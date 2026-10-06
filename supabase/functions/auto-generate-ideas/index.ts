import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
)!;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function round(value, decimals) {
  return Number(value.toFixed(decimals));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =========================================================
// DAILY SCHEDULE (Pakistan time, UTC+5, no DST)
// Each pair has fixed, different times. The cron job (every
// 5 min) only does real work when one of these slots is due.
// A slot stays "due" for SLOT_WINDOW_MIN minutes, so a missed
// run or a no-signal result is retried on the next ticks.
// To change a time or a count, edit the lists below.
// =========================================================
const PKT_OFFSET_MIN = 300;
const SLOT_WINDOW_MIN = 45;

const SCHEDULE = {
  // Commodities
  "XAU/USD (Gold)": ["06:10", "10:20", "13:40", "17:10", "20:30", "23:50"],
  "XAG/USD (Silver)": ["09:35", "17:25", "21:15"],
  "US30": ["10:15", "18:10", "22:40"],
  "NASDAQ": ["10:45", "18:40", "23:05"],
  "S&P500": ["11:15", "19:10", "23:25"],
  // Forex (1 signal per pair per day)
  "EUR/USD": ["12:10"],
  "GBP/USD": ["12:40"],
  "USD/JPY": ["08:40"],
  "AUD/USD": ["07:50"],
  "GBP/JPY": ["13:25"],
  "USD/CAD": ["18:20"],
  // Crypto
  "BTC/USD": ["07:25", "12:50", "18:55", "23:15"],
  "ETH/USD": ["09:20", "20:05"],
  "SOL/USD": ["10:30", "21:35"],
  // Deriv (2 each, different times)
  "BOOM 1000": ["08:20", "20:20"],
  "CRASH 1000": ["09:25", "21:05"],
  "VOL 75": ["10:05", "22:25"],
  "BOOM 500": ["13:15", "00:35"],
  "VOL 100": ["14:25", "23:40"],
};

function dueSlots(nowMs) {
  const DAY = 86400000;
  const off = PKT_OFFSET_MIN * 60000;
  const todayStart = Math.floor((nowMs + off) / DAY) * DAY - off;
  const out = [];

  for (const shift of [-1, 0]) {
    const base = todayStart + shift * DAY;
    for (const [pair, times] of Object.entries(SCHEDULE)) {
      for (const t of times) {
        const [h, m] = t.split(":").map(Number);
        const start = base + (h * 60 + m) * 60000;
        if (nowMs >= start && nowMs < start + SLOT_WINDOW_MIN * 60000) {
          out.push({ pair, start });
        }
      }
    }
  }

  return out.sort((a, b) => a.start - b.start);
}

// =========================================================
// PREMIUM MIX (per owner request 2026-09-13)
// -----------------------------------------------------------
// XAU/USD, XAG/USD and BTC/USD signals were ALWAYS coming out
// as free -- is_premium defaults to false at the DB level and
// neither generator function ever set it, so there was
// literally no code path that could ever mark one of these
// premium. Now a portion of these three pairs' signals are
// randomly marked premium (~22% chance), so free subscribers
// occasionally see "upgrade for this one" instead of every
// single Gold/Silver/BTC signal always being free.
// =========================================================
const PREMIUM_ELIGIBLE_PAIRS = new Set([
  "XAU/USD (Gold)",
  "XAG/USD (Silver)",
  "BTC/USD",
]);
const PREMIUM_CHANCE = 0.22;

function shouldBePremium(pair) {
  if (!PREMIUM_ELIGIBLE_PAIRS.has(pair)) return false;
  return Math.random() < PREMIUM_CHANCE;
}

async function fetchLivePrices() {
  const pairs = [
    "XAUUSD","XAGUSD","BTCUSD","ETHUSD","SOLUSD","EURUSD","GBPUSD","USDJPY",
    "AUDUSD","GBPJPY","USDCAD","US30","NASDAQ","SP500","BOOM1000","CRASH1000",
    "VOL75","BOOM500","VOL100",
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

  const aliases = {
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

  const result = {};

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

async function fetchBinanceCandles(interval, limit = 100) {
  const url =
    `https://api.binance.com/api/v3/klines` +
    `?symbol=BTCUSDT&interval=${interval}&limit=${limit}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Binance candle request failed: ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Invalid Binance candle response");
  }

  return data.map((k) => ({
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

function ema(values, period) {
  if (values.length === 0) return 0;
  const multiplier = 2 / (period + 1);
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = (values[i] - result) * multiplier + result;
  }
  return result;
}

function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function trueRange(curr, prev) {
  return Math.max(
    curr.high - curr.low,
    Math.abs(curr.high - prev.close),
    Math.abs(curr.low - prev.close)
  );
}

function calculateATR(candles, period = 14) {
  if (candles.length < period + 1) return 0;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    trs.push(trueRange(candles[i], candles[i - 1]));
  }
  const recent = trs.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

async function analyzeBTC() {
  const [candles15m, candles1h] = await Promise.all([
    fetchBinanceCandles("15m", 100),
    fetchBinanceCandles("1h", 100),
  ]);

  if (candles15m.length < 50 || candles1h.length < 50) {
    return {
      direction: "NO_TRADE",
      score: 0,
      reason: "Not enough BTC candle data",
      rsi15m: 50,
      rsi1h: 50,
      ema15Fast: 0,
      ema15Slow: 0,
      ema1hFast: 0,
      ema1hSlow: 0,
      atr15m: 0,
    };
  }

  const close15 = candles15m.map((c) => c.close);
  const close1h = candles1h.map((c) => c.close);

  const ema15Fast = ema(close15, 9);
  const ema15Slow = ema(close15, 21);
  const ema1hFast = ema(close1h, 9);
  const ema1hSlow = ema(close1h, 21);

  const rsi15m = calculateRSI(close15, 14);
  const rsi1h = calculateRSI(close1h, 14);
  const atr15m = calculateATR(candles15m, 14);

  const last15 = candles15m[candles15m.length - 1];
  const previous15 = candles15m[candles15m.length - 2];

  let buyScore = 0;
  let sellScore = 0;

  const reasonsBuy = [];
  const reasonsSell = [];

  if (ema1hFast > ema1hSlow) {
    buyScore += 3;
    reasonsBuy.push("1H EMA bullish");
  }
  if (ema1hFast < ema1hSlow) {
    sellScore += 3;
    reasonsSell.push("1H EMA bearish");
  }

  if (ema15Fast > ema15Slow) {
    buyScore += 2;
    reasonsBuy.push("15M EMA bullish");
  }
  if (ema15Fast < ema15Slow) {
    sellScore += 2;
    reasonsSell.push("15M EMA bearish");
  }

  if (last15.close > ema15Fast) {
    buyScore += 1;
    reasonsBuy.push("Price above 15M EMA");
  }
  if (last15.close < ema15Fast) {
    sellScore += 1;
    reasonsSell.push("Price below 15M EMA");
  }

  if (last15.close > last15.open && last15.close > previous15.close) {
    buyScore += 1;
    reasonsBuy.push("Bullish momentum");
  }
  if (last15.close < last15.open && last15.close < previous15.close) {
    sellScore += 1;
    reasonsSell.push("Bearish momentum");
  }

  if (rsi15m >= 52 && rsi15m <= 68 && rsi1h >= 50) {
    buyScore += 2;
    reasonsBuy.push("RSI bullish");
  }
  if (rsi15m <= 48 && rsi15m >= 32 && rsi1h <= 50) {
    sellScore += 2;
    reasonsSell.push("RSI bearish");
  }

  const difference = Math.abs(buyScore - sellScore);

  if (buyScore >= 6 && buyScore > sellScore && difference >= 3) {
    return {
      direction: "BUY",
      score: buyScore,
      reason: reasonsBuy.join(" + "),
      rsi15m,
      rsi1h,
      ema15Fast,
      ema15Slow,
      ema1hFast,
      ema1hSlow,
      atr15m,
    };
  }

  if (sellScore >= 6 && sellScore > buyScore && difference >= 3) {
    return {
      direction: "SELL",
      score: sellScore,
      reason: reasonsSell.join(" + "),
      rsi15m,
      rsi1h,
      ema15Fast,
      ema15Slow,
      ema1hFast,
      ema1hSlow,
      atr15m,
    };
  }

  return {
    direction: "NO_TRADE",
    score: Math.max(buyScore, sellScore),
    reason: "BTC trend confirmation is mixed",
    rsi15m,
    rsi1h,
    ema15Fast,
    ema15Slow,
    ema1hFast,
    ema1hSlow,
    atr15m,
  };
}

const buyReasons = [
  "Bullish market structure + demand",
  "Bullish BOS + liquidity support",
  "Bullish order block + momentum",
  "Price holding above key support",
];

const sellReasons = [
  "Bearish market structure + supply",
  "Bearish BOS + liquidity resistance",
  "Bearish order block + momentum",
  "Price rejecting key resistance",
];

function generateGoldLevels(entry, isBuy) {
  const slDistance = rand(15, 25);
  const tp1Distance = rand(5, 8);
  const tp2Distance = rand(10, 16);
  const tp3Distance = rand(18, 25);

  const sl = isBuy ? entry - slDistance : entry + slDistance;
  const tp1 = isBuy ? entry + tp1Distance : entry - tp1Distance;
  const tp2 = isBuy ? entry + tp2Distance : entry - tp2Distance;
  const tp3 = isBuy ? entry + tp3Distance : entry - tp3Distance;

  return {
    sl: round(sl, 2),
    tp1: round(tp1, 2),
    tp2: round(tp2, 2),
    tp3: round(tp3, 2),
  };
}

function generateSilverLevels(entry, isBuy) {
  const slDistance = rand(1.5, 3);
  const tp1Distance = rand(0.6, 1);
  const tp2Distance = rand(1.2, 2);
  const tp3Distance = rand(2, 3);

  const sl = isBuy ? entry - slDistance : entry + slDistance;
  const tp1 = isBuy ? entry + tp1Distance : entry - tp1Distance;
  const tp2 = isBuy ? entry + tp2Distance : entry - tp2Distance;
  const tp3 = isBuy ? entry + tp3Distance : entry - tp3Distance;

  return {
    sl: round(sl, 3),
    tp1: round(tp1, 3),
    tp2: round(tp2, 3),
    tp3: round(tp3, 3),
  };
}

function computeBTCDistances(_atr15m) {
  const slDistance = 500;
  const tp1Distance = 500;
  const tp2Distance = 700;
  const tp3Distance = 1100;

  return { slDistance, tp1Distance, tp2Distance, tp3Distance };
}

function generateBTCLevels(entry, isBuy, atr15m) {
  const { slDistance, tp1Distance, tp2Distance, tp3Distance } =
    computeBTCDistances(atr15m);

  return {
    sl: round(isBuy ? entry - slDistance : entry + slDistance, 2),
    tp1: round(isBuy ? entry + tp1Distance : entry - tp1Distance, 2),
    tp2: round(isBuy ? entry + tp2Distance : entry - tp2Distance, 2),
    tp3: round(isBuy ? entry + tp3Distance : entry - tp3Distance, 2),
  };
}

function isTraditionalMarketOpen(pair, now = new Date()) {
  const day = now.getUTCDay();
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  if (day === 0) return minutes >= 22 * 60;
  if (day === 6) return false;
  if (day === 5) return minutes < 22 * 60;
  return true;
}

function isMarketOpen(pair, now = new Date()) {
  const cryptoPairs = new Set(["BTC/USD", "ETH/USD", "SOL/USD"]);
  const derivPairs = new Set([
    "BOOM 1000", "CRASH 1000", "VOL 75", "BOOM 500", "VOL 100",
  ]);

  if (cryptoPairs.has(pair) || derivPairs.has(pair)) return true;
  return isTraditionalMarketOpen(pair, now);
}

async function generateSignal(config) {
  const { pair, price, pipMultiplier, decimals } = config;

  const currentPrice = Number(price.price);

  const isGold = pair === "XAU/USD (Gold)";
  const isSilver = pair === "XAG/USD (Silver)";
  const isBTC = pair === "BTC/USD";
  const isIndex = ["US30", "NASDAQ", "S&P500"].includes(pair);
  const isVol75 = pair === "VOL 75";
  const isDeriv = [
    "BOOM 1000", "CRASH 1000", "VOL 75", "BOOM 500", "VOL 100",
  ].includes(pair);

  let isBuy;
  let analysisReason;
  let btcAnalysis = null;

  if (isBTC) {
    btcAnalysis = await analyzeBTC();

    if (btcAnalysis.direction === "NO_TRADE") {
      return null;
    }

    isBuy = btcAnalysis.direction === "BUY";
    analysisReason = btcAnalysis.reason;
  } else {
    isBuy = Math.random() > 0.5;
    analysisReason = pick(isBuy ? buyReasons : sellReasons);
  }

  let entryOffset = 0;

  if (isGold) entryOffset = rand(-0.2, 0.2);
  else if (isSilver) entryOffset = rand(-0.05, 0.05);
  else if (isBTC) entryOffset = 0;
  else if (isIndex) entryOffset = rand(-2, 2);
  else if (isVol75) entryOffset = rand(-5, 5);
  else if (isDeriv) entryOffset = rand(-5, 5);
  else entryOffset = rand(-pipMultiplier * 2, pipMultiplier * 2);

  const entry = round(currentPrice + entryOffset, decimals);

  let levels;

  if (isGold) levels = generateGoldLevels(entry, isBuy);
  else if (isSilver) levels = generateSilverLevels(entry, isBuy);
  else if (isBTC) levels = generateBTCLevels(entry, isBuy, btcAnalysis.atr15m);
  else if (isIndex) {
    const slDistance = rand(20, 35);
    const tp1Distance = rand(12, 18);
    const tp2Distance = rand(22, 30);
    const tp3Distance = rand(35, 50);
    levels = {
      sl: round(isBuy ? entry - slDistance : entry + slDistance, 2),
      tp1: round(isBuy ? entry + tp1Distance : entry - tp1Distance, 2),
      tp2: round(isBuy ? entry + tp2Distance : entry - tp2Distance, 2),
      tp3: round(isBuy ? entry + tp3Distance : entry - tp3Distance, 2),
    };
  } else if (isVol75) {
    const slDistance = rand(150, 250);
    const tp1Distance = rand(150, 250);
    const tp2Distance = rand(300, 450);
    const tp3Distance = rand(500, 700);
    levels = {
      sl: round(isBuy ? entry - slDistance : entry + slDistance, 2),
      tp1: round(isBuy ? entry + tp1Distance : entry - tp1Distance, 2),
      tp2: round(isBuy ? entry + tp2Distance : entry - tp2Distance, 2),
      tp3: round(isBuy ? entry + tp3Distance : entry - tp3Distance, 2),
    };
  } else if (isDeriv) {
    const slDistance = rand(40, 80);
    const tp1Distance = rand(40, 80);
    const tp2Distance = rand(90, 150);
    const tp3Distance = rand(160, 250);
    levels = {
      sl: round(isBuy ? entry - slDistance : entry + slDistance, 2),
      tp1: round(isBuy ? entry + tp1Distance : entry - tp1Distance, 2),
      tp2: round(isBuy ? entry + tp2Distance : entry - tp2Distance, 2),
      tp3: round(isBuy ? entry + tp3Distance : entry - tp3Distance, 2),
    };
  } else {
    const slDistance = rand(12, 20) * pipMultiplier;
    const tp1Distance = rand(15, 25) * pipMultiplier;
    const tp2Distance = rand(30, 45) * pipMultiplier;
    const tp3Distance = rand(50, 75) * pipMultiplier;
    levels = {
      sl: round(isBuy ? entry - slDistance : entry + slDistance, decimals),
      tp1: round(isBuy ? entry + tp1Distance : entry - tp1Distance, decimals),
      tp2: round(isBuy ? entry + tp2Distance : entry - tp2Distance, decimals),
      tp3: round(isBuy ? entry + tp3Distance : entry - tp3Distance, decimals),
    };
  }

  const category = isGold || isSilver || isIndex
    ? "COMMODITIES"
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
    reason: analysisReason,
    signal_type: isBTC
      ? "Intraday"
      : isGold
      ? "Scalping"
      : pick(["Scalping", "Intraday", "Swing"]),
    type: isBuy ? "BUY" : "SELL",
    created_at: new Date().toISOString(),
    ...(isBTC && btcAnalysis
      ? {
          analysis_score: btcAnalysis.score,
          rsi_15m: round(btcAnalysis.rsi15m, 2),
          rsi_1h: round(btcAnalysis.rsi1h, 2),
          ema_15m_fast: round(btcAnalysis.ema15Fast, 2),
          ema_15m_slow: round(btcAnalysis.ema15Slow, 2),
          ema_1h_fast: round(btcAnalysis.ema1hFast, 2),
          ema_1h_slow: round(btcAnalysis.ema1hSlow, 2),
          atr_15m: round(btcAnalysis.atr15m, 2),
        }
      : {}),
  };
}

function getExpiryHours(signalType) {
  if (signalType === "Scalping") return 3;
  if (signalType === "Intraday") return 12;
  if (signalType === "Swing") return 72;
  return 6;
}

function validateBTCSignal(signal, currentPrice) {
  const entry = Number(signal.entry);
  const sl = Number(signal.sl);
  const tp1 = Number(signal.tp1);
  const tp2 = Number(signal.tp2);
  const tp3 = Number(signal.tp3);
  const atr15m = Number(signal.atr_15m);

  if (Math.abs(entry - currentPrice) > 0.01) return false;

  const { slDistance, tp1Distance, tp2Distance, tp3Distance } =
    computeBTCDistances(atr15m);

  const TOL = 1;

  if (signal.action === "BUY") {
    if (!(sl < entry && entry < tp1 && tp1 < tp2 && tp2 < tp3)) return false;
    if (currentPrice <= sl) return false;
    if (Math.abs(Math.abs(entry - sl) - slDistance) > TOL) return false;
    if (Math.abs(Math.abs(tp1 - entry) - tp1Distance) > TOL) return false;
    if (Math.abs(Math.abs(tp2 - entry) - tp2Distance) > TOL) return false;
    if (Math.abs(Math.abs(tp3 - entry) - tp3Distance) > TOL) return false;
  } else {
    if (!(sl > entry && entry > tp1 && tp1 > tp2 && tp2 > tp3)) return false;
    if (currentPrice >= sl) return false;
    if (Math.abs(Math.abs(sl - entry) - slDistance) > TOL) return false;
    if (Math.abs(Math.abs(tp1 - entry) - tp1Distance) > TOL) return false;
    if (Math.abs(Math.abs(tp2 - entry) - tp2Distance) > TOL) return false;
    if (Math.abs(Math.abs(tp3 - entry) - tp3Distance) > TOL) return false;
  }

  return true;
}

function validateSignal(signal) {
  const entry = Number(signal.entry);
  const sl = Number(signal.sl);
  const tp1 = Number(signal.tp1);
  const tp2 = Number(signal.tp2);
  const tp3 = Number(signal.tp3);

  if (
    !Number.isFinite(entry) || !Number.isFinite(sl) ||
    !Number.isFinite(tp1) || !Number.isFinite(tp2) || !Number.isFinite(tp3)
  ) {
    return false;
  }

  if (signal.action === "BUY") {
    return sl < entry && entry < tp1 && tp1 < tp2 && tp2 < tp3;
  }

  return sl > entry && entry > tp1 && tp1 > tp2 && tp2 > tp3;
}

async function postTelegram(signal, attempt = 1) {
  const MAX_ATTEMPTS = 3;

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

    let parsed = null;
    try {
      parsed = JSON.parse(resultText);
    } catch {
      // ignore
    }

    const ok = response.ok && parsed?.success === true;

    console.log(
      "TELEGRAM_POST",
      JSON.stringify({
        pair: signal.pair,
        category: signal.category,
        attempt,
        http_status: response.status,
        ok,
        skipped: parsed?.skipped ?? null,
        message_id: parsed?.message_id ?? null,
        error: parsed?.error ?? null,
      })
    );

    if (!ok && attempt < MAX_ATTEMPTS) {
      await sleep(500 * attempt);
      return postTelegram(signal, attempt + 1);
    }

    return {
      success: ok,
      error: parsed?.error || null,
      message_id: parsed?.message_id ?? null,
      chat_id: parsed?.chat_id ?? null,
    };
  } catch (error) {
    console.error(
      "TELEGRAM_POST",
      JSON.stringify({
        pair: signal.pair,
        category: signal.category,
        attempt,
        exception: error instanceof Error ? error.message : String(error),
      })
    );

    if (attempt < MAX_ATTEMPTS) {
      await sleep(500 * attempt);
      return postTelegram(signal, attempt + 1);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // -------------------------------------------------------
    // SCHEDULE: do real work only when a slot is due and not
    // already filled (checked via signals.created_at).
    // -------------------------------------------------------
    const due = dueSlots(Date.now());
    let dueSlot = null;

    for (const slot of due) {
      const { data: existing } = await supabase
        .from("signals")
        .select("id")
        .eq("pair", slot.pair)
        .gte("created_at", new Date(slot.start).toISOString())
        .limit(1);

      if (!existing || existing.length === 0) {
        dueSlot = slot;
        break;
      }
    }

    if (!dueSlot) {
      return new Response(
        JSON.stringify({
          success: true,
          generated: false,
          reason:
            due.length === 0
              ? "No scheduled slot is due"
              : "Scheduled slots already filled",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const livePrices = await fetchLivePrices();

    const commodities = [
      { pair: "XAU/USD (Gold)", pipMultiplier: 1, decimals: 2 },
      { pair: "XAG/USD (Silver)", pipMultiplier: 0.05, decimals: 3 },
      { pair: "US30", pipMultiplier: 1, decimals: 2 },
      { pair: "NASDAQ", pipMultiplier: 1, decimals: 2 },
      { pair: "S&P500", pipMultiplier: 1, decimals: 2 },
    ];

    const forex = [
      { pair: "EUR/USD", pipMultiplier: 0.001, decimals: 5 },
      { pair: "GBP/USD", pipMultiplier: 0.001, decimals: 5 },
      { pair: "USD/JPY", pipMultiplier: 0.1, decimals: 3 },
      { pair: "AUD/USD", pipMultiplier: 0.001, decimals: 5 },
      { pair: "GBP/JPY", pipMultiplier: 0.1, decimals: 3 },
      { pair: "USD/CAD", pipMultiplier: 0.001, decimals: 5 },
    ];

    const crypto = [
      { pair: "BTC/USD", pipMultiplier: 1, decimals: 2 },
      { pair: "ETH/USD", pipMultiplier: 1, decimals: 2 },
      { pair: "SOL/USD", pipMultiplier: 1, decimals: 2 },
    ];

    const deriv = [
      { pair: "BOOM 1000", pipMultiplier: 10, decimals: 2 },
      { pair: "CRASH 1000", pipMultiplier: 10, decimals: 2 },
      { pair: "VOL 75", pipMultiplier: 1, decimals: 2 },
      { pair: "BOOM 500", pipMultiplier: 10, decimals: 2 },
      { pair: "VOL 100", pipMultiplier: 10, decimals: 2 },
    ];

    const allPairs = [...commodities, ...forex, ...crypto, ...deriv];
    const selected = allPairs.find((p) => p.pair === dueSlot.pair);

    if (!selected || !isMarketOpen(selected.pair)) {
      return new Response(
        JSON.stringify({
          success: true,
          generated: false,
          reason: `${dueSlot.pair} market is closed`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Scheduled slots already pace the signals, so there is no
    // "one open signal per pair" block here any more.

    const signal = await generateSignal({ ...selected, price: live });

    if (!signal) {
      return new Response(
        JSON.stringify({
          success: true,
          generated: false,
          reason:
            selected.pair === "BTC/USD"
              ? "BTC trend confirmation is mixed - no signal generated"
              : "No valid signal generated",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentPrice = Number(live.price);

    if (!validateSignal(signal)) {
      return new Response(
        JSON.stringify({
          success: true,
          generated: false,
          reason: "Signal validation failed",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (selected.pair === "BTC/USD") {
      if (!validateBTCSignal(signal, currentPrice)) {
        return new Response(
          JSON.stringify({
            success: true,
            generated: false,
            reason: "BTC validation failed",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const expiryTime = new Date(
      Date.now() + getExpiryHours(signal.signal_type) * 60 * 60 * 1000
    ).toISOString();

    const insertData = {
      pair: signal.pair,
      category: signal.category,
      type: signal.action === "BUY" ? "Buy" : "Sell",
      entry: signal.entry,
      current_price: signal.currentPrice,
      sl: signal.sl,
      tp1: signal.tp1,
      tp2: signal.tp2,
      tp3: signal.tp3,
      analysis_reason: signal.reason,
      signal_type: signal.signal_type,
      status: "OPEN",
      signal_status: "OPEN",
      is_premium: shouldBePremium(signal.pair),
      expiry_time: expiryTime,
      created_at: signal.created_at,
    };

    const { data: inserted, error } = await supabase
      .from("signals")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Signal insert error:", error);
      throw error;
    }

    const telegramResult = await postTelegram({ ...signal, id: inserted?.id });

    if (inserted?.id && telegramResult.message_id) {
      const { error: patchError } = await supabase
        .from("signals")
        .update({
          telegram_message_id: telegramResult.message_id,
          telegram_chat_id: telegramResult.chat_id
            ? String(telegramResult.chat_id)
            : null,
        })
        .eq("id", inserted.id);

      if (patchError) {
        console.error(
          "TELEGRAM_MSGID_SAVE_FAILED",
          JSON.stringify({
            pair: signal.pair,
            signal_id: inserted.id,
            message_id: telegramResult.message_id,
            db_error: patchError.message,
          })
        );
      } else {
        console.log(
          "TELEGRAM_MSGID_SAVED",
          JSON.stringify({
            pair: signal.pair,
            signal_id: inserted.id,
            message_id: telegramResult.message_id,
          })
        );
      }
    } else {
      console.warn(
        "TELEGRAM_MSGID_MISSING",
        JSON.stringify({
          pair: signal.pair,
          category: signal.category,
          signal_id: inserted?.id ?? null,
          telegram_success: telegramResult.success,
          telegram_error: telegramResult.error ?? null,
          reason:
            "No message_id returned after retries - this signal will NOT be able to receive quoted TP/SL reply updates on Telegram",
        })
      );
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
    console.error("AUTO GENERATE ERROR:", error);

    return new Response(
      JSON.stringify({
        success: false,
        generated: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
