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

    const prices: Record<string, string> =
      json?.prices || {};

    for (const pair of pairs) {
      const raw = prices[pair];
      const price = raw ? parseFloat(raw) : NaN;

      if (Number.isFinite(price) && price > 0) {
        result[pair] = price;
      }
    }

    console.log(
      "MT5 prices:",
      JSON.stringify(result)
    );
  } catch (error) {
    console.error(
      "MT5 price fetch error:",
      String(error)
    );
  }

  return result;
}

/* =========================================================
   EXTERNAL PRICE DATA
   ONLY USED FOR RANGE / VOLATILITY
========================================================= */

async function fetchMarketPrice(
  symbol: string
): Promise<PriceData> {
  try {
    const yahooSymbol =
      symbol.replace("/", "") + "=X";

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();

      const meta =
        data.chart?.result?.[0]?.meta;

      const quote =
        data.chart?.result?.[0]?.indicators
          ?.quote?.[0];

      if (meta?.regularMarketPrice) {
        const price =
          Number(meta.regularMarketPrice);

        const high =
          Number(quote?.high?.[0]) ||
          price * 1.003;

        const low =
          Number(quote?.low?.[0]) ||
          price * 0.997;

        return {
          price,
          high,
          low,
        };
      }
    }
  } catch (error) {
    console.log(
      `Yahoo failed for ${symbol}:`,
      String(error)
    );
  }

  const fallback: Record<string, number> = {
    "EUR/USD": 1.0830,
    "GBP/USD": 1.2940,
    "USD/JPY": 149.60,
    "AUD/USD": 0.6290,
    "GBP/JPY": 193.70,
    "USD/CAD": 1.3580,
    "NZD/USD": 0.5680,
    "USD/CHF": 0.8830,
    "CHF/JPY": 169.40,
    "CAD/JPY": 110.20,
  };

  const price =
    fallback[symbol] || 1;

  return {
    price,
    high: price * 1.003,
    low: price * 0.997,
  };
}

/* =========================================================
   GOLD / SILVER MARKET RANGE
========================================================= */

async function fetchMetalPrice(
  symbol: string
): Promise<PriceData> {
  try {
    const yahooSymbol =
      symbol === "XAU/USD"
        ? "GC=F"
        : "SI=F";

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();

      const meta =
        data.chart?.result?.[0]?.meta;

      const quote =
        data.chart?.result?.[0]?.indicators
          ?.quote?.[0];

      if (meta?.regularMarketPrice) {
        const price =
          Number(meta.regularMarketPrice);

        return {
          price,
          high:
            Number(quote?.high?.[0]) ||
            price + 15,
          low:
            Number(quote?.low?.[0]) ||
            price - 15,
        };
      }
    }
  } catch (error) {
    console.log(
      `${symbol} market data failed:`,
      String(error)
    );
  }

  if (symbol === "XAU/USD") {
    return {
      price: 3300,
      high: 3330,
      low: 3270,
    };
  }

  return {
    price: 37,
    high: 38,
    low: 36,
  };
}

/* =========================================================
   CRYPTO
========================================================= */

async function fetchCryptoPrices(): Promise<
  Record<string, PriceData>
> {
  const result: Record<string, PriceData> = {};

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,dogecoin&vs_currencies=usd&include_24hr_high=true&include_24hr_low=true"
    );

    if (response.ok) {
      const data = await response.json();

      const map: Record<string, string> = {
        bitcoin: "BTC/USD",
        ethereum: "ETH/USD",
        solana: "SOL/USD",
        ripple: "XRP/USD",
        dogecoin: "DOGE/USD",
      };

      for (const [id, pair] of Object.entries(map)) {
        if (data[id]?.usd) {
          result[pair] = {
            price: Number(data[id].usd),
            high:
              Number(data[id].usd_24h_high) ||
              Number(data[id].usd) * 1.02,
            low:
              Number(data[id].usd_24h_low) ||
              Number(data[id].usd) * 0.98,
          };
        }
      }
    }
  } catch (error) {
    console.log(
      "CoinGecko failed:",
      String(error)
    );
  }

  const fallback: Record<string, number> = {
    "BTC/USD": 83500,
    "ETH/USD": 1820,
    "SOL/USD": 125,
    "XRP/USD": 2.10,
    "DOGE/USD": 0.168,
  };

  for (const [pair, price] of Object.entries(
    fallback
  )) {
    if (!result[pair]) {
      result[pair] = {
        price,
        high: price * 1.02,
        low: price * 0.98,
      };
    }
  }

  return result;
}

/* =========================================================
   SIGNAL REASONS
========================================================= */

function pick<T>(arr: T[]): T {
  return arr[
    Math.floor(Math.random() * arr.length)
  ];
}

function rand(
  min: number,
  max: number
): number {
  return (
    Math.round(
      (min +
        Math.random() * (max - min)) *
        100
    ) / 100
  );
}

const buyReasons = [
  "Demand zone bounce with bullish engulfing",
  "Trendline support holding on H1",
  "Double bottom formation confirmed",
  "RSI oversold bounce at key level",
  "Order block retest with bullish confirmation",
  "Golden ratio 61.8% retracement support",
  "Bullish MACD crossover on M30",
  "Asian session support zone holding",
];

const sellReasons = [
  "Supply zone rejection with bearish pin bar",
  "Resistance rejection at daily high",
  "Bearish divergence on RSI H1",
  "Head and shoulders pattern completing",
  "MACD bearish crossover near resistance",
  "Failed breakout at upper channel",
  "Overbought conditions on H4",
  "Distribution zone detected on volume",
];

/* =========================================================
   GENERATE SIGNAL
========================================================= */

function generateOneOpenSignal(
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
    price.high - price.low;

  const entryOffset = rand(
    -spread * 0.3,
    spread * 0.3
  );

  const entry = Number(
    (
      price.price + entryOffset
    ).toFixed(decimals)
  );

  const tp1d =
    rand(8, 15) *
    pipMultiplier;

  const tp2d =
    rand(18, 28) *
    pipMultiplier;

  const tp3d =
    rand(30, 45) *
    pipMultiplier;

  const sld =
    rand(10, 18) *
    pipMultiplier;

  const tp1 = Number(
    (
      isBuy
        ? entry + tp1d
        : entry - tp1d
    ).toFixed(decimals)
  );

  const tp2 = Number(
    (
      isBuy
        ? entry + tp2d
        : entry - tp2d
    ).toFixed(decimals)
  );

  const tp3 = Number(
    (
      isBuy
        ? entry + tp3d
        : entry - tp3d
    ).toFixed(decimals)
  );

  const sl = Number(
    (
      isBuy
        ? entry - sld
        : entry + sld
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

    entry:
      entry.toString(),

    tp1:
      tp1.toString(),

    tp2:
      tp2.toString(),

    tp3:
      tp3.toString(),

    sl:
      sl.toString(),

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
   CHECK SIGNAL ELIGIBILITY
========================================================= */

async function evaluatePair(
  supabase: ReturnType<
    typeof createClient
  >,
  pair: string,
  currentPrice: number,
  thresholdPct: number
): Promise<{
  generate: boolean;
  reason: string;
  pctMove?: number;
}> {
  const { data: active } =
    await supabase
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
      reason:
        "signal_still_open",
    };
  }

  const { data: last } =
    await supabase
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
      reason:
        "no_prior_signal",
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
        "invalid_previous_price",
    };
  }

  const pctMove =
    Math.abs(
      (currentPrice -
        lastPrice) /
        lastPrice
    ) * 100;

  if (
    pctMove >=
    thresholdPct
  ) {
    return {
      generate: true,
      reason:
        "movement_detected",
      pctMove:
        Number(
          pctMove.toFixed(4)
        ),
    };
  }

  return {
    generate: false,
    reason:
      "no_significant_movement",
    pctMove:
      Number(
        pctMove.toFixed(4)
      ),
  };
}

/* =========================================================
   TELEGRAM AUTO POST
========================================================= */

async function postTelegram(
  signal: any,
  supabaseUrl: string,
  serviceRoleKey: string
) {
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
          },

          body: JSON.stringify({
            signal,
            action:
              "new_signal",
          }),
        }
      );

    const json =
      await response
        .json()
        .catch(() => ({}));

    console.log(
      `Telegram ${signal.pair}:`,
      response.status,
      json
    );

    return (
      response.ok &&
      json?.success === true
    );
  } catch (error) {
    console.error(
      `Telegram error ${signal.pair}:`,
      String(error)
    );

    return false;
  }
}

/* =========================================================
   SERVER
========================================================= */

Deno.serve(
  async (req) => {
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

      /* =====================================================
         SESSION
      ===================================================== */

      const pktHour =
        (new Date().getUTCHours() +
          5) %
        24;

      const session:
        | "morning"
        | "evening" =
        pktHour < 12
          ? "morning"
          : "evening";

      /* =====================================================
         PAIRS
      ===================================================== */

      const forexPairPool = [
        "EUR/USD",
        "GBP/USD",
        "USD/JPY",
        "AUD/USD",
        "GBP/JPY",
      ];

      const cryptoPairPool = [
        "BTC/USD",
        "ETH/USD",
        "SOL/USD",
      ];

      /*
       * IMPORTANT:
       * These names EXACTLY match dashboard.
       */

      const goldPair =
        "XAU/USD (Gold)";

      const silverPair =
        "XAG/USD (Silver)";

      const derivPairNames = [
        "BOOM 1000",
        "CRASH 1000",
        "VOL 75",
        "BOOM 500",
      ];

      /* =====================================================
         EXTERNAL MARKET DATA
      ===================================================== */

      const [
        goldMarket,
        silverMarket,
        cryptoPrices,
        ...forexResults
      ] = await Promise.all([
        fetchMetalPrice(
          "XAU/USD"
        ),

        fetchMetalPrice(
          "XAG/USD"
        ),

        fetchCryptoPrices(),

        ...forexPairPool.map(
          async (pair) => ({
            pair,
            data:
              await fetchMarketPrice(
                pair
              ),
          })
        ),
      ]);

      /* =====================================================
         GET ALL MT5 PRICES
      ===================================================== */

      const mt5Pairs = [
        goldPair,
        silverPair,
        ...forexPairPool,
        ...cryptoPairPool,
        ...derivPairNames,
      ];

      const mt5Prices =
        await fetchMT5Prices(
          mt5Pairs,
          supabaseUrl,
          serviceRoleKey
        );

      console.log(
        "ALL REQUESTED MT5 PAIRS:",
        mt5Pairs
      );

      console.log(
        "ALL RETURNED MT5 PRICES:",
        mt5Prices
      );

      /* =====================================================
         CANDIDATES
      ===================================================== */

      const candidates:
        SignalConfig[] = [];

      /* =====================================================
         GOLD
      ===================================================== */

      if (
        mt5Prices[goldPair]
      ) {
        const p =
          mt5Prices[
            goldPair
          ];

        candidates.push({
          pair:
            goldPair,

          category:
            "COMMODITIES",

          mainCategory:
            "COMMODITIES",

          subCategory:
            goldPair,

          price: {
            price: p,
            high:
              p +
              Math.max(
                10,
                Math.abs(
                  goldMarket.high -
                    goldMarket.price
                )
              ),
            low:
              p -
              Math.max(
                10,
                Math.abs(
                  goldMarket.price -
                    goldMarket.low
                )
              ),
          },

          pipMultiplier: 1,
          decimals: 2,
          thresholdPct: 0.12,
        });

        console.log(
          "GOLD CANDIDATE ADDED:",
          p
        );
      } else {
        console.log(
          "GOLD SKIPPED - NO MT5 PRICE:",
          goldPair
        );
      }

      /* =====================================================
         SILVER
      ===================================================== */

      if (
        mt5Prices[silverPair]
      ) {
        const p =
          mt5Prices[
            silverPair
          ];

        candidates.push({
          pair:
            silverPair,

          category:
            "COMMODITIES",

          mainCategory:
            "COMMODITIES",

          subCategory:
            silverPair,

          price: {
            price: p,
            high:
              p +
              Math.max(
                0.5,
                Math.abs(
                  silverMarket.high -
                    silverMarket.price
                )
              ),
            low:
              p -
              Math.max(
                0.5,
                Math.abs(
                  silverMarket.price -
                    silverMarket.low
                )
              ),
          },

          pipMultiplier: 0.01,
          decimals: 3,
          thresholdPct: 0.20,
        });

        console.log(
          "SILVER CANDIDATE ADDED:",
          p
        );
      } else {
        console.log(
          "SILVER SKIPPED - NO MT5 PRICE:",
          silverPair
        );
      }

      /* =====================================================
         FOREX
      ===================================================== */

      for (
        const fr of forexResults
      ) {
        if (
          !mt5Prices[
            fr.pair
          ]
        ) {
          console.log(
            "FOREX skipped:",
            fr.pair
          );
          continue;
        }

        const isJpy =
          fr.pair.includes(
            "JPY"
          );

        const mt5Price =
          mt5Prices[
            fr.pair
          ];

        candidates.push({
          pair:
            fr.pair,

          category:
            "FOREX",

          mainCategory:
            "FOREX",

          subCategory:
            fr.pair,

          price: {
            price:
              mt5Price,

            high:
              mt5Price +
              Math.abs(
                fr.data.high -
                  fr.data.price
              ),

            low:
              mt5Price -
              Math.abs(
                fr.data.price -
                  fr.data.low
              ),
          },

          pipMultiplier:
            isJpy
              ? 0.1
              : 0.001,

          decimals:
            isJpy
              ? 3
              : 5,

          thresholdPct:
            0.12,
        });
      }

      /* =====================================================
         CRYPTO
      ===================================================== */

      for (
        const pair of cryptoPairPool
      ) {
        if (
          !mt5Prices[pair]
        ) {
          console.log(
            "CRYPTO skipped:",
            pair
          );
          continue;
        }

        const pd =
          cryptoPrices[
            pair
          ];

        if (!pd) continue;

        const mt5Price =
          mt5Prices[pair];

        const isSmall =
          mt5Price < 10;

        candidates.push({
          pair,

          category:
            "CRYPTO",

          mainCategory:
            "CRYPTO",

          subCategory:
            pair,

          price: {
            price:
              mt5Price,

            high:
              mt5Price +
              Math.abs(
                pd.high -
                  pd.price
              ),

            low:
              mt5Price -
              Math.abs(
                pd.price -
                  pd.low
              ),
          },

          pipMultiplier:
            mt5Price > 1000
              ? 100
              : mt5Price > 50
              ? 1
              : 0.01,

          decimals:
            isSmall
              ? 4
              : mt5Price > 1000
              ? 2
              : 2,

          thresholdPct:
            0.4,
        });
      }

      /* =====================================================
         DERIV
      ===================================================== */

      const derivPipMap:
        Record<string, number> =
        {
          "BOOM 1000": 10,
          "CRASH 1000": 10,
          "VOL 75": 1,
          "BOOM 500": 10,
        };

      for (
        const pair of derivPairNames
      ) {
        const p =
          mt5Prices[pair];

        if (
          !p ||
          p <= 0
        ) {
          console.log(
            "DERIV skipped:",
            pair
          );
          continue;
        }

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
              p * 1.002,
            low:
              p * 0.998,
          },

          pipMultiplier:
            derivPipMap[
              pair
            ] || 1,

          decimals: 0,

          thresholdPct:
            0.15,
        });
      }

      console.log(
        "TOTAL CANDIDATES:",
        candidates.map(
          (c) =>
            `${c.pair} -> ${c.mainCategory}`
        )
      );

      /* =====================================================
         EVALUATE
      ===================================================== */

      const newSignals:
        any[] = [];

      const decisions:
        Record<
          string,
          any
        > = {};

      for (
        const candidate of
          candidates
      ) {
        const result =
          await evaluatePair(
            supabase,
            candidate.pair,
            candidate.price.price,
            candidate.thresholdPct
          );

        decisions[
          candidate.pair
        ] = {
          generated:
            result.generate,

          reason:
            result.reason,

          pctMove:
            result.pctMove,
        };

        if (
          result.generate
        ) {
          newSignals.push(
            generateOneOpenSignal(
              candidate
            )
          );
        }
      }

      /* =====================================================
         NO SIGNAL
      ===================================================== */

      if (
        newSignals.length ===
        0
      ) {
        console.log(
          "No signals generated."
        );

        return new Response(
          JSON.stringify({
            success: true,
            generated: false,
            signals_created: 0,
            session,
            candidates:
              candidates.map(
                (c) => c.pair
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
              "Failed to insert signals",
            details:
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
      ===================================================== */

      const telegramResults:
        Record<
          string,
          boolean
        > = {};

      if (
        data &&
        data.length > 0
      ) {
        await Promise.allSettled(
          data.map(
            async (signal) => {
              const success =
                await postTelegram(
                  signal,
                  supabaseUrl,
                  serviceRoleKey
                );

              telegramResults[
                signal.pair
              ] = success;
            }
          )
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

          telegram_posted:
            telegramResults,

          candidates:
            candidates.map(
              (c) => ({
                pair:
                  c.pair,

                category:
                  c.mainCategory,
              })
            ),

          decisions,

          signals:
            data || [],
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
  }
);
