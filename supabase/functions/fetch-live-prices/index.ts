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
  credentialsLoadedAt = Date.now();
}

async function getAccountId(): Promise<string | null> {
  await loadCredentials();
  if (!METAAPI_TOKEN || !MT5_LOGIN || !MT5_SERVER) return null;
  if (cachedAccountId && Date.now() - cachedAccountAt < 10 * 60 * 1000) return cachedAccountId;

  try {
    const response = await fetch(`${PROVISIONING}/users/current/accounts`, {
      headers: { "auth-token": METAAPI_TOKEN },
      signal: AbortSignal.timeout(8000),
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

/* =========================================================
   STRICT DERIV SYMBOL MATCHER
========================================================= */

function isDerivPair(appPair: string): boolean {
  const p = String(appPair || "").toUpperCase();
  return (
    p.includes("VOL") ||
    p.includes("BOOM") ||
    p.includes("CRASH") ||
    p.includes("STEP") ||
    p.includes("HZ") ||
    p.includes("JUMP")
  );
}

function getDerivSymbol(appPair: string): string | null {
  const p = String(appPair || "").toUpperCase().replace(/\s+/g, "");

  if (p.includes("BOOM1000")) return "BOOM1000";
  if (p.includes("BOOM500")) return "BOOM500";
  if (p.includes("CRASH1000")) return "CRASH1000";
  if (p.includes("CRASH500")) return "CRASH500";
  if (p.includes("STEP")) return "stpRNG";

  const is1S = p.includes("1S") || p.includes("1SEC");
  if (p.includes("VOL100") || p.includes("V100")) return is1S ? "1HZ100V" : "R_100";
  if (p.includes("VOL75") || p.includes("V75")) return is1S ? "1HZ75V" : "R_75";
  if (p.includes("VOL50") || p.includes("V50")) return is1S ? "1HZ50V" : "R_50";
  if (p.includes("VOL25") || p.includes("V25")) return is1S ? "1HZ25V" : "R_25";
  if (p.includes("VOL10") || p.includes("V10")) return is1S ? "1HZ10V" : "R_10";

  return null;
}

// Deriv WebSocket Connection (Max 3 Seconds)
function fetchDerivWsPrice(symbol: string): Promise<string | null> {
  return new Promise((resolve) => {
    let ws: WebSocket | null = null;
    const timeout = setTimeout(() => {
      if (ws) {
        try { ws.close(); } catch (_) {}
      }
      resolve(null);
    }, 3000);

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
   FOREX / CRYPTO MT5 FETCH
========================================================= */

function getMt5Symbol(appPair: string): string {
  const p = String(appPair || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (p.includes("XAU") || p.includes("GOLD")) return "XAUUSD";
  if (p.includes("BTC")) return "BTCUSD";
  if (p.includes("EUR")) return "EURUSD";
  if (p.includes("GBP")) return "GBPUSD";
  return p;
}

async function fetchMt5Price(accountId: string, appPair: string): Promise<string | null> {
  try {
    const symbol = getMt5Symbol(appPair);
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
   MAIN FETCH & PROCESSOR
========================================================= */

async function fetchAllPrices(pairs: string[]): Promise<Record<string, string>> {
  const prices: Record<string, string> = {};
  const mt5Pairs: string[] = [];

  // Separate Deriv and MT5 pairs completely
  await Promise.all(
    pairs.map(async (pair) => {
      if (isDerivPair(pair)) {
        const derivSymbol = getDerivSymbol(pair);
        if (derivSymbol) {
          const derivPrice = await fetchDerivWsPrice(derivSymbol);
          if (derivPrice) prices[pair] = derivPrice;
        }
      } else {
        mt5Pairs.push(pair);
      }
    })
  );

  // Fetch MT5 ONLY for non-Deriv pairs
  if (mt5Pairs.length > 0) {
    const accountId = await getAccountId();
    if (accountId) {
      await Promise.all(
        mt5Pairs.map(async (pair) => {
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: signals, error } = await supabase
      .from("signals")
      .select("*")
      .eq("published", true);

    if (error || !signals || signals.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No active signals" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uniquePairs = [...new Set(signals.map((s) => s.pair))];
    const prices = await fetchAllPrices(uniquePairs);

    for (const signal of signals) {
      const current = prices[signal.pair];
      if (!current) continue; // Safety Lock: Jab tak Deriv real price na de, update na ho

      const currentPrice = parseFloat(current);
      const isBuy = String(signal.type || "").toLowerCase() === "buy";
      const updates: Record<string, any> = {
        current_price: current,
        updated_at: new Date().toISOString(),
      };

      const isClosed = String(signal.signal_status || "").toLowerCase() === "close" || 
                       String(signal.status || "").toLowerCase() === "close";

      if (!isClosed) {
        const entry = parsePrice(signal.entry || "");
        const sl = parsePrice(signal.sl || "");
        const tp1 = parsePrice(signal.tp1 || "");

        // 1. Check TP1 Hit
        if (!signal.tp1_hit && tp1 > 0) {
          const isTp1Hit = isBuy ? currentPrice >= tp1 : currentPrice <= tp1;
          if (isTp1Hit) {
            updates.tp1_hit = true;
            updates.profit_note = "TP 1 Hit ✅ SL moved to B.E";
            if (entry > 0) updates.sl = String(entry);
          }
        }

        // 2. Check SL Hit
        const targetSl = updates.sl ? parsePrice(updates.sl) : sl;
        if (!signal.sl_hit && targetSl > 0) {
          const isSlHit = isBuy ? currentPrice < targetSl : currentPrice > targetSl;
          if (isSlHit) {
            updates.sl_hit = true;
            updates.signal_status = "close";
            updates.status = "close";
            updates.profit_note = "SL Hit ❌";
          }
        }
      }

      await supabase.from("signals").update(updates).eq("id", signal.id);
    }

    return new Response(JSON.stringify({ success: true, prices }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
