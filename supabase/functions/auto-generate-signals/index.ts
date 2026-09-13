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

// =========================================================
// HELPERS
// =========================================================

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function round(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
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
    throw new Error(
      `Live price function failed: ${response.status}`
    );
  }

  const data = await response.json();

  const prices = data?.prices || data || {};

  const aliases: Record<string, string[]> = {
    "XAU/USD (Gold)": [
      "XAUUSD",
      "GOLD",
      "XAU/USD (Gold)",
    ],

    "XAG/USD (Silver)": [
      "XAGUSD",
      "SILVER",
      "XAG/USD (Silver)",
    ],

    "BTC/USD": [
      "BTCUSD",
      "BTCUSDT",
      "BTC/USD",
    ],

    "ETH/USD": [
      "ETHUSD",
      "ETHUSDT",
      "ETH/USD",
    ],

    "SOL/USD": [
      "SOLUSD",
      "SOLUSDT",
      "SOL/USD",
    ],

    "EUR/USD": [
      "EURUSD",
      "EUR/USD",
    ],

    "GBP/USD": [
      "GBPUSD",
      "GBP/USD",
    ],

    "USD/JPY": [
      "USDJPY",
      "USD/JPY",
    ],

    "AUD/USD": [
      "AUDUSD",
      "AUD/USD",
    ],

    "GBP/JPY": [
      "GBPJPY",
      "GBP/JPY",
    ],

    "USD/CAD": [
      "USDCAD",
      "USD/CAD",
    ],

    "US30": [
      "US30",
      "DJI",
      "DOW",
    ],

    "NASDAQ": [
      "NASDAQ",
      "NAS100",
      "USTEC",
    ],

    "S&P500": [
      "SP500",
      "US500",
    ],

    "BOOM 1000": [
      "BOOM1000",
      "BOOM 1000",
    ],

    "CRASH 1000": [
      "CRASH1000",
      "CRASH 1000",
    ],

    "VOL 75": [
      "VOL75",
      "VOL 75",
    ],

    "BOOM 500": [
      "BOOM500",
      "BOOM 500",
    ],

    "VOL 100": [
      "VOL100",
      "VOL 100",
    ],
  };

  const result: Record<string, any> = {};

  for (const [standardName, possibleKeys] of Object.entries(
    aliases
  )) {
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
// BTC MARKET DATA
// =========================================================
//
// Uses Binance public klines for BTCUSDT.
//
// 15m = entry/momentum
// 1h  = higher timeframe trend
//
// We DO NOT randomly choose BTC BUY/SELL anymore.
//
// =========================================================

type Candle = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

async function fetchBinanceCandles(
  interval: "15m" | "1h",
  limit = 100
): Promise<Candle[]> {
  const url =
    `https://api.binance.com/api/v3/klines` +
    `?symbol=BTCUSDT` +
    `&interval=${interval}` +
    `&limit=${limit}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Binance candle request failed: ${response.status}`
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error(
      "Invalid Binance candle response"
    );
  }

  return data.map((k: any[]) => ({
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

// =========================================================
// EMA
// =========================================================

function ema(
  values: number[],
  period: number
): number {
  if (values.length === 0) {
    return 0;
  }

  const multiplier =
    2 / (period + 1);

  let result =
    values[0];

  for (
    let i = 1;
    i < values.length;
    i++
  ) {
    result =
      (
        values[i] -
        result
      ) *
        multiplier +
      result;
  }

  return result;
}

// =========================================================
// RSI
// =========================================================

function calculateRSI(
  closes: number[],
  period = 14
): number {
  if (
    closes.length <
    period + 1
  ) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  for (
    let i = 1;
    i <= period;
    i++
  ) {
    const diff =
      closes[i] -
      closes[i - 1];

    if (diff > 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  let avgGain =
    gains / period;

  let avgLoss =
    losses / period;

  for (
    let i = period + 1;
    i < closes.length;
    i++
  ) {
    const diff =
      closes[i] -
      closes[i - 1];

    const gain =
      diff > 0
        ? diff
        : 0;

    const loss =
      diff < 0
        ? Math.abs(diff)
        : 0;

    avgGain =
      (
        avgGain *
          (period - 1) +
        gain
      ) / period;

    avgLoss =
      (
        avgLoss *
          (period - 1) +
        loss
      ) / period;
  }

  if (avgLoss === 0) {
    return 100;
  }

  const rs =
    avgGain /
    avgLoss;

  return (
    100 -
    100 /
      (1 + rs)
  );
}

// =========================================================
// BTC TREND ANALYSIS
// =========================================================
//
// Returns:
// BUY
// SELL
// NO_TRADE
//
// Stronger confirmation required.
// =========================================================

async function analyzeBTC(): Promise<{
  direction:
    | "BUY"
    | "SELL"
    | "NO_TRADE";

  score: number;

  reason: string;

  rsi15m: number;

  rsi1h: number;

  ema15Fast: number;

  ema15Slow: number;

  ema1hFast: number;

  ema1hSlow: number;
}> {
  const [
    candles15m,
    candles1h,
  ] = await Promise.all([
    fetchBinanceCandles(
      "15m",
      100
    ),

    fetchBinanceCandles(
      "1h",
      100
    ),
  ]);

  if (
    candles15m.length < 50 ||
    candles1h.length < 50
  ) {
    return {
      direction: "NO_TRADE",
      score: 0,
      reason:
        "Not enough BTC candle data",
      rsi15m: 50,
      rsi1h: 50,
      ema15Fast: 0,
      ema15Slow: 0,
      ema1hFast: 0,
      ema1hSlow: 0,
    };
  }

  const close15 =
    candles15m.map(
      c => c.close
    );

  const close1h =
    candles1h.map(
      c => c.close
    );

  const ema15Fast =
    ema(close15, 9);

  const ema15Slow =
    ema(close15, 21);

  const ema1hFast =
    ema(close1h, 9);

  const ema1hSlow =
    ema(close1h, 21);

  const rsi15m =
    calculateRSI(
      close15,
      14
    );

  const rsi1h =
    calculateRSI(
      close1h,
      14
    );

  const last15 =
    candles15m[
      candles15m.length - 1
    ];

  const previous15 =
    candles15m[
      candles15m.length - 2
    ];

  let buyScore = 0;
  let sellScore = 0;

  const reasonsBuy: string[] = [];
  const reasonsSell: string[] = [];

  // =======================================================
  // 1H TREND
  // =======================================================

  if (
    ema1hFast >
    ema1hSlow
  ) {
    buyScore += 3;

    reasonsBuy.push(
      "1H EMA bullish"
    );
  }

  if (
    ema1hFast <
    ema1hSlow
  ) {
    sellScore += 3;

    reasonsSell.push(
      "1H EMA bearish"
    );
  }

  // =======================================================
  // 15M TREND
  // =======================================================

  if (
    ema15Fast >
    ema15Slow
  ) {
    buyScore += 2;

    reasonsBuy.push(
      "15M EMA bullish"
    );
  }

  if (
    ema15Fast <
    ema15Slow
  ) {
    sellScore += 2;

    reasonsSell.push(
      "15M EMA bearish"
    );
  }

  // =======================================================
  // PRICE vs EMA
  // =======================================================

  if (
    last15.close >
    ema15Fast
  ) {
    buyScore += 1;

    reasonsBuy.push(
      "Price above 15M EMA"
    );
  }

  if (
    last15.close <
    ema15Fast
  ) {
    sellScore += 1;

    reasonsSell.push(
      "Price below 15M EMA"
    );
  }

  // =======================================================
  // MOMENTUM CANDLE
  // =======================================================

  if (
    last15.close >
      last15.open &&
    last15.close >
      previous15.close
  ) {
    buyScore += 1;

    reasonsBuy.push(
      "Bullish momentum"
    );
  }

  if (
    last15.close <
      last15.open &&
    last15.close <
      previous15.close
  ) {
    sellScore += 1;

    reasonsSell.push(
      "Bearish momentum"
    );
  }

  // =======================================================
  // RSI
  // =======================================================

  if (
    rsi15m >= 52 &&
    rsi15m <= 68 &&
    rsi1h >= 50
  ) {
    buyScore += 2;

    reasonsBuy.push(
      "RSI bullish"
    );
  }

  if (
    rsi15m <= 48 &&
    rsi15m >= 32 &&
    rsi1h <= 50
  ) {
    sellScore += 2;

    reasonsSell.push(
      "RSI bearish"
    );
  }

  // =======================================================
  // FINAL CONFIRMATION
  // =======================================================

  const difference =
    Math.abs(
      buyScore -
      sellScore
    );

  // Require strong confluence.
  if (
    buyScore >= 6 &&
    buyScore > sellScore &&
    difference >= 3
  ) {
    return {
      direction: "BUY",

      score: buyScore,

      reason:
        reasonsBuy.join(
          " + "
        ),

      rsi15m,

      rsi1h,

      ema15Fast,

      ema15Slow,

      ema1hFast,

      ema1hSlow,
    };
  }

  if (
    sellScore >= 6 &&
    sellScore > buyScore &&
    difference >= 3
  ) {
    return {
      direction: "SELL",

      score: sellScore,

      reason:
        reasonsSell.join(
          " + "
        ),

      rsi15m,

      rsi1h,

      ema15Fast,

      ema15Slow,

      ema1hFast,

      ema1hSlow,
    };
  }

  return {
    direction: "NO_TRADE",

    score:
      Math.max(
        buyScore,
        sellScore
      ),

    reason:
      "BTC trend confirmation is mixed",

    rsi15m,

    rsi1h,

    ema15Fast,

    ema15Slow,

    ema1hFast,

    ema1hSlow,
  };
}

// =========================================================
// REASONS
// =========================================================

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

// =========================================================
// GOLD
// =========================================================

function generateGoldLevels(
  entry: number,
  isBuy: boolean
) {
  const slDistance = rand(15, 25);

  const tp1Distance = rand(5, 8);

  const tp2Distance = rand(10, 16);

  const tp3Distance = rand(18, 25);

  const sl =
    isBuy
      ? entry - slDistance
      : entry + slDistance;

  const tp1 =
    isBuy
      ? entry + tp1Distance
      : entry - tp1Distance;

  const tp2 =
    isBuy
      ? entry + tp2Distance
      : entry - tp2Distance;

  const tp3 =
    isBuy
      ? entry + tp3Distance
      : entry - tp3Distance;

  return {
    sl: round(sl, 2),
    tp1: round(tp1, 2),
    tp2: round(tp2, 2),
    tp3: round(tp3, 2),
  };
}

// =========================================================
// SILVER
// =========================================================

function generateSilverLevels(
  entry: number,
  isBuy: boolean
) {
  const slDistance = rand(1.5, 3);

  const tp1Distance = rand(0.6, 1);

  const tp2Distance = rand(1.2, 2);

  const tp3Distance = rand(2, 3);

  const sl =
    isBuy
      ? entry - slDistance
      : entry + slDistance;

  const tp1 =
    isBuy
      ? entry + tp1Distance
      : entry - tp1Distance;

  const tp2 =
    isBuy
      ? entry + tp2Distance
      : entry - tp2Distance;

  const tp3 =
    isBuy
      ? entry + tp3Distance
      : entry - tp3Distance;

  return {
    sl: round(sl, 3),
    tp1: round(tp1, 3),
    tp2: round(tp2, 3),
    tp3: round(tp3, 3),
  };
}

// =========================================================
// BTC
// =========================================================
//
// IMPORTANT:
//
// Entry = EXACT live price
//
// BUY:
//
// SL  -800
// TP1 +400
// TP2 +800
// TP3 +1400
//
// SELL:
//
// SL  +800
// TP1 -400
// TP2 -800
// TP3 -1400
//
// =========================================================

function generateBTCLevels(
  entry: number,
  isBuy: boolean
) {
  const SL_DISTANCE = 800;

  const TP1_DISTANCE = 400;

  const TP2_DISTANCE = 800;

  const TP3_DISTANCE = 1400;

  return {
    sl: round(
      isBuy
        ? entry - SL_DISTANCE
        : entry + SL_DISTANCE,
      2
    ),

    tp1: round(
      isBuy
        ? entry + TP1_DISTANCE
        : entry - TP1_DISTANCE,
      2
    ),

    tp2: round(
      isBuy
        ? entry + TP2_DISTANCE
        : entry - TP2_DISTANCE,
      2
    ),

    tp3: round(
      isBuy
        ? entry + TP3_DISTANCE
        : entry - TP3_DISTANCE,
      2
    ),
  };
}

// =========================================================
// MARKET HOURS
// =========================================================

function isTraditionalMarketOpen(
  pair: string,
  now = new Date()
): boolean {
  const day =
    now.getUTCDay();

  const minutes =
    now.getUTCHours() * 60 +
    now.getUTCMinutes();

  if (day === 0) {
    return minutes >= 22 * 60;
  }

  if (day === 6) {
    return false;
  }

  if (day === 5) {
    return minutes < 22 * 60;
  }

  return true;
}

function isMarketOpen(
  pair: string,
  now = new Date()
): boolean {
  const cryptoPairs =
    new Set([
      "BTC/USD",
      "ETH/USD",
      "SOL/USD",
    ]);

  const derivPairs =
    new Set([
      "BOOM 1000",
      "CRASH 1000",
      "VOL 75",
      "BOOM 500",
      "VOL 100",
    ]);

  if (
    cryptoPairs.has(pair) ||
    derivPairs.has(pair)
  ) {
    return true;
  }

  return isTraditionalMarketOpen(
    pair,
    now
  );
}

function filterOpenMarketPairs<
  T extends { pair: string }
>(
  pairs: T[]
): T[] {
  const now =
    new Date();

  return pairs.filter(
    item =>
      isMarketOpen(
        item.pair,
        now
      )
  );
}

// =========================================================
// SIGNAL GENERATOR
// =========================================================

async function generateSignal(
  config: any
) {
  const {
    pair,
    price,
    pipMultiplier,
    decimals,
  } = config;

  const currentPrice =
    Number(price.price);

  const isGold =
    pair ===
    "XAU/USD (Gold)";

  const isSilver =
    pair ===
    "XAG/USD (Silver)";

  const isBTC =
    pair === "BTC/USD";

  const isIndex =
    [
      "US30",
      "NASDAQ",
      "S&P500",
    ].includes(pair);

  const isVol75 =
    pair === "VOL 75";

  const isDeriv =
    [
      "BOOM 1000",
      "CRASH 1000",
      "VOL 75",
      "BOOM 500",
      "VOL 100",
    ].includes(pair);

  // =======================================================
  // BTC DIRECTION
  // =======================================================

  let isBuy: boolean;

  let analysisReason: string;

  let btcAnalysis:
    | Awaited<
        ReturnType<
          typeof analyzeBTC
        >
      >
    | null = null;

  if (isBTC) {
    btcAnalysis =
      await analyzeBTC();

    if (
      btcAnalysis.direction ===
      "NO_TRADE"
    ) {
      return null;
    }

    isBuy =
      btcAnalysis.direction ===
      "BUY";

    analysisReason =
      btcAnalysis.reason;
  } else {
    // =====================================================
    // Non-BTC assets
    //
    // Kept compatible with your existing system.
    // =====================================================

    isBuy =
      Math.random() > 0.5;

    analysisReason =
      pick(
        isBuy
          ? buyReasons
          : sellReasons
      );
  }

  // =======================================================
  // ENTRY
  // =======================================================

  let entryOffset = 0;

  if (isGold) {
    entryOffset =
      rand(
        -0.20,
        0.20
      );
  }

  else if (isSilver) {
    entryOffset =
      rand(
        -0.05,
        0.05
      );
  }

  else if (isBTC) {
    // IMPORTANT:
    // EXACT live price.
    entryOffset = 0;
  }

  else if (isIndex) {
    entryOffset =
      rand(-2, 2);
  }

  else if (isVol75) {
    entryOffset =
      rand(-5, 5);
  }

  else if (isDeriv) {
    entryOffset =
      rand(-5, 5);
  }

  else {
    entryOffset =
      rand(
        -pipMultiplier * 2,
        pipMultiplier * 2
      );
  }

  const entry =
    round(
      currentPrice +
        entryOffset,
      decimals
    );

  // =======================================================
  // LEVELS
  // =======================================================

  let levels: any;

  if (isGold) {
    levels =
      generateGoldLevels(
        entry,
        isBuy
      );
  }

  else if (isSilver) {
    levels =
      generateSilverLevels(
        entry,
        isBuy
      );
  }

  else if (isBTC) {
    levels =
      generateBTCLevels(
        entry,
        isBuy
      );
  }

  else if (isIndex) {
    const slDistance =
      rand(20, 35);

    const tp1Distance =
      rand(12, 18);

    const tp2Distance =
      rand(22, 30);

    const tp3Distance =
      rand(35, 50);

    levels = {
      sl: round(
        isBuy
          ? entry - slDistance
          : entry + slDistance,
        2
      ),

      tp1: round(
        isBuy
          ? entry + tp1Distance
          : entry - tp1Distance,
        2
      ),

      tp2: round(
        isBuy
          ? entry + tp2Distance
          : entry - tp2Distance,
        2
      ),

      tp3: round(
        isBuy
          ? entry + tp3Distance
          : entry - tp3Distance,
        2
      ),
    };
  }

  else if (isVol75) {
    const slDistance =
      rand(150, 250);

    const tp1Distance =
      rand(150, 250);

    const tp2Distance =
      rand(300, 450);

    const tp3Distance =
      rand(500, 700);

    levels = {
      sl: round(
        isBuy
          ? entry - slDistance
          : entry + slDistance,
        2
      ),

      tp1: round(
        isBuy
          ? entry + tp1Distance
          : entry - tp1Distance,
        2
      ),

      tp2: round(
        isBuy
          ? entry + tp2Distance
          : entry - tp2Distance,
        2
      ),

      tp3: round(
        isBuy
          ? entry + tp3Distance
          : entry - tp3Distance,
        2
      ),
    };
  }

  else if (isDeriv) {
    const slDistance =
      rand(40, 80);

    const tp1Distance =
      rand(40, 80);

    const tp2Distance =
      rand(90, 150);

    const tp3Distance =
      rand(160, 250);

    levels = {
      sl: round(
        isBuy
          ? entry - slDistance
          : entry + slDistance,
        2
      ),

      tp1: round(
        isBuy
          ? entry + tp1Distance
          : entry - tp1Distance,
        2
      ),

      tp2: round(
        isBuy
          ? entry + tp2Distance
          : entry - tp2Distance,
        2
      ),

      tp3: round(
        isBuy
          ? entry + tp3Distance
          : entry - tp3Distance,
        2
      ),
    };
  }

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

    levels = {
      sl: round(
        isBuy
          ? entry - slDistance
          : entry + slDistance,
        decimals
      ),

      tp1: round(
        isBuy
          ? entry + tp1Distance
          : entry - tp1Distance,
        decimals
      ),

      tp2: round(
        isBuy
          ? entry + tp2Distance
          : entry - tp2Distance,
        decimals
      ),

      tp3: round(
        isBuy
          ? entry + tp3Distance
          : entry - tp3Distance,
        decimals
      ),
    };
  }

  // =======================================================
  // FINAL SIGNAL
  // =======================================================

  return {
    pair,

    symbol: pair,

    category:
      isGold || isSilver
        ? "COMMODITIES"
        : isBTC
        ? "CRYPTO"
        : isDeriv
        ? "DERIV/BINARY"
        : isIndex
        ? "INDICES"
        : "FOREX",

    action:
      isBuy
        ? "BUY"
        : "SELL",

    direction:
      isBuy
        ? "BUY"
        : "SELL",

    entry,

    current_price:
      currentPrice,

    currentPrice,

    sl: levels.sl,

    tp1: levels.tp1,

    tp2: levels.tp2,

    tp3: levels.tp3,

    stop_loss:
      levels.sl,

    target1:
      levels.tp1,

    target2:
      levels.tp2,

    target3:
      levels.tp3,

    reason:
      analysisReason,

    signal_type:
      isBTC
        ? "Intraday"
        : isGold
        ? "Scalping"
        : pick([
            "Scalping",
            "Intraday",
            "Swing",
          ]),

    type:
      isBuy
        ? "BUY"
        : "SELL",

    created_at:
      new Date().toISOString(),

    // Extra BTC analysis data
    ...(isBTC &&
      btcAnalysis
      ? {
          analysis_score:
            btcAnalysis.score,

          rsi_15m:
            round(
              btcAnalysis.rsi15m,
              2
            ),

          rsi_1h:
            round(
              btcAnalysis.rsi1h,
              2
            ),

          ema_15m_fast:
            round(
              btcAnalysis.ema15Fast,
              2
            ),

          ema_15m_slow:
            round(
              btcAnalysis.ema15Slow,
              2
            ),

          ema_1h_fast:
            round(
              btcAnalysis.ema1hFast,
              2
            ),

          ema_1h_slow:
            round(
              btcAnalysis.ema1hSlow,
              2
            ),
        }
      : {}),
  };
}

// =========================================================
// EXPIRY
// =========================================================

function getExpiryHours(
  signalType: string
): number {
  if (
    signalType ===
    "Scalping"
  ) {
    return 3;
  }

  if (
    signalType ===
    "Intraday"
  ) {
    return 12;
  }

  if (
    signalType ===
    "Swing"
  ) {
    return 72;
  }

  return 6;
}

// =========================================================
// BTC VALIDATION
// =========================================================

function validateBTCSignal(
  signal: any,
  currentPrice: number
) {
  const entry =
    Number(signal.entry);

  const sl =
    Number(signal.sl);

  const tp1 =
    Number(signal.tp1);

  const tp2 =
    Number(signal.tp2);

  const tp3 =
    Number(signal.tp3);

  // Entry must equal live price.
  if (
    Math.abs(
      entry -
        currentPrice
    ) > 0.01
  ) {
    return false;
  }

  // =======================================================
  // BUY
  // =======================================================

  if (
    signal.action ===
    "BUY"
  ) {
    if (
      !(
        sl < entry &&
        entry < tp1 &&
        tp1 < tp2 &&
        tp2 < tp3
      )
    ) {
      return false;
    }

    if (
      currentPrice <= sl
    ) {
      return false;
    }

    if (
      Math.abs(
        entry - sl
      ) !== 800
    ) {
      return false;
    }

    if (
      Math.abs(
        tp1 - entry
      ) !== 400
    ) {
      return false;
    }

    if (
      Math.abs(
        tp2 - entry
      ) !== 800
    ) {
      return false;
    }

    if (
      Math.abs(
        tp3 - entry
      ) !== 1400
    ) {
      return false;
    }
  }

  // =======================================================
  // SELL
  // =======================================================

  else {
    if (
      !(
        sl > entry &&
        entry > tp1 &&
        tp1 > tp2 &&
        tp2 > tp3
      )
    ) {
      return false;
    }

    if (
      currentPrice >= sl
    ) {
      return false;
    }

    if (
      Math.abs(
        sl - entry
      ) !== 800
    ) {
      return false;
    }

    if (
      Math.abs(
        tp1 - entry
      ) !== 400
    ) {
      return false;
    }

    if (
      Math.abs(
        tp2 - entry
      ) !== 800
    ) {
      return false;
    }

    if (
      Math.abs(
        tp3 - entry
      ) !== 1400
    ) {
      return false;
    }
  }

  return true;
}

// =========================================================
// GENERAL VALIDATION
// =========================================================

function validateSignal(
  signal: any
) {
  const entry =
    Number(signal.entry);

  const sl =
    Number(signal.sl);

  const tp1 =
    Number(signal.tp1);

  const tp2 =
    Number(signal.tp2);

  const tp3 =
    Number(signal.tp3);

  if (
    !Number.isFinite(entry) ||
    !Number.isFinite(sl) ||
    !Number.isFinite(tp1) ||
    !Number.isFinite(tp2) ||
    !Number.isFinite(tp3)
  ) {
    return false;
  }

  if (
    signal.action ===
    "BUY"
  ) {
    return (
      sl < entry &&
      entry < tp1 &&
      tp1 < tp2 &&
      tp2 < tp3
    );
  }

  return (
    sl > entry &&
    entry > tp1 &&
    tp1 > tp2 &&
    tp2 > tp3
  );
}

// =========================================================
// ACTIVE SIGNAL CHECK
// =========================================================

async function evaluatePair(
  pair: string
) {
  const {
    data,
    error,
  } =
    await supabase
      .from("signals")
      .select(
        "id, pair, status"
      )
      .eq(
        "pair",
        pair
      )
      .eq(
        "status",
        "OPEN"
      )
      .limit(1);

  if (error) {
    console.error(
      "Active signal check error:",
      error
    );

    return false;
  }

  return (
    !data ||
    data.length === 0
  );
}

// =========================================================
// TELEGRAM
// =========================================================

async function postTelegram(
  signal: any
) {
  try {
    const response =
      await fetch(
        `${SUPABASE_URL}/functions/v1/telegram-signal-post`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,

            apikey:
              SUPABASE_SERVICE_ROLE_KEY,
          },

          body: JSON.stringify({
            action:
              "new_signal",

            signal: {
              ...signal,

              type:
                signal.type ||
                signal.action ||
                signal.direction,
            },
          }),
        }
      );

    const resultText =
      await response.text();

    console.log(
      "Telegram response:",
      response.status,
      resultText
    );

    let parsed: any =
      null;

    try {
      parsed =
        JSON.parse(
          resultText
        );
    } catch {
      // Ignore
    }

    const ok =
      response.ok &&
      parsed?.success ===
        true;

    return {
      success: ok,

      error:
        parsed?.error ||
        null,

      message_id:
        parsed?.message_id ??
        null,

      chat_id:
        parsed?.chat_id ??
        null,
    };
  } catch (error) {
    console.error(
      "Telegram error:",
      error
    );

    return {
      success: false,

      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

// =========================================================
// MAIN
// =========================================================

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
      // ===================================================
      // LIVE PRICES
      // ===================================================

      const livePrices =
        await fetchLivePrices();

      // ===================================================
      // PAIRS
      // ===================================================

      const commodities = [
        {
          pair:
            "XAU/USD (Gold)",
          pipMultiplier: 1,
          decimals: 2,
        },

        {
          pair:
            "XAG/USD (Silver)",
          pipMultiplier:
            0.05,
          decimals: 3,
        },

        {
          pair: "US30",
          pipMultiplier: 1,
          decimals: 2,
        },

        {
          pair: "NASDAQ",
          pipMultiplier: 1,
          decimals: 2,
        },

        {
          pair: "S&P500",
          pipMultiplier: 1,
          decimals: 2,
        },
      ];

      const forex = [
        {
          pair: "EUR/USD",
          pipMultiplier:
            0.001,
          decimals: 5,
        },

        {
          pair: "GBP/USD",
          pipMultiplier:
            0.001,
          decimals: 5,
        },

        {
          pair: "USD/JPY",
          pipMultiplier:
            0.1,
          decimals: 3,
        },

        {
          pair: "AUD/USD",
          pipMultiplier:
            0.001,
          decimals: 5,
        },

        {
          pair: "GBP/JPY",
          pipMultiplier:
            0.1,
          decimals: 3,
        },

        {
          pair: "USD/CAD",
          pipMultiplier:
            0.001,
          decimals: 5,
        },
      ];

      const crypto = [
        {
          pair: "BTC/USD",
          pipMultiplier: 1,
          decimals: 2,
        },

        {
          pair: "ETH/USD",
          pipMultiplier: 1,
          decimals: 2,
        },

        {
          pair: "SOL/USD",
          pipMultiplier: 1,
          decimals: 2,
        },
      ];

      const deriv = [
        {
          pair:
            "BOOM 1000",
          pipMultiplier: 10,
          decimals: 2,
        },

        {
          pair:
            "CRASH 1000",
          pipMultiplier: 10,
          decimals: 2,
        },

        {
          pair:
            "VOL 75",
          pipMultiplier: 1,
          decimals: 2,
        },

        {
          pair:
            "BOOM 500",
          pipMultiplier: 10,
          decimals: 2,
        },

        {
          pair:
            "VOL 100",
          pipMultiplier: 10,
          decimals: 2,
        },
      ];

      // ===================================================
      // WEIGHTED SELECTION
      // ===================================================

      const weighted: any[] =
        [];

      for (
        const item of commodities
      ) {
        let weight = 1;

        if (
          item.pair ===
          "XAU/USD (Gold)"
        ) {
          weight = 55;
        }

        else if (
          item.pair ===
          "XAG/USD (Silver)"
        ) {
          weight = 12;
        }

        else if (
          item.pair ===
          "US30"
        ) {
          weight = 9;
        }

        else if (
          item.pair ===
          "NASDAQ"
        ) {
          weight = 8;
        }

        else if (
          item.pair ===
          "S&P500"
        ) {
          weight = 6;
        }

        for (
          let i = 0;
          i < weight;
          i++
        ) {
          weighted.push(
            item
          );
        }
      }

      for (
        const item of forex
      ) {
        weighted.push(item);
      }

      for (
        const item of crypto
      ) {
        weighted.push(item);
      }

      for (
        const item of deriv
      ) {
        weighted.push(item);
      }

      // ===================================================
      // MARKET OPEN
      // ===================================================

      const openWeighted =
        filterOpenMarketPairs(
          weighted
        );

      if (
        openWeighted.length ===
        0
      ) {
        return new Response(
          JSON.stringify({
            success: true,
            generated: false,
            reason:
              "No markets are currently open",
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

      const selected =
        pick(openWeighted);

      // ===================================================
      // LIVE PRICE
      // ===================================================

      const live =
        livePrices[
          selected.pair
        ];

      if (
        !live ||
        !Number.isFinite(
          Number(live.price)
        )
      ) {
        return new Response(
          JSON.stringify({
            success: true,
            generated: false,
            reason:
              `No live price for ${selected.pair}`,
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

      // ===================================================
      // ONLY ONE OPEN SIGNAL
      // ===================================================

      const canGenerate =
        await evaluatePair(
          selected.pair
        );

      if (!canGenerate) {
        return new Response(
          JSON.stringify({
            success: true,
            generated: false,
            reason:
              `${selected.pair} already has an open signal`,
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

      // ===================================================
      // GENERATE
      // ===================================================

      const signal =
        await generateSignal({
          ...selected,
          price: live,
        });

      // ===================================================
      // BTC MIXED = NO TRADE
      // ===================================================

      if (!signal) {
        return new Response(
          JSON.stringify({
            success: true,
            generated: false,
            reason:
              selected.pair ===
              "BTC/USD"
                ? "BTC trend confirmation is mixed - no signal generated"
                : "No valid signal generated",
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

      const currentPrice =
        Number(live.price);

      // ===================================================
      // GENERAL VALIDATION
      // ===================================================

      if (
        !validateSignal(
          signal
        )
      ) {
        console.log(
          "General validation failed:",
          signal
        );

        return new Response(
          JSON.stringify({
            success: true,
            generated: false,
            reason:
              "Signal validation failed",
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

      // ===================================================
      // BTC VALIDATION
      // ===================================================

      if (
        selected.pair ===
        "BTC/USD"
      ) {
        if (
          !validateBTCSignal(
            signal,
            currentPrice
          )
        ) {
          console.log(
            "BTC validation failed:",
            signal
          );

          return new Response(
            JSON.stringify({
              success: true,
              generated: false,
              reason:
                "BTC validation failed",
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
      }

      // ===================================================
      // EXPIRY
      // ===================================================

      const expiryTime =
        new Date(
          Date.now() +
            getExpiryHours(
              signal.signal_type
            ) *
              60 *
              60 *
              1000
        ).toISOString();

      // ===================================================
      // INSERT
      // ===================================================

      const insertData = {
        pair:
          signal.pair,

        symbol:
          signal.symbol,

        category:
          signal.category,

        type:
          signal.type,

        action:
          signal.action,

        direction:
          signal.direction,

        entry:
          signal.entry,

        current_price:
          signal.currentPrice,

        sl:
          signal.sl,

        tp1:
          signal.tp1,

        tp2:
          signal.tp2,

        tp3:
          signal.tp3,

        stop_loss:
          signal.stop_loss,

        target1:
          signal.target1,

        target2:
          signal.target2,

        target3:
          signal.target3,

        analysis_reason:
          signal.reason,

        reason:
          signal.reason,

        signal_type:
          signal.signal_type,

        status:
          "OPEN",

        signal_status:
          "OPEN",

        expiry_time:
          expiryTime,

        created_at:
          signal.created_at,

        // BTC analysis
        ...(signal.analysis_score !==
        undefined
          ? {
              analysis_score:
                signal.analysis_score,

              rsi_15m:
                signal.rsi_15m,

              rsi_1h:
                signal.rsi_1h,

              ema_15m_fast:
                signal.ema_15m_fast,

              ema_15m_slow:
                signal.ema_15m_slow,

              ema_1h_fast:
                signal.ema_1h_fast,

              ema_1h_slow:
                signal.ema_1h_slow,
            }
          : {}),
      };

      const {
        data: inserted,
        error,
      } =
        await supabase
          .from("signals")
          .insert(
            insertData
          )
          .select()
          .single();

      if (error) {
        console.error(
          "Signal insert error:",
          error
        );

        throw error;
      }

      // ===================================================
      // TELEGRAM
      // ===================================================

      const telegramResult =
        await postTelegram({
          ...signal,
          id:
            inserted?.id,
        });

      // ===================================================
      // TELEGRAM MESSAGE ID
      // ===================================================

      if (
        inserted?.id &&
        telegramResult.message_id
      ) {
        await supabase
          .from("signals")
          .update({
            telegram_message_id:
              telegramResult.message_id,

            telegram_chat_id:
              telegramResult.chat_id
                ? String(
                    telegramResult.chat_id
                  )
                : null,
          })
          .eq(
            "id",
            inserted.id
          );
      }

      // ===================================================
      // RESPONSE
      // ===================================================

      return new Response(
        JSON.stringify({
          success: true,

          generated: true,

          signal: inserted,

          telegram_posted:
            telegramResult.success,

          telegram_error:
            telegramResult.error,
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

    catch (error) {
      console.error(
        "AUTO GENERATE ERROR:",
        error
      );

      return new Response(
        JSON.stringify({
          success: false,

          generated: false,

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
  }
);
