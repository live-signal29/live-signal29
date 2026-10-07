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
//
// 2026-10-07 (owner request):
//  - Gold: 10 signals/day = 6 FREE + 4 PREMIUM (premium slots end with *)
//  - Silver: 3/day
//  - US30: 2/day, NASDAQ: 2/day (S&P500 is not generated)
//  - FOREX signals are OFF (no forex pairs in the schedule)
//  - Deriv (BOOM 1000, CRASH 1000, VOL 75, BOOM 500, VOL 100): 1/day each
// Time format: "HH:MM" = free signal, "HH:MM*" = premium signal.
//  - A pair that still has an OPEN signal gets no new signal (slot skipped),
//    so a pair can produce fewer signals than listed -- that is intended.
//  - Signals never expire by time; they close only on TP3 / SL (auto-close-signals).
// =========================================================
const PKT_OFFSET_MIN = 300;
const SLOT_WINDOW_MIN = 45;

const SCHEDULE = {
  // Commodities
  "XAU/USD (Gold)": [
    "06:10", "08:25*", "10:20", "12:10*", "13:40",
    "15:30*", "16:40", "19:15", "21:20*", "23:50",
  ],
  "XAG/USD (Silver)": ["09:35", "17:25", "21:15"],
  "US30": ["18:10", "22:40"],
  "NASDAQ": ["18:40", "23:05"],
  // Forex: OFF (removed on request)
  // Crypto
  "BTC/USD": ["07:25", "12:50", "18:55", "23:15"],
  "ETH/USD": ["09:20", "20:05"],
  "SOL/USD": ["10:30", "21:35"],
  // Deriv: 1 signal per pair per day
  "BOOM 1000": ["08:20"],
  "CRASH 1000": ["09:25"],
  "VOL 75": ["10:05"],
  "BOOM 500": ["13:15"],
  "VOL 100": ["14:25"],
};

function dueSlots(nowMs) {
  const DAY = 86400000;
  const off = PKT_OFFSET_MIN * 60000;
  const todayStart = Math.floor((nowMs + off) / DAY) * DAY - off;
  const out = [];

  for (const shift of [-1, 0]) {
    const base = todayStart + shift * DAY;
    for (const [pair, times] of Object.entries(SCHEDULE)) {
      for (const raw of times) {
        const premium = raw.endsWith("*");
        const [h, m] = raw.replace("*", "").split(":").map(Number);
        const start = base + (h * 60 + m) * 60000;
        if (nowMs >= start && nowMs < start + SLOT_WINDOW_MIN * 60000) {
          out.push({ pair, start, premium });
        }
      }
    }
  }

  return out.sort((a, b) => a.start - b.start);
}

// =========================================================
// PREMIUM MIX (per owner request 2026-09-13)
// Gold free/premium is fixed by the schedule. Silver / BTC signals are
// randomly marked premium (~22% chance) so free users sometimes see "upgrade".
// =========================================================
const PREMIUM_ELIGIBLE_PAIRS = new Set([
  "XAU/USD (Gold)",
  "XAG/USD (Silver)",
  "BTC/USD",
]);
const PREMIUM_CHANCE = 0.22;

// Pairs whose free/premium split is fixed by the schedule ("*" = premium).
const PREMIUM_BY_SLOT_PAIRS = new Set(["XAU/USD (Gold)"]);

function shouldBePremium(pair, slot) {
  if (PREMIUM_BY_SLOT_PAIRS.has(pair)) return slot?.premium === true;
  if (!PREMIUM_ELIGIBLE_PAIRS.has(pair)) return false;
  return Math.random() < PREMIUM_CHANCE;
}

// Key sent to fetch-live-prices for each pair, plus the keys we
// accept back. fetch-live-prices returns plain numbers
// ({ "XAUUSD": 4167.5 }), NOT objects.
const PRICE_KEYS = {
  "XAU/USD (Gold)": ["XAUUSD", "GOLD"],
  "XAG/USD (Silver)": ["XAGUSD", "SILVER"],
  "BTC/USD": ["BTCUSD", "BTCUSDT"],
  "ETH/USD": ["ETHUSD", "ETHUSDT"],
  "SOL/USD": ["SOLUSD", "SOLUSDT"],
  "US30": ["US30"],
  "NASDAQ": ["NASDAQ"],
  "BOOM 1000": ["BOOM1000"],
  "CRASH 1000": ["CRASH1000"],
  "VOL 75": ["VOL75"],
  "BOOM 500": ["BOOM500"],
  "VOL 100": ["VOL100"],
};

// Fetch the live price for ONE pair only, with a hard timeout so a
// slow source (e.g. Deriv websocket) can never stall the whole run.
async function fetchLivePrice(pair) {
  const keys = PRICE_KEYS[pair];
  if (!keys) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/fetch-live-prices?pairs=${encodeURIComponent(
        keys[0]
      )}`,
      {
        signal: controller.signal,
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

    for (const key of keys) {
      const raw = prices[key];
      if (raw === undefined || raw === null) continue;

      const value =
        typeof raw === "object" ? Number(raw.price) : Number(raw);

      if (Number.isFinite(value) && value > 0) {
        return { price: value };
      }
    }

    return null;
  } finally {
    clearTimeout(timer);
  }
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
  // Owner's BTC levels (2026-10-07): SL 800, TP1 400, TP2 800, TP3 1400
  const slDistance = 800;
  const tp1Distance = 400;
  const tp2Distance = 800;
  const tp3Distance = 1400;

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
  const isCryptoPair = ["BTC/USD", "ETH/USD", "SOL/USD"].includes(pair);
  const isIndex = ["US30", "NASDAQ"].includes(pair);
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

  // FIX: ETH and SOL used to fall through to "FOREX" here.
  const category = isGold || isSilver || isIndex
    ? "COMMODITIES"
    : isCryptoPair
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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// FOREX generation is OFF (owner request 2026-10-06).
// Forex pairs are intentionally not listed here, so they can
// never be generated even if a forex slot were added back.
const ALL_PAIRS = [
  { pair: "XAU/USD (Gold)", pipMultiplier: 1, decimals: 2 },
  { pair: "XAG/USD (Silver)", pipMultiplier: 0.05, decimals: 3 },
  { pair: "US30", pipMultiplier: 1, decimals: 2 },
  { pair: "NASDAQ", pipMultiplier: 1, decimals: 2 },
  { pair: "BTC/USD", pipMultiplier: 1, decimals: 2 },
  { pair: "ETH/USD", pipMultiplier: 1, decimals: 2 },
  { pair: "SOL/USD", pipMultiplier: 1, decimals: 2 },
  { pair: "BOOM 1000", pipMultiplier: 10, decimals: 2 },
  { pair: "CRASH 1000", pipMultiplier: 10, decimals: 2 },
  { pair: "VOL 75", pipMultiplier: 1, decimals: 2 },
  { pair: "BOOM 500", pipMultiplier: 10, decimals: 2 },
  { pair: "VOL 100", pipMultiplier: 10, decimals: 2 },
];

// A pair that still has an OPEN signal gets NO new signal (owner request
// 2026-10-07). The slot simply stays unfilled; if the old signal closes
// (TP3 / SL hit) while the slot is still inside its 45-minute window, the
// new signal is generated then, otherwise that slot is skipped. So some days
// a pair may produce fewer signals than its schedule -- that is intended.
async function hasOpenSignal(pair) {
  const { data, error } = await supabase
    .from("signals")
    .select("id, status, signal_status")
    .eq("pair", pair)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("OPEN_CHECK_FAILED", pair, error.message);
    return false;
  }

  return (data || []).some((r) => {
    const st = String(r.status || "").toUpperCase();
    const ss = String(r.signal_status || "").toUpperCase();
    return st !== "CLOSED" && ss !== "CLOSE" && ss !== "CLOSED";
  });
}

// Try to generate one signal for one due slot.
// Returns { generated: true, ... } or { generated: false, reason }.
async function tryGenerate(slot) {
  if (await hasOpenSignal(slot.pair)) {
    return {
      generated: false,
      reason: `${slot.pair}: previous signal is still open, no new signal`,
    };
  }

  const selected = ALL_PAIRS.find((p) => p.pair === slot.pair);

  if (!selected || !isMarketOpen(selected.pair)) {
    return {
      generated: false,
      reason: `${slot.pair} is off or its market is closed`,
    };
  }

  const live = await fetchLivePrice(selected.pair);

  if (!live || !Number.isFinite(Number(live.price))) {
    console.error("NO_LIVE_PRICE", selected.pair);
    return { generated: false, reason: `No live price for ${selected.pair}` };
  }

  const signal = await generateSignal({ ...selected, price: live });

  if (!signal) {
    return {
      generated: false,
      reason:
        selected.pair === "BTC/USD"
          ? "BTC trend confirmation is mixed - no signal generated"
          : "No valid signal generated",
    };
  }

  const currentPrice = Number(live.price);

  if (!validateSignal(signal)) {
    return { generated: false, reason: "Signal validation failed" };
  }

  if (selected.pair === "BTC/USD") {
    if (!validateBTCSignal(signal, currentPrice)) {
      return { generated: false, reason: "BTC validation failed" };
    }
  }

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
    is_premium: shouldBePremium(signal.pair, slot),
    // NO time expiry (owner request 2026-10-07): a signal stays open until
    // its TP3 or SL is hit, however long that takes.
    expiry_time: null,
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

  return {
    generated: true,
    signal: inserted,
    telegram_posted: telegramResult.success,
    telegram_error: telegramResult.error,
  };
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
    const unfilled = [];

    for (const slot of due) {
      const { data: existing } = await supabase
        .from("signals")
        .select("id")
        .eq("pair", slot.pair)
        .gte("created_at", new Date(slot.start).toISOString())
        .limit(1);

      if (!existing || existing.length === 0) {
        unfilled.push(slot);
      }
    }

    if (unfilled.length === 0) {
      return jsonResponse({
        success: true,
        generated: false,
        reason:
          due.length === 0
            ? "No scheduled slot is due"
            : "Scheduled slots already filled",
      });
    }

    // FIX: go through ALL unfilled due slots (oldest first) and stop at the
    // first one that really produces a signal. Before, only the single oldest
    // unfilled slot was tried, so one broken slot (e.g. a Deriv pair with no
    // price) blocked every later slot (Gold, US30, ...) until its 45-minute
    // window ran out - which is why signals came 20-35 minutes late.
    const attempts = [];

    for (const slot of unfilled) {
      try {
        const result = await tryGenerate(slot);

        if (result.generated) {
          return jsonResponse({ success: true, ...result, skipped: attempts });
        }

        attempts.push({ pair: slot.pair, reason: result.reason });
      } catch (slotError) {
        console.error("SLOT_ERROR", slot.pair, slotError);
        attempts.push({
          pair: slot.pair,
          reason:
            slotError instanceof Error ? slotError.message : String(slotError),
        });
      }
    }

    return jsonResponse({
      success: true,
      generated: false,
      reason: "No due slot could generate a signal",
      attempts,
    });
  } catch (error) {
    console.error("AUTO GENERATE ERROR:", error);

    return jsonResponse(
      {
        success: false,
        generated: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});
