import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROVISIONING = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";
const DEFAULT_CLIENT_API = "https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai";

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

interface Credentials {
  token: string;
  login: string;
  password: string;
  server: string;
}

// Credentials can live in TWO places depending on how they were entered:
// 1. The admin "MT5 Connection Settings" UI -> saved to the
//    `integration_settings` table (this is how fetch-live-prices reads
//    them, which is why live prices already work).
// 2. Supabase Edge Function secrets (METAAPI_TOKEN / MT5_LOGIN / etc).
// Check the table FIRST, fall back to secrets, so this function always
// sees the same credentials the rest of the app is using.
async function loadCredentials(supabase: any): Promise<Credentials> {
  const keys = ["METAAPI_TOKEN", "MT5_LOGIN", "MT5_PASSWORD", "MT5_SERVER"];
  const values: Record<string, string> = {};

  try {
    const { data, error } = await supabase
      .from("integration_settings")
      .select("key,value")
      .in("key", keys);

    if (error) {
      console.error("integration_settings error:", error.message);
    }

    for (const row of data || []) {
      values[row.key] = String(row.value || "").trim();
    }
  } catch (error) {
    console.error("integration_settings fetch failed:", String(error));
  }

  const token = values.METAAPI_TOKEN || Deno.env.get("METAAPI_TOKEN")?.trim() || "";
  const login = values.MT5_LOGIN || Deno.env.get("MT5_LOGIN")?.trim() || "";
  const password = values.MT5_PASSWORD || Deno.env.get("MT5_PASSWORD")?.trim() || "";
  const server = values.MT5_SERVER || Deno.env.get("MT5_SERVER")?.trim() || "";

  console.log(
    "MT5 credentials loaded:",
    "token=" + Boolean(token),
    "login=" + Boolean(login),
    "password=" + Boolean(password),
    "server=" + Boolean(server)
  );

  return { token, login, password, server };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const creds = await loadCredentials(supabase);

    if (!creds.token) {
      throw new Error("MetaApi token not configured (checked integration_settings table and secrets)");
    }
    if (!creds.login || !creds.server) {
      throw new Error("MT5 login/server not configured (checked integration_settings table and secrets)");
    }

    const body: TradeRequest = await req.json();
    
    console.log("MT5 Demo Trade request:", body.action);

    // Get or create MetaApi account (also resolves the region-specific
    // client-api host, same as fetch-live-prices does — the generic host
    // works for provisioning but trade/position calls need the region
    // host or they silently fail / 404).
    const { accountId, clientApi } = await getOrCreateMetaApiAccount(
      creds.token,
      creds.login,
      creds.password,
      creds.server
    );

    switch (body.action) {
      case "open":
        return await openTrade(supabase, creds.token, accountId, clientApi, body);
      
      case "check":
        return await checkTrades(supabase, creds.token, accountId, clientApi);
      
      case "close":
        return await closeTrade(supabase, creds.token, accountId, clientApi, body.trade_id!);
      
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
): Promise<{ accountId: string; clientApi: string }> {
  // Check if account already exists
  const listResponse = await fetch(`${PROVISIONING}/users/current/accounts`, {
    headers: { "auth-token": token },
  });

  if (!listResponse.ok) {
    throw new Error(`Failed to list MetaApi accounts: ${await listResponse.text()}`);
  }

  const raw = await listResponse.json();
  const accounts = Array.isArray(raw) ? raw : raw?.items || [];
  let account = accounts.find((acc: any) => String(acc.login) === String(login) && String(acc.server || "").toLowerCase() === String(server).toLowerCase())
    || accounts.find((acc: any) => String(acc.login) === String(login));

  if (!account) {
    // Create new account
    console.log("Creating new MetaApi account...");
    const createResponse = await fetch(`${PROVISIONING}/users/current/accounts`, {
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

    account = await createResponse.json();
    console.log("Created MetaApi account:", account._id || account.id);
  } else {
    console.log("Using existing MetaApi account:", account._id || account.id);
  }

  const accountId = account._id || account.id;
  const state = String(account?.state || "").toUpperCase();

  // Deploy if not deployed
  if (state && state !== "DEPLOYED" && state !== "DEPLOYING") {
    await fetch(`${PROVISIONING}/users/current/accounts/${accountId}/deploy`, {
      method: "POST",
      headers: { "auth-token": token },
    });
    // Wait for deployment
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  const region = account?.region || account?.primaryReplica?.region || null;
  const clientApi = region
    ? `https://mt-client-api-v1.${region}.agiliumtrade.ai`
    : DEFAULT_CLIENT_API;

  console.log("MT5 account ready:", accountId, "region:", region || "default");

  return { accountId, clientApi };
}

// Broker MT5 accounts often list symbols with a suffix/prefix that differs
// from the plain pair name used in our signals (e.g. our "XAUUSD" might be
// the broker's "XAUUSDm" or "GOLD"). Placing a trade with the wrong exact
// symbol string fails silently with a MetaApi error, even though price
// lookups (which already do this matching) work fine. Resolve against the
// broker's actual symbol list before sending the trade.
async function resolveBrokerSymbol(
  token: string,
  clientApi: string,
  accountId: string,
  appSymbol: string
): Promise<string> {
  try {
    const response = await fetch(
      `${clientApi}/users/current/accounts/${accountId}/symbols`,
      { headers: { "auth-token": token }, signal: AbortSignal.timeout(15000) }
    );

    if (!response.ok) return appSymbol;

    const raw = await response.json();
    const list: string[] = (Array.isArray(raw) ? raw : raw?.symbols || raw?.items || [])
      .map((s: any) => (typeof s === "string" ? s : s?.symbol || s?.name))
      .filter(Boolean);

    const normalize = (v: string) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const wanted = normalize(appSymbol);

    const exact = list.find((s) => normalize(s) === wanted);
    if (exact) return exact;

    const prefix = list.find((s) => normalize(s).startsWith(wanted) || wanted.startsWith(normalize(s)));
    if (prefix) return prefix;

    const contains = wanted.length >= 4 ? list.find((s) => normalize(s).includes(wanted)) : null;
    if (contains) return contains;

    console.log(`No broker symbol match for ${appSymbol}, using as-is`);
    return appSymbol;
  } catch (error) {
    console.error("resolveBrokerSymbol error:", String(error));
    return appSymbol;
  }
}

async function openTrade(
  supabase: any,
  token: string,
  accountId: string,
  clientApi: string,
  body: TradeRequest
): Promise<Response> {
  const { signal_id, symbol, trade_type, entry, sl, tp, lot_size = 0.01 } = body;

  if (!symbol || !trade_type) {
    throw new Error("Symbol and trade type required");
  }

  const brokerSymbol = await resolveBrokerSymbol(token, clientApi, accountId, symbol);
  console.log(`Symbol resolved: ${symbol} -> ${brokerSymbol}`);

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
      symbol: brokerSymbol,
      volume: lot_size,
      comment: `Signal: ${signal_id || "manual"}`,
    };

    // Add SL/TP if provided and valid
    if (sl && sl > 0) tradePayload.stopLoss = sl;
    if (tp && tp > 0) tradePayload.takeProfit = tp;

    console.log("Opening MT5 trade:", tradePayload);

    const tradeResponse = await fetch(
      `${clientApi}/users/current/accounts/${accountId}/trade`,
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
  accountId: string,
  clientApi: string
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
    `${clientApi}/users/current/accounts/${accountId}/positions`,
    { headers: { "auth-token": token } }
  );

  const positions = await positionsResponse.json();
  console.log("Current positions:", positions);

  // Get closed positions (history)
  const historyResponse = await fetch(
    `${clientApi}/users/current/accounts/${accountId}/history-deals?startTime=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`,
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
  clientApi: string,
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
    `${clientApi}/users/current/accounts/${accountId}/trade`,
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
