import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TradeRequest {
  action: "open" | "check" | "close" | "stats";
  signal_id?: string;
  symbol?: string;
  trade_type?: "buy" | "sell";
  entry?: number;
  sl?: number;
  tp?: number;
  lot_size?: number;
  trade_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const METAAPI_TOKEN = Deno.env.get("METAAPI_TOKEN");
    const MT5_LOGIN = Deno.env.get("MT5_LOGIN");
    const MT5_PASSWORD = Deno.env.get("MT5_PASSWORD");
    const MT5_SERVER = Deno.env.get("MT5_SERVER");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!METAAPI_TOKEN) {
      throw new Error("MetaApi token not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: TradeRequest = await req.json();
    
    console.log("MT5 Demo Trade request:", body.action);

    // Get or create MetaApi account
    const accountId = await getOrCreateMetaApiAccount(
      METAAPI_TOKEN,
      MT5_LOGIN!,
      MT5_PASSWORD!,
      MT5_SERVER!
    );

    switch (body.action) {
      case "open":
        return await openTrade(supabase, METAAPI_TOKEN, accountId, body);
      
      case "check":
        return await checkTrades(supabase, METAAPI_TOKEN, accountId);
      
      case "close":
        return await closeTrade(supabase, METAAPI_TOKEN, accountId, body.trade_id!);
      
      case "stats":
        return await getStats(supabase);
      
      default:
        throw new Error("Invalid action");
    }
  } catch (error) {
    console.error("MT5 Demo Trade error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getOrCreateMetaApiAccount(
  token: string,
  login: string,
  password: string,
  server: string
): Promise<string> {
  // Check if account already exists
  const listResponse = await fetch("https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts", {
    headers: { "auth-token": token },
  });

  if (!listResponse.ok) {
    throw new Error(`Failed to list MetaApi accounts: ${await listResponse.text()}`);
  }

  const accounts = await listResponse.json();
  const existingAccount = accounts.find((acc: any) => acc.login === login && acc.server === server);

  if (existingAccount) {
    console.log("Using existing MetaApi account:", existingAccount._id);
    
    // Deploy if not deployed
    if (existingAccount.state !== "DEPLOYED") {
      await fetch(`https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${existingAccount._id}/deploy`, {
        method: "POST",
        headers: { "auth-token": token },
      });
      // Wait for deployment
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    return existingAccount._id;
  }

  // Create new account
  console.log("Creating new MetaApi account...");
  const createResponse = await fetch("https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts", {
    method: "POST",
    headers: {
      "auth-token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `Demo-${login}`,
      type: "cloud",
      login: login,
      password: password,
      server: server,
      platform: "mt5",
      magic: 123456,
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create MetaApi account: ${await createResponse.text()}`);
  }

  const newAccount = await createResponse.json();
  console.log("Created MetaApi account:", newAccount.id);

  // Deploy the account
  await fetch(`https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${newAccount.id}/deploy`, {
    method: "POST",
    headers: { "auth-token": token },
  });

  // Wait for deployment
  await new Promise(resolve => setTimeout(resolve, 10000));

  return newAccount.id;
}

async function openTrade(
  supabase: any,
  token: string,
  accountId: string,
  body: TradeRequest
): Promise<Response> {
  const { signal_id, symbol, trade_type, entry, sl, tp, lot_size = 0.01 } = body;

  if (!symbol || !trade_type) {
    throw new Error("Symbol and trade type required");
  }

  // Insert pending trade record
  const { data: tradeRecord, error: insertError } = await supabase
    .from("mt5_demo_trades")
    .insert({
      signal_id,
      symbol,
      trade_type,
      entry_price: entry,
      sl_price: sl,
      tp_price: tp,
      lot_size,
      status: "pending",
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to create trade record: ${insertError.message}`);
  }

  try {
    // Place trade via MetaApi
    const tradePayload: any = {
      actionType: trade_type.toUpperCase() === "BUY" ? "ORDER_TYPE_BUY" : "ORDER_TYPE_SELL",
      symbol: symbol,
      volume: lot_size,
      comment: `Signal: ${signal_id || "manual"}`,
    };

    // Add SL/TP if provided and valid
    if (sl && sl > 0) tradePayload.stopLoss = sl;
    if (tp && tp > 0) tradePayload.takeProfit = tp;

    console.log("Opening MT5 trade:", tradePayload);

    const tradeResponse = await fetch(
      `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${accountId}/trade`,
      {
        method: "POST",
        headers: {
          "auth-token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tradePayload),
      }
    );

    const tradeResult = await tradeResponse.json();
    console.log("Trade result:", tradeResult);

    if (!tradeResponse.ok || tradeResult.error) {
      throw new Error(tradeResult.message || tradeResult.error || "Trade execution failed");
    }

    // Update trade record with success
    await supabase
      .from("mt5_demo_trades")
      .update({
        mt5_ticket: tradeResult.positionId || tradeResult.orderId,
        status: "open",
        open_time: new Date().toISOString(),
        entry_price: tradeResult.price || entry,
      })
      .eq("id", tradeRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        trade_id: tradeRecord.id,
        mt5_ticket: tradeResult.positionId || tradeResult.orderId,
        message: "Trade opened successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Update trade record with error
    await supabase
      .from("mt5_demo_trades")
      .update({
        status: "error",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", tradeRecord.id);

    throw error;
  }
}

async function checkTrades(
  supabase: any,
  token: string,
  accountId: string
): Promise<Response> {
  // Get all open trades from database
  const { data: openTrades, error } = await supabase
    .from("mt5_demo_trades")
    .select("*")
    .eq("status", "open");

  if (error) {
    throw new Error(`Failed to fetch open trades: ${error.message}`);
  }

  if (!openTrades || openTrades.length === 0) {
    return new Response(
      JSON.stringify({ message: "No open trades to check", updated: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get positions from MetaApi
  const positionsResponse = await fetch(
    `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${accountId}/positions`,
    { headers: { "auth-token": token } }
  );

  const positions = await positionsResponse.json();
  console.log("Current positions:", positions);

  // Get closed positions (history)
  const historyResponse = await fetch(
    `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${accountId}/history-deals?startTime=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`,
    { headers: { "auth-token": token } }
  );

  const history = await historyResponse.json();
  console.log("Recent history:", history);

  let updated = 0;

  for (const trade of openTrades) {
    // Check if position is still open
    const openPosition = positions.find((p: any) => 
      p.id === trade.mt5_ticket || p.positionId === trade.mt5_ticket
    );

    if (openPosition) {
      // Position still open - update profit/loss
      await supabase
        .from("mt5_demo_trades")
        .update({
          profit_loss: openPosition.profit,
        })
        .eq("id", trade.id);
    } else {
      // Position closed - find in history
      const closedDeal = history.find((h: any) => 
        h.positionId === trade.mt5_ticket && h.entryType === "DEAL_ENTRY_OUT"
      );

      if (closedDeal) {
        const result = closedDeal.profit > 0 ? "win" : closedDeal.profit < 0 ? "loss" : "breakeven";
        
        await supabase
          .from("mt5_demo_trades")
          .update({
            status: "closed",
            close_time: closedDeal.time,
            close_price: closedDeal.price,
            profit_loss: closedDeal.profit,
            result,
          })
          .eq("id", trade.id);

        updated++;
        console.log(`Trade ${trade.id} closed with ${result}: $${closedDeal.profit}`);
      }
    }
  }

  return new Response(
    JSON.stringify({ 
      message: "Trades checked", 
      updated,
      open_positions: positions.length,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function closeTrade(
  supabase: any,
  token: string,
  accountId: string,
  tradeId: string
): Promise<Response> {
  // Get trade from database
  const { data: trade, error } = await supabase
    .from("mt5_demo_trades")
    .select("*")
    .eq("id", tradeId)
    .single();

  if (error || !trade) {
    throw new Error("Trade not found");
  }

  if (trade.status !== "open") {
    throw new Error("Trade is not open");
  }

  // Close position via MetaApi
  const closeResponse = await fetch(
    `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${accountId}/trade`,
    {
      method: "POST",
      headers: {
        "auth-token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        actionType: "POSITION_CLOSE_ID",
        positionId: trade.mt5_ticket,
      }),
    }
  );

  const closeResult = await closeResponse.json();
  console.log("Close result:", closeResult);

  if (!closeResponse.ok) {
    throw new Error(closeResult.message || "Failed to close trade");
  }

  // Update trade record
  await supabase
    .from("mt5_demo_trades")
    .update({
      status: "closed",
      close_time: new Date().toISOString(),
      close_price: closeResult.price,
      profit_loss: closeResult.profit || 0,
      result: (closeResult.profit || 0) > 0 ? "win" : (closeResult.profit || 0) < 0 ? "loss" : "breakeven",
    })
    .eq("id", tradeId);

  return new Response(
    JSON.stringify({ success: true, message: "Trade closed" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function getStats(supabase: any): Promise<Response> {
  const { data, error } = await supabase.rpc("get_mt5_demo_stats", { p_days: 30 });

  if (error) {
    throw new Error(`Failed to get stats: ${error.message}`);
  }

  return new Response(
    JSON.stringify(data?.[0] || {
      total_trades: 0,
      total_wins: 0,
      total_losses: 0,
      total_breakeven: 0,
      total_profit: 0,
      win_rate: 0,
      accuracy_percent: 0,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
