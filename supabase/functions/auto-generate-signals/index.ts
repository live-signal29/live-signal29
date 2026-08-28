import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PriceData {
  price: number;
  high: number;
  low: number;
}

interface SignalConfig {
  pair: string;
  category: string;
  mainCategory: string;
  subCategory: string;
  price: PriceData;
  pipMultiplier: number;
  decimals: number;
  thresholdPct: number;
}

/* =========================================================
   MT5 LIVE PRICES
========================================================= */

async function fetchMT5Prices(
  pairs: string[],
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/fetch-live-prices?pairs=${encodeURIComponent(
        pairs.join(",")
      )}`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      }
    );

    if (!response.ok) {
      console.error("MT5 price endpoint failed:", response.status);
      return result;
    }

    const json = await response.json();
    const prices = json?.prices || {};

    for (const pair of pairs) {
      const value = prices[pair];
      const price = value ? parseFloat(String(value)) : NaN;

      if (Number.isFinite(price) && price > 0) {
        result[pair] = price;
      }
    }

    for (const key of Object.keys(prices)) {
      const normalized = String(key)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

      const value = parseFloat(String(prices[key]));

      if (!Number.isFinite(value) || value <= 0) continue;

      if (normalized.includes("XAUUSD") || normalized === "GOLD") {
        result["XAU/USD (Gold)"] = value;
      }

      if (normalized.includes("XAGUSD") || normalized === "SILVER") {
        result["XAG/USD (Silver)"] = value;
      }

      if (
        normalized.includes("US30") ||
        normalized.includes("DJ30") ||
        normalized.includes("DOW")
      ) {
        result["US30"] = value;
      }

      if (
        normalized.includes("NASDAQ") ||
        normalized.includes("NAS100") ||
        normalized.includes("USTEC")
      ) {
        result["NASDAQ"] = value;
      }

      if (
        normalized.includes("SP500") ||
        normalized.includes("US500") ||
        normalized.includes("SPX")
      ) {
        result["S&P500"] = value;
      }

      if (normalized.includes("VOL75")) {
        result["VOL 75"] = value;
      }

      if (normalized.includes("VOL100")) {
        result["VOL 100"] = value;
      }

      if (normalized.includes("BOOM1000")) {
        result["BOOM 1000"] = value;
      }

      if (normalized.includes("CRASH1000")) {
        result["CRASH 1000"] = value;
      }

      if (normalized.includes("BOOM500")) {
        result["BOOM 500"] = value;
      }
    }
  } catch (error) {
    console.error("MT5 fetch error:", String(error));
  }

  return result;
}

/* =========================================================
   HELPERS
========================================================= */

function pick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function rand(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

/* =========================================================
   ANALYSIS
========================================================= */

const buyReasons = [
  "Demand zone bounce with bullish confirmation",
  "Trendline support holding",
  "Double bottom formation",
  "Bullish order block retest",
  "Smart Money demand zone confirmed",
  "Bullish market structure",
  "Support zone reaction",
  "Liquidity sweep followed by bullish confirmation",
  "Fair Value Gap bullish reaction",
];

const sellReasons = [
  "Supply zone rejection",
  "Resistance rejection",
  "Bearish market structure",
  "Bearish order block retest",
  "Smart Money supply zone confirmed",
  "Failed breakout",
  "Liquidity sweep followed by bearish confirmation",
  "Fair Value Gap bearish reaction",
];

/* =========================================================
   GENERATE SIGNAL
========================================================= */

function generateSignal(config: SignalConfig) {
  const {
    pair,
    category,
    mainCategory,
    subCategory,
    price,
    pipMultiplier,
    decimals,
  } = config;

  const isBuy = Math.random() < 0.5;
  const type = isBuy ? "Buy" : "Sell";

  const isGold = pair === "XAU/USD (Gold)";
  const isSilver = pair === "XAG/USD (Silver)";
  const isIndex =
    pair === "US30" ||
    pair === "NASDAQ" ||
    pair === "S&P500";

  const isVol75 = pair === "VOL 75";
  const isDeriv = category === "DERIV";

  const spread = Math.max(
    price.high - price.low,
    pipMultiplier * 20
  );

  const offset = rand(
    -spread * 0.03,
    spread * 0.03
  );

  const entry = Number(
    (price.price + offset).toFixed(decimals)
  );

  let slMult: number;
  let tp1Mult: number;
  let tp2Mult: number;
  let tp3Mult: number;

  if (isGold) {
    slMult = rand(25, 45);
    tp1Mult = rand(35, 60);
    tp2Mult = rand(65, 100);
    tp3Mult = rand(110, 160);
  } else if (isSilver) {
    slMult = rand(18, 30);
    tp1Mult = rand(28, 45);
    tp2Mult = rand(50, 75);
    tp3Mult = rand(85, 120);
  } else if (isIndex) {
    slMult = rand(20, 35);
    tp1Mult = rand(30, 50);
    tp2Mult = rand(55, 85);
    tp3Mult = rand(90, 130);
  } else if (isVol75) {
    slMult = rand(150, 250);
    tp1Mult = rand(150, 250);
    tp2Mult = rand(300, 450);
    tp3Mult = rand(500, 700);
  } else if (isDeriv) {
    slMult = rand(40, 80);
    tp1Mult = rand(40, 80);
    tp2Mult = rand(90, 150);
    tp3Mult = rand(160, 250);
  } else {
    slMult = rand(12, 20);
    tp1Mult = rand(15, 25);
    tp2Mult = rand(30, 45);
    tp3Mult = rand(50, 75);
  }

  const slDistance = slMult * pipMultiplier;
  const tp1Distance = tp1Mult * pipMultiplier;
  const tp2Distance = tp2Mult * pipMultiplier;
  const tp3Distance = tp3Mult * pipMultiplier;

  const sl = Number(
    (
      isBuy
        ? entry - slDistance
        : entry + slDistance
    ).toFixed(decimals)
  );

  const tp1 = Number(
    (
      isBuy
        ? entry + tp1Distance
        : entry - tp1Distance
    ).toFixed(decimals)
  );

  const tp2 = Number(
    (
      isBuy
        ? entry + tp2Distance
        : entry - tp2Distance
    ).toFixed(decimals)
  );

  const tp3 = Number(
    (
      isBuy
        ? entry + tp3Distance
        : entry - tp3Distance
    ).toFixed(decimals)
  );

  const now = new Date().toISOString();

  return {
    pair,
    type,
    category,
    main_category: mainCategory,
    sub_category: subCategory,

    entry: String(entry),
    tp1: String(tp1),
    tp2: String(tp2),
    tp3: String(tp3),
    sl: String(sl),

    status: "open",
    signal_status: "open",

    is_premium: Math.random() < 0.2,
    is_activated: true,
    activated_at: now,
    entry_mode: "market",

    signal_type: pick([
      "Scalping",
      "Intraday",
      "Swing",
    ]),

    risk_level:
      isVol75 || isIndex
        ? "High"
        : pick(["Low", "Medium"]),

    analysis_reason: isBuy
      ? pick(buyReasons)
      : pick(sellReasons),

    published: true,
    created_at: now,

    tp1_hit: false,
    tp2_hit: false,
    tp3_hit: false,
  };
}

/* =========================================================
   CHECK PAIR
========================================================= */

async function evaluatePair(
  supabase: ReturnType<typeof createClient>,
  pair: string,
  currentPrice: number,
  thresholdPct: number
) {
  const { data: active } = await supabase
    .from("signals")
    .select("id")
    .eq("pair", pair)
    .eq("signal_status", "open")
    .limit(1)
    .maybeSingle();

  if (active) {
    return {
      generate: false,
      reason: "signal_still_open",
    };
  }

  const { data: last } = await supabase
    .from("signals")
    .select("entry,created_at")
    .eq("pair", pair)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (!last?.entry) {
    return {
      generate: true,
      reason: "no_prior_signal",
    };
  }

  const COOLDOWN_MINUTES = 60;

  const lastCreatedAt = last.created_at
    ? new Date(last.created_at).getTime()
    : 0;

  const minutesSinceLast =
    (Date.now() - lastCreatedAt) / 60000;

  if (
    lastCreatedAt &&
    minutesSinceLast < COOLDOWN_MINUTES
  ) {
    return {
      generate: false,
      reason: "cooldown",
      minutesSinceLast: Number(
        minutesSinceLast.toFixed(1)
      ),
    };
  }

  const lastPrice = parseFloat(
    String(last.entry)
  );

  if (
    !Number.isFinite(lastPrice) ||
    lastPrice <= 0
  ) {
    return {
      generate: true,
      reason: "invalid_entry",
    };
  }

  const move =
    Math.abs(
      (currentPrice - lastPrice) /
        lastPrice
    ) * 100;

  return {
    generate: true,
    reason:
      move >= thresholdPct
        ? "movement_detected"
        : "hourly_refresh",
    pctMove: Number(move.toFixed(4)),
  };
}

/* =========================================================
   TELEGRAM POST
========================================================= */

async function postTelegramSignal(
  supabaseUrl: string,
  serviceRoleKey: string,
  signal: any
) {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/telegram-signal-post`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signal,
          action: "new_signal",
        }),
      }
    );

    const text = await response.text();

    if (!response.ok) {
      console.error(
        "Telegram signal post failed:",
        response.status,
        text
      );

      return {
        success: false,
        status: response.status,
        response: text,
      };
    }

    console.log(
      "Telegram signal posted:",
      text
    );

    return {
      success: true,
      response: text,
    };
  } catch (error) {
    console.error(
      "Telegram trigger error:",
      String(error)
    );

    return {
      success: false,
      response: String(error),
    };
  }
}

/* =========================================================
   MAIN
========================================================= */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL")!;

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      )!;

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    /* =====================================================
       DERIV DAILY LIMIT
    ===================================================== */

    const todayStart = new Date();

    todayStart.setUTCHours(
      0,
      0,
      0,
      0
    );

    const {
      count: derivCount,
    } = await supabase
      .from("signals")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("category", "DERIV")
      .gte(
        "created_at",
        todayStart.toISOString()
      );

    const allowDeriv =
      (derivCount || 0) < 5;

    /* =====================================================
       PAIRS
    ===================================================== */

    const commodities = [
      "XAU/USD (Gold)",
      "XAG/USD (Silver)",
      "US30",
      "NASDAQ",
      "S&P500",
    ];

    const forex = [
      "EUR/USD",
      "GBP/USD",
      "USD/JPY",
      "AUD/USD",
      "GBP/JPY",
      "USD/CAD",
    ];

    const crypto = [
      "BTC/USD",
      "ETH/USD",
      "SOL/USD",
    ];

    const deriv = allowDeriv
      ? [
          "BOOM 1000",
          "CRASH 1000",
          "VOL 75",
          "BOOM 500",
          "VOL 100",
        ]
      : [];

    const allPairs = [
      ...commodities,
      ...forex,
      ...crypto,
      ...deriv,
    ];

    /* =====================================================
       MT5 PRICES
    ===================================================== */

    const mt5 = await fetchMT5Prices(
      allPairs,
      supabaseUrl,
      serviceRoleKey
    );

    /* =====================================================
       BUILD CANDIDATES
    ===================================================== */

    const candidates: SignalConfig[] = [];

    for (const pair of commodities) {
      if (!mt5[pair]) continue;

      const p = mt5[pair];

      const isGold =
        pair === "XAU/USD (Gold)";

      const isSilver =
        pair === "XAG/USD (Silver)";

      const isIndex =
        pair === "US30" ||
        pair === "NASDAQ" ||
        pair === "S&P500";

      candidates.push({
        pair,
        category: "COMMODITIES",
        mainCategory: "COMMODITIES",
        subCategory: pair,

        price: {
          price: p,

          high:
            p +
            (
              isGold
                ? 10
                : isSilver
                ? 1
                : isIndex
                ? 100
                : 1
            ),

          low:
            p -
            (
              isGold
                ? 10
                : isSilver
                ? 1
                : isIndex
                ? 100
                : 1
            ),
        },

        pipMultiplier:
          isGold
            ? 1
            : isSilver
            ? 0.05
            : 1,

        decimals:
          isSilver
            ? 3
            : 2,

        thresholdPct:
          isGold
            ? 0.03
            : 0.05,
      });
    }

    for (const pair of forex) {
      if (!mt5[pair]) continue;

      const p = mt5[pair];
      const isJPY =
        pair.includes("JPY");

      candidates.push({
        pair,
        category: "FOREX",
        mainCategory: "FOREX",
        subCategory: pair,

        price: {
          price: p,
          high:
            p +
            (isJPY
              ? 0.4
              : 0.004),
          low:
            p -
            (isJPY
              ? 0.4
              : 0.004),
        },

        pipMultiplier:
          isJPY
            ? 0.1
            : 0.001,

        decimals:
          isJPY
            ? 3
            : 5,

        thresholdPct: 0.1,
      });
    }

    for (const pair of crypto) {
      if (!mt5[pair]) continue;

      const p = mt5[pair];

      candidates.push({
        pair,
        category: "CRYPTO",
        mainCategory: "CRYPTO",
        subCategory: pair,

        price: {
          price: p,
          high: p * 1.01,
          low: p * 0.99,
        },

        pipMultiplier: 1,
        decimals: 2,
        thresholdPct: 0.25,
      });
    }

    if (allowDeriv) {
      for (const pair of deriv) {
        if (!mt5[pair]) continue;

        const p = mt5[pair];
        const isVol75 =
          pair === "VOL 75";

        candidates.push({
          pair,
          category: "DERIV",
          mainCategory: "DERIV/BINARY",
          subCategory: pair,

          price: {
            price: p,
            high: p * 1.005,
            low: p * 0.995,
          },

          pipMultiplier:
            isVol75 ? 1 : 10,

          decimals: 2,
          thresholdPct: 0.25,
        });
      }
    }

    /* =====================================================
       WEIGHTED PRIORITY
    ===================================================== */

    const available =
      candidates.filter(
        (x) => mt5[x.pair]
      );

    if (!available.length) {
      return new Response(
        JSON.stringify({
          success: false,
          generated: false,
          error:
            "No MT5 prices available",
        }),
        {
          status: 503,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    const gold = available.filter(
      x =>
        x.pair ===
        "XAU/USD (Gold)"
    );

    const silver = available.filter(
      x =>
        x.pair ===
        "XAG/USD (Silver)"
    );

    const us30 = available.filter(
      x => x.pair === "US30"
    );

    const nasdaq = available.filter(
      x => x.pair === "NASDAQ"
    );

    const sp500 = available.filter(
      x => x.pair === "S&P500"
    );

    const forexAvailable =
      available.filter(
        x => x.category === "FOREX"
      );

    const cryptoAvailable =
      available.filter(
        x => x.category === "CRYPTO"
      );

    const derivAvailable =
      available.filter(
        x => x.category === "DERIV"
      );

    const weightedPool: SignalConfig[] =
      [];

    function addMany(
      list: SignalConfig[],
      weight: number
    ) {
      for (
        let i = 0;
        i < weight;
        i++
      ) {
        weightedPool.push(...list);
      }
    }

    /*
     * XAU = highest priority
     */
    addMany(gold, 50);
    addMany(silver, 12);
    addMany(us30, 10);
    addMany(nasdaq, 8);
    addMany(sp500, 5);

    addMany(forexAvailable, 10);
    addMany(cryptoAvailable, 3);
    addMany(derivAvailable, 2);

    const shuffled =
      [
        ...(weightedPool.length
          ? weightedPool
          : available),
      ].sort(
        () =>
          Math.random() - 0.5
      );

    const orderedPairs: SignalConfig[] =
      [];

    const seen =
      new Set<string>();

    for (const config of shuffled) {
      if (seen.has(config.pair))
        continue;

      seen.add(config.pair);
      orderedPairs.push(config);
    }

    /* =====================================================
       SELECT PAIR
    ===================================================== */

    let selected:
      | SignalConfig
      | null = null;

    let selectedDecision:
      | any = null;

    for (const config of orderedPairs) {
      const current =
        mt5[config.pair];

      if (!current) continue;

      const decision =
        await evaluatePair(
          supabase,
          config.pair,
          current,
          config.thresholdPct
        );

      console.log(
        "PAIR:",
        config.pair,
        decision
      );

      if (!decision.generate)
        continue;

      selected = config;
      selectedDecision =
        decision;

      break;
    }

    if (!selected) {
      return new Response(
        JSON.stringify({
          success: true,
          generated: false,
          reason:
            "No pair available - open signal/cooldown",
          deriv_daily_count:
            derivCount || 0,
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
       GENERATE
    ===================================================== */

    const signal =
      generateSignal(selected);

    console.log(
      "GENERATING:",
      selected.pair,
      selectedDecision
    );

    /* =====================================================
       INSERT INTO DATABASE
    ===================================================== */

    const {
      data,
      error,
    } = await supabase
      .from("signals")
      .insert(signal)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    /* =====================================================
       TELEGRAM
    ===================================================== */

    const telegramResult =
      await postTelegramSignal(
        supabaseUrl,
        serviceRoleKey,
        data
      );

    /* =====================================================
       FINAL RESPONSE
    ===================================================== */

    return new Response(
      JSON.stringify({
        success: true,
        generated: true,

        pair:
          selected.pair,

        category:
          selected.category,

        decision:
          selectedDecision,

        signal: data,

        telegram:
          telegramResult,

        deriv_daily_count:
          derivCount || 0,
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
      "AUTO SIGNAL ERROR:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
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
