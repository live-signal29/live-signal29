import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PROVISIONING = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";
const DEFAULT_CLIENT_API = "https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai";

const KEYS = ["METAAPI_TOKEN", "MT5_LOGIN", "MT5_SERVER", "MT5_PASSWORD"];

let METAAPI_TOKEN = "";
let MT5_LOGIN = "";
let MT5_SERVER = "";
let MT5_PASSWORD = "";

let credentialsLoadedAt = 0;
let cachedAccountId: string | null = null;
let cachedRegion: string | null = null;
let cachedAccountAt = 0;

function clientApi(): string {
  return cachedRegion
    ? `https://mt-client-api-v1.${cachedRegion}.agiliumtrade.ai`
    : DEFAULT_CLIENT_API;
}

async function loadCredentials() {
  if (Date.now() - credentialsLoadedAt < 30000) return;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data } = await admin.from("integration_settings").select("key,value").in("key", KEYS);

  const values: Record<string, string> = {};
  for (const row of data || []) {
    values[row.key] = String(row.value || "").trim();
  }

  METAAPI_TOKEN = values.METAAPI_TOKEN || Deno.env.get("METAAPI_TOKEN")?.trim() || "";
  MT5_LOGIN = values.MT5_LOGIN || Deno.env.get("MT5_LOGIN")?.trim() || "";
  MT5_SERVER = values.MT5_SERVER || Deno.env.get("MT5_SERVER")?.trim() || "";
  MT5_PASSWORD = values.MT5_PASSWORD || Deno.env.get("MT5_PASSWORD")?.trim() || "";
  credentialsLoadedAt = Date.now();
}

async function getAccountId(): Promise<string | null> {
  await loadCredentials();
  if (!METAAPI_TOKEN || !MT5_LOGIN || !MT5_SERVER) return null;
  if (cachedAccountId && Date.now() - cachedAccountAt < 10 * 60 * 1000) return cachedAccountId;

  try {
    const response = await fetch(`${PROVISIONING}/users/current/accounts`, {
      headers: { "auth-token": METAAPI_TOKEN },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const raw = await response.json();
    const accounts = Array.isArray(raw) ? raw : raw?.items || [];
    const account = accounts.find((a: any) => String(a.login) === String(MT5_LOGIN));

    if (account) {
      cachedAccountId = account._id || account.id;
      cachedRegion = account.region || account.primaryReplica?.region || null;
      cachedAccountAt = Date.now();
      return cachedAccountId;
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeSymbol(value: string): string {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/* =========================================================
   DERIV SYMBOL MAPPER & WEBSOCKET ENGINE
========================================================= */

function getDerivSymbol(appPair: string): string | null {
  const n = normalizeSymbol(appPair);
  if (n.includes("BOOM") && n.includes("1000")) return "BOOM1000";
  if (n.includes("BOOM") && n.includes("500")) return "BOOM500";
  if (n.includes("CRASH") && n.includes("1000")) return "CRASH1000";
  if (n.includes("CRASH") && n.includes("500")) return "CRASH500";
  if (n.includes("STEP")) return "stpRNG";

  if (n.includes("VOL")) {
    const oneSecond = n.includes("1S") || n.includes("1SEC");
    if (n.includes("100")) return oneSecond ? "1HZ100V" : "R_100";
    if (n.includes("75")) return oneSecond ? "1HZ75V" : "R_75";
    if (n.includes("50")) return oneSecond ? "1HZ50V" : "R_50";
    if (n.includes("25")) return oneSecond ? "1HZ25V" : "R_25";
    if (n.includes("10")) return oneSecond ? "1HZ10V" : "R_10";
  }
  return null;
}

// Reliable WebSocket implementation with 3.5s strict timeout
function fetchDerivWsPrice(symbol: string): Promise<string | null> {
  return new Promise((resolve) => {
    let ws: WebSocket | null = null;
    const timeout = setTimeout(() => {
      if (ws) {
        try { ws.close(); } catch (_) {}
      }
      resolve(null);
    }, 3500);

    try {
      ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");

      ws.onopen = () => {
        ws?.send(JSON.stringify({ ticks: symbol }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.msg_type === "tick" && data.tick?.quote) {
            const price = Number(data.tick.quote);
            const decimals = symbol.includes("R_75") || symbol.includes("1HZ75V") ? 4 : 2;
            clearTimeout(timeout);
            try { ws?.close(); } catch (_) {}
            resolve(price > 0 ? price.toFixed(decimals) : null);
          }
        } catch (_) {
          clearTimeout(timeout);
          try { ws?.close(); } catch (_) {}
          resolve(null);
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        try { ws?.close(); } catch (_) {}
        resolve(null);
      };
    } catch (_) {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

/* =========================================================
   FOREX / CRYPTO METAAPI FETCH ENGINE
========================================================= */

function getSymbolAliases(appPair: string): string[] {
  const n = normalizeSymbol(appPair);
  if (n.includes("XAU") || n.includes("GOLD")) return ["XAUUSD", "GOLD", "XAUUSDM"];
  if (n.includes("BTCUSD")) return ["BTCUSD", "BTCUSDT"];
  if (n.includes("EURUSD")) return ["EURUSD"];
  if (n.includes("GBPUSD")) return ["GBPUSD"];
  return [n];
}

async function fetchMt5Price(accountId: string, appPair: string): Promise<string | null> {
  try {
    const symbol = getSymbolAliases(appPair)[0];
    const response = await fetch(
      `${clientApi()}/users/current/accounts/${accountId}/symbols/${encodeURIComponent(symbol)}/current-price`,
      {
        headers: { "auth-token": METAAPI_TOKEN },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const price = Number(data?.bid || data?.ask);
    return price > 0 ? price.toFixed(2) : null;
  } catch {
    return null;
  }
}

/* =========================================================
   ROUTER & MAIN PROCESSOR
========================================================= */

async function fetchAllPrices(pairs: string[]): Promise<Record<string, string>> {
  const prices: Record<string, string> = {};
  const remainingPairs: string[] = [];

  // 1. Process Deriv pairs (Strictly isolated from MetaAPI)
  await Promise.all(
    pairs.map(async (pair) => {
      const derivSymbol = getDerivSymbol(pair);
      if (derivSymbol) {
        const derivPrice = await fetchDerivWsPrice(derivSymbol);
        if (derivPrice) prices[pair] = derivPrice;
      } else {
        remainingPairs.push(pair);
      }
    })
  );

  // 2. Process Forex / Commodities / Cryptos via MetaAPI
  if (remainingPairs.length > 0) {
    const accountId = await getAccountId();
    if (accountId) {
      await Promise.all(
        remainingPairs.map(async (pair) => {
          const mt5Price = await fetchMt5Price(accountId, pair);
          if (mt5Price) prices[pair] = mt5Price;
        })
      );
    }
  }

  return prices;
}

function parsePrice(val: string): number {
  return parseFloat(String(val || "").replace(/[^\d.\-]/g, "")) || 0;
}

/* =========================================================
   EDGE FUNCTION ENTRY POINT
========================================================= */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: signals, error } = await supabase
      .from("signals")
      .select("*")
      .eq("published", true)
      .not("signal_status", "ilike", "close");

    if (error || !signals || signals.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No active signals to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uniquePairs = [...new Set(signals.map((s) => s.pair))];
    const prices = await fetchAllPrices(uniquePairs);

    for (const signal of signals) {
      const current = prices[signal.pair];
      
      // Safety Lock: Price fetch na ho sake tou database me wrong data add na ho
      if (!current) continue;

      const currentPrice = parseFloat(current);
      const isBuy = String(signal.type || "").toLowerCase() === "buy";
      const updates: Record<string, any> = {
        current_price: current,
        updated_at: new Date().toISOString(),
      };

      const entry = parsePrice(signal.entry || "");
      const sl = parsePrice(signal.sl || "");
      const tp1 = parsePrice(signal.tp1 || "");

      // 1. SL Hit Checks
      if (!signal.sl_hit && sl > 0) {
        const isSlHit = isBuy ? currentPrice <= sl : currentPrice >= sl;
        if (isSlHit) {
          updates.sl_hit = true;
          updates.signal_status = "close";
          updates.status = "close";
          updates.profit_note = "SL Hit ❌";
        }
      }

      // 2. TP1 Hit & Break Even Checks
      if (!signal.tp1_hit && tp1 > 0) {
        const isTp1Hit = isBuy ? currentPrice >= tp1 : currentPrice <= tp1;
        if (isTp1Hit) {
          updates.tp1_hit = true;
          updates.profit_note = "TP 1 Hit ✅ SL moved to B.E";
          if (entry > 0) updates.sl = String(entry);
        }
      }

      await supabase.from("signals").update(updates).eq("id", signal.id);
    }

    return new Response(JSON.stringify({ success: true, processed_pairs: prices }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
