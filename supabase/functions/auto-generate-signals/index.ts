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
// GOLD - DETERMINISTIC MULTI-TIMEFRAME LOGIC
// 1H = trend | 5M = setup | 1M = confirmation | $10+ trigger
// Entry = whole dollar | SL = 1R | TP1 = 1R | TP2 = 3R | TP3 = 5R
// =========================================================

function generateGoldLevels(entry: number, isBuy: boolean) {
  const risk = 5;

  return {
    sl: Math.round(isBuy ? entry - risk : entry + risk),
    tp1: Math.round(isBuy ? entry + risk : entry - risk),
    tp2: Math.round(isBuy ? entry + risk * 3 : entry - risk * 3),
    tp3: Math.round(isBuy ? entry + risk * 5 : entry - risk * 5),
  };
}

type GoldCandle = {
  open: number;
  high: number;
  low: number;
  close: number;
};

function goldEMA(values: number[], period: number): number[] {
  if (!values.length) return [];

  const multiplier = 2 / (period + 1);
  const result = [values[0]];

  for (let i = 1; i < values.length; i++) {
    result.push(
      values[i] * multiplier +
      result[i - 1] * (1 - multiplier)
    );
  }

  return result;
}

async function fetchGoldCandles(
  interval: "1m" | "5m" | "1h",
  range: "1d" | "5d"
): Promise<GoldCandle[]> {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/GC=F" +
    `?range=${range}&interval=${interval}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "User-Agent": "LiveSignals-Gold-Engine/1.0",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(
      `Gold ${interval} candle request failed: ${response.status}`
    );
  }

  const data = await response.json();
  const quote = data?.chart?.result?.[0]?.indicators?.quote?.[0];

  if (!quote) return [];

  const candles: GoldCandle[] = [];

  for (let i = 0; i < (quote.close?.length || 0); i++) {
    const open = Number(quote.open?.[i]);
    const high = Number(quote.high?.[i]);
    const low = Number(quote.low?.[i]);
    const close = Number(quote.close?.[i]);

    if (
      Number.isFinite(open) &&
      Number.isFinite(high) &&
      Number.isFinite(low) &&
      Number.isFinite(close)
    ) {
      candles.push({ open, high, low, close });
    }
  }

  return candles;
}

function getGoldDirection(
  candles1h: GoldCandle[],
  candles5m: GoldCandle[],
  candles1m: GoldCandle[]
): { direction: "BUY" | "SELL"; reason: string } | null {

  if (
    candles1h.length < 60 ||
    candles5m.length < 25 ||
    candles1m.length < 10
  ) {
    return null;
  }

  // -------------------------
  // 1H TREND
  // -------------------------
  const closes1h = candles1h.map(c => c.close);
  const ema20_1h = goldEMA(closes1h, 20);
  const ema50_1h = goldEMA(closes1h, 50);

  const last1h = candles1h[candles1h.length - 1];

  const e20 = ema20_1h[ema20_1h.length - 1];
  const e50 = ema50_1h[ema50_1h.length - 1];
  const previousE20 = ema20_1h[ema20_1h.length - 2];

  const bullishTrend =
    e20 > e50 &&
    e20 > previousE20 &&
    last1h.close > e20;

  const bearishTrend =
    e20 < e50 &&
    e20 < previousE20 &&
    last1h.close < e20;

  if (!bullishTrend && !bearishTrend) {
    return null;
  }

  // -------------------------
  // 5M SETUP
  // -------------------------
  const closes5m = candles5m.map(c => c.close);
  const ema20_5m = goldEMA(closes5m, 20);

  const last5m = candles5m[candles5m.length - 1];
  const previous5m = candles5m[candles5m.length - 2];

  const e20_5m = ema20_5m[ema20_5m.length - 1];

  const recent5m = candles5m.slice(-13, -1);

  const recentHigh = Math.max(
    ...recent5m.map(c => c.high)
  );

  const recentLow = Math.min(
    ...recent5m.map(c => c.low)
  );

  const bullish5m =
    last5m.close > e20_5m &&
    (
      previous5m.low <= e20_5m ||
      last5m.close > recentHigh
    ) &&
    last5m.close > last5m.open;

  const bearish5m =
    last5m.close < e20_5m &&
    (
      previous5m.high >= e20_5m ||
      last5m.close < recentLow
    ) &&
    last5m.close < last5m.open;

  // -------------------------
  // 1M CONFIRMATION
  // -------------------------
  const last1m = candles1m[candles1m.length - 1];
  const previous1m = candles1m[candles1m.length - 2];

  const bullish1m =
    last1m.close > last1m.open &&
    last1m.close > previous1m.high;

  const bearish1m =
    last1m.close < last1m.open &&
    last1m.close < previous1m.low;

  if (bullishTrend && bullish5m && bullish1m) {
    return {
      direction: "BUY",
      reason:
        "1H bullish trend + 5M bullish setup + 1M confirmation + $10+ movement",
    };
  }

  if (bearishTrend && bearish5m && bearish1m) {
    return {
      direction: "SELL",
      reason:
        "1H bearish trend + 5M bearish setup + 1M confirmation + $10+ movement",
    };
  }

  return null;
}

async function analyzeGold(currentPrice: number) {
  try {
    const [candles1h, candles5m, candles1m] =
      await Promise.all([
        fetchGoldCandles("1h", "5d"),
        fetchGoldCandles("5m", "1d"),
        fetchGoldCandles("1m", "1d"),
      ]);

    if (
      candles1h.length < 60 ||
      candles5m.length < 25 ||
      candles1m.length < 30
    ) {
      return null;
    }

    const analysis = getGoldDirection(
      candles1h,
      candles5m,
      candles1m
    );

    if (!analysis) {
      return null;
    }

    // $10+ movement trigger from the recent 60 x 1M candles.
    const triggerWindow = candles1m.slice(-60);

    const recentLow = Math.min(
      ...triggerWindow.map(c => c.low)
    );

    const recentHigh = Math.max(
      ...triggerWindow.map(c => c.high)
    );

    const triggerDistance =
      analysis.direction === "BUY"
        ? currentPrice - recentLow
        : recentHigh - currentPrice;

    if (triggerDistance < 10) {
      return null;
    }

    // Whole-dollar entry. Never use decimals for Gold entry.
    const entry =
      analysis.direction === "BUY"
        ? Math.ceil(currentPrice)
        : Math.floor(currentPrice);

    const levels = generateGoldLevels(
      entry,
      analysis.direction === "BUY"
    );

    return {
      direction: analysis.direction,
      entry,
      levels,
      reason: analysis.reason,
    };
  } catch (error) {
    console.error(
      "Gold multi-timeframe analysis failed:",
      error
    );

    return null;
  }
}

// =========================================================
// SILVER - FIXED LOGIC
// =========================================================

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

// =========================================================
// BTC - FIXED LOGIC
// =========================================================

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
  const {
    pair,
    price,
    pipMultiplier,
    decimals,
  } = config;

  const currentPrice = Number(price.price);

  const isGold = pair === "XAU/USD (Gold)";
  const isSilver = pair === "XAG/USD (Silver)";
  const isBTC = pair === "BTC/USD";

  const isIndex = [
    "US30",
    "NASDAQ",
    "S&P500",
  ].includes(pair);

  const isVol75 = pair === "VOL 75";

  const isDeriv = [
    "BOOM 1000",
    "CRASH 1000",
    "VOL 75",
    "BOOM 500",
    "VOL 100",
  ].includes(pair);

  const isBuy = Math.random() > 0.5;

  // =======================================================
  // ENTRY DISTANCE
  // =======================================================

  let entryOffset = 0;

  if (isGold) {
    // GOLD: existing working logic
    entryOffset = rand(-0.50, 0.50);
  } else if (isSilver) {
    // SILVER: maximum $0.10 away
    entryOffset = rand(-0.10, 0.10);
  } else if (isBTC) {
    // BTC: maximum $10 away
    entryOffset = rand(-10, 10);
  } else if (isIndex) {
    entryOffset = rand(-2, 2);
  } else if (isVol75) {
    entryOffset = rand(-5, 5);
  } else if (isDeriv) {
    entryOffset = rand(-5, 5);
  } else {
    entryOffset = rand(
      -pipMultiplier * 3,
      pipMultiplier * 3
    );
  }

  const entry = Number(
    (currentPrice + entryOffset).toFixed(decimals)
  );

  // =======================================================
  // LEVELS
  // =======================================================

  let levels;

  if (isGold) {
    levels = generateGoldLevels(entry, isBuy);
  }

  // SILVER
  else if (isSilver) {
    levels = generateSilverLevels(entry, isBuy);
  }

  // BTC
  else if (isBTC) {
    levels = generateBTCLevels(entry, isBuy);
  }

  // INDICES
  else if (isIndex) {
    const slDistance = rand(20, 35);
    const tp1Distance = rand(10, 18);
    const tp2Distance = rand(20, 30);
    const tp3Distance = rand(30, 50);

    levels = {
      sl: Number(
        (isBuy
          ? entry - slDistance
          : entry + slDistance
        ).toFixed(2)
      ),

      tp1: Number(
        (isBuy
          ? entry + tp1Distance
          : entry - tp1Distance
        ).toFixed(2)
      ),

      tp2: Number(
        (isBuy
          ? entry + tp2Distance
          : entry - tp2Distance
        ).toFixed(2)
      ),

      tp3: Number(
        (isBuy
          ? entry + tp3Distance
          : entry - tp3Distance
        ).toFixed(2)
      ),
    };
  }

  // VOL 75
  else if (isVol75) {
    const slDistance = rand(150, 250);
    const tp1Distance = rand(150, 250);
    const tp2Distance = rand(300, 450);
    const tp3Distance = rand(500, 700);

    levels = {
      sl: Number(
        (isBuy
          ? entry - slDistance
          : entry + slDistance
        ).toFixed(2)
      ),

      tp1: Number(
        (isBuy
          ? entry + tp1Distance
          : entry - tp1Distance
        ).toFixed(2)
      ),

      tp2: Number(
        (isBuy
          ? entry + tp2Distance
          : entry - tp2Distance
        ).toFixed(2)
      ),

      tp3: Number(
        (isBuy
          ? entry + tp3Distance
          : entry - tp3Distance
        ).toFixed(2)
      ),
    };
  }

  // OTHER DERIV
  else if (isDeriv) {
    const slDistance = rand(40, 80);
    const tp1Distance = rand(40, 80);
    const tp2Distance = rand(90, 150);
    const tp3Distance = rand(160, 250);

    levels = {
      sl: Number(
        (isBuy
          ? entry - slDistance
          : entry + slDistance
        ).toFixed(2)
      ),

      tp1: Number(
        (isBuy
          ? entry + tp1Distance
          : entry - tp1Distance
        ).toFixed(2)
      ),

      tp2: Number(
        (isBuy
          ? entry + tp2Distance
          : entry - tp2Distance
        ).toFixed(2)
      ),

      tp3: Number(
        (isBuy
          ? entry + tp3Distance
          : entry - tp3Distance
        ).toFixed(2)
      ),
    };
  }

  // FOREX / OTHER CRYPTO
  else {
    const slDistance = rand(12, 20) * pipMultiplier;
    const tp1Distance = rand(15, 25) * pipMultiplier;
    const tp2Distance = rand(30, 45) * pipMultiplier;
    const tp3Distance = rand(50, 75) * pipMultiplier;

    levels = {
      sl: Number(
        (isBuy
          ? entry - slDistance
          : entry + slDistance
        ).toFixed(decimals)
      ),

      tp1: Number(
        (isBuy
          ? entry + tp1Distance
          : entry - tp1Distance
        ).toFixed(decimals)
      ),

      tp2: Number(
        (isBuy
          ? entry + tp2Distance
          : entry - tp2Distance
        ).toFixed(decimals)
      ),

      tp3: Number(
        (isBuy
          ? entry + tp3Distance
          : entry - tp3Distance
        ).toFixed(decimals)
      ),
    };
  }

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
        ? "COMMODITIES"
        : "FOREX",

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

    reason: pick(
      isBuy ? buyReasons : sellReasons
    ),

    signal_type: isGold
      ? "Scalping"
      : pick([
          "Scalping",
          "Intraday",
          "Swing",
        ]),

    // FIX: the `signals` table's real direction column is `type`
    // (NOT `action`/`direction`) — the frontend card reads
    // `signal.type` to show the BUY/SELL badge. We keep
    // action/direction too for backward compatibility with any
    // code still reading those.
    type: isBuy ? "BUY" : "SELL",

    created_at: new Date().toISOString(),
  };
}

// =========================================================
// EXPIRY TIME
// -----------------------------------------------------------
// Auto-generated signals never got an expiry_time before, so the
// client-side auto-close timer (useSignalTimer) had nothing to
// expire and signals stayed OPEN forever. This also feeds the
// server-side safety-close timeout in auto-close-signals.
// =========================================================

function getExpiryHours(signalType: string): number {
  if (signalType === "Scalping") return 3;
  if (signalType === "Intraday") return 12;
  if (signalType === "Swing") return 72;
  return 6;
}

// =========================================================
// SILVER VALIDATION
// =========================================================

function validateSilverSignal(
  signal: any,
  currentPrice: number
) {
  const entry = Number(signal.entry);
  const sl = Number(signal.sl);
  const tp1 = Number(signal.tp1);
  const tp2 = Number(signal.tp2);
  const tp3 = Number(signal.tp3);

  // Entry must stay very close to live price
  if (Math.abs(entry - currentPrice) > 0.15) {
    return false;
  }

  if (signal.action === "BUY") {
    if (!(sl < entry && entry < tp1 && tp1 < tp2 && tp2 < tp3)) {
      return false;
    }

    // Current price must not already be below SL
    if (currentPrice <= sl) {
      return false;
    }
  } else {
    if (!(sl > entry && entry > tp1 && tp1 > tp2 && tp2 > tp3)) {
      return false;
    }

    // Current price must not already be above SL
    if (currentPrice >= sl) {
      return false;
    }
  }

  // Maximum distances
  if (Math.abs(sl - entry) > 3.1) return false;
  if (Math.abs(tp1 - entry) > 1.1) return false;
  if (Math.abs(tp2 - entry) > 2.1) return false;
  if (Math.abs(tp3 - entry) > 3.1) return false;

  return true;
}

// =========================================================
// BTC VALIDATION
// =========================================================

function validateBTCSignal(
  signal: any,
  currentPrice: number
) {
  const entry = Number(signal.entry);
  const sl = Number(signal.sl);
  const tp1 = Number(signal.tp1);
  const tp2 = Number(signal.tp2);
  const tp3 = Number(signal.tp3);

  // Entry must stay within $10.50 of live price
  if (Math.abs(entry - currentPrice) > 10.5) {
    return false;
  }

  if (signal.action === "BUY") {
    if (!(sl < entry && entry < tp1 && tp1 < tp2 && tp2 < tp3)) {
      return false;
    }

    // Current price must be above SL
    if (currentPrice <= sl) {
      return false;
    }
  } else {
    if (!(sl > entry && entry > tp1 && tp1 > tp2 && tp2 > tp3)) {
      return false;
    }

    // Current price must be below SL
    if (currentPrice >= sl) {
      return false;
    }
  }

  // Maximum distances
  if (Math.abs(sl - entry) > 60) return false;
  if (Math.abs(tp1 - entry) > 35) return false;
  if (Math.abs(tp2 - entry) > 70) return false;
  if (Math.abs(tp3 - entry) > 120) return false;

  return true;
}

// =========================================================
// GENERAL VALIDATION
// =========================================================

function validateSignal(
  signal: any,
  currentPrice: number
) {
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
    if (!(sl < entry && entry < tp1 && tp1 < tp2 && tp2 < tp3)) {
      return false;
    }
  } else {
    if (!(sl > entry && entry > tp1 && tp1 > tp2 && tp2 > tp3)) {
      return false;
    }
  }

  return true;
}

// =========================================================
// CHECK ACTIVE SIGNAL
// =========================================================

async function evaluatePair(pair: string) {
  const { data, error } = await supabase
    .from("signals")
    .select("id, pair, status, signal_status")
    .eq("pair", pair)
    .or("status.ilike.OPEN,signal_status.ilike.OPEN")
    .limit(1);

  if (error) {
    console.error("Active signal check error:", error);
    return false;
  }

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
          // send `type` explicitly too so telegram-signal-post
          // always has a direction to render even if its own
          // fallback logic ever changes.
          signal: {
            ...signal,
            type: signal.type || signal.action || signal.direction,
          },
        }),
      }
    );

    const resultText = await response.text();

    console.log(
      "Telegram response:",
      response.status,
      resultText
    );

    let parsed: any = null;
    try {
      parsed = JSON.parse(resultText);
    } catch {
      // non-JSON response — fall through, treated as failure below
    }

    const ok = response.ok && parsed?.success === true;

    if (!ok) {
      // IMPORTANT: this used to fail silently. Log loudly so the
      // reason (missing TELEGRAM_BOT_TOKEN/TELEGRAM_CHANNEL_ID,
      // wrong chat id, bot not admin in channel, etc.) is visible
      // in the auto-generate-signals function logs.
      console.error(
        "TELEGRAM POST FAILED:",
        response.status,
        parsed?.error || resultText
      );
    }

    return {
      success: ok,
      error: parsed?.error || null,
      // Stored on the signal row so a later TP/SL update can EDIT
      // this exact channel message instead of posting a new one.
      message_id: parsed?.message_id ?? null,
      chat_id: parsed?.chat_id ?? null,
    };
  } catch (error) {
    console.error("Telegram post error:", error);
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
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const livePrices = await fetchLivePrices();

    // =====================================================
    // PAIRS
    // =====================================================

    const commodities = [
      {
        pair: "XAU/USD (Gold)",
        pipMultiplier: 1,
        decimals: 2,
      },
      {
        pair: "XAG/USD (Silver)",
        pipMultiplier: 0.05,
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
        pipMultiplier: 0.001,
        decimals: 5,
      },
      {
        pair: "GBP/USD",
        pipMultiplier: 0.001,
        decimals: 5,
      },
      {
        pair: "USD/JPY",
        pipMultiplier: 0.1,
        decimals: 3,
      },
      {
        pair: "AUD/USD",
        pipMultiplier: 0.001,
        decimals: 5,
      },
      {
        pair: "GBP/JPY",
        pipMultiplier: 0.1,
        decimals: 3,
      },
      {
        pair: "USD/CAD",
        pipMultiplier: 0.001,
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
        pair: "BOOM 1000",
        pipMultiplier: 10,
        decimals: 2,
      },
      {
        pair: "CRASH 1000",
        pipMultiplier: 10,
        decimals: 2,
      },
      {
        pair: "VOL 75",
        pipMultiplier: 1,
        decimals: 2,
      },
      {
        pair: "BOOM 500",
        pipMultiplier: 10,
        decimals: 2,
      },
      {
        pair: "VOL 100",
        pipMultiplier: 10,
        decimals: 2,
      },
    ];

    const allPairs = [
      ...commodities,
      ...forex,
      ...crypto,
      ...deriv,
    ];

    // =====================================================
    // WEIGHTED SELECTION
    // =====================================================

    const weighted: any[] = [];

    for (const item of commodities) {
      let weight = 1;

      if (item.pair === "XAU/USD (Gold)") {
        weight = 55;
      } else if (item.pair === "XAG/USD (Silver)") {
        weight = 12;
      } else if (item.pair === "US30") {
        weight = 9;
      } else if (item.pair === "NASDAQ") {
        weight = 8;
      } else if (item.pair === "S&P500") {
        weight = 6;
      }

      for (let i = 0; i < weight; i++) {
        weighted.push(item);
      }
    }

    for (const item of forex) {
      weighted.push(item);
    }

    for (const item of crypto) {
      weighted.push(item);
    }

    for (const item of deriv) {
      weighted.push(item);
    }

    const selected = pick(weighted);

    // =====================================================
    // LIVE PRICE CHECK
    // =====================================================

    const live = livePrices[selected.pair];

    if (!live || !Number.isFinite(Number(live.price))) {
      console.log(
        `No live price for ${selected.pair}`
      );

      return new Response(
        JSON.stringify({
          success: true,
          generated: false,
          reason: `No live price for ${selected.pair}`,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // =====================================================
    // ONLY ONE OPEN SIGNAL PER PAIR
    // =====================================================

    const canGenerate = await evaluatePair(
      selected.pair
    );

    if (!canGenerate) {
      return new Response(
        JSON.stringify({
          success: true,
          generated: false,
          reason: `${selected.pair} already has an open signal`,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // =====================================================
    // GENERATE
    // =====================================================

    const currentPrice = Number(live.price);

    let signal: any;

    if (selected.pair === "XAU/USD (Gold)") {
      const goldAnalysis = await analyzeGold(currentPrice);

      // IMPORTANT: no random/fake Gold signal.
      // If all Gold conditions are not confirmed, generate nothing.
      if (!goldAnalysis) {
        return new Response(
          JSON.stringify({
            success: true,
            generated: false,
            reason:
              "Gold setup rejected: 1H trend, 5M setup, 1M confirmation and $10+ trigger were not all confirmed",
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const isBuy =
        goldAnalysis.direction === "BUY";

      signal = {
        pair: selected.pair,
        symbol: selected.pair,
        category: "COMMODITIES",

        type: isBuy ? "BUY" : "SELL",
        action: goldAnalysis.direction,
        direction: goldAnalysis.direction,

        entry: goldAnalysis.entry,

        current_price: currentPrice,
        currentPrice,

        sl: goldAnalysis.levels.sl,
        tp1: goldAnalysis.levels.tp1,
        tp2: goldAnalysis.levels.tp2,
        tp3: goldAnalysis.levels.tp3,

        stop_loss: goldAnalysis.levels.sl,
        target1: goldAnalysis.levels.tp1,
        target2: goldAnalysis.levels.tp2,
        target3: goldAnalysis.levels.tp3,

        reason: goldAnalysis.reason,
        signal_type: "Scalping",
        created_at: new Date().toISOString(),
      };
    } else {
      signal = generateSignal({
        ...selected,
        price: live,
      });
    }

    // =====================================================
    // VALIDATE
    // =====================================================

    if (
      !validateSignal(
        signal,
        currentPrice
      )
    ) {
      console.log(
        "General signal validation failed:",
        signal
      );

      return new Response(
        JSON.stringify({
          success: true,
          generated: false,
          reason: "Signal validation failed",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // SILVER SPECIAL VALIDATION
    if (
      selected.pair ===
      "XAG/USD (Silver)"
    ) {
      if (
        !validateSilverSignal(
          signal,
          currentPrice
        )
      ) {
        console.log(
          "Silver validation failed:",
          signal
        );

        return new Response(
          JSON.stringify({
            success: true,
            generated: false,
            reason:
              "Silver signal validation failed",
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    // BTC SPECIAL VALIDATION
    if (
      selected.pair === "BTC/USD"
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
              "BTC signal validation failed",
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    // =====================================================
    // INSERT DATABASE
    // =====================================================

    const expiryTime = new Date(
      Date.now() +
        getExpiryHours(signal.signal_type) * 60 * 60 * 1000
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

    const { data: inserted, error } =
      await supabase
        .from("signals")
        .insert(insertData)
        .select()
        .single();

    if (error) {
      console.error(
        "Signal insert error:",
        error
      );

      throw error;
    }

    // =====================================================
    // TELEGRAM
    // =====================================================

    const telegramResult = await postTelegram({
      ...signal,
      id: inserted?.id,
    });

    // Save the Telegram message id/chat id on the signal row so a
    // later TP1/TP2/TP3/SL update can edit THIS exact channel post
    // instead of spamming a new message for every target hit.
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

    // =====================================================
    // RESPONSE
    // =====================================================

    return new Response(
      JSON.stringify({
        success: true,
        generated: true,
        signal: inserted,
        telegram_posted: telegramResult.success,
        telegram_error: telegramResult.error,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
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
          "Content-Type": "application/json",
        },
      }
    );
  }
});
