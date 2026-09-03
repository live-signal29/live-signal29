import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "GET, POST, OPTIONS",
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
      const value = prices[key];

      if (
        value !== undefined &&
        value !== null &&
        Number.isFinite(Number(value?.price ?? value))
      ) {
        result[standardName] = value;
        break;
      }
    }
  }

  console.log(
    "Live prices received:",
    Object.keys(result)
  );

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
// BTC
// =========================================================

function generateBTCLevels(
  entry: number,
  isBuy: boolean
) {
  const slDistance = rand(30, 60);
  const tp1Distance = rand(20, 35);
  const tp2Distance = rand(45, 70);
  const tp3Distance = rand(80, 120);

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
// SIGNAL GENERATOR
// =========================================================

function generateSignal(config: any) {
  const {
    pair,
    price,
    pipMultiplier,
    decimals,
  } = config;

  const currentPrice = Number(
    price?.price ?? price
  );

  if (!Number.isFinite(currentPrice)) {
    throw new Error(
      `Invalid live price for ${pair}`
    );
  }

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
    (
      currentPrice + entryOffset
    ).toFixed(decimals)
  );

  let levels: any;

  if (isGold) {
    levels = generateGoldLevels(
      entry,
      isBuy
    );
  } else if (isSilver) {
    levels = generateSilverLevels(
      entry,
      isBuy
    );
  } else if (isBTC) {
    levels = generateBTCLevels(
      entry,
      isBuy
    );
  } else if (isIndex) {
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
  } else if (isVol75) {
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
  } else if (isDeriv) {
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
  } else {
    const slDistance =
      rand(12, 20) * pipMultiplier;

    const tp1Distance =
      rand(15, 25) * pipMultiplier;

    const tp2Distance =
      rand(30, 45) * pipMultiplier;

    const tp3Distance =
      rand(50, 75) * pipMultiplier;

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
      isGold ||
      isSilver
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

    signal_type: isGold
      ? "Scalping"
      : pick([
          "Scalping",
          "Intraday",
          "Swing",
        ]),

    created_at:
      new Date().toISOString(),
  };
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

  if (
    Math.abs(
      entry - currentPrice
    ) > 0.15
  ) {
    return false;
  }

  if (signal.action === "BUY") {
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

    if (currentPrice <= sl) {
      return false;
    }
  } else {
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

    if (currentPrice >= sl) {
      return false;
    }
  }

  if (
    Math.abs(sl - entry) > 3.1
  )
    return false;

  if (
    Math.abs(tp1 - entry) > 1.1
  )
    return false;

  if (
    Math.abs(tp2 - entry) > 2.1
  )
    return false;

  if (
    Math.abs(tp3 - entry) > 3.1
  )
    return false;

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

  if (
    Math.abs(
      entry - currentPrice
    ) > 10.5
  ) {
    return false;
  }

  if (signal.action === "BUY") {
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

    if (currentPrice <= sl) {
      return false;
    }
  } else {
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

    if (currentPrice >= sl) {
      return false;
    }
  }

  if (
    Math.abs(sl - entry) > 60
  )
    return false;

  if (
    Math.abs(tp1 - entry) > 35
  )
    return false;

  if (
    Math.abs(tp2 - entry) > 70
  )
    return false;

  if (
    Math.abs(tp3 - entry) > 120
  )
    return false;

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
    !Number.isFinite(tp3) ||
    !Number.isFinite(currentPrice)
  ) {
    return false;
  }

  if (signal.action === "BUY") {
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
  } else {
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
  const { data, error } =
    await supabase
      .from("signals")
      .select(
        "id, pair, status, signal_status, created_at"
      )
      .eq("pair", pair)
      .order(
        "created_at",
        { ascending: false }
      )
      .limit(20);

  if (error) {
    console.error(
      `Active signal check error for ${pair}:`,
      error
    );

    // Fail closed.
    // If database check fails, don't create duplicate signals.
    return false;
  }

  if (
    !data ||
    data.length === 0
  ) {
    return true;
  }

  const activeSignal =
    data.some((row) => {
      const status = String(
        row.status || ""
      )
        .trim()
        .toUpperCase();

      const signalStatus =
        String(
          row.signal_status || ""
        )
          .trim()
          .toUpperCase();

      // Explicitly closed statuses
      const closedStatuses = [
        "CLOSED",
        "CLOSE",
        "TP1",
        "TP 1",
        "TP1 HIT",
        "TP 1 HIT",
        "TP2",
        "TP 2",
        "TP2 HIT",
        "TP 2 HIT",
        "TP3",
        "TP 3",
        "TP3 HIT",
        "TP 3 HIT",
        "SL",
        "SL HIT",
        "STOP LOSS",
        "STOP LOSS HIT",
        "EXPIRED",
        "CANCELLED",
        "CANCELED",
      ];

      if (
        closedStatuses.includes(status) ||
        closedStatuses.includes(
          signalStatus
        )
      ) {
        return false;
      }

      // Any close / TP / SL style signal status
      if (
        signalStatus.includes("CLOSE") ||
        signalStatus.includes("TP") ||
        signalStatus.includes("SL HIT") ||
        signalStatus.includes("STOP")
      ) {
        return false;
      }

      // Only OPEN is considered active.
      return status === "OPEN";
    });

  return !activeSignal;
}

// =========================================================
// GET AVAILABLE PAIR
// =========================================================

async function findAvailablePair(
  candidates: any[],
  livePrices: Record<string, any>
) {
  // Shuffle candidates while keeping duplicate weighted
  // entries. Gold has more entries, so it still receives
  // higher probability.
  const shuffled = [...candidates].sort(
    () => Math.random() - 0.5
  );

  const checked = new Set<string>();

  for (const candidate of shuffled) {
    const pair = candidate.pair;

    // Don't query same pair repeatedly.
    if (checked.has(pair)) {
      continue;
    }

    checked.add(pair);

    const live =
      livePrices[pair];

    if (
      !live ||
      !Number.isFinite(
        Number(live.price)
      )
    ) {
      console.log(
        `Skipping ${pair}: no live price`
      );

      continue;
    }

    const available =
      await evaluatePair(pair);

    if (!available) {
      console.log(
        `Skipping ${pair}: active signal exists`
      );

      continue;
    }

    console.log(
      `Available pair found: ${pair}`
    );

    return candidate;
  }

  return null;
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

          body: JSON.stringify(
            signal
          ),
        }
      );

    const result =
      await response.text();

    console.log(
      "Telegram response:",
      response.status,
      result
    );

    return response.ok;
  } catch (error) {
    console.error(
      "Telegram post error:",
      error
    );

    return false;
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
      console.log(
        "================================"
      );

      console.log(
        "AUTO GENERATE SIGNAL START"
      );

      console.log(
        "================================"
      );

      // ===================================================
      // LIVE PRICES
      // ===================================================

      const livePrices =
        await fetchLivePrices();

      if (
        !livePrices ||
        Object.keys(livePrices)
          .length === 0
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            generated: false,
            error:
              "No live prices available",
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

      // ===================================================
      // PAIRS
      // ===================================================

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
        } else if (
          item.pair ===
          "XAG/USD (Silver)"
        ) {
          weight = 12;
        } else if (
          item.pair === "US30"
        ) {
          weight = 9;
        } else if (
          item.pair === "NASDAQ"
        ) {
          weight = 8;
        } else if (
          item.pair === "S&P500"
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
      // FIND AVAILABLE PAIR
      // ===================================================

      let selected =
        await findAvailablePair(
          weighted,
          livePrices
        );

      // If weighted selection somehow fails,
      // check every pair.
      if (!selected) {
        console.log(
          "Weighted search failed. Trying all pairs..."
        );

        selected =
          await findAvailablePair(
            allPairs,
            livePrices
          );
      }

      if (!selected) {
        return new Response(
          JSON.stringify({
            success: true,
            generated: false,
            reason:
              "No available pair with live price. All pairs may have active signals.",
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
      // LIVE PRICE
      // ===================================================

      const live =
        livePrices[
          selected.pair
        ];

      const currentPrice =
        Number(live.price);

      if (
        !Number.isFinite(
          currentPrice
        )
      ) {
        return new Response(
          JSON.stringify({
            success: true,
            generated: false,
            reason:
              `Invalid live price for ${selected.pair}`,
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

      console.log(
        `Generating ${selected.pair} at ${currentPrice}`
      );

      // ===================================================
      // GENERATE
      // ===================================================

      const signal =
        generateSignal({
          ...selected,
          price: live,
        });

      // ===================================================
      // VALIDATE
      // ===================================================

      if (
        !validateSignal(
          signal,
          currentPrice
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
            pair:
              selected.pair,
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
      // SILVER
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
      // BTC
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
      // DATABASE INSERT
      // ===================================================

      const insertData = {
        pair: signal.pair,
        symbol: signal.symbol,
        category:
          signal.category,

        action: signal.action,
        direction:
          signal.direction,

        entry: signal.entry,

        current_price:
          signal.currentPrice,

        sl: signal.sl,
        tp1: signal.tp1,
        tp2: signal.tp2,
        tp3: signal.tp3,

        stop_loss:
          signal.stop_loss,

        target1:
          signal.target1,

        target2:
          signal.target2,

        target3:
          signal.target3,

        reason:
          signal.reason,

        signal_type:
          signal.signal_type,

        status: "OPEN",

        created_at:
          signal.created_at,
      };

      console.log(
        "Inserting signal:",
        insertData
      );

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

      console.log(
        "Signal inserted:",
        inserted?.id
      );

      // ===================================================
      // TELEGRAM
      // ===================================================

      const telegramPosted =
        await postTelegram({
          ...signal,
          id: inserted?.id,
        });

      // ===================================================
      // SUCCESS
      // ===================================================

      return new Response(
        JSON.stringify({
          success: true,
          generated: true,

          pair:
            selected.pair,

          telegram_posted:
            telegramPosted,

          signal: inserted,
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
