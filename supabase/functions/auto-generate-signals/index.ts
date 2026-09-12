import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// =========================================================
// HELPERS & MARKET OPEN CHECK
// =========================================================

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// WEEKEND CHECK: Crypto and Deriv run 24/7. Forex/Commodities close on Weekend.
function isMarketOpen(category: string): boolean {
  if (category === "CRYPTO" || category === "DERIV") {
    return true; // Always 24/7 open
  }

  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const hour = now.getUTCHours();

  if (day === 6) return false; // Saturday closed
  if (day === 5 && hour >= 22) return false; // Friday after 10 PM UTC closed
  if (day === 0 && hour < 22) return false; // Sunday before 10 PM UTC closed

  return true;
}

// =========================================================
// LIVE PRICES
// =========================================================

async function fetchLivePrices() {
  const pairs = [
    "XAUUSD", "XAGUSD", "BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD", "LTCUSD", "ADAUSD",
    "EURUSD", "GBPUSD", "USDJPY", "CHFJPY", "CADJPY", "AUDUSD", "NZDUSD", "USDCAD", "USDCHF",
    "US30", "NASDAQ", "SP500", "DAX", "FTSE100", "OIL", "BRENT", "NGAS",
    "BOOM1000", "CRASH1000", "VOL75", "BOOM500", "VOL100"
  ];

  let prices: Record<string, any> = {};

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/fetch-live-prices?pairs=${pairs.join(",")}`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      prices = data?.prices || data || {};
    }
  } catch (err) {
    console.error("Live price fetch error:", err);
  }

  const aliases: Record<string, string[]> = {
    // COMMODITIE
    "XAU/USD (Gold)": ["XAUUSD", "GOLD", "XAU/USD (Gold)"],
    "XAG/USD (Silver)": ["XAGUSD", "SILVER", "XAG/USD (Silver)"],
    "Oil - Crude": ["OIL", "WTI", "CRUDE", "Oil - Crude"],
    "Oil - Brent": ["BRENT", "Oil - Brent"],
    "Natural Gas": ["NGAS", "GAS", "Natural Gas"],
    "US30": ["US30", "DJI", "DOW"],
    "NASDAQ": ["NASDAQ", "NAS100", "USTEC"],
    "S&P500": ["SP500", "US500"],
    "DAX": ["DAX", "GER30", "GER40"],
    "FTSE100": ["FTSE100", "UK100"],

    // FOREX
    "EUR/USD": ["EURUSD", "EUR/USD"],
    "GBP/USD": ["GBPUSD", "GBP/USD"],
    "USD/JPY": ["USDJPY", "USD/JPY"],
    "CHF/JPY": ["CHFJPY", "CHF/JPY"],
    "CAD/JPY": ["CADJPY", "CAD/JPY"],
    "AUD/USD": ["AUDUSD", "AUD/USD"],
    "NZD/USD": ["NZDUSD", "NZD/USD"],
    "USD/CAD": ["USDCAD", "USD/CAD"],
    "USD/CHF": ["USDCHF", "USD/CHF"],

    // CRYPTO
    "BTC/USD": ["BTCUSD", "BTCUSDT", "BTC/USD"],
    "ETH/USD": ["ETHUSD", "ETHUSDT", "ETH/USD"],
    "XRP/USD": ["XRPUSD", "XRPUSDT", "XRP/USD"],
    "LTC/USD": ["LTCUSD", "LTCUSDT", "LTC/USD"],
    "ADA/USD": ["ADAUSD", "ADAUSDT", "ADA/USD"],
    "SOL/USD": ["SOLUSD", "SOLUSDT", "SOL/USD"],

    // DERIV
    "BOOM 1000": ["BOOM1000", "BOOM 1000"],
    "CRASH 1000": ["CRASH1000", "CRASH 1000"],
    "VOL 75": ["VOL75", "VOL 75"],
    "BOOM 500": ["BOOM500", "BOOM 500"],
    "VOL 100": ["VOL100", "VOL 100"],
  };

  const result: Record<string, any> = {};

  for (const [standardName, possibleKeys] of Object.entries(aliases)) {
    for (const key of possibleKeys) {
      if (prices[key]) {
        result[standardName] = prices[key];
        break;
      }
    }
  }

  return result;
}

// =========================================================
// REASONS
// =========================================================

const buyReasons = [
  "Bullish FVG + market structure support",
  "Bullish BOS with strong demand zone",
  "SMC bullish setup with liquidity sweep",
  "Price holding above key support",
  "Bullish order block + FVG confirmation",
];

const sellReasons = [
  "Bearish FVG + market structure resistance",
  "Bearish BOS with strong supply zone",
  "SMC bearish setup with liquidity sweep",
  "Price rejected from key resistance",
  "Bearish order block + FVG confirmation",
];

// =========================================================
// LEVEL GENERATORS
// =========================================================

function generateGoldLevels(entry: number, isBuy: boolean) {
  const slDistance = rand(15, 25);
  const tp1Distance = rand(3, 5);
  const tp2Distance = rand(8, 15);
  const tp3Distance = rand(15, 25);

  const sl = isBuy ? entry - slDistance : entry + slDistance;
  const tp1 = isBuy ? entry + tp1Distance : entry - tp1Distance;
  const tp2 = isBuy ? entry + tp2Distance : entry - tp2Distance;
  const tp3 = isBuy ? entry + tp3Distance : entry - tp3Distance;

  return {
    sl: Number(sl.toFixed(2)),
    tp1: Number(tp1.toFixed(2)),
    tp2: Number(tp2.toFixed(2)),
    tp3: Number(tp3.toFixed(2)),
  };
}

function generateSilverLevels(entry: number, isBuy: boolean) {
  const slDistance = rand(1.5, 3);
  const tp1Distance = rand(0.5, 1);
  const tp2Distance = rand(1, 2);
  const tp3Distance = rand(2, 3);

  const sl = isBuy ? entry - slDistance : entry + slDistance;
  const tp1 = isBuy ? entry + tp1Distance : entry - tp1Distance;
  const tp2 = isBuy ? entry + tp2Distance : entry - tp2Distance;
  const tp3 = isBuy ? entry + tp3Distance : entry - tp3Distance;

  return {
    sl: Number(sl.toFixed(3)),
    tp1: Number(tp1.toFixed(3)),
    tp2: Number(tp2.toFixed(3)),
    tp3: Number(tp3.toFixed(3)),
  };
}

function generateBTCLevels(entry: number, isBuy: boolean) {
  const slDistance = rand(30, 60);
  const tp1Distance = rand(20, 35);
  const tp2Distance = rand(45, 70);
  const tp3Distance = rand(80, 120);

  const sl = isBuy ? entry - slDistance : entry + slDistance;
  const tp1 = isBuy ? entry + tp1Distance : entry - tp1Distance;
  const tp2 = isBuy ? entry + tp2Distance : entry - tp2Distance;
  const tp3 = isBuy ? entry + tp3Distance : entry - tp3Distance;

  return {
    sl: Number(sl.toFixed(2)),
    tp1: Number(tp1.toFixed(2)),
    tp2: Number(tp2.toFixed(2)),
    tp3: Number(tp3.toFixed(2)),
  };
}

// =========================================================
// SIGNAL GENERATOR
// =========================================================

function generateSignal(config: any) {
  const { pair, price, pipMultiplier, decimals, category } = config;

  const currentPrice = Number(price.price);

  const isGold = pair === "XAU/USD (Gold)";
  const isSilver = pair === "XAG/USD (Silver)";
  const isBTC = pair === "BTC/USD";
  const isIndex = ["US30", "NASDAQ", "S&P500", "DAX", "FTSE100"].includes(pair);
  const isVol75 = pair === "VOL 75";
  const isDeriv = category === "DERIV";

  const isBuy = Math.random() > 0.5;

  let entryOffset = 0;

  if (isGold) {
    entryOffset = rand(-0.50, 0.50);
  } else if (isSilver) {
    entryOffset = rand(-0.10, 0.10);
  } else if (isBTC) {
    entryOffset = rand(-10, 10);
  } else if (isIndex) {
    entryOffset = rand(-2, 2);
  } else if (isVol75 || isDeriv) {
    entryOffset = rand(-5, 5);
  } else {
    entryOffset = rand(-pipMultiplier * 3, pipMultiplier * 3);
  }

  const entry = Number((currentPrice + entryOffset).toFixed(decimals));

  let levels;

  if (isGold) {
    levels = generateGoldLevels(entry, isBuy);
  } else if (isSilver) {
    levels = generateSilverLevels(entry, isBuy);
  } else if (isBTC) {
    levels = generateBTCLevels(entry, isBuy);
  } else if (isIndex) {
    const slDistance = rand(20, 35);
    const tp1Distance = rand(10, 18);
    const tp2Distance = rand(20, 30);
    const tp3Distance = rand(30, 50);

    levels = {
      sl: Number((isBuy ? entry - slDistance : entry + slDistance).toFixed(2)),
      tp1: Number((isBuy ? entry + tp1Distance : entry - tp1Distance).toFixed(2)),
      tp2: Number((isBuy ? entry + tp2Distance : entry - tp2Distance).toFixed(2)),
      tp3: Number((isBuy ? entry + tp3Distance : entry - tp3Distance).toFixed(2)),
    };
  } else if (isVol75) {
    const slDistance = rand(150, 250);
    const tp1Distance = rand(150, 250);
    const tp2Distance = rand(300, 450);
    const tp3Distance = rand(500, 700);

    levels = {
      sl: Number((isBuy ? entry - slDistance : entry + slDistance).toFixed(2)),
      tp1: Number((isBuy ? entry + tp1Distance : entry - tp1Distance).toFixed(2)),
      tp2: Number((isBuy ? entry + tp2Distance : entry - tp2Distance).toFixed(2)),
      tp3: Number((isBuy ? entry + tp3Distance : entry - tp3Distance).toFixed(2)),
    };
  } else if (isDeriv) {
    const slDistance = rand(40, 80);
    const tp1Distance = rand(40, 80);
    const tp2Distance = rand(90, 150);
    const tp3Distance = rand(160, 250);

    levels = {
      sl: Number((isBuy ? entry - slDistance : entry + slDistance).toFixed(2)),
      tp1: Number((isBuy ? entry + tp1Distance : entry - tp1Distance).toFixed(2)),
      tp2: Number((isBuy ? entry + tp2Distance : entry - tp2Distance).toFixed(2)),
      tp3: Number((isBuy ? entry + tp3Distance : entry - tp3Distance).toFixed(2)),
    };
  } else {
    const slDistance = rand(12, 20) * pipMultiplier;
    const tp1Distance = rand(15, 25) * pipMultiplier;
    const tp2Distance = rand(30, 45) * pipMultiplier;
    const tp3Distance = rand(50, 75) * pipMultiplier;

    levels = {
      sl: Number((isBuy ? entry - slDistance : entry + slDistance).toFixed(decimals)),
      tp1: Number((isBuy ? entry + tp1Distance : entry - tp1Distance).toFixed(decimals)),
      tp2: Number((isBuy ? entry + tp2Distance : entry - tp2Distance).toFixed(decimals)),
      tp3: Number((isBuy ? entry + tp3Distance : entry - tp3Distance).toFixed(decimals)),
    };
  }

  return {
    pair,
    symbol: pair,
    category, // EXACT APP CATEGORY (COMMODITIE, FOREX, CRYPTO, DERIV)
    action: isBuy ? "BUY" : "SELL",
    direction: isBuy ? "BUY" : "SELL",
    type: isBuy ? "BUY" : "SELL",
    entry,
    current_price: currentPrice,
    currentPrice,
    sl: levels.sl,
    tp1: levels.tp1,
    tp2: levels.tp2,
    tp3: levels.tp3,
    stop_loss: levels.sl,
    target1: levels.tp1,
    target2: levels.tp2,
    target3: levels.tp3,
    reason: pick(isBuy ? buyReasons : sellReasons),
    signal_type: isGold ? "Scalping" : pick(["Scalping", "Intraday", "Swing"]),
    created_at: new Date().toISOString(),
  };
}

function getExpiryHours(signalType: string): number {
  if (signalType === "Scalping") return 3;
  if (signalType === "Intraday") return 12;
  if (signalType === "Swing") return 72;
  return 6;
}

// =========================================================
// VALIDATION
// =========================================================

function validateSignal(signal: any, currentPrice: number) {
  const entry = Number(signal.entry);
  const sl = Number(signal.sl);
  const tp1 = Number(signal.tp1);
  const tp2 = Number(signal.tp2);
  const tp3 = Number(signal.tp3);

  if (
    !Number.isFinite(entry) ||
    !Number.isFinite(sl) ||
    !Number.isFinite(tp1) ||
    !Number.isFinite(tp2) ||
    !Number.isFinite(tp3)
  ) {
    return false;
  }

  if (signal.action === "BUY") {
    if (!(sl < entry && entry < tp1 && tp1 < tp2 && tp2 < tp3)) return false;
  } else {
    if (!(sl > entry && entry > tp1 && tp1 > tp2 && tp2 > tp3)) return false;
  }

  return true;
}

async function evaluatePair(pair: string) {
  const { data, error } = await supabase
    .from("signals")
    .select("id, pair, status")
    .eq("pair", pair)
    .eq("status", "OPEN")
    .limit(1);

  if (error) return false;
  return !data || data.length === 0;
}

// =========================================================
// TELEGRAM POST
// =========================================================

async function postTelegram(signal: any) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/telegram-signal-post`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          action: "new_signal",
          signal: {
            ...signal,
            type: signal.type || signal.action || signal.direction,
          },
        }),
      }
    );

    const resultText = await response.text();
    let parsed: any = null;
    try { parsed = JSON.parse(resultText); } catch {}

    const ok = response.ok && parsed?.success === true;

    return {
      success: ok,
      error: parsed?.error || null,
      message_id: parsed?.message_id ?? null,
      chat_id: parsed?.chat_id ?? null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// =========================================================
// MAIN
// =========================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const livePrices = await fetchLivePrices();

    // STRICT CATEGORY MAPPING TO APP UI TABS
    const commodities = [
      { pair: "XAU/USD (Gold)", pipMultiplier: 1, decimals: 2, category: "COMMODITIE" },
      { pair: "XAG/USD (Silver)", pipMultiplier: 0.05, decimals: 3, category: "COMMODITIE" },
      { pair: "Oil - Crude", pipMultiplier: 0.1, decimals: 2, category: "COMMODITIE" },
      { pair: "Oil - Brent", pipMultiplier: 0.1, decimals: 2, category: "COMMODITIE" },
      { pair: "Natural Gas", pipMultiplier: 0.01, decimals: 3, category: "COMMODITIE" },
      { pair: "US30", pipMultiplier: 1, decimals: 2, category: "COMMODITIE" },
      { pair: "NASDAQ", pipMultiplier: 1, decimals: 2, category: "COMMODITIE" },
      { pair: "S&P500", pipMultiplier: 1, decimals: 2, category: "COMMODITIE" },
      { pair: "DAX", pipMultiplier: 1, decimals: 2, category: "COMMODITIE" },
      { pair: "FTSE100", pipMultiplier: 1, decimals: 2, category: "COMMODITIE" },
    ];

    const forex = [
      { pair: "EUR/USD", pipMultiplier: 0.001, decimals: 5, category: "FOREX" },
      { pair: "GBP/USD", pipMultiplier: 0.001, decimals: 5, category: "FOREX" },
      { pair: "USD/JPY", pipMultiplier: 0.1, decimals: 3, category: "FOREX" },
      { pair: "CHF/JPY", pipMultiplier: 0.1, decimals: 3, category: "FOREX" },
      { pair: "CAD/JPY", pipMultiplier: 0.1, decimals: 3, category: "FOREX" },
      { pair: "AUD/USD", pipMultiplier: 0.001, decimals: 5, category: "FOREX" },
      { pair: "NZD/USD", pipMultiplier: 0.001, decimals: 5, category: "FOREX" },
      { pair: "USD/CAD", pipMultiplier: 0.001, decimals: 5, category: "FOREX" },
      { pair: "USD/CHF", pipMultiplier: 0.001, decimals: 5, category: "FOREX" },
    ];

    const crypto = [
      { pair: "BTC/USD", pipMultiplier: 1, decimals: 2, category: "CRYPTO" },
      { pair: "ETH/USD", pipMultiplier: 1, decimals: 2, category: "CRYPTO" },
      { pair: "XRP/USD", pipMultiplier: 0.001, decimals: 4, category: "CRYPTO" },
      { pair: "LTC/USD", pipMultiplier: 0.1, decimals: 2, category: "CRYPTO" },
      { pair: "ADA/USD", pipMultiplier: 0.001, decimals: 4, category: "CRYPTO" },
      { pair: "SOL/USD", pipMultiplier: 1, decimals: 2, category: "CRYPTO" },
    ];

    const deriv = [
      { pair: "BOOM 1000", pipMultiplier: 10, decimals: 2, category: "DERIV" },
      { pair: "CRASH 1000", pipMultiplier: 10, decimals: 2, category: "DERIV" },
      { pair: "VOL 75", pipMultiplier: 1, decimals: 2, category: "DERIV" },
      { pair: "BOOM 500", pipMultiplier: 10, decimals: 2, category: "DERIV" },
      { pair: "VOL 100", pipMultiplier: 10, decimals: 2, category: "DERIV" },
    ];

    const allPairs = [...commodities, ...forex, ...crypto, ...deriv];

    // FILTER OUT CLOSED MARKETS ON WEEKENDS
    const openPairs = allPairs.filter((item) => isMarketOpen(item.category));

    if (openPairs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          generated: false,
          reason: "Market is closed for selected categories on weekend.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selected = pick(openPairs);
    const live = livePrices[selected.pair];

    if (!live || !Number.isFinite(Number(live.price))) {
      return new Response(
        JSON.stringify({
          success: true,
          generated: false,
          reason: `No live price available for ${selected.pair}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const canGenerate = await evaluatePair(selected.pair);
    if (!canGenerate) {
      return new Response(
        JSON.stringify({
          success: true,
          generated: false,
          reason: `${selected.pair} already has an active open signal`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const signal = generateSignal({ ...selected, price: live });
    const currentPrice = Number(live.price);

    if (!validateSignal(signal, currentPrice)) {
      return new Response(
        JSON.stringify({
          success: true,
          generated: false,
          reason: "Signal validation failed",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expiryTime = new Date(
      Date.now() + getExpiryHours(signal.signal_type) * 60 * 60 * 1000
    ).toISOString();

    const insertData = {
      pair: signal.pair,
      symbol: signal.symbol,
      category: signal.category,
      type: signal.type,
      action: signal.action,
      direction: signal.direction,
      entry: signal.entry,
      current_price: signal.currentPrice,
      sl: signal.sl,
      tp1: signal.tp1,
      tp2: signal.tp2,
      tp3: signal.tp3,
      stop_loss: signal.stop_loss,
      target1: signal.target1,
      target2: signal.target2,
      target3: signal.target3,
      analysis_reason: signal.reason,
      reason: signal.reason,
      signal_type: signal.signal_type,
      status: "OPEN",
      signal_status: "OPEN",
      expiry_time: expiryTime,
      created_at: signal.created_at,
    };

    const { data: inserted, error } = await supabase
      .from("signals")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    const telegramResult = await postTelegram({
      ...signal,
      id: inserted?.id,
    });

    if (inserted?.id && telegramResult.message_id) {
      await supabase
        .from("signals")
        .update({
          telegram_message_id: telegramResult.message_id,
          telegram_chat_id: telegramResult.chat_id
            ? String(telegramResult.chat_id)
            : null,
        })
        .eq("id", inserted.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated: true,
        signal: inserted,
        telegram_posted: telegramResult.success,
        telegram_error: telegramResult.error,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        generated: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
