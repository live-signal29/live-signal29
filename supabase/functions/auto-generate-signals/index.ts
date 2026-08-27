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

/* =========================================================
   MT5 PRICES
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
      console.error(
        "fetch-live-prices failed:",
        response.status,
        await response.text()
      );
      return result;
    }

    const json = await response.json();
    const prices = json?.prices || {};

    console.log(
      "RAW MT5 PRICES:",
      JSON.stringify(prices)
    );

    for (const pair of pairs) {
      const value = prices[pair];

      const price = value
        ? parseFloat(String(value))
        : NaN;

      if (
        Number.isFinite(price) &&
        price > 0
      ) {
        result[pair] = price;
      }
    }

    /*
     * GOLD ALIAS SUPPORT
     *
     * This makes sure XAUUSD / XAU/USD / Gold
     * are treated as the same instrument.
     */

    const goldKeys = Object.keys(prices);

    for (const key of goldKeys) {
      const normalized = String(key)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

      const value = parseFloat(
        String(prices[key])
      );

      if (
        Number.isFinite(value) &&
        value > 0
      ) {
        if (
          normalized.includes("XAUUSD") ||
          normalized === "GOLD"
        ) {
          result["XAU/USD (Gold)"] = value;
        }

        if (
          normalized.includes("XAGUSD") ||
          normalized === "SILVER"
        ) {
          result["XAG/USD (Silver)"] = value;
        }
      }
    }

  } catch (error) {
    console.error(
      "MT5 fetch error:",
      String(error)
    );
  }

  console.log(
    "FINAL MT5 PRICE MAP:",
    JSON.stringify(result)
  );

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
    Math.round(
      (
        min +
        Math.random() *
          (max - min)
      ) * 100
    ) / 100
  );
}

/* =========================================================
   REASONS
========================================================= */

const buyReasons = [
  "Demand zone bounce with bullish confirmation",
  "Trendline support holding",
  "Double bottom formation",
  "RSI oversold bounce",
  "Bullish order block retest",
  "61.8% Fibonacci support",
  "Bullish MACD crossover",
  "Liquidity sweep followed by bullish rejection",
  "Smart Money demand zone confirmed",
  "Market structure bullish shift",
];

const sellReasons = [
  "Supply zone rejection",
  "Resistance rejection",
  "RSI bearish divergence",
  "Head and shoulders formation",
  "Bearish MACD crossover",
  "Failed breakout",
  "Overbought rejection",
  "Liquidity sweep followed by bearish rejection",
  "Smart Money supply zone confirmed",
  "Market structure bearish shift",
];

/* =========================================================
   CONFIG
========================================================= */

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

  const isBuy =
    Math.random() < 0.5;

  const type =
    isBuy ? "Buy" : "Sell";

  const spread =
    Math.max(
      price.high - price.low,
      pipMultiplier * 20
    );

  const offset =
    rand(
      -spread * 0.15,
      spread * 0.15
    );

  const entry =
    Number(
      (
        price.price +
        offset
      ).toFixed(decimals)
    );

  const tp1Distance =
    rand(8, 15) *
    pipMultiplier;

  const tp2Distance =
    rand(18, 28) *
    pipMultiplier;

  const tp3Distance =
    rand(30, 45) *
    pipMultiplier;

  const slDistance =
    rand(10, 18) *
    pipMultiplier;

  const tp1 =
    Number(
      (
        isBuy
          ? entry + tp1Distance
          : entry - tp1Distance
      ).toFixed(decimals)
    );

  const tp2 =
    Number(
      (
        isBuy
          ? entry + tp2Distance
          : entry - tp2Distance
      ).toFixed(decimals)
    );

  const tp3 =
    Number(
      (
        isBuy
          ? entry + tp3Distance
          : entry - tp3Distance
      ).toFixed(decimals)
    );

  const sl =
    Number(
      (
        isBuy
          ? entry - slDistance
          : entry + slDistance
      ).toFixed(decimals)
    );

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
    tp1: String(tp1),
    tp2: String(tp2),
    tp3: String(tp3),
    sl: String(sl),

    status: "open",
    signal_status: "open",

    is_premium:
      Math.random() < 0.25,

    is_activated: true,
    activated_at: now,

    entry_mode: "market",

    signal_type: pick([
      "Scalping",
      "Intraday",
      "Swing",
    ]),

    risk_level: pick([
      "Low",
      "Medium",
      "High",
    ]),

    analysis_reason:
      isBuy
        ? pick(buyReasons)
        : pick(sellReasons),

    tag: null,
    signal_raw_text: null,

    published: true,

    created_at: now,

    tp1_hit: false,
    tp2_hit: false,
    tp3_hit: false,

    profit_note: null,
  };
}

/* =========================================================
   CHECK IF PAIR CAN GENERATE
========================================================= */

async function evaluatePair(
  supabase: ReturnType<typeof createClient>,
  pair: string,
  currentPrice: number,
  thresholdPct: number
) {
  const {
    data: active,
  } = await supabase
    .from("signals")
    .select("id")
    .eq("pair", pair)
    .not(
      "signal_status",
      "ilike",
      "close"
    )
    .limit(1)
    .maybeSingle();

  if (active) {
    return {
      generate: false,
      reason: "signal_still_open",
    };
  }

  const {
    data: last,
  } = await supabase
    .from("signals")
    .select(
      "entry,created_at"
    )
    .eq("pair", pair)
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (!last?.entry) {
    return {
      generate: true,
      reason: "no_prior_signal",
    };
  }

  const lastPrice =
    parseFloat(
      String(last.entry)
    );

  if (
    !Number.isFinite(lastPrice) ||
    lastPrice <= 0
  ) {
    return {
      generate: true,
      reason:
        "invalid_previous_entry",
    };
  }

  const move =
    Math.abs(
      (currentPrice -
        lastPrice) /
        lastPrice
    ) * 100;

  if (
    move >= thresholdPct
  ) {
    return {
      generate: true,
      reason:
        "movement_detected",
      pctMove:
        Number(
          move.toFixed(4)
        ),
    };
  }

  return {
    generate: false,
    reason:
      "no_significant_movement",
    pctMove:
      Number(
        move.toFixed(4)
      ),
  };
}

/* =========================================================
   SERVER
========================================================= */

Deno.serve(async (req) => {
  if (
    req.method === "OPTIONS"
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

    /* =====================================================
       SESSION
    ===================================================== */

    const pktHour =
      (
        new Date().getUTCHours() +
        5
      ) % 24;

    const session =
      pktHour < 12
        ? "morning"
        : "evening";

    /* =====================================================
       GOLD
    ===================================================== */

    const goldPairs = [
      "XAU/USD (Gold)",
      "XAG/USD (Silver)",
    ];

    /* =====================================================
       FOREX
    ===================================================== */

    const forex = [
      "EUR/USD",
      "GBP/USD",
      "USD/JPY",
      "AUD/USD",
      "GBP/JPY",
      "USD/CAD",
      "NZD/USD",
      "USD/CHF",
      "CHF/JPY",
      "CAD/JPY",
    ];

    /* =====================================================
       CRYPTO
    ===================================================== */

    const crypto = [
      "BTC/USD",
      "ETH/USD",
      "SOL/USD",
      "XRP/USD",
      "DOGE/USD",
    ];

    /* =====================================================
       DERIV
    ===================================================== */

    const deriv = [
      "BOOM 1000",
      "CRASH 1000",
      "VOL 75",
      "BOOM 500",
      "CRASH 500",
      "VOL 100",
      "VOL 50",
      "VOL 25",
    ];

    const allPairs = [
      ...goldPairs,
      ...forex,
      ...crypto,
      ...deriv,
    ];

    /* =====================================================
       GET MT5 PRICES
    ===================================================== */

    const mt5 =
      await fetchMT5Prices(
        allPairs,
        supabaseUrl,
        serviceRoleKey
      );

    console.log(
      "AVAILABLE MT5 PRICES:",
      JSON.stringify(mt5)
    );

    /* =====================================================
       BUILD CANDIDATES
    ===================================================== */

    const candidates: SignalConfig[] =
      [];

    /* =====================================================
       GOLD / COMMODITIES
    ===================================================== */

    for (
      const pair of goldPairs
    ) {
      if (!mt5[pair]) {
        console.log(
          `No MT5 price for ${pair}`
        );
        continue;
      }

      const p =
        mt5[pair];

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
            pair.includes("XAU")
              ? p + 15
              : p + 1.5,
          low:
            pair.includes("XAU")
              ? p - 15
              : p - 1.5,
        },

        pipMultiplier:
          pair.includes("XAU")
            ? 1
            : 0.1,

        decimals:
          3,

        thresholdPct:
          pair.includes("XAU")
            ? 0.12
            : 0.15,
      });
    }

    /* =====================================================
       FOREX
    ===================================================== */

    for (
      const pair of forex
    ) {
      if (!mt5[pair]) {
        console.log(
          `No MT5 price for ${pair}`
        );
        continue;
      }

      const p =
        mt5[pair];

      const isJPY =
        pair.includes("JPY");

      const width =
        isJPY
          ? 0.6
          : 0.006;

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
          high: p + width,
          low: p - width,
        },

        pipMultiplier:
          isJPY
            ? 0.1
            : 0.001,

        decimals:
          isJPY ? 3 : 5,

        thresholdPct:
          0.12,
      });
    }

    /* =====================================================
       CRYPTO
    ===================================================== */

    for (
      const pair of crypto
    ) {
      if (!mt5[pair]) {
        console.log(
          `No MT5 price for ${pair}`
        );
        continue;
      }

      const p =
        mt5[pair];

      const multiplier =
        p > 1000
          ? 100
          : p > 50
          ? 1
          : 0.01;

      const decimals =
        p < 10
          ? 4
          : 2;

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
          high: p * 1.02,
          low: p * 0.98,
        },

        pipMultiplier:
          multiplier,

        decimals,

        thresholdPct:
          0.4,
      });
    }

    /* =====================================================
       DERIV
    ===================================================== */

    const derivSettings: Record<
      string,
      number
    > = {
      "BOOM 1000": 10,
      "CRASH 1000": 10,
      "VOL 75": 1,
      "BOOM 500": 10,
      "CRASH 500": 10,
      "VOL 100": 1,
      "VOL 50": 1,
      "VOL 25": 1,
    };

    for (
      const pair of deriv
    ) {
      if (!mt5[pair]) {
        console.log(
          `No MT5 price for ${pair}`
        );
        continue;
      }

      const p =
        mt5[pair];

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
          high: p * 1.002,
          low: p * 0.998,
        },

        pipMultiplier:
          derivSettings[pair] || 1,

        decimals: 2,

        thresholdPct:
          0.15,
      });
    }

    console.log(
      "CANDIDATES:",
      candidates.map(
        x => x.pair
      )
    );

    /* =====================================================
       EVALUATE
    ===================================================== */

    const newSignals: any[] =
      [];

    const decisions: Record<
      string,
      any
    > = {};

    for (
      const config of candidates
    ) {
      const current =
        mt5[config.pair];

      const decision =
        await evaluatePair(
          supabase,
          config.pair,
          current,
          config.thresholdPct
        );

      decisions[
        config.pair
      ] = {
        generated:
          decision.generate,

        reason:
          decision.reason,

        pctMove:
          decision.pctMove,
      };

      console.log(
        `DECISION ${config.pair}:`,
        JSON.stringify(
          decision
        )
      );

      if (
        decision.generate
      ) {
        newSignals.push(
          generateSignal(
            config
          )
        );
      }
    }

    /* =====================================================
       NO SIGNAL
    ===================================================== */

    if (
      newSignals.length === 0
    ) {
      return new Response(
        JSON.stringify({
          success: true,

          generated: false,

          signals_created: 0,

          session,

          candidates:
            candidates.map(
              x => x.pair
            ),

          decisions,
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
       INSERT
    ===================================================== */

    const {
      data,
      error,
    } = await supabase
      .from("signals")
      .insert(
        newSignals
      )
      .select(
        "id,pair,type,entry,tp1,tp2,tp3,sl,risk_level,signal_type,analysis_reason,category,main_category,sub_category"
      );

    if (error) {
      console.error(
        "Signal insert error:",
        error
      );

      return new Response(
        JSON.stringify({
          success: false,
          error:
            error.message,
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

    /* =====================================================
       TELEGRAM
       EVERY NEW SIGNAL
    ===================================================== */

    const telegramResults: Record<
      string,
      boolean
    > = {};

    if (
      data &&
      data.length > 0
    ) {
      await Promise.allSettled(
        data.map(
          async signal => {
            try {
              const response =
                await fetch(
                  `${supabaseUrl}/functions/v1/telegram-signal-post`,
                  {
                    method: "POST",

                    headers: {
                      "Content-Type":
                        "application/json",

                      Authorization:
                        `Bearer ${serviceRoleKey}`,

                      apikey:
                        serviceRoleKey,
                    },

                    body:
                      JSON.stringify({
                        signal,

                        action:
                          "new_signal",
                      }),
                  }
                );

              const result =
                await response
                  .json()
                  .catch(
                    () => ({})
                  );

              const ok =
                response.ok &&
                result?.success ===
                  true;

              telegramResults[
                signal.pair
              ] = ok;

              console.log(
                `Telegram ${signal.pair}:`,
                ok,
                result
              );

            } catch (error) {
              telegramResults[
                signal.pair
              ] = false;

              console.error(
                `Telegram error ${signal.pair}:`,
                String(error)
              );
            }
          }
        )
      );
    }

    /* =====================================================
       MT5 AUTO-TRADE
       MIRROR EVERY NEW SIGNAL ONTO THE
       CONNECTED MT5 DEMO ACCOUNT
    ===================================================== */

    const mt5Results: Record<string, boolean> = {};

    if (data && data.length > 0) {
      await Promise.allSettled(
        data.map(async (signal) => {
          try {
            const entryNum = parseFloat(String(signal.entry));
            const slNum = parseFloat(String(signal.sl));
            const tpNum = parseFloat(String(signal.tp1));

            const response = await fetch(
              `${supabaseUrl}/functions/v1/mt5-demo-trade`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${serviceRoleKey}`,
                  apikey: serviceRoleKey,
                },
                body: JSON.stringify({
                  action: "open",
                  signal_id: signal.id,
                  symbol: signal.pair,
                  trade_type: signal.type === "Buy" ? "buy" : "sell",
                  entry: Number.isFinite(entryNum) ? entryNum : undefined,
                  sl: Number.isFinite(slNum) ? slNum : undefined,
                  tp: Number.isFinite(tpNum) ? tpNum : undefined,
                  lot_size: 0.01,
                }),
              }
            );

            const result = await response.json().catch(() => ({}));
            const ok = response.ok && result?.success === true;
            mt5Results[signal.pair] = ok;
            console.log(`MT5 auto-trade ${signal.pair}:`, ok, result);
          } catch (error) {
            mt5Results[signal.pair] = false;
            console.error(`MT5 auto-trade error ${signal.pair}:`, String(error));
          }
        })
      );
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return new Response(
      JSON.stringify({
        success: true,

        generated: true,

        session,

        signals_created:
          data?.length || 0,

        candidates:
          candidates.map(
            x => x.pair
          ),

        telegram_posted:
          telegramResults,

        mt5_auto_trade:
          mt5Results,

        decisions,

        signals:
          data,
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
      "auto-generate-signals error:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
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
