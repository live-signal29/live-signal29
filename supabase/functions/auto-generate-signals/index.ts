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
// MARKET HOURS CHECKER (FIXED CATEGORIES & WEEKENDS)
// =========================================================

function isMarketOpen(item: { pair: string; category: string }): boolean {
  const { category } = item;

  // Crypto aur Deriv indices 24/7 chalte hain
  if (category === "CRYPTO" || category === "DERIV") {
    return true;
  }

  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const hour = now.getUTCHours();

  // Friday 22:00 UTC se Sunday 22:00 UTC tak Forex & Commodities band hotay hain
  if (day === 6) return false; // Saturday (Closed)
  if (day === 5 && hour >= 22) return false; // Friday late night
  if (day === 0 && hour < 22) return false; // Sunday early morning

  return true;
}

// =========================================================
// HELPERS
// =========================================================

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// =========================================================
// LIVE PRICES
// =========================================================

async function fetchLivePrices() {
  const pairs = [
    "XAUUSD",
    "XAGUSD",
    "BTCUSD",
    "ETHUSD",
    "SOLUSD",
    "EURUSD",
    "GBPUSD",
    "USDJPY",
    "AUDUSD",
    "GBPJPY",
    "USDCAD",
    "US30",
    "NASDAQ",
    "SP500",
    "BOOM1000",
    "CRASH1000",
    "VOL75",
    "BOOM500",
    "VOL100",
  ];

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/fetch-live-prices?pairs=${pairs.join(",")}`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Live price function failed: ${response.status}`);
  }

  const data = await response.json();
  const prices = data?.prices || data || {};

  const aliases: Record<string, string[]> = {
    "XAU/USD (Gold)": ["XAUUSD", "GOLD", "XAU/USD (Gold)"],
    "XAG/USD (Silver)": ["XAGUSD", "SILVER", "XAG/USD (Silver)"],
    "BTC/USD": ["BTCUSD", "BTCUSDT", "BTC/USD"],
    "ETH/USD": ["ETHUSD", "ETHUSDT", "ETH/USD"],
    "SOL/USD": ["SOLUSD", "SOLUSDT", "SOL/USD"],

    "EUR/USD": ["EURUSD", "EUR/USD"],
    "GBP/USD": ["GBPUSD", "GBP/USD"],
    "USD/JPY": ["USDJPY", "USD/JPY"],
    "AUD/USD": ["AUDUSD", "AUD/USD"],
    "GBP/JPY": ["GBPJPY", "GBP/JPY"],
    "USD/CAD": ["USDCAD", "USD/CAD"],

    "US30": ["US30", "DJI", "DOW"],
    "NASDAQ": ["NASDAQ", "NAS100", "USTEC"],
    "S&P500": ["SP500", "US500"],

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
  const { pair, price, pipMultiplier, decimals } = config;
  const currentPrice = Number(price.price);

  const isGold = pair === "XAU/USD (Gold)";
  const isSilver = pair === "XAG/USD (Silver)";
  const isBTC = pair === "BTC/USD";
  const isIndex = ["US30", "NASDAQ", "S&P500"].includes(pair);
  const isVol75 = pair === "VOL 75";
  const isDeriv = ["BOOM 1000", "CRASH 1000", "VOL 75", "BOOM 500", "VOL 100"].includes(pair);

  const isBuy = Math.random() > 0.5;

  let entryOffset = 0;
  if (isGold) entryOffset = rand(-0.50, 0.50);
  else if (isSilver) entryOffset = rand(-0.10, 0.10);
  else if (isBTC) entryOffset = rand(-10, 10);
  else if (isIndex) entryOffset = rand(-2, 2);
  else if (isVol75 || isDeriv) entryOffset = rand(-5, 5);
  else entryOffset = rand(-pipMultiplier * 3, pipMultiplier * 3);

  const entry = Number((currentPrice + entryOffset).toFixed(decimals));

  let levels;
  if (isGold) levels = generateGoldLevels(entry, isBuy);
  else if (isSilver) levels = generateSilverLevels(entry, isBuy);
  else if (isBTC) levels = generateBTCLevels(entry, isBuy);
  else if (isIndex) {
    const slDist = rand(20, 35);
    levels = {
      sl: Number((isBuy ? entry - slDist : entry + slDist).toFixed(2)),
      tp1: Number((isBuy ? entry + rand(10, 18) : entry - rand(10, 18)).toFixed(2)),
      tp2: Number((isBuy ? entry + rand(20, 30) : entry - rand(20, 30)).toFixed(2)),
      tp3: Number((isBuy ? entry + rand(30, 50) : entry - rand(30, 50)).toFixed(2)),
    };
  } else if (isVol75) {
    levels = {
      sl: Number((isBuy ? entry - rand(150, 250) : entry + rand(150, 250)).toFixed(2)),
      tp1: Number((isBuy ? entry + rand(150, 250) : entry - rand(150, 250)).toFixed(2)),
      tp2: Number((isBuy ? entry + rand(300, 450) : entry - rand(300, 450)).toFixed(2)),
      tp3: Number((isBuy ? entry + rand(500, 700) : entry - rand(500, 700)).toFixed(2)),
    };
  } else if (isDeriv) {
    levels = {
      sl: Number((isBuy ? entry - rand(40, 80) : entry + rand(40, 80)).toFixed(2)),
      tp1: Number((isBuy ? entry + rand(40, 80) : entry - rand(40, 80)).toFixed(2)),
      tp2: Number((isBuy ? entry + rand(90, 150) : entry - rand(90, 150)).toFixed(2)),
      tp3: Number((isBuy ? entry + rand(160, 250) : entry - rand(160, 250)).toFixed(2)),
    };
  } else {
    levels = {
      sl: Number((isBuy ? entry - rand(12, 20) * pipMultiplier : entry + rand(12, 20) * pipMultiplier).toFixed(decimals)),
      tp1: Number((isBuy ? entry + rand(15, 25) * pipMultiplier : entry - rand(15, 25) * pipMultiplier).toFixed(decimals)),
      tp2: Number((isBuy ? entry + rand(30, 45) * pipMultiplier : entry - rand(30, 45) * pipMultiplier).toFixed(decimals)),
      tp3: Number((isBuy ? entry + rand(50, 75) * pipMultiplier : entry - rand(50, 75) * pipMultiplier).toFixed(decimals)),
    };
  }

  // Database Column Constraint matches exactly: COMMODITIE, CRYPTO, DERIV, FOREX
  const category = isGold || isSilver || isIndex
    ? "COMMODITIE"
    : isBTC
    ? "CRYPTO"
    : isDeriv
    ? "DERIV"
    : "FOREX";

  return {
    pair,
    symbol: pair,
    category,
    action: isBuy ? "BUY" : "SELL",
    direction: isBuy ? "BUY" : "SELL",
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
    type: isBuy ? "BUY" : "SELL",
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
// VALIDATION HELPERS
// =========================================================

function validateSignal(signal: any, currentPrice: number) {
  const entry = Number(signal.entry);
  const sl = Number(signal.sl);
  const tp1 = Number(signal.tp1);
  const tp2 = Number(signal.tp2);
  const tp3 = Number(signal.tp3);

  if ([entry, sl, tp1, tp2, tp3].some((v) => !Number.isFinite(v))) return false;

  if (signal.action === "BUY") {
    return sl < entry && entry < tp1 && tp1 < tp2 && tp2 < tp3;
  } else {
    return sl > entry && entry > tp1 && tp1 > tp2 && tp2 > tp3;
  }
}

async function evaluatePair(pair: string) {
  const { data, error } = await supabase
    .from("signals")
    .select("id, pair, status")
    .eq("pair", pair)
    .eq("status", "OPEN")
    .limit(1);

  if (error) {
    console.error("Active signal check error:", error);
    return false;
  }

  return !data || data.length === 0;
}

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
// MAIN SERVER
// =========================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const livePrices = await fetchLivePrices();

    const commodities = [
      { pair: "XAU/USD (Gold)", pipMultiplier: 1, decimals: 2, category: "COMMODITIE" },
      { pair: "XAG/USD (Silver)", pipMultiplier: 0.05, decimals: 3, category: "COMMODITIE" },
      { pair: "US30", pipMultiplier: 1, decimals: 2, category: "COMMODITIE" },
      { pair: "NASDAQ", pipMultiplier: 1, decimals: 2, category: "COMMODITIE" },
      { pair: "S&P500", pipMultiplier: 1, decimals: 2, category: "COMMODITIE" },
    ];

    const forex = [
      { pair: "EUR/USD", pipMultiplier: 0.001, decimals: 5, category: "FOREX" },
      { pair: "GBP/USD", pipMultiplier: 0.001, decimals: 5, category: "FOREX" },
      { pair: "USD/JPY", pipMultiplier: 0.1, decimals: 3, category: "FOREX" },
      { pair: "AUD/USD", pipMultiplier: 0.001, decimals: 5, category: "FOREX" },
      { pair: "GBP/JPY", pipMultiplier: 0.1, decimals: 3, category: "FOREX" },
      { pair: "USD/CAD", pipMultiplier: 0.001, decimals: 5, category: "FOREX" },
    ];

    const crypto = [
      { pair: "BTC/USD", pipMultiplier: 1, decimals: 2, category: "CRYPTO" },
      { pair: "ETH/USD", pipMultiplier: 1, decimals: 2, category: "CRYPTO" },
      { pair: "SOL/USD", pipMultiplier: 1, decimals: 2, category: "CRYPTO" },
    ];

    const deriv = [
      { pair: "BOOM 1000", pipMultiplier: 10, decimals: 2, category: "DERIV" },
      { pair: "CRASH 1000", pipMultiplier: 10, decimals: 2, category: "DERIV" },
      { pair: "VOL 75", pipMultiplier: 1, decimals: 2, category: "DERIV" },
      { pair: "BOOM 500", pipMultiplier: 10, decimals: 2, category: "DERIV" },
      { pair: "VOL 100", pipMultiplier: 10, decimals: 2, category: "DERIV" },
    ];

    // FILTER OUT CLOSED MARKETS
    const availableCommodities = commodities.filter((i) => isMarketOpen(i));
    const availableForex = forex.filter((i) => isMarketOpen(i));
    const availableCrypto = crypto.filter((i) => isMarketOpen(i));
    const availableDeriv = deriv.filter((i) => isMarketOpen(i));

    const weighted: any[] = [];

    // Weekend par weight fair divide hoga
    for (const item of availableCommodities) weighted.push(item);
    for (const item of availableForex) weighted.push(item);
    for (const item of availableCrypto) weighted.push(item);
    for (const item of availableDeriv) weighted.push(item);

    // IF ALL MARKETS ARE CLOSED
    if (weighted.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          generated: false,
          reason: "Markets are currently closed for selection",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selected = pick(weighted);
    const live = livePrices[selected.pair];

    if (!live || !Number.isFinite(Number(live.price))) {
      return new Response(
        JSON.stringify({
          success: true,
          generated: false,
          reason: `No live price for ${selected.pair}`,
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
          reason: `${selected.pair} already has an open signal`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const signal = generateSignal({ ...selected, price: live });

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

    const telegramResult = await postTelegram({ ...signal, id: inserted?.id });

    if (inserted?.id && telegramResult.message_id) {
      await supabase
        .from("signals")
        .update({
          telegram_message_id: telegramResult.message_id,
          telegram_chat_id: telegramResult.chat_id ? String(telegramResult.chat_id) : null,
        })
        .eq("id", inserted.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated: true,
        signal: inserted,
        telegram_posted: telegramResult.success,
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
