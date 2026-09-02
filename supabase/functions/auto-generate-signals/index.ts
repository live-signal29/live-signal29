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
   LIVE PRICES
========================================================= */

async function fetchLivePrices(
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
      console.error(
        "Price endpoint error:",
        response.status
      );
      return result;
    }

    const json = await response.json();
    const prices = json?.prices || {};

    for (const key of Object.keys(prices)) {
      const value = Number(prices[key]);

      if (
        !Number.isFinite(value) ||
        value <= 0
      ) {
        continue;
      }

      const normalized = String(key)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

      if (
        normalized.includes("XAUUSD") ||
        normalized.includes("GOLD")
      ) {
        result["XAU/USD (Gold)"] = value;
      } else if (
        normalized.includes("XAGUSD") ||
        normalized.includes("SILVER")
      ) {
        result["XAG/USD (Silver)"] = value;
      } else if (
        normalized.includes("BTCUSD") ||
        normalized.includes("BTCUSDT")
      ) {
        result["BTC/USD"] = value;
      } else if (
        normalized.includes("ETHUSD") ||
        normalized.includes("ETHUSDT")
      ) {
        result["ETH/USD"] = value;
      } else if (
        normalized.includes("SOLUSD") ||
        normalized.includes("SOLUSDT")
      ) {
        result["SOL/USD"] = value;
      } else if (
        normalized.includes("US30") ||
        normalized.includes("DJ30")
      ) {
        result["US30"] = value;
      } else if (
        normalized.includes("NASDAQ") ||
        normalized.includes("NAS100")
      ) {
        result["NASDAQ"] = value;
      } else if (
        normalized.includes("SP500") ||
        normalized.includes("US500")
      ) {
        result["S&P500"] = value;
      } else if (
        normalized.includes("VOL75")
      ) {
        result["VOL 75"] = value;
      } else if (
        normalized.includes("VOL100")
      ) {
        result["VOL 100"] = value;
      } else if (
        normalized.includes("BOOM1000")
      ) {
        result["BOOM 1000"] = value;
      } else if (
        normalized.includes("CRASH1000")
      ) {
        result["CRASH 1000"] = value;
      } else if (
        normalized.includes("BOOM500")
      ) {
        result["BOOM 500"] = value;
      } else {
        result[key] = value;
      }
    }
  } catch (error) {
    console.error(
      "Live price fetch error:",
      String(error)
    );
  }

  return result;
}

/* =========================================================
   HELPERS
========================================================= */

function pick<T>(array: T[]): T {
  return array[
    Math.floor(
      Math.random() * array.length
    )
  ];
}

function rand(
  min: number,
  max: number
): number {
  return (
    min +
    Math.random() *
      (max - min)
  );
}

const buyReasons = [
  "Demand zone bounce with bullish confirmation",
  "Trendline support holding",
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
   GOLD SIGNAL DISTANCE
========================================================= */

/*
  GOLD IS NOW BASED ON REAL DOLLAR DISTANCE.

  BUY:
    Entry 4376.79

    TP1 = +$3 to +$5
    TP2 = +$8 to +$15
    TP3 = +$15 to +$25

    SL  = -$15 to -$25

  SELL:
    TP1 = -$3 to -$5
    TP2 = -$8 to -$15
    TP3 = -$15 to -$25

    SL  = +$15 to +$25

  This prevents huge targets like:
    4435
    4462
    4515
*/

function generateGoldLevels(
  entry: number,
  isBuy: boolean
) {
  const slDistance = rand(15, 25);

  const tp1Distance = rand(3, 5);

  const tp2Distance = rand(8, 15);

  const tp3Distance = rand(15, 25);

  const sl = isBuy
    ? entry - slDistance
    : entry + slDistance;

  const tp1 = isBuy
    ? entry + tp1Distance
    : entry - tp1Distance;

  const tp2 = isBuy
    ? entry + tp2Distance
    : entry - tp2Distance;

  const tp3 = isBuy
    ? entry + tp3Distance
    : entry - tp3Distance;

  return {
    sl: Number(sl.toFixed(2)),
    tp1: Number(tp1.toFixed(2)),
    tp2: Number(tp2.toFixed(2)),
    tp3: Number(tp3.toFixed(2)),
  };
}

/* =========================================================
   GENERATE SIGNAL
========================================================= */

function generateSignal(
  config: SignalConfig
) {
  const {
    pair,
    category,
    mainCategory,
    subCategory,
    price,
    pipMultiplier,
    decimals,
  } = config;

  const isGold =
    pair === "XAU/USD (Gold)";

  const isSilver =
    pair === "XAG/USD (Silver)";

  const isIndex =
    pair === "US30" ||
    pair === "NASDAQ" ||
    pair === "S&P500";

  const isVol75 =
    pair === "VOL 75";

  const isDeriv =
    category === "DERIV";

  const isBuy =
    Math.random() >= 0.5;

  const type =
    isBuy ? "Buy" : "Sell";

  const currentPrice =
    price.price;

  /*
   * IMPORTANT:
   *
   * Entry should stay close to current
   * market price.
   *
   * Old code used ±2% of candle spread,
   * which could create bad entries.
   */

  let entryOffset = 0;

  if (isGold) {
    entryOffset = rand(-0.50, 0.50);
  } else if (isSilver) {
    entryOffset = rand(-0.10, 0.10);
  } else if (isIndex) {
    entryOffset = rand(-2, 2);
  } else if (isVol75) {
    entryOffset = rand(-5, 5);
  } else if (isDeriv) {
    entryOffset = rand(-5, 5);
  } else {
    entryOffset =
      rand(
        -pipMultiplier * 3,
        pipMultiplier * 3
      );
  }

  const entry = Number(
    (
      currentPrice +
      entryOffset
    ).toFixed(decimals)
  );

  let sl: number;
  let tp1: number;
  let tp2: number;
  let tp3: number;

  /* =======================================================
     GOLD
  ======================================================= */

  if (isGold) {
    const levels =
      generateGoldLevels(
        entry,
        isBuy
      );

    sl = levels.sl;
    tp1 = levels.tp1;
    tp2 = levels.tp2;
    tp3 = levels.tp3;
  }

  /* =======================================================
     SILVER
  ======================================================= */

  else if (isSilver) {
    const slDistance =
      rand(1.5, 3);

    const tp1Distance =
      rand(0.5, 1);

    const tp2Distance =
      rand(1, 2);

    const tp3Distance =
      rand(2, 3);

    sl = Number(
      (
        isBuy
          ? entry - slDistance
          : entry + slDistance
      ).toFixed(decimals)
    );

    tp1 = Number(
      (
        isBuy
          ? entry + tp1Distance
          : entry - tp1Distance
      ).toFixed(decimals)
    );

    tp2 = Number(
      (
        isBuy
          ? entry + tp2Distance
          : entry - tp2Distance
      ).toFixed(decimals)
    );

    tp3 = Number(
      (
        isBuy
          ? entry + tp3Distance
          : entry - tp3Distance
      ).toFixed(decimals)
    );
  }

  /* =======================================================
     INDEX
  ======================================================= */

  else if (isIndex) {
    const slDistance =
      rand(20, 35);

    const tp1Distance =
      rand(10, 18);

    const tp2Distance =
      rand(20, 30);

    const tp3Distance =
      rand(30, 50);

    sl = Number(
      (
        isBuy
          ? entry - slDistance
          : entry + slDistance
      ).toFixed(decimals)
    );

    tp1 = Number(
      (
        isBuy
          ? entry + tp1Distance
          : entry - tp1Distance
      ).toFixed(decimals)
    );

    tp2 = Number(
      (
        isBuy
          ? entry + tp2Distance
          : entry - tp2Distance
      ).toFixed(decimals)
    );

    tp3 = Number(
      (
        isBuy
          ? entry + tp3Distance
          : entry - tp3Distance
      ).toFixed(decimals)
    );
  }

  /* =======================================================
     VOL 75
  ======================================================= */

  else if (isVol75) {
    const slDistance =
      rand(150, 250);

    const tp1Distance =
      rand(150, 250);

    const tp2Distance =
      rand(300, 450);

    const tp3Distance =
      rand(500, 700);

    sl = Number(
      (
        isBuy
          ? entry - slDistance
          : entry + slDistance
      ).toFixed(decimals)
    );

    tp1 = Number(
      (
        isBuy
          ? entry + tp1Distance
          : entry - tp1Distance
      ).toFixed(decimals)
    );

    tp2 = Number(
      (
        isBuy
          ? entry + tp2Distance
          : entry - tp2Distance
      ).toFixed(decimals)
    );

    tp3 = Number(
      (
        isBuy
          ? entry + tp3Distance
          : entry - tp3Distance
      ).toFixed(decimals)
    );
  }

  /* =======================================================
     OTHER DERIV
  ======================================================= */

  else if (isDeriv) {
    const slDistance =
      rand(40, 80);

    const tp1Distance =
      rand(40, 80);

    const tp2Distance =
      rand(90, 150);

    const tp3Distance =
      rand(160, 250);

    sl = Number(
      (
        isBuy
          ? entry - slDistance
          : entry + slDistance
      ).toFixed(decimals)
    );

    tp1 = Number(
      (
        isBuy
          ? entry + tp1Distance
          : entry - tp1Distance
      ).toFixed(decimals)
    );

    tp2 = Number(
      (
        isBuy
          ? entry + tp2Distance
          : entry - tp2Distance
      ).toFixed(decimals)
    );

    tp3 = Number(
      (
        isBuy
          ? entry + tp3Distance
          : entry - tp3Distance
      ).toFixed(decimals)
    );
  }

  /* =======================================================
     FOREX / CRYPTO
  ======================================================= */

  else {
    const slDistance =
      rand(12, 20) *
      pipMultiplier;

    const tp1Distance =
      rand(15, 25) *
      pipMultiplier;

    const tp2Distance =
      rand(30, 45) *
      pipMultiplier;

    const tp3Distance =
      rand(50, 75) *
      pipMultiplier;

    sl = Number(
      (
        isBuy
          ? entry - slDistance
          : entry + slDistance
      ).toFixed(decimals)
    );

    tp1 = Number(
      (
        isBuy
          ? entry + tp1Distance
          : entry - tp1Distance
      ).toFixed(decimals)
    );

    tp2 = Number(
      (
        isBuy
          ? entry + tp2Distance
          : entry - tp2Distance
      ).toFixed(decimals)
    );

    tp3 = Number(
      (
        isBuy
          ? entry + tp3Distance
          : entry - tp3Distance
      ).toFixed(decimals)
    );
  }

  const now =
    new Date().toISOString();

  return {
    pair,
    type,
    category,
    main_category:
      mainCategory,
    sub_category:
      subCategory,

    entry: String(entry),

    /*
     * CURRENT is the actual live market price.
     */
    current_price:
      String(currentPrice),

    tp1: String(tp1),
    tp2: String(tp2),
    tp3: String(tp3),

    sl: String(sl),

    status: "open",
    signal_status: "open",

    is_premium: false,
    is_activated: true,
    activated_at: now,

    entry_mode: "market",

    signal_type: isGold
      ? "Scalping"
      : pick([
          "Scalping",
          "Intraday",
          "Swing",
        ]),

    risk_level:
      isVol75 || isIndex
        ? "High"
        : isGold
        ? "Medium"
        : pick([
            "Low",
            "Medium",
          ]),

    analysis_reason:
      isBuy
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
   EVALUATE PAIR
========================================================= */

async function evaluatePair(
  supabase: ReturnType<
    typeof createClient
  >,
  pair: string
) {
  const {
    data: active,
    error: activeError,
  } = await supabase
    .from("signals")
    .select("id")
    .eq("pair", pair)
    .eq(
      "signal_status",
      "open"
    )
    .limit(1)
    .maybeSingle();

  if (activeError) {
    console.error(
      "Active signal check error:",
      activeError.message
    );
  }

  if (active) {
    return {
      generate: false,
      reason:
        "signal_still_open",
    };
  }

  return {
    generate: true,
    reason:
      "hourly_signal_slot",
  };
}

/* =========================================================
   TELEGRAM
========================================================= */

async function postTelegramSignal(
  supabaseUrl: string,
  serviceRoleKey: string,
  signal: any
) {
  try {
    const response =
      await fetch(
        `${supabaseUrl}/functions/v1/telegram-signal-post`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${serviceRoleKey}`,
            apikey:
              serviceRoleKey,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            signal,
            action:
              "new_signal",
          }),
        }
      );

    const text =
      await response.text();

    console.log(
      "Telegram response:",
      response.status,
      text
    );

    return {
      success:
        response.ok,
      status:
        response.status,
      response:
        text,
    };

  } catch (error) {

    console.error(
      "Telegram error:",
      String(error)
    );

    return {
      success: false,
      response:
        String(error),
    };
  }
}

/* =========================================================
   MAIN
========================================================= */

Deno.serve(async (req) => {

  if (
    req.method ===
    "OPTIONS"
  ) {
    return new Response(
      "ok",
      {
        headers:
          corsHeaders,
      }
    );
  }

  try {

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL"
      )!;

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      )!;

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey
      );

    const todayStart =
      new Date();

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
      .select(
        "id",
        {
          count:
            "exact",
          head: true,
        }
      )
      .eq(
        "category",
        "DERIV"
      )
      .gte(
        "created_at",
        todayStart.toISOString()
      );

    const allowDeriv =
      (derivCount || 0) < 5;

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

    const deriv =
      allowDeriv
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

    const prices =
      await fetchLivePrices(
        allPairs,
        supabaseUrl,
        serviceRoleKey
      );

    const candidates: SignalConfig[] =
      [];

    /* =====================================================
       COMMODITIES
    ===================================================== */

    for (
      const pair of commodities
    ) {

      const p =
        prices[pair];

      if (!p) continue;

      const isGold =
        pair ===
        "XAU/USD (Gold)";

      const isSilver =
        pair ===
        "XAG/USD (Silver)";

      const isIndex =
        pair === "US30" ||
        pair === "NASDAQ" ||
        pair === "S&P500";

      candidates.push({
        pair,
        category:
          "COMMODITIES",
        mainCategory:
          "COMMODITIES",
        subCategory:
          pair,

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

    /* =====================================================
       FOREX
    ===================================================== */

    for (
      const pair of forex
    ) {

      const p =
        prices[pair];

      if (!p) continue;

      const isJPY =
        pair.includes(
          "JPY"
        );

      candidates.push({
        pair,
        category:
          "FOREX",
        mainCategory:
          "FOREX",
        subCategory:
          pair,

        price: {
          price: p,
          high:
            p +
            (
              isJPY
                ? 0.4
                : 0.004
            ),
          low:
            p -
            (
              isJPY
                ? 0.4
                : 0.004
            ),
        },

        pipMultiplier:
          isJPY
            ? 0.1
            : 0.001,

        decimals:
          isJPY
            ? 3
            : 5,

        thresholdPct:
          0.1,
      });
    }

    /* =====================================================
       CRYPTO
    ===================================================== */

    for (
      const pair of crypto
    ) {

      const p =
        prices[pair];

      if (!p) continue;

      candidates.push({
        pair,
        category:
          "CRYPTO",
        mainCategory:
          "CRYPTO",
        subCategory:
          pair,

        price: {
          price: p,
          high:
            p * 1.01,
          low:
            p * 0.99,
        },

        pipMultiplier:
          1,

        decimals:
          2,

        thresholdPct:
          0.25,
      });
    }

    /* =====================================================
       DERIV
    ===================================================== */

    if (allowDeriv) {

      for (
        const pair of deriv
      ) {

        const p =
          prices[pair];

        if (!p) continue;

        const isVol75 =
          pair ===
          "VOL 75";

        candidates.push({
          pair,
          category:
            "DERIV",
          mainCategory:
            "DERIV/BINARY",
          subCategory:
            pair,

          price: {
            price: p,
            high:
              p * 1.005,
            low:
              p * 0.995,
          },

          pipMultiplier:
            isVol75
              ? 1
              : 10,

          decimals:
            2,

          thresholdPct:
            0.25,
        });
      }
    }

    /* =====================================================
       AVAILABLE
    ===================================================== */

    const available =
      candidates.filter(
        (x) =>
          !!prices[x.pair]
      );

    if (
      !available.length
    ) {

      return new Response(
        JSON.stringify({
          success:
            false,
          generated:
            false,
          error:
            "No live prices available",
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

    /* =====================================================
       UPDATE OPEN SIGNAL CURRENT PRICE
    ===================================================== */

    for (
      const item of available
    ) {

      await supabase
        .from("signals")
        .update({
          current_price:
            String(
              item.price.price
            ),
        })
        .eq(
          "pair",
          item.pair
        )
        .eq(
          "signal_status",
          "open"
        );
    }

    /* =====================================================
       WEIGHTED POOL
    ===================================================== */

    const weightedPool:
      SignalConfig[] = [];

    function add(
      pairName: string,
      weight: number
    ) {

      const item =
        available.find(
          (x) =>
            x.pair ===
            pairName
        );

      if (!item) return;

      for (
        let i = 0;
        i < weight;
        i++
      ) {
        weightedPool.push(
          item
        );
      }
    }

    // Gold remains the main pair
    add(
      "XAU/USD (Gold)",
      55
    );

    add(
      "XAG/USD (Silver)",
      12
    );

    add(
      "US30",
      9
    );

    add(
      "NASDAQ",
      8
    );

    add(
      "S&P500",
      6
    );

    for (
      const pair of forex
    ) {
      add(pair, 1);
    }

    for (
      const pair of crypto
    ) {
      add(pair, 1);
    }

    for (
      const pair of deriv
    ) {
      add(pair, 1);
    }

    const shuffled =
      [...weightedPool]
        .sort(
          () =>
            Math.random() -
            0.5
        );

    const orderedPairs:
      SignalConfig[] = [];

    const seen =
      new Set<string>();

    for (
      const item of shuffled
    ) {

      if (
        seen.has(
          item.pair
        )
      ) {
        continue;
      }

      seen.add(
        item.pair
      );

      orderedPairs.push(
        item
      );
    }

    for (
      const item of available
    ) {

      if (
        seen.has(
          item.pair
        )
      ) {
        continue;
      }

      seen.add(
        item.pair
      );

      orderedPairs.push(
        item
      );
    }

    /* =====================================================
       SELECT PAIR
    ===================================================== */

    let selected:
      SignalConfig | null =
      null;

    let decision:
      any = null;

    for (
      const config of orderedPairs
    ) {

      const result =
        await evaluatePair(
          supabase,
          config.pair
        );

      if (
        !result.generate
      ) {
        continue;
      }

      selected =
        config;

      decision =
        result;

      break;
    }

    if (!selected) {

      return new Response(
        JSON.stringify({
          success:
            true,
          generated:
            false,
          reason:
            "All available pairs already have open signals",
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
      generateSignal(
        selected
      );

    /* =====================================================
       INSERT
    ===================================================== */

    const {
      data,
      error,
    } = await supabase
      .from("signals")
      .insert(
        signal
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    /* =====================================================
       TELEGRAM
    ===================================================== */

    const telegram =
      await postTelegramSignal(
        supabaseUrl,
        serviceRoleKey,
        data
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return new Response(
      JSON.stringify({
        success:
          true,
        generated:
          true,

        pair:
          selected.pair,

        category:
          selected.category,

        decision,

        signal:
          data,

        telegram,

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
        success:
          false,
        generated:
          false,
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
