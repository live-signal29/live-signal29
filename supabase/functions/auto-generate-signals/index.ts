import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_FUNCTION_URL =
  `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-signal-post`;

const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

interface PriceData {
  price: number;
  high: number;
  low: number;
}

async function fetchGoldPrice(): Promise<PriceData> {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d",
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      const quote = data.chart?.result?.[0]?.indicators?.quote?.[0];

      if (meta?.regularMarketPrice) {
        return {
          price: meta.regularMarketPrice,
          high:
            quote?.high?.[0] ||
            meta.regularMarketPrice + 15,
          low:
            quote?.low?.[0] ||
            meta.regularMarketPrice - 15,
        };
      }
    }
  } catch (e) {
    console.log("Yahoo gold failed:", e);
  }

  return {
    price: 2650,
    high: 2665,
    low: 2635,
  };
}

async function fetchForexPrice(
  symbol: string
): Promise<PriceData> {
  try {
    const yahooSymbol =
      symbol.replace("/", "") + "=X";

    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;

      if (meta?.regularMarketPrice) {
        const spread =
          meta.regularMarketPrice * 0.003;

        return {
          price: meta.regularMarketPrice,
          high: meta.regularMarketPrice + spread,
          low: meta.regularMarketPrice - spread,
        };
      }
    }
  } catch (e) {
    console.log(
      `Yahoo forex ${symbol} failed:`,
      e
    );
  }

  const fallback: Record<string, number> = {
    "EUR/USD": 1.0830,
    "GBP/USD": 1.2940,
    "USD/JPY": 149.60,
  };

  const p = fallback[symbol] || 1.0;
  const s = p * 0.003;

  return {
    price: p,
    high: p + s,
    low: p - s,
  };
}

async function fetchCryptoPrices(): Promise<
  Record<string, PriceData>
> {
  const result: Record<string, PriceData> = {};

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_high=true&include_24hr_low=true"
    );

    if (res.ok) {
      const data = await res.json();

      if (data.bitcoin?.usd) {
        result["BTC/USD"] = {
          price: data.bitcoin.usd,
          high: data.bitcoin.usd * 1.01,
          low: data.bitcoin.usd * 0.99,
        };
      }

      if (data.ethereum?.usd) {
        result["ETH/USD"] = {
          price: data.ethereum.usd,
          high: data.ethereum.usd * 1.01,
          low: data.ethereum.usd * 0.99,
        };
      }
    }
  } catch (e) {
    console.log("Crypto fetch failed:", e);
  }

  if (!result["BTC/USD"]) {
    result["BTC/USD"] = {
      price: 83500,
      high: 84000,
      low: 83000,
    };
  }

  if (!result["ETH/USD"]) {
    result["ETH/USD"] = {
      price: 2450,
      high: 2480,
      low: 2420,
    };
  }

  return result;
}

function rand(
  min: number,
  max: number
) {
  return (
    Math.round(
      (min + Math.random() * (max - min)) * 100
    ) / 100
  );
}

function generateSignalsForAsset(
  config: any,
  count: number
) {
  const {
    pair,
    category,
    mainCategory,
    subCategory,
    price,
    decimals,
  } = config;

  const signals = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const isBuy = i % 2 === 0;

    const type = isBuy ? "Buy" : "Sell";

    const spread = price.high - price.low;

    const entryOffset = rand(
      -spread * 0.05,
      spread * 0.05
    );

    const entry = +(
      price.price + entryOffset
    ).toFixed(decimals);

    const tp1d =
      entry * (rand(0.3, 0.6) / 100);

    const tp2d =
      entry * (rand(0.7, 1.2) / 100);

    const tp3d =
      entry * (rand(1.3, 2.0) / 100);

    const sld =
      entry * (rand(0.4, 0.8) / 100);

    const tp1 = +(
      isBuy
        ? entry + tp1d
        : entry - tp1d
    ).toFixed(decimals);

    const tp2 = +(
      isBuy
        ? entry + tp2d
        : entry - tp2d
    ).toFixed(decimals);

    const tp3 = +(
      isBuy
        ? entry + tp3d
        : entry - tp3d
    ).toFixed(decimals);

    const sl = +(
      isBuy
        ? entry - sld
        : entry + sld
    ).toFixed(decimals);

    const isOpen =
      i === count - 1 ||
      (i === 0 && count === 1);

    const signalTime = new Date(
      now.getTime() -
        (count - 1 - i) * 60000
    );

    signals.push({
      pair,
      type,
      category,
      main_category: mainCategory,
      sub_category: subCategory,

      entry: entry.toString(),
      tp1: tp1.toString(),
      tp2: tp2.toString(),
      tp3: tp3.toString(),
      sl: sl.toString(),

      status: isOpen ? "open" : "close",
      signal_status: isOpen ? "open" : "close",

      is_premium: i % 2 === 1,
      is_activated: true,

      activated_at:
        signalTime.toISOString(),

      entry_mode: "market",
      signal_type: "Intraday",
      risk_level: "Medium",

      analysis_reason: isBuy
        ? "Demand zone bounce"
        : "Supply zone rejection",

      published: true,

      created_at:
        signalTime.toISOString(),

      tp1_hit: !isOpen,
      tp2_hit: !isOpen,
      tp3_hit: false,

      profit_note: !isOpen
        ? "TP 2 Secured! 💰 Signal Closed"
        : null,
    });
  }

  return signals;
}

/**
 * Send one signal to Telegram
 */
async function sendTelegramSignal(
  signal: any
): Promise<boolean> {
  try {
    const response = await fetch(
      TELEGRAM_FUNCTION_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          ...(SUPABASE_ANON_KEY
            ? {
                Authorization:
                  `Bearer ${SUPABASE_ANON_KEY}`,
              }
            : {}),
        },

        body: JSON.stringify({
          action: "new_signal",

          signal: {
            id: signal.id,
            pair: signal.pair,
            type: signal.type,
            entry: signal.entry,
            tp1: signal.tp1,
            tp2: signal.tp2,
            tp3: signal.tp3,
            tp4: signal.tp4,
            sl: signal.sl,
            risk_level:
              signal.risk_level,
            signal_type:
              signal.signal_type,
            analysis_reason:
              signal.analysis_reason,
          },
        }),
      }
    );

    const result = await response.json();

    console.log(
      "Telegram result:",
      result
    );

    return (
      response.ok &&
      result?.success === true
    );
  } catch (error) {
    console.error(
      "Telegram send failed:",
      error
    );

    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Supabase environment variables are missing"
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    /*
     * Close previous open signals
     */
    const { error: closeError } =
      await supabase
        .from("signals")
        .update({
          signal_status: "close",
          status: "close",
          tp1_hit: true,
          tp2_hit: true,
          profit_note:
            "TP 2 Secured! 💰 Signal Closed",
        })
        .or(
          "signal_status.eq.open,status.eq.open"
        );

    if (closeError) {
      console.error(
        "Close old signals error:",
        closeError
      );
    }

    /*
     * Fetch prices
     */
    const [
      goldPrice,
      cryptoPrices,
      eurPrice,
      gbpPrice,
    ] = await Promise.all([
      fetchGoldPrice(),
      fetchCryptoPrices(),
      fetchForexPrice("EUR/USD"),
      fetchForexPrice("GBP/USD"),
    ]);

    /*
     * Generate signals
     *
     * IMPORTANT:
     * Gold uses XAU/USD (Gold)
     * to match dashboard dropdown.
     */
    const allSignals = [
      ...generateSignalsForAsset(
        {
          pair: "XAU/USD",
          category: "COMMODITIES",
          mainCategory: "COMMODITIES",
          subCategory: "XAU/USD",
          price: goldPrice,
          decimals: 0,
        },
        3
      ),

      ...generateSignalsForAsset(
        {
          pair: "EUR/USD",
          category: "FOREX",
          mainCategory: "FOREX",
          subCategory: "EUR/USD",
          price: eurPrice,
          decimals: 4,
        },
        2
      ),

      ...generateSignalsForAsset(
        {
          pair: "GBP/USD",
          category: "FOREX",
          mainCategory: "FOREX",
          subCategory: "GBP/USD",
          price: gbpPrice,
          decimals: 4,
        },
        2
      ),

      ...generateSignalsForAsset(
        {
          pair: "BTC/USD",
          category: "CRYPTO",
          mainCategory: "CRYPTO",
          subCategory: "BTC/USD",
          price: cryptoPrices["BTC/USD"],
          decimals: 0,
        },
        2
      ),

      ...generateSignalsForAsset(
        {
          pair: "ETH/USD",
          category: "CRYPTO",
          mainCategory: "CRYPTO",
          subCategory: "ETH/USD",
          price: cryptoPrices["ETH/USD"],
          decimals: 0,
        },
        2
      ),
    ];

    /*
     * Insert signals
     */
    const {
      data,
      error,
    } = await supabase
      .from("signals")
      .insert(allSignals)
      .select("*");

    if (error) {
      console.error(
        "Signal insert error:",
        error
      );

      throw error;
    }

    /*
     * Send each NEW signal to Telegram
     */
    let telegramSent = 0;
    let telegramFailed = 0;

    if (data && data.length > 0) {
      for (const signal of data) {
        const sent =
          await sendTelegramSignal(
            signal
          );

        if (sent) {
          telegramSent++;
        } else {
          telegramFailed++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,

        signals_created:
          data?.length || 0,

        telegram_sent:
          telegramSent,

        telegram_failed:
          telegramFailed,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  } catch (err) {
    console.error(
      "auto-generate-signals error:",
      err
    );

    return new Response(
      JSON.stringify({
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Unknown error",
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
