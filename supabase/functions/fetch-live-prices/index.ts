import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PROVISIONING =
  "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";

const DEFAULT_CLIENT_API =
  "https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai";

const KEYS = [
  "METAAPI_TOKEN",
  "MT5_LOGIN",
  "MT5_SERVER",
  "MT5_PASSWORD",
];

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

/* =========================================================
   LOAD CREDENTIALS
========================================================= */

async function loadCredentials() {
  if (Date.now() - credentialsLoadedAt < 30000) return;

  const admin = createClient(
    SUPABASE_URL,
    SERVICE_KEY
  );

  const { data, error } = await admin
    .from("integration_settings")
    .select("key,value")
    .in("key", KEYS);

  if (error) {
    console.error(
      "integration_settings error:",
      error.message
    );
  }

  const values: Record<string, string> = {};

  for (const row of data || []) {
    values[row.key] = String(row.value || "").trim();
  }

  METAAPI_TOKEN =
    values.METAAPI_TOKEN ||
    Deno.env.get("METAAPI_TOKEN")?.trim() ||
    "";

  MT5_LOGIN =
    values.MT5_LOGIN ||
    Deno.env.get("MT5_LOGIN")?.trim() ||
    "";

  MT5_SERVER =
    values.MT5_SERVER ||
    Deno.env.get("MT5_SERVER")?.trim() ||
    "";

  MT5_PASSWORD =
    values.MT5_PASSWORD ||
    Deno.env.get("MT5_PASSWORD")?.trim() ||
    "";

  credentialsLoadedAt = Date.now();
}

/* =========================================================
   GET / CREATE MT5 ACCOUNT
========================================================= */

async function getAccountId(): Promise<string | null> {
  await loadCredentials();

  if (
    !METAAPI_TOKEN ||
    !MT5_LOGIN ||
    !MT5_SERVER
  ) {
    console.error("MT5 credentials incomplete");
    return null;
  }

  if (
    cachedAccountId &&
    Date.now() - cachedAccountAt < 10 * 60 * 1000
  ) {
    return cachedAccountId;
  }

  try {
    const response = await fetch(
      `${PROVISIONING}/users/current/accounts`,
      {
        headers: {
          "auth-token": METAAPI_TOKEN,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return null;
    }

    const raw = await response.json();

    const accounts = Array.isArray(raw)
      ? raw
      : raw?.items || [];

    let account =
      accounts.find(
        (a: any) =>
          String(a.login) === String(MT5_LOGIN) &&
          String(a.server || "").toLowerCase() ===
            String(MT5_SERVER).toLowerCase()
      ) ||
      accounts.find(
        (a: any) =>
          String(a.login) === String(MT5_LOGIN)
      );

    if (!account && MT5_PASSWORD) {
      const createResponse = await fetch(
        `${PROVISIONING}/users/current/accounts`,
        {
          method: "POST",
          headers: {
            "auth-token": METAAPI_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `LiveSignals-${MT5_LOGIN}`,
            type: "cloud",
            login: MT5_LOGIN,
            password: MT5_PASSWORD,
            server: MT5_SERVER,
            platform: "mt5",
            magic: 0,
          }),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!createResponse.ok) {
        return null;
      }

      account = await createResponse.json();
    }

    const accountId =
      account?._id || account?.id;

    if (!accountId) {
      return null;
    }

    const state = String(
      account?.state || ""
    ).toUpperCase();

    if (
      state &&
      state !== "DEPLOYED" &&
      state !== "DEPLOYING"
    ) {
      await fetch(
        `${PROVISIONING}/users/current/accounts/${accountId}/deploy`,
        {
          method: "POST",
          headers: {
            "auth-token": METAAPI_TOKEN,
          },
          signal: AbortSignal.timeout(10000),
        }
      );
    }

    cachedAccountId = accountId;

    cachedRegion =
      account?.region ||
      account?.primaryReplica?.region ||
      null;

    cachedAccountAt = Date.now();

    return accountId;
  } catch (error) {
    console.error(
      "getAccountId error:",
      String(error)
    );
    return null;
  }
}

/* =========================================================
   NORMALIZE SYMBOL
========================================================= */

function normalizeSymbol(value: string): string {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/* =========================================================
   DERIV SYNTHETIC INDICES (VOL / BOOM / CRASH / STEP / JUMP)
========================================================= */

const DERIV_WS_URL =
  "wss://ws.derivws.com/websockets/v3?app_id=1089";

function getDerivSymbol(
  appPair: string
): string | null {
  const n = normalizeSymbol(appPair);

  if (n.includes("BOOM") && n.includes("1000")) {
    return "BOOM1000";
  }

  if (n.includes("BOOM") && n.includes("500")) {
    return "BOOM500";
  }

  if (n.includes("CRASH") && n.includes("1000")) {
    return "CRASH1000";
  }

  if (n.includes("CRASH") && n.includes("500")) {
    return "CRASH500";
  }

  if (n.includes("STEP")) {
    return "stpRNG";
  }

  if (n.includes("JUMP")) {
    if (n.includes("10")) return "JD10";
    if (n.includes("25")) return "JD25";
    if (n.includes("50")) return "JD50";
    if (n.includes("75")) return "JD75";
    if (n.includes("100")) return "JD100";
    return null;
  }

  if (n.includes("VOL")) {
    const oneSecond = n.includes("1S") || n.includes("1SEC");

    if (n.includes("100")) {
      return oneSecond ? "1HZ100V" : "R_100";
    }
    if (n.includes("75")) {
      return oneSecond ? "1HZ75V" : "R_75";
    }
    if (n.includes("50")) {
      return oneSecond ? "1HZ50V" : "R_50";
    }
    if (n.includes("25")) {
      return oneSecond ? "1HZ25V" : "R_25";
    }
    if (n.includes("10")) {
      return oneSecond ? "1HZ10V" : "R_10";
    }
  }

  return null;
}

async function fetchDerivPrice(
  symbol: string
): Promise<string | null> {
  return await new Promise((resolve) => {
    let settled = false;
    let ws: WebSocket;

    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        try {
          ws.close();
        } catch {}
      }
      resolve(value);
    };

    const timer = setTimeout(() => {
      finish(null);
    }, 6000);

    try {
      ws = new WebSocket(DERIV_WS_URL);
    } catch {
      clearTimeout(timer);
      resolve(null);
      return;
    }

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          ticks_history: symbol,
          adjust_start_time: 1,
          count: 1,
          end: "latest",
          start: 1,
          style: "ticks",
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(
          typeof event.data === "string"
            ? event.data
            : "{}"
        );

        if (data?.error) {
          finish(null);
          return;
        }

        const decimals =
          symbol.includes("R_75") || symbol.includes("1HZ75V") ? 4 : 2;

        const prices = data?.history?.prices;

        if (Array.isArray(prices) && prices.length > 0) {
          const price = Number(prices[prices.length - 1]);
          if (price > 0) {
            finish(price.toFixed(decimals));
            return;
          }
        }

        const tickPrice = Number(data?.tick?.quote);
        if (tickPrice > 0) {
          finish(tickPrice.toFixed(decimals));
        }
      } catch {
        finish(null);
      }
    };

    ws.onerror = () => finish(null);
  });
}

/* =========================================================
   FOREX / CRYPTO SYMBOL ALIASES (DERIV EXCLUDED)
========================================================= */

function getSymbolAliases(
  appPair: string
): string[] {
  const n = normalizeSymbol(appPair);

  if (n.includes("XAU") || n.includes("GOLD")) {
    return [
      "XAUUSD",
      "GOLD",
      "XAUUSDM",
      "XAUUSD.A",
      "XAUUSD.M",
    ];
  }

  if (n.includes("XAG") || n.includes("SILVER")) {
    return [
      "XAGUSD",
      "SILVER",
    ];
  }

  const crypto: Record<string, string[]> = {
    BTCUSD: [
      "BTCUSD",
      "BTCUSDT",
      "BTCUSD.M",
      "BTCUSDm",
    ],
    ETHUSD: [
      "ETHUSD",
      "ETHUSDT",
      "ETHUSD.M",
      "ETHUSDm",
    ],
    SOLUSD: [
      "SOLUSD",
      "SOLUSDT",
      "SOLUSD.M",
      "SOLUSDm",
    ],
    XRPUSD: [
      "XRPUSD",
      "XRPUSDT",
      "XRPUSD.M",
      "XRPUSDm",
    ],
    DOGEUSD: [
      "DOGEUSD",
      "DOGEUSDT",
      "DOGEUSD.M",
      "DOGEUSDm",
    ],
  };

  if (crypto[n]) {
    return crypto[n];
  }

  return [n];
}

/* =========================================================
   GET BROKER SYMBOLS
========================================================= */

async function getBrokerSymbols(
  accountId: string
): Promise<string[]> {
  try {
    const response = await fetch(
      `${clientApi()}/users/current/accounts/${accountId}/symbols`,
      {
        headers: {
          "auth-token": METAAPI_TOKEN,
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) return [];

    const raw = await response.json();
    const list = Array.isArray(raw)
      ? raw
      : raw?.symbols ||
        raw?.items ||
        [];

    return list
      .map((s: any) =>
        typeof s === "string"
          ? s
          : s?.symbol || s?.name
      )
      .filter(Boolean);
  } catch {
    return [];
  }
}

/* =========================================================
   FIND BROKER SYMBOL
========================================================= */

async function findBrokerSymbol(
  accountId: string,
  appPair: string,
  brokerSymbols: string[]
): Promise<string | null> {
  const aliases = getSymbolAliases(appPair);

  const normalizedBroker = brokerSymbols.map((symbol) => ({
    original: symbol,
    normalized: normalizeSymbol(symbol),
  }));

  /* EXACT */
  for (const alias of aliases) {
    const wanted = normalizeSymbol(alias);
    const exact = normalizedBroker.find((x) => x.normalized === wanted);
    if (exact) return exact.original;
  }

  /* STARTS WITH */
  for (const alias of aliases) {
    const wanted = normalizeSymbol(alias);
    const match = normalizedBroker.find(
      (x) =>
        x.normalized.startsWith(wanted) || wanted.startsWith(x.normalized)
    );
    if (match) return match.original;
  }

  /* CONTAINS */
  for (const alias of aliases) {
    const wanted = normalizeSymbol(alias);
    if (wanted.length < 4) continue;
    const match = normalizedBroker.find((x) => x.normalized.includes(wanted));
    if (match) return match.original;
  }

  return null;
}

/* =========================================================
   GET PRICE FROM MT5
========================================================= */

async function fetchMt5Price(
  accountId: string,
  symbol: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `${clientApi()}/users/current/accounts/${accountId}/symbols/${encodeURIComponent(
        symbol
      )}/current-price?keepSubscription=true`,
      {
        headers: {
          "auth-token": METAAPI_TOKEN,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const bid = Number(data?.bid);
    const ask = Number(data?.ask);

    const price =
      bid > 0 && ask > 0
        ? (bid + ask) / 2
        : bid > 0
        ? bid
        : ask;

    if (!price || price <= 0) return null;

    const n = normalizeSymbol(symbol);
    let decimals = 5;

    if (n.includes("JPY")) {
      decimals = 3;
    } else if (n.includes("XAU") || n.includes("GOLD")) {
      decimals = 2;
    } else if (n.includes("XAG") || n.includes("SILVER")) {
      decimals = 3;
    } else if (
      n.includes("BTC") ||
      n.includes("ETH") ||
      n.includes("SOL") ||
      n.includes("XRP") ||
      n.includes("DOGE")
    ) {
      decimals = 2;
    }

    return price.toFixed(decimals);
  } catch {
    return null;
  }
}

/* =========================================================
   FETCH ALL (STRICT DERIV SEPARATION)
========================================================= */

async function fetchAllPrices(
  pairs: string[]
): Promise<Record<string, string>> {
  const prices: Record<string, string> = {};

  const derivPairs: { pair: string; symbol: string }[] = [];
  const remainingPairs: string[] = [];

  for (const pair of pairs) {
    const derivSymbol = getDerivSymbol(pair);

    if (derivSymbol) {
      derivPairs.push({ pair, symbol: derivSymbol });
    } else {
      remainingPairs.push(pair);
    }
  }

  // 1. Deriv Real-time Fetch
  if (derivPairs.length > 0) {
    await Promise.all(
      derivPairs.map(async ({ pair, symbol }) => {
        const price = await fetchDerivPrice(symbol);
        if (price) {
          prices[pair] = price;
        }
      })
    );
  }

  // Strictly return if no Forex/Crypto pairs requested
  if (remainingPairs.length === 0) {
    return prices;
  }

  // 2. MT5 Fetch ONLY for non-Deriv Pairs
  const accountId = await getAccountId();
  if (!accountId) return prices;

  const brokerSymbols = await getBrokerSymbols(accountId);
  if (!brokerSymbols.length) return prices;

  for (const pair of remainingPairs) {
    const symbol = await findBrokerSymbol(
      accountId,
      pair,
      brokerSymbols
    );

    if (!symbol) continue;

    const price = await fetchMt5Price(accountId, symbol);
    if (price) {
      prices[pair] = price;
    }
  }

  return prices;
}

/* =========================================================
   PARSE PRICE
========================================================= */

function parsePrice(value: string): number {
  if (!value) return 0;
  const cleaned = String(value).replace(/[^\d.\-]/g, "");
  return parseFloat(cleaned) || 0;
}

/* =========================================================
   TELEGRAM NOTIFICATION
========================================================= */

async function notifyTelegramUpdate(
  signal: Record<string, any>,
  updateType: string
): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/telegram-signal-post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      body: JSON.stringify({
        action: "update",
        update_type: updateType,
        signal: {
          pair: signal.pair,
          type: signal.type,
          entry: signal.entry,
          tp1: signal.tp1,
          tp2: signal.tp2,
          tp3: signal.tp3,
          tp4: signal.tp4,
          sl: signal.sl,
          profit_note: signal.profit_note,
          tp1_hit: signal.tp1_hit,
          tp2_hit: signal.tp2_hit,
          tp3_hit: signal.tp3_hit,
          tp4_hit: signal.tp4_hit,
          sl_hit: signal.sl_hit,
        },
      }),
    });
  } catch (error) {
    console.error(`Telegram notify error ${signal.pair}:`, String(error));
  }
}

/* =========================================================
   MAIN EDGE FUNCTION SERVER
========================================================= */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const url = new URL(req.url);
    let pairs: string[] = [];

    const pairsParam = url.searchParams.get("pairs");
    if (pairsParam) {
      pairs = pairsParam.split(",").map((x) => x.trim()).filter(Boolean);
    } else if (req.method === "POST") {
      try {
        const body = await req.json();
        if (Array.isArray(body?.pairs)) {
          pairs = body.pairs.map((x: any) => String(x)).filter(Boolean);
        }
      } catch {}
    }

    if (pairs.length > 0) {
      const prices = await fetchAllPrices(pairs);
      return new Response(
        JSON.stringify({
          success: Object.keys(prices).length > 0,
          source: "LIVE_SYNC",
          prices,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /* =====================================================
       DATABASE SIGNALS PROCESS & REAL-TIME SYNC
    ===================================================== */

    const { data: signals, error } = await supabase
      .from("signals")
      .select(
        "id,pair,type,entry,tp1,tp2,tp3,tp4,sl,tp1_hit,tp2_hit,tp3_hit,tp4_hit,sl_hit,status,signal_status,entry_mode,limit_entry_price,is_activated,published"
      )
      .eq("published", true)
      .not("signal_status", "ilike", "close");

    if (error) throw error;

    if (!signals || signals.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active signals",
          prices: {},
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const uniquePairs = [...new Set(signals.map((s) => s.pair))];
    const prices = await fetchAllPrices(uniquePairs);

    let updatedCount = 0;
    let activatedCount = 0;
    const telegramPromises: Promise<void>[] = [];

    for (const signal of signals) {
      const current = prices[signal.pair];
      if (!current) continue;

      const currentPrice = parseFloat(current);
      const updates: Record<string, any> = {
        current_price: current,
        updated_at: new Date().toISOString(),
      };

      const runningState: Record<string, any> = { ...signal };
      const hitEvents: { type: string; snapshot: Record<string, any> }[] = [];

      const isBuy = String(signal.type || "").toLowerCase() === "buy";
      const lifecycle = String(
        signal.signal_status || signal.status || ""
      ).toLowerCase();

      const isLimit = signal.entry_mode === "limit";
      const isPending = lifecycle === "pending";
      const limit = typeof signal.limit_entry_price === "number" ? signal.limit_entry_price : 0;

      // Limit Order Activation
      if (isLimit && isPending && limit > 0) {
        const activate = isBuy ? currentPrice <= limit : currentPrice >= limit;
        if (activate) {
          updates.signal_status = "open";
          updates.status = "open";
          updates.is_activated = true;
          updates.activated_at = new Date().toISOString();
          activatedCount++;
        }
      }

      const isOpen = lifecycle === "open" || updates.signal_status === "open";

      if (!isOpen) {
        await supabase.from("signals").update(updates).eq("id", signal.id);
        updatedCount++;
        continue;
      }

      const entry = parsePrice(signal.entry || "");

      /* TP1 */
      if (!signal.tp1_hit && signal.tp1) {
        const tp = parsePrice(signal.tp1);
        if (tp > 0 && (isBuy ? currentPrice >= tp : currentPrice <= tp)) {
          updates.tp1_hit = true;
          updates.profit_note = "TP 1 Hit ✅ SL moved to B.E";
          if (entry > 0) updates.sl = String(entry);

          runningState.tp1_hit = true;
          runningState.profit_note = updates.profit_note;
          if (updates.sl) runningState.sl = updates.sl;

          hitEvents.push({ type: "tp1_hit", snapshot: { ...runningState } });
        }
      }

      /* TP2 */
      if (!signal.tp2_hit && signal.tp2) {
        const tp = parsePrice(signal.tp2);
        if (tp > 0 && (isBuy ? currentPrice >= tp : currentPrice <= tp)) {
          updates.tp2_hit = true;
          updates.profit_note = "TP 2 Cleared! Secure More Profits 💰";
          runningState.tp2_hit = true;
          runningState.profit_note = updates.profit_note;

          hitEvents.push({ type: "tp2_hit", snapshot: { ...runningState } });
        }
      }

      /* TP3 */
      if (!signal.tp3_hit && signal.tp3) {
        const tp = parsePrice(signal.tp3);
        if (tp > 0 && (isBuy ? currentPrice >= tp : currentPrice <= tp)) {
          updates.tp3_hit = true;
          updates.signal_status = "close";
          updates.status = "close";
          updates.profit_note = "TP 3 Final Target Hit! 🎊 Maximum Profit Secured ✅";
          runningState.tp3_hit = true;
          runningState.profit_note = updates.profit_note;

          hitEvents.push({ type: "tp3_hit", snapshot: { ...runningState } });
        }
      }

      /* TP4 */
      if (!signal.tp4_hit && signal.tp4) {
        const tp = parsePrice(signal.tp4);
        if (tp > 0 && (isBuy ? currentPrice >= tp : currentPrice <= tp)) {
          updates.tp4_hit = true;
          updates.profit_note = "TP 4 Hit 🚀";
          runningState.tp4_hit = true;
          runningState.profit_note = updates.profit_note;

          hitEvents.push({ type: "tp4_hit", snapshot: { ...runningState } });
        }
      }

      /* SL */
      const tp1Hit = signal.tp1_hit || updates.tp1_hit;
      if (!signal.sl_hit && signal.sl && !tp1Hit) {
        const sl = parsePrice(signal.sl);
        if (sl > 0 && (isBuy ? currentPrice <= sl : currentPrice >= sl)) {
          updates.sl_hit = true;
          updates.signal_status = "close";
          updates.status = "close";
          updates.profit_note = signal.tp1_hit
            ? "Break-Even Exit ⚪ (TP1 was already secured)"
            : "SL Hit ❌";

          runningState.sl_hit = true;
          runningState.profit_note = updates.profit_note;

          hitEvents.push({ type: "sl_hit", snapshot: { ...runningState } });
        }
      }

      await supabase.from("signals").update(updates).eq("id", signal.id);
      updatedCount++;

      for (const event of hitEvents) {
        telegramPromises.push(
          notifyTelegramUpdate(event.snapshot, event.type)
        );
      }
    }

    await Promise.allSettled(telegramPromises);

    return new Response(
      JSON.stringify({
        success: true,
        source: "LIVE_SYNC",
        pricesUpdated: updatedCount,
        limitOrdersActivated: activatedCount,
        pairs: Object.keys(prices),
        prices,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("fetch-live-prices error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Live price service failed",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
