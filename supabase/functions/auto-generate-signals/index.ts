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
// GOLD
// =========================================================

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

// =========================================================
// SILVER
// =========================================================

function generateSilverLevels(
  entry: number,
  isBuy: boolean
) {
  const slDistance = rand(1.5, 3);
  const tp1Distance = rand(0.5, 1);
  const tp2Distance = rand(1, 2);
  const tp3Distance = rand(2, 3);

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
    sl: Number(sl.toFixed(3)),
    tp1: Number(tp1.toFixed(3)),
    tp2: Number(tp2.toFixed(3)),
    tp3: Number(tp3.toFixed(3)),
  };
}

// =========================================================
// BTC - FIXED VOLATILITY LOGIC
// =========================================================
//
// BTC moves much more than FX/metals on a dollar basis.
//
// Example:
//
// BUY 77200.50
//
// TP1 = 77600.50  (+400)
// TP2 = 78000.50  (+800)
// TP3 = 78600.50 (+1400)
// SL  = 76400.50  (-800)
//
// SELL:
//
// Entry 77200.50
// TP1 = 76800.50  (-400)
// TP2 = 76400.50  (-800)
// TP3 = 75800.50 (-1400)
// SL  = 78000.50  (+800)
//
// IMPORTANT:
// These are FIXED BTC distances, not random.
// =========================================================

function generateBTCLevels(
  entry: number,
  isBuy: boolean
) {
  // =======================================================
  // BTC DISTANCES
  // =======================================================

  const SL_DISTANCE = 800;
  const TP1_DISTANCE = 400;
  const TP2_DISTANCE = 800;
  const TP3_DISTANCE = 1400;

  const sl = isBuy
    ? entry - SL_DISTANCE
    : entry + SL_DISTANCE;

  const tp1 = isBuy
    ? entry + TP1_DISTANCE
    : entry - TP1_DISTANCE;

  const tp2 = isBuy
    ? entry + TP2_DISTANCE
    : entry - TP2_DISTANCE;

  const tp3 = isBuy
    ? entry + TP3_DISTANCE
    : entry - TP3_DISTANCE;

  return {
    sl: Number(sl.toFixed(2)),
    tp1: Number(tp1.toFixed(2)),
    tp2: Number(tp2.toFixed(2)),
    tp3: Number(tp3.toFixed(2)),
  };
}

// =========================================================
// MARKET HOURS
// =========================================================

function isTraditionalMarketOpen(
  pair: string,
  now = new Date()
): boolean {
  const day = now.getUTCDay();

  const minutes =
    now.getUTCHours() * 60 +
    now.getUTCMinutes();

  // Sunday
  if (day === 0) {
    return minutes >= 22 * 60;
  }

  // Saturday
  if (day === 6) {
    return false;
  }

  // Friday
  if (day === 5) {
    return minutes < 22 * 60;
  }

  // Monday-Thursday
  return true;
}

function isMarketOpen(
  pair: string,
  now = new Date()
): boolean {
  const cryptoPairs = new Set([
    "BTC/USD",
    "ETH/USD",
    "SOL/USD",
  ]);

  const derivPairs = new Set([
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

  return isTraditionalMarketOpen(pair, now);
}

function filterOpenMarketPairs<
  T extends { pair: string }
>(pairs: T[]): T[] {
  const now = new Date();

  return pairs.filter((item) => {
    const open = isMarketOpen(
      item.pair,
      now
    );

    if (!open) {
      console.log(
        `Skipping ${item.pair}: market CLOSED`
      );
    }

    return open;
  });
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

  const isGold =
    pair === "XAU/USD (Gold)";

  const isSilver =
    pair === "XAG/USD (Silver)";

  const isBTC =
    pair === "BTC/USD";

  const isIndex = [
    "US30",
    "NASDAQ",
    "S&P500",
  ].includes(pair);

  const isVol75 =
    pair === "VOL 75";

  const isDeriv = [
    "BOOM 1000",
    "CRASH 1000",
    "VOL 75",
    "BOOM 500",
    "VOL 100",
  ].includes(pair);

  const isBuy =
    Math.random() > 0.5;

  // =======================================================
  // ENTRY DISTANCE
  // =======================================================

  let entryOffset = 0;

  if (isGold) {
    entryOffset = rand(-0.50, 0.50);
  }

  else if (isSilver) {
    entryOffset = rand(-0.10, 0.10);
  }

  // =======================================================
  // BTC IMPORTANT FIX
  // =======================================================
  // BTC entry = LIVE PRICE.
  //
  // No random $10 offset.
  //
  // Example:
  // live price = 77200.50
  // entry      = 77200.50
  // =======================================================

  else if (isBTC) {
    entryOffset = 0;
  }

  else if (isIndex) {
    entryOffset = rand(-2, 2);
  }

  else if (isVol75) {
    entryOffset = rand(-5, 5);
  }

  else if (isDeriv) {
    entryOffset = rand(-5, 5);
  }

  else {
    entryOffset = rand(
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

  // =======================================================
  // LEVELS
  // =======================================================

  let levels;

  // =======================================================
  // GOLD
  // =======================================================

  if (isGold) {
    levels = generateGoldLevels(
      entry,
      isBuy
    );
  }

  // =======================================================
  // SILVER
  // =======================================================

  else if (isSilver) {
    levels = generateSilverLevels(
      entry,
      isBuy
    );
  }

  // =======================================================
  // BTC
  // =======================================================

  else if (isBTC) {
    levels = generateBTCLevels(
      entry,
      isBuy
    );
  }

  // =======================================================
  // INDICES
  // =======================================================

  else if (isIndex) {
    const slDistance = rand(20, 35);
    const tp1Distance = rand(10, 18);
    const tp2Distance = rand(20, 30);
    const tp3Distance = rand(30, 50);

    levels = {
      sl: Number(
        (
          isBuy
            ? entry - slDistance
            : entry + slDistance
        ).toFixed(2)
      ),

      tp1: Number(
        (
          isBuy
            ? entry + tp1Distance
            : entry - tp1Distance
        ).toFixed(2)
      ),

      tp2: Number(
        (
          isBuy
            ? entry + tp2Distance
            : entry - tp2Distance
        ).toFixed(2)
      ),

      tp3: Number(
        (
          isBuy
            ? entry + tp3Distance
            : entry - tp3Distance
        ).toFixed(2)
      ),
    };
  }

  // =======================================================
  // VOL 75
  // =======================================================

  else if (isVol75) {
    const slDistance = rand(150, 250);
    const tp1Distance = rand(150, 250);
    const tp2Distance = rand(300, 450);
    const tp3Distance = rand(500, 700);

    levels = {
      sl: Number(
        (
          isBuy
            ? entry - slDistance
            : entry + slDistance
        ).toFixed(2)
      ),

      tp1: Number(
        (
          isBuy
            ? entry + tp1Distance
            : entry - tp1Distance
        ).toFixed(2)
      ),

      tp2: Number(
        (
          isBuy
            ? entry + tp2Distance
            : entry - tp2Distance
        ).toFixed(2)
      ),

      tp3: Number(
        (
          isBuy
            ? entry + tp3Distance
            : entry - tp3Distance
        ).toFixed(2)
      ),
    };
  }

  // =======================================================
  // OTHER DERIV
  // =======================================================

  else if (isDeriv) {
    const slDistance = rand(40, 80);
    const tp1Distance = rand(40, 80);
    const tp2Distance = rand(90, 150);
    const tp3Distance = rand(160, 250);

    levels = {
      sl: Number(
        (
          isBuy
            ? entry - slDistance
            : entry + slDistance
        ).toFixed(2)
      ),

      tp1: Number(
        (
          isBuy
            ? entry + tp1Distance
            : entry - tp1Distance
        ).toFixed(2)
      ),

      tp2: Number(
        (
          isBuy
            ? entry + tp2Distance
            : entry - tp2Distance
        ).toFixed(2)
      ),

      tp3: Number(
        (
          isBuy
            ? entry + tp3Distance
            : entry - tp3Distance
        ).toFixed(2)
      ),
    };
  }

  // =======================================================
  // FOREX / OTHER
  // =======================================================

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
      sl: Number(
        (
          isBuy
            ? entry - slDistance
            : entry + slDistance
        ).toFixed(decimals)
      ),

      tp1: Number(
        (
          isBuy
            ? entry + tp1Distance
            : entry - tp1Distance
        ).toFixed(decimals)
      ),

      tp2: Number(
        (
          isBuy
            ? entry + tp2Distance
            : entry - tp2Distance
        ).toFixed(decimals)
      ),

      tp3: Number(
        (
          isBuy
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

    action: isBuy
      ? "BUY"
      : "SELL",

    direction: isBuy
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

    stop_loss: levels.sl,

    target1: levels.tp1,
    target2: levels.tp2,
    target3: levels.tp3,

    reason: pick(
      isBuy
        ? buyReasons
        : sellReasons
    ),

    signal_type:
      isGold
        ? "Scalping"
        : pick([
            "Scalping",
            "Intraday",
            "Swing",
          ]),

    type: isBuy
      ? "BUY"
      : "SELL",

    created_at:
      new Date().toISOString(),
  };
}

// =========================================================
// EXPIRY
// =========================================================

function getExpiryHours(
  signalType: string
): number {
  if (
    signalType === "Scalping"
  ) {
    return 3;
  }

  if (
    signalType === "Intraday"
  ) {
    return 12;
  }

  if (
    signalType === "Swing"
  ) {
    return 72;
  }

  return 6;
}

// =========================================================
// SILVER VALIDATION
// =========================================================

function validateSilverSignal(
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

  if (
    Math.abs(
      entry - currentPrice
    ) > 0.15
  ) {
    return false;
  }

  if (
    signal.action === "BUY"
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
  }

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
  }

  if (
    Math.abs(sl - entry) >
    3.1
  ) {
    return false;
  }

  if (
    Math.abs(tp1 - entry) >
    1.1
  ) {
    return false;
  }

  if (
    Math.abs(tp2 - entry) >
    2.1
  ) {
    return false;
  }

  if (
    Math.abs(tp3 - entry) >
    3.1
  ) {
    return false;
  }

  return true;
}

// =========================================================
// BTC VALIDATION
// =========================================================
//
// BTC must follow exactly:
//
// SL  = 800
// TP1 = 400
// TP2 = 800
// TP3 = 1400
//
// Entry must equal live price.
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

  // =======================================================
  // Entry must be very close to live price.
  // BTC generator now uses EXACT live price.
  // =======================================================

  if (
    Math.abs(
      entry - currentPrice
    ) > 0.01
  ) {
    return false;
  }

  // =======================================================
  // BUY
  // =======================================================

  if (
    signal.action === "BUY"
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

    // Current price must not already be at/below SL
    if (
      currentPrice <= sl
    ) {
      return false;
    }

    // EXACT DISTANCES
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

    // Current price must not already be at/above SL
    if (
      currentPrice >= sl
    ) {
      return false;
    }

    // EXACT DISTANCES
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
    signal.action === "BUY"
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
  }

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
  }

  return true;
}

// =========================================================
// CHECK ACTIVE SIGNAL
// =========================================================

async function evaluatePair(
  pair: string
) {
  const {
    data,
    error,
  } = await supabase
    .from("signals")
    .select(
      "id, pair, status"
    )
    .eq("pair", pair)
    .eq("status", "OPEN")
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
// TELEGRAM POST
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

    let parsed: any = null;

    try {
      parsed =
        JSON.parse(
          resultText
        );
    } catch {
      // Ignore JSON parse error
    }

    const ok =
      response.ok &&
      parsed?.success === true;

    if (!ok) {
      console.error(
        "TELEGRAM POST FAILED:",
        response.status,
        parsed?.error ||
          resultText
      );
    }

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
  }

  catch (error) {
    console.error(
      "Telegram post error:",
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

      const allPairs = [
        ...commodities,
        ...forex,
        ...crypto,
        ...deriv,
      ];

      // ===================================================
      // WEIGHTED SELECTION
      // ===================================================

      const weighted: any[] = [];

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
          item.pair === "US30"
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
      // MARKET OPEN CHECK
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
      // LIVE PRICE CHECK
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
        console.log(
          `No live price for ${selected.pair}`
        );

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
      // ONLY ONE OPEN SIGNAL PER PAIR
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
      // GENERATE SIGNAL
      // ===================================================

      const signal =
        generateSignal({
          ...selected,

          price: live,
        });

      const currentPrice =
        Number(live.price);

      // ===================================================
      // GENERAL VALIDATION
      // ===================================================

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
      // SILVER VALIDATION
      // ===================================================

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

                "Content-Type":
                  "application/json",
              },
            }
          );
        }
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
                "BTC signal validation failed",
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
      // INSERT DATABASE
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

        status: "OPEN",

        signal_status:
          "OPEN",

        expiry_time:
          expiryTime,

        created_at:
          signal.created_at,
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
      // SAVE TELEGRAM MESSAGE ID
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
