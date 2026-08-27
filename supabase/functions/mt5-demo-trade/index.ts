import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROVISIONING = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";
const DEFAULT_CLIENT_API = "https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai";

interface TradeRequest {
  action: "open" | "open_multi" | "check" | "close" | "stats";
  signal_id?: string;
  symbol?: string;
  trade_type?: "buy" | "sell";
  entry?: number;
  sl?: number;
  tp?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  lot_size?: number;
  trade_id?: string;
  tp_level?: number;
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

      case "open_multi":
        return await openMultiTrade(supabase, creds.token, accountId, clientApi, body);
      
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
function normalizeSym(v: string): string {
  return String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// "VOL 75" / "Volatility 75" etc need to expand to the broker's real
// name ("Volatility 75 Index" -> normalized "VOLATILITY75INDEX") before
// matching — a plain normalize+prefix check fails for these because
// "VOL75" is NOT a prefix of "VOLATILITY75INDEX" (unlike "BOOM1000",
// which IS a prefix of "BOOM1000INDEX" and so worked already). This is
// exactly why Boom/Crash trades opened fine but Volatility ones didn't.
function getSymbolAliases(appSymbol: string): string[] {
  const n = normalizeSym(appSymbol);

  if (n.includes("XAU") || n.includes("GOLD")) return ["XAUUSD", "GOLD", "XAUUSDM"];
  if (n.includes("XAG") || n.includes("SILVER")) return ["XAGUSD", "SILVER"];

  if (n.includes("BOOM") && n.includes("1000")) return ["BOOM1000INDEX", "BOOM1000"];
  if (n.includes("BOOM") && n.includes("500")) return ["BOOM500INDEX", "BOOM500"];
  if (n.includes("CRASH") && n.includes("1000")) return ["CRASH1000INDEX", "CRASH1000"];
  if (n.includes("CRASH") && n.includes("500")) return ["CRASH500INDEX", "CRASH500"];

  if (n.includes("VOL") && n.includes("75")) return ["VOLATILITY75INDEX", "VOL75", "V75"];
  if (n.includes("VOL") && n.includes("100")) return ["VOLATILITY100INDEX", "VOL100", "V100"];
  if (n.includes("VOL") && n.includes("50")) return ["VOLATILITY50INDEX", "VOL50", "V50"];
  if (n.includes("VOL") && n.includes("25")) return ["VOLATILITY25INDEX", "VOL25", "V25"];

  if (n.includes("STEP")) return ["STEPINDEX", "STEP"];
  if (n.includes("JUMP")) return [n, "JUMP"];

  return [n];
}

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

    const normalized = list.map((s) => ({ original: s, n: normalizeSym(s) }));
    const aliases = getSymbolAliases(appSymbol);

    // EXACT match against every alias first (most reliable)
    for (const alias of aliases) {
      const wanted = normalizeSym(alias);
      const exact = normalized.find((x) => x.n === wanted);
      if (exact) {
        console.log(`Symbol EXACT: ${appSymbol} -> ${exact.original}`);
        return exact.original;
      }
    }

    // PREFIX match as fallback
    for (const alias of aliases) {
      const wanted = normalizeSym(alias);
      const match = normalized.find((x) => x.n.startsWith(wanted) || wanted.startsWith(x.n));
      if (match) {
        console.log(`Symbol PREFIX: ${appSymbol} -> ${match.original}`);
        return match.original;
      }
    }

    // CONTAINS match as last resort
    for (const alias of aliases) {
      const wanted = normalizeSym(alias);
      if (wanted.length < 4) continue;
      const match = normalized.find((x) => x.n.includes(wanted));
      if (match) {
        console.log(`Symbol CONTAINS: ${appSymbol} -> ${match.original}`);
        return match.original;
      }
    }

    console.log(`No broker symbol match for ${appSymbol}, using as-is`);
    return appSymbol;
  } catch (error) {
    console.error("resolveBrokerSymbol error:", String(error));
    return appSymbol;
  }
}

// Different symbols (especially Deriv synthetic indices like VOL75,
// BOOM1000, CRASH500) have their own minimum/step lot size — 0.01 that
// works fine for forex/gold gets rejected by the broker as "Invalid
// volume" on these. Look up the broker's actual volume rules for this
// symbol and snap the requested lot to a valid value before trading.
async function resolveValidVolume(
  token: string,
  clientApi: string,
  accountId: string,
  brokerSymbol: string,
  requestedVolume: number
): Promise<number> {
  try {
    const response = await fetch(
      `${clientApi}/users/current/accounts/${accountId}/symbols/${encodeURIComponent(brokerSymbol)}/specification`,
      { headers: { "auth-token": token }, signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) return requestedVolume;

    const spec = await response.json();
    const minVolume = Number(spec?.minVolume) || 0;
    const maxVolume = Number(spec?.maxVolume) || Infinity;
    const step = Number(spec?.volumeStep) || minVolume || 0.01;

    if (!minVolume) return requestedVolume;

    let volume = requestedVolume;
    if (volume < minVolume) volume = minVolume;
    if (volume > maxVolume) volume = maxVolume;

    // Snap to the nearest valid step above the minimum
    if (step > 0) {
      const steps = Math.round((volume - minVolume) / step);
      volume = minVolume + steps * step;
    }

    volume = Number(volume.toFixed(2));
    console.log(`Volume for ${brokerSymbol}: requested ${requestedVolume} -> broker min ${minVolume}/step ${step} -> using ${volume}`);
    return volume;
  } catch (error) {
    console.error("resolveValidVolume error:", String(error));
    return requestedVolume;
  }
}

async function openTrade(
  supabase: any,
  token: string,
  accountId: string,
  clientApi: string,
  body: TradeRequest
): Promise<Response> {
  const result = await placeSingleTrade(supabase, token, accountId, clientApi, body);
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: result.error }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  return new Response(
    JSON.stringify({
      success: true,
      trade_id: result.trade_id,
      mt5_ticket: result.mt5_ticket,
      message: "Trade opened successfully",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Opens 3 separate MT5 positions for one signal — same symbol/entry/SL,
// but each targeting a different take-profit level (TP1, TP2, TP3). This
// is how partial profit-taking is done on MT5: since a single position
// can't have three TPs, we open three smaller positions instead, so each
// one can close independently as price reaches that level. Once the
// TP1-tagged trade closes in profit, checkTrades() below moves the SL of
// the remaining two positions to break-even automatically.
async function openMultiTrade(
  supabase: any,
  token: string,
  accountId: string,
  clientApi: string,
  body: TradeRequest
): Promise<Response> {
  const { tp1, tp2, tp3, sl, lot_size = 0.01 } = body;

  const legs: { tp_level: number; tp: number | undefined }[] = [
    { tp_level: 1, tp: tp1 },
    { tp_level: 2, tp: tp2 },
    { tp_level: 3, tp: tp3 },
  ].filter((leg) => leg.tp && leg.tp > 0);

  if (legs.length === 0) {
    return new Response(
      JSON.stringify({ error: "At least one of tp1/tp2/tp3 is required for open_multi" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const results: any[] = [];

  // Placed one at a time (not in parallel) — MT5/MetaApi can reject
  // rapid-fire simultaneous orders on the same symbol from one account.
  for (const leg of legs) {
    const result = await placeSingleTrade(supabase, token, accountId, clientApi, {
      ...body,
      tp: leg.tp,
      sl,
      lot_size,
      tp_level: leg.tp_level,
    });
    results.push({ tp_level: leg.tp_level, ...result });
  }

  const opened = results.filter((r) => r.success).length;

  return new Response(
    JSON.stringify({
      success: opened > 0,
      opened,
      total: legs.length,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function placeSingleTrade(
  supabase: any,
  token: string,
  accountId: string,
  clientApi: string,
  body: TradeRequest
): Promise<{ success: boolean; trade_id?: string; mt5_ticket?: any; error?: string }> {
  const { signal_id, symbol, trade_type, entry, sl, tp, lot_size = 0.01, tp_level } = body;

  if (!symbol || !trade_type) {
    return { success: false, error: "Symbol and trade type required" };
  }

  const brokerSymbol = await resolveBrokerSymbol(token, clientApi, accountId, symbol);
  console.log(`Symbol resolved: ${symbol} -> ${brokerSymbol}`);

  const validVolume = await resolveValidVolume(token, clientApi, accountId, brokerSymbol, lot_size);

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
      lot_size: validVolume,
      status: "pending",
      tp_level: tp_level ?? null,
    })
    .select()
    .single();

  if (insertError) {
    return { success: false, error: `Failed to create trade record: ${insertError.message}` };
  }

  try {
    // Place trade via MetaApi
    const tradePayload: any = {
      actionType: trade_type.toUpperCase() === "BUY" ? "ORDER_TYPE_BUY" : "ORDER_TYPE_SELL",
      symbol: brokerSymbol,
      volume: validVolume,
      // MT5 brokers cap the comment field at ~26 characters — a full
      // "Signal: <uuid>" (44+ chars) gets rejected by MetaApi with
      // "clientId and comment fields length is invalid". Keep it short;
      // the real signal_id is already stored in mt5_demo_trades.
      comment: tp_level ? `LiveSignal TP${tp_level}` : "LiveSignal",
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

    // MetaApi's /trade endpoint often returns HTTP 200 even when the
    // BROKER rejected/requoted the order — there is no top-level "error"
    // field in that case, only a non-success numericCode/stringCode and
    // no positionId/orderId. Treating that as success was the actual bug:
    // the DB row got marked "open" with mt5_ticket = NULL while nothing
    // was really placed on the MT5 account. A trade only really opened
    // if MetaApi gave back a positionId or orderId.
    const ticket = tradeResult.positionId || tradeResult.orderId;
    const isRejected =
      !tradeResponse.ok ||
      tradeResult.error ||
      !ticket ||
      (tradeResult.numericCode !== undefined && tradeResult.numericCode !== 0 && tradeResult.numericCode !== 10009) ||
      (tradeResult.stringCode && !["TRADE_RETCODE_DONE", "TRADE_RETCODE_PLACED"].includes(tradeResult.stringCode));

    if (isRejected) {
      throw new Error(
        tradeResult.message ||
        tradeResult.stringCode ||
        tradeResult.error ||
        `Broker rejected the order (no ticket returned): ${JSON.stringify(tradeResult)}`
      );
    }

    // Update trade record with success
    await supabase
      .from("mt5_demo_trades")
      .update({
        mt5_ticket: ticket,
        status: "open",
        open_time: new Date().toISOString(),
        entry_price: tradeResult.price || entry,
      })
      .eq("id", tradeRecord.id);

    return { success: true, trade_id: tradeRecord.id, mt5_ticket: ticket };
  } catch (error) {
    // Update trade record with error
    await supabase
      .from("mt5_demo_trades")
      .update({
        status: "error",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", tradeRecord.id);

    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
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

        // Scale-out logic: when the TP1 leg of a multi-TP signal closes
        // in profit, move the SL of the still-open TP2/TP3 legs (same
        // signal_id) to break-even (the shared entry price) so they can
        // no longer turn into a loss.
        if (trade.tp_level === 1 && result === "win" && trade.signal_id) {
          await moveSiblingsToBreakeven(supabase, token, clientApi, accountId, trade, positions);
        }
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

async function moveSiblingsToBreakeven(
  supabase: any,
  token: string,
  clientApi: string,
  accountId: string,
  tp1Trade: any,
  positions: any[]
): Promise<void> {
  const { data: siblings, error } = await supabase
    .from("mt5_demo_trades")
    .select("*")
    .eq("signal_id", tp1Trade.signal_id)
    .eq("status", "open")
    .in("tp_level", [2, 3]);

  if (error || !siblings || siblings.length === 0) return;

  const breakevenPrice = tp1Trade.entry_price;

  for (const sibling of siblings) {
    // Already moved (avoid redundant MetaApi calls on every cron run)
    if (Number(sibling.sl_price) === Number(breakevenPrice)) continue;

    const position = positions.find(
      (p: any) => p.id === sibling.mt5_ticket || p.positionId === sibling.mt5_ticket
    );
    if (!position) continue;

    try {
      const response = await fetch(
        `${clientApi}/users/current/accounts/${accountId}/trade`,
        {
          method: "POST",
          headers: { "auth-token": token, "Content-Type": "application/json" },
          body: JSON.stringify({
            actionType: "POSITION_MODIFY",
            positionId: sibling.mt5_ticket,
            stopLoss: breakevenPrice,
            takeProfit: position.takeProfit,
          }),
        }
      );

      const result = await response.json();
      const ok = response.ok && !result.error &&
        (result.numericCode === undefined || result.numericCode === 0 || result.numericCode === 10009);

      if (ok) {
        await supabase
          .from("mt5_demo_trades")
          .update({ sl_price: breakevenPrice })
          .eq("id", sibling.id);
        console.log(`Moved TP${sibling.tp_level} trade ${sibling.id} SL to breakeven (${breakevenPrice})`);
      } else {
        console.error(`Failed to move SL to breakeven for trade ${sibling.id}:`, result);
      }
    } catch (err) {
      console.error(`Breakeven modify error for trade ${sibling.id}:`, String(err));
    }
  }
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
