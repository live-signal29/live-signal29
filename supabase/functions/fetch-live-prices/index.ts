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

  console.log(
    "Credentials:",
    Boolean(METAAPI_TOKEN),
    Boolean(MT5_LOGIN),
    Boolean(MT5_SERVER),
    Boolean(MT5_PASSWORD)
  );
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
      console.error(
        "Account list failed:",
        response.status,
        (await response.text()).slice(0, 500)
      );
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
      console.log("Creating MetaApi account...");

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
        console.error(
          "Account creation failed:",
          createResponse.status,
          (await createResponse.text()).slice(0, 500)
        );
        return null;
      }

      account = await createResponse.json();
    }

    const accountId =
      account?._id || account?.id;

    if (!accountId) {
      console.error("No MetaApi account ID");
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
      const deploy = await fetch(
        `${PROVISIONING}/users/current/accounts/${accountId}/deploy`,
        {
          method: "POST",
          headers: {
            "auth-token": METAAPI_TOKEN,
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      console.log(
        "Deploy status:",
        deploy.status
      );
    }

    cachedAccountId = accountId;

    cachedRegion =
      account?.region ||
      account?.primaryReplica?.region ||
      null;

    cachedAccountAt = Date.now();

    console.log(
      "MT5 account ready:",
      accountId,
      cachedRegion || "default"
    );

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
   SYMBOL ALIASES
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

  if (
    n.includes("BOOM") &&
    n.includes("1000")
  ) {
    return [
      "BOOM1000",
      "BOOM1000INDEX",
      "BOOM1000INDEX.M",
      "BOOM1000.M",
    ];
  }

  if (
    n.includes("BOOM") &&
    n.includes("500")
  ) {
    return [
      "BOOM500",
      "BOOM500INDEX",
      "BOOM500INDEX.M",
      "BOOM500.M",
    ];
  }

  if (
    n.includes("CRASH") &&
    n.includes("1000")
  ) {
    return [
      "CRASH1000",
      "CRASH1000INDEX",
      "CRASH1000INDEX.M",
      "CRASH1000.M",
    ];
  }

  if (
    n.includes("CRASH") &&
    n.includes("500")
  ) {
    return [
      "CRASH500",
      "CRASH500INDEX",
      "CRASH500INDEX.M",
      "CRASH500.M",
    ];
  }

  if (
    n.includes("VOL") &&
    n.includes("75")
  ) {
    return [
      "VOLATILITY75INDEX",
      "VOLATILITY75",
      "VOL75",
      "V75",
      "VOLATILITY75INDEX.M",
      "VOL75.M",
    ];
  }

  if (
    n.includes("VOL") &&
    n.includes("100")
  ) {
    return [
      "VOLATILITY100INDEX",
      "VOLATILITY100",
      "VOL100",
      "V100",
    ];
  }

  if (
    n.includes("VOL") &&
    n.includes("50")
  ) {
    return [
      "VOLATILITY50INDEX",
      "VOLATILITY50",
      "VOL50",
      "V50",
    ];
  }

  if (
    n.includes("VOL") &&
    n.includes("25")
  ) {
    return [
      "VOLATILITY25INDEX",
      "VOLATILITY25",
      "VOL25",
      "V25",
    ];
  }

  if (n.includes("STEP")) {
    return [
      "STEPINDEX",
      "STEP",
    ];
  }

  if (n.includes("JUMP")) {
    return [
      n,
      "JUMP",
    ];
  }

  if (/^[A-Z]{6}$/.test(n)) {
    return [n];
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

    if (!response.ok) {
      console.error(
        "Broker symbols failed:",
        response.status
      );
      return [];
    }

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
  } catch (error) {
    console.error(
      "getBrokerSymbols error:",
      String(error)
    );
    return [];
  }
}

/* =========================================================
   FIND BROKER SYMBOL - STRONG MATCHING
========================================================= */

async function findBrokerSymbol(
  accountId: string,
  appPair: string,
  brokerSymbols: string[]
): Promise<string | null> {
  const aliases =
    getSymbolAliases(appPair);

  const normalizedBroker =
    brokerSymbols.map((symbol) => ({
      original: symbol,
      normalized: normalizeSymbol(symbol),
    }));

  /* EXACT */
  for (const alias of aliases) {
    const wanted = normalizeSymbol(alias);

    const exact =
      normalizedBroker.find(
        (x) =>
          x.normalized === wanted
      );

    if (exact) {
      console.log(
        `SYMBOL EXACT: ${appPair} -> ${exact.original}`
      );
      return exact.original;
    }
  }

  /* STARTS WITH */
  for (const alias of aliases) {
    const wanted = normalizeSymbol(alias);

    const match =
      normalizedBroker.find(
        (x) =>
          x.normalized.startsWith(wanted) ||
          wanted.startsWith(x.normalized)
      );

    if (match) {
      console.log(
        `SYMBOL PREFIX: ${appPair} -> ${match.original}`
      );
      return match.original;
    }
  }

  /* CONTAINS */
  for (const alias of aliases) {
    const wanted = normalizeSymbol(alias);

    if (wanted.length < 4) continue;

    const match =
      normalizedBroker.find(
        (x) =>
          x.normalized.includes(wanted)
      );

    if (match) {
      console.log(
        `SYMBOL CONTAINS: ${appPair} -> ${match.original}`
      );
      return match.original;
    }
  }

  console.log(
    `NO BROKER SYMBOL: ${appPair}`,
    aliases
  );

  return null;
}

/* =========================================================
   GET PRICE
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

    if (!response.ok) {
      console.error(
        `Price failed ${symbol}:`,
        response.status
      );
      return null;
    }

    const data = await response.json();

    const bid = Number(data?.bid);
    const ask = Number(data?.ask);

    const price =
      bid > 0 && ask > 0
        ? (bid + ask) / 2
        : bid > 0
        ? bid
        : ask;

    if (!price || price <= 0) {
      return null;
    }

    const n = normalizeSymbol(symbol);

    let decimals = 5;

    if (n.includes("JPY")) {
      decimals = 3;
    } else if (
      n.includes("XAU") ||
      n.includes("GOLD")
    ) {
      decimals = 2;
    } else if (
      n.includes("XAG") ||
      n.includes("SILVER")
    ) {
      decimals = 3;
    } else if (
      n.includes("BTC") ||
      n.includes("ETH") ||
      n.includes("SOL") ||
      n.includes("XRP") ||
      n.includes("DOGE") ||
      n.includes("VOL") ||
      n.includes("BOOM") ||
      n.includes("CRASH") ||
      n.includes("STEP") ||
      n.includes("JUMP")
    ) {
      decimals = 2;
    }

    console.log(
      `REAL MT5 PRICE: ${symbol} -> ${price}`
    );

    return price.toFixed(decimals);
  } catch (error) {
    console.error(
      `Price error ${symbol}:`,
      String(error)
    );
    return null;
  }
}

/* =========================================================
   FETCH ALL
========================================================= */

async function fetchAllPrices(
  pairs: string[]
): Promise<Record<string, string>> {
  const prices: Record<string, string> = {};

  const accountId =
    await getAccountId();

  if (!accountId) {
    return prices;
  }

  const brokerSymbols =
    await getBrokerSymbols(
      accountId
    );

  if (!brokerSymbols.length) {
    console.error(
      "No broker symbols received"
    );
    return prices;
  }

  console.log(
    `Broker symbols loaded: ${brokerSymbols.length}`
  );

  for (const pair of pairs) {
    const symbol =
      await findBrokerSymbol(
        accountId,
        pair,
        brokerSymbols
      );

    if (!symbol) {
      console.log(
        `Skipping ${pair}: broker symbol not found`
      );
      continue;
    }

    const price =
      await fetchMt5Price(
        accountId,
        symbol
      );

    if (price) {
      prices[pair] = price;
    }
  }

  console.log(
    "FINAL MT5 PRICES:",
    JSON.stringify(prices)
  );

  return prices;
}

/* =========================================================
   PARSE PRICE
========================================================= */

function parsePrice(
  value: string
): number {
  if (!value) return 0;

  const cleaned =
    String(value).replace(
      /[^\d.\-]/g,
      ""
    );

  return parseFloat(cleaned) || 0;
}

/* =========================================================
   TELEGRAM TP/SL UPDATE NOTIFICATION
========================================================= */

async function notifyTelegramUpdate(
  signal: Record<string, any>,
  updateType: string
): Promise<void> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/telegram-signal-post`,
      {
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
      }
    );

    const result = await response.json();
    console.log(
      `Telegram update (${updateType}) for ${signal.pair}:`,
      JSON.stringify(result)
    );
  } catch (error) {
    console.error(
      `Telegram update notify error for ${signal.pair}:`,
      String(error)
    );
  }
}

/* =========================================================
   SERVER
========================================================= */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const supabase =
      createClient(
        SUPABASE_URL,
        SERVICE_KEY
      );

    const url =
      new URL(req.url);

    let pairs: string[] = [];

    const pairsParam =
      url.searchParams.get(
        "pairs"
      );

    if (pairsParam) {
      pairs = pairsParam
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    } else if (
      req.method === "POST"
    ) {
      try {
        const body =
          await req.json();

        if (
          Array.isArray(
            body?.pairs
          )
        ) {
          pairs =
            body.pairs
              .map((x: any) =>
                String(x)
              )
              .filter(Boolean);
        }
      } catch {}
    }

    /* =====================================================
       PRICE REQUEST
    ===================================================== */

    if (pairs.length > 0) {
      const prices =
        await fetchAllPrices(
          pairs
        );

      return new Response(
        JSON.stringify({
          success:
            Object.keys(prices)
              .length > 0,
          source: "MT5",
          prices,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    /* =====================================================
       UPDATE ACTIVE SIGNALS
    ===================================================== */

    const { data: signals, error } =
      await supabase
        .from("signals")
        .select(
          "id,pair,type,entry,tp1,tp2,tp3,tp4,sl,tp1_hit,tp2_hit,tp3_hit,tp4_hit,sl_hit,status,signal_status,entry_mode,limit_entry_price,is_activated,published"
        )
        .eq("published", true)
        .not(
          "signal_status",
          "ilike",
          "close"
        );

    if (error) {
      throw error;
    }

    if (
      !signals ||
      signals.length === 0
    ) {
      return new Response(
        JSON.stringify({
          success: true,
          message:
            "No active signals",
          source: "MT5",
          prices: {},
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    const uniquePairs =
      [
        ...new Set(
          signals.map(
            (s) => s.pair
          )
        ),
      ];

    const prices =
      await fetchAllPrices(
        uniquePairs
      );

    let updatedCount = 0;
    let activatedCount = 0;
    const telegramPromises: Promise<void>[] = [];

    for (const signal of signals) {
      const current =
        prices[signal.pair];

      if (!current) continue;

      const currentPrice =
        parseFloat(current);

      const updates: Record<
        string,
        any
      > = {
        current_price: current,
      };

      const hitEvents: string[] = [];

      const isBuy =
        String(signal.type || "")
          .toLowerCase() ===
        "buy";

      const lifecycle =
        String(
          signal.signal_status ||
            signal.status ||
            ""
        ).toLowerCase();

      const isLimit =
        signal.entry_mode ===
        "limit";

      const isPending =
        lifecycle === "pending";

      const limit =
        typeof signal.limit_entry_price ===
        "number"
          ? signal.limit_entry_price
          : 0;

      if (
        isLimit &&
        isPending &&
        limit > 0
      ) {
        const activate =
          isBuy
            ? currentPrice <= limit
            : currentPrice >= limit;

        if (activate) {
          updates.signal_status =
            "open";
          updates.status = "open";
          updates.is_activated = true;
          updates.activated_at =
            new Date().toISOString();

          activatedCount++;
        }
      }

      const isOpen =
        lifecycle === "open" ||
        updates.signal_status ===
          "open";

      if (!isOpen) {
        await supabase
          .from("signals")
          .update(updates)
          .eq("id", signal.id);

        updatedCount++;
        continue;
      }

      const entry =
        parsePrice(
          signal.entry || ""
        );

      /* TP1 */
      if (
        !signal.tp1_hit &&
        signal.tp1
      ) {
        const tp =
          parsePrice(signal.tp1);

        if (
          tp > 0 &&
          (isBuy
            ? currentPrice >= tp
            : currentPrice <= tp)
        ) {
          updates.tp1_hit = true;
          updates.profit_note =
            "TP 1 Hit ✅ SL moved to B.E";

          hitEvents.push("tp1_hit");

          if (entry > 0) {
            updates.sl =
              String(entry);
          }
        }
      }

      /* TP2 */
      if (
        !signal.tp2_hit &&
        signal.tp2
      ) {
        const tp =
          parsePrice(signal.tp2);

        if (
          tp > 0 &&
          (isBuy
            ? currentPrice >= tp
            : currentPrice <= tp)
        ) {
          updates.tp2_hit = true;
          updates.profit_note =
            "TP 2 Cleared! Secure More Profits 💰";

          hitEvents.push("tp2_hit");
        }
      }

      /* TP3 */
      if (
        !signal.tp3_hit &&
        signal.tp3
      ) {
        const tp =
          parsePrice(signal.tp3);

        if (
          tp > 0 &&
          (isBuy
            ? currentPrice >= tp
            : currentPrice <= tp)
        ) {
          updates.tp3_hit = true;
          updates.signal_status =
            "close";
          updates.status = "close";
          updates.profit_note =
            "TP 3 Final Target Hit! 🎊 Maximum Profit Secured ✅";

          hitEvents.push("tp3_hit");
        }
      }

      /* TP4 */
      if (
        !signal.tp4_hit &&
        signal.tp4
      ) {
        const tp =
          parsePrice(signal.tp4);

        if (
          tp > 0 &&
          (isBuy
            ? currentPrice >= tp
            : currentPrice <= tp)
        ) {
          updates.tp4_hit = true;
          updates.profit_note =
            "TP 4 Hit 🚀";

          hitEvents.push("tp4_hit");
        }
      }

      /* SL */
      const tp1Hit =
        signal.tp1_hit ||
        updates.tp1_hit;

      if (
        !signal.sl_hit &&
        signal.sl &&
        !tp1Hit
      ) {
        const sl =
          parsePrice(signal.sl);

        if (
          sl > 0 &&
          (isBuy
            ? currentPrice <= sl
            : currentPrice >= sl)
        ) {
          updates.sl_hit = true;
          updates.signal_status =
            "close";
          updates.status = "close";
          updates.profit_note =
            signal.tp1_hit
              ? "Break-Even Exit ⚪ (TP1 was already secured)"
              : "SL Hit ❌";

          hitEvents.push("sl_hit");
        }
      }

      await supabase
        .from("signals")
        .update(updates)
        .eq("id", signal.id);

      updatedCount++;

      // Post every newly-hit TP/SL level to Telegram (one message per
      // event, using the latest values so SL-moved-to-B.E after TP1
      // shows correctly).
      for (const eventType of hitEvents) {
        telegramPromises.push(
          notifyTelegramUpdate(
            { ...signal, ...updates },
            eventType
          )
        );
      }
    }

    await Promise.allSettled(telegramPromises);

    return new Response(
      JSON.stringify({
        success: true,
        source: "MT5",
        pricesUpdated:
          updatedCount,
        limitOrdersActivated:
          activatedCount,
        pairs:
          Object.keys(prices),
        prices,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "fetch-live-prices error:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        source: "MT5",
        error:
          error instanceof Error
            ? error.message
            : "MT5 live price service failed",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  }
});
