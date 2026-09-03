import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// PAIRS
// ============================================================

const PAIRS = [
  {
    name: "XAU/USD (Gold)",
    category: "COMMODITIES",
    weight: 55,
    decimals: 2,
  },
  {
    name: "XAG/USD (Silver)",
    category: "COMMODITIES",
    weight: 12,
    decimals: 2,
  },
  {
    name: "US30",
    category: "COMMODITIES",
    weight: 9,
    decimals: 2,
  },
  {
    name: "NASDAQ",
    category: "COMMODITIES",
    weight: 8,
    decimals: 2,
  },
  {
    name: "S&P500",
    category: "COMMODITIES",
    weight: 6,
    decimals: 2,
  },

  {
    name: "EUR/USD",
    category: "FOREX",
    weight: 1,
    decimals: 5,
  },
  {
    name: "GBP/USD",
    category: "FOREX",
    weight: 1,
    decimals: 5,
  },
  {
    name: "USD/JPY",
    category: "FOREX",
    weight: 1,
    decimals: 3,
  },
  {
    name: "AUD/USD",
    category: "FOREX",
    weight: 1,
    decimals: 5,
  },
  {
    name: "GBP/JPY",
    category: "FOREX",
    weight: 1,
    decimals: 3,
  },
  {
    name: "USD/CAD",
    category: "FOREX",
    weight: 1,
    decimals: 5,
  },

  {
    name: "BTC/USD",
    category: "CRYPTO",
    weight: 1,
    decimals: 2,
  },
  {
    name: "ETH/USD",
    category: "CRYPTO",
    weight: 1,
    decimals: 2,
  },
  {
    name: "SOL/USD",
    category: "CRYPTO",
    weight: 1,
    decimals: 2,
  },

  {
    name: "BOOM 1000",
    category: "DERIV/BINARY",
    weight: 1,
    decimals: 2,
  },
  {
    name: "CRASH 1000",
    category: "DERIV/BINARY",
    weight: 1,
    decimals: 2,
  },
  {
    name: "VOL 75",
    category: "DERIV/BINARY",
    weight: 1,
    decimals: 2,
  },
  {
    name: "BOOM 500",
    category: "DERIV/BINARY",
    weight: 1,
    decimals: 2,
  },
  {
    name: "VOL 100",
    category: "DERIV/BINARY",
    weight: 1,
    decimals: 2,
  },
];

// ============================================================
// HELPERS
// ============================================================

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function getLivePrice(value: any): number {
  const price = Number(
    value?.price ??
      value?.current_price ??
      value?.currentPrice ??
      value
  );

  return Number.isFinite(price) && price > 0
    ? price
    : NaN;
}

function roundPrice(
  value: number,
  decimals: number
): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function randomBetween(
  min: number,
  max: number
): number {
  return min + Math.random() * (max - min);
}

function weightedRandom<T extends { weight: number }>(
  items: T[]
): T {
  const total = items.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  let random = Math.random() * total;

  for (const item of items) {
    random -= item.weight;

    if (random <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

// ============================================================
// LIVE PRICE FETCH
// ============================================================

async function fetchLivePrices(
  requestedNames: string[]
): Promise<Record<string, { price: number }>> {
  const result: Record<
    string,
    { price: number }
  > = {};

  const aliases: Record<string, string[]> = {
    "XAU/USD (Gold)": [
      "XAU/USD (Gold)",
      "XAUUSD",
      "XAU/USD",
      "Gold",
    ],

    "XAG/USD (Silver)": [
      "XAG/USD (Silver)",
      "XAGUSD",
      "XAG/USD",
      "Silver",
    ],

    US30: [
      "US30",
      "DJI",
      "^DJI",
    ],

    NASDAQ: [
      "NASDAQ",
      "NAS100",
      "^IXIC",
    ],

    "S&P500": [
      "S&P500",
      "SPX",
      "^GSPC",
    ],

    "EUR/USD": [
      "EUR/USD",
      "EURUSD",
    ],

    "GBP/USD": [
      "GBP/USD",
      "GBPUSD",
    ],

    "USD/JPY": [
      "USD/JPY",
      "USDJPY",
    ],

    "AUD/USD": [
      "AUD/USD",
      "AUDUSD",
    ],

    "GBP/JPY": [
      "GBP/JPY",
      "GBPJPY",
    ],

    "USD/CAD": [
      "USD/CAD",
      "USDCAD",
    ],

    "BTC/USD": [
      "BTC/USD",
      "BTCUSD",
      "BTC-USD",
    ],

    "ETH/USD": [
      "ETH/USD",
      "ETHUSD",
      "ETH-USD",
    ],

    "SOL/USD": [
      "SOL/USD",
      "SOLUSD",
      "SOL-USD",
    ],

    "BOOM 1000": ["BOOM 1000"],
    "CRASH 1000": ["CRASH 1000"],
    "VOL 75": ["VOL 75"],
    "BOOM 500": ["BOOM 500"],
    "VOL 100": ["VOL 100"],
  };

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/fetch-live-prices`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          pairs: requestedNames,
        }),
      }
    );

    const text = await response.text();

    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `fetch-live-prices returned invalid JSON: ${text}`
      );
    }

    if (!response.ok) {
      throw new Error(
        `fetch-live-prices failed: ${
          data?.error ?? text
        }`
      );
    }

    const prices =
      data?.prices ??
      data?.data?.prices ??
      {};

    console.log(
      "LIVE PRICES:",
      JSON.stringify(prices)
    );

    for (const standardName of requestedNames) {
      const possibleKeys =
        aliases[standardName] ?? [
          standardName,
        ];

      for (const key of possibleKeys) {
        const value = prices[key];
        const price = getLivePrice(value);

        if (Number.isFinite(price)) {
          result[standardName] = {
            price,
          };

          break;
        }
      }
    }
  } catch (error) {
    console.error(
      "LIVE PRICE ERROR:",
      formatError(error)
    );
  }

  console.log(
    "NORMALIZED LIVE PRICES:",
    JSON.stringify(result)
  );

  return result;
}

// ============================================================
// CHECK ACTIVE SIGNAL
// ============================================================

async function evaluatePair(
  pairName: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("signals")
      .select(
        "id,pair,status,signal_status,created_at"
      )
      .eq("pair", pairName)
      .order("created_at", {
        ascending: false,
      })
      .limit(10);

    if (error) {
      console.error(
        `evaluatePair error ${pairName}:`,
        JSON.stringify(error)
      );

      return false;
    }

    if (!data || data.length === 0) {
      return true;
    }

    for (const signal of data) {
      const status = String(
        signal.status ??
          signal.signal_status ??
          ""
      )
        .trim()
        .toUpperCase();

      if (
        status === "OPEN" ||
        status === "ACTIVE" ||
        status === "RUNNING" ||
        status === "LIVE"
      ) {
        console.log(
          `Active signal exists for ${pairName}`
        );

        return false;
      }
    }

    return true;
  } catch (error) {
    console.error(
      `evaluatePair exception ${pairName}:`,
      formatError(error)
    );

    return false;
  }
}

// ============================================================
// FIND AVAILABLE PAIR
// ============================================================

async function findAvailablePair() {
  const shuffled = [...PAIRS];

  // Weighted candidate
  const weightedCandidate =
    weightedRandom(shuffled);

  const ordered = [
    weightedCandidate,
    ...shuffled.filter(
      (p) =>
        p.name !== weightedCandidate.name
    ),
  ];

  const requestedNames = ordered.map(
    (p) => p.name
  );

  const livePrices =
    await fetchLivePrices(requestedNames);

  for (const candidate of ordered) {
    const live =
      livePrices[candidate.name];

    const currentPrice =
      getLivePrice(live);

    if (!Number.isFinite(currentPrice)) {
      console.log(
        `Skipping ${candidate.name}: no live price`
      );

      continue;
    }

    const available =
      await evaluatePair(candidate.name);

    if (!available) {
      console.log(
        `Skipping ${candidate.name}: active signal exists`
      );

      continue;
    }

    return {
      ...candidate,
      livePrice: currentPrice,
    };
  }

  return null;
}

// ============================================================
// GENERATE SIGNAL
// ============================================================

function generateSignal({
  name,
  category,
  decimals,
  price,
}: {
  name: string;
  category: string;
  decimals: number;
  price: { price: number };
}) {
  const currentPrice =
    getLivePrice(price);

  if (!Number.isFinite(currentPrice)) {
    throw new Error(
      `Invalid live price for ${name}`
    );
  }

  let movePercent = 0.12;

  if (category === "CRYPTO") {
    movePercent = 0.4;
  } else if (
    category === "DERIV/BINARY"
  ) {
    movePercent = 0.15;
  }

  // Random BUY / SELL
  const action =
    Math.random() >= 0.5
      ? "BUY"
      : "SELL";

  const distance =
    currentPrice *
    (movePercent / 100);

  const entry = currentPrice;

  let tp1: number;
  let tp2: number;
  let sl: number;

  if (action === "BUY") {
    tp1 = entry + distance * 0.55;
    tp2 = entry + distance;
    sl = entry - distance * 0.65;
  } else {
    tp1 = entry - distance * 0.55;
    tp2 = entry - distance;
    sl = entry + distance * 0.65;
  }

  return {
    pair: name,
    category,
    action,
    signal: action,
    entry: roundPrice(
      entry,
      decimals
    ),
    tp1: roundPrice(
      tp1,
      decimals
    ),
    tp2: roundPrice(
      tp2,
      decimals
    ),
    sl: roundPrice(
      sl,
      decimals
    ),
    price: roundPrice(
      currentPrice,
      decimals
    ),
    confidence: Math.floor(
      randomBetween(78, 94)
    ),
    timeframe: "15M",
    status: "OPEN",
    signal_status: "OPEN",
    created_at:
      new Date().toISOString(),
  };
}

// ============================================================
// TELEGRAM
// ============================================================

async function postToTelegram(
  signal: any
) {
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
          signal,
        }),
      }
    );

    const text =
      await response.text();

    let data: any;

    try {
      data = JSON.parse(text);
    } catch {
      data = {
        raw: text,
      };
    }

    if (!response.ok) {
      console.error(
        "Telegram post failed:",
        JSON.stringify(data)
      );

      return {
        success: false,
        error:
          data?.error ??
          text,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error(
      "Telegram exception:",
      formatError(error)
    );

    return {
      success: false,
      error: formatError(error),
    };
  }
}

// ============================================================
// MAIN
// ============================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    console.log(
      "========== AUTO GENERATE START =========="
    );

    const selected =
      await findAvailablePair();

    if (!selected) {
      console.log(
        "No available pair with live price."
      );

      return new Response(
        JSON.stringify({
          success: false,
          generated: false,
          error:
            "No available pair with live price. All pairs may have active signals or unavailable prices.",
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    console.log(
      "SELECTED PAIR:",
      selected.name
    );

    console.log(
      "LIVE PRICE:",
      selected.livePrice
    );

    const currentPrice =
      Number(selected.livePrice);

    const signal =
      generateSignal({
        name: selected.name,
        category:
          selected.category,
        decimals:
          selected.decimals,
        price: {
          price: currentPrice,
        },
      });

    console.log(
      "GENERATED SIGNAL:",
      JSON.stringify(signal)
    );

    // ========================================================
    // INSERT SIGNAL
    // ========================================================

    const insertData: any = {
      pair: signal.pair,
      category: signal.category,
      action: signal.action,
      signal: signal.signal,
      entry: signal.entry,
      tp1: signal.tp1,
      tp2: signal.tp2,
      sl: signal.sl,
      price: signal.price,
      confidence:
        signal.confidence,
      timeframe:
        signal.timeframe,
      status: "OPEN",
      signal_status: "OPEN",
      created_at:
        signal.created_at,
    };

    const {
      data: insertedSignal,
      error: insertError,
    } = await supabase
      .from("signals")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error(
        "SIGNAL INSERT ERROR:",
        JSON.stringify(
          insertError,
          null,
          2
        )
      );

      throw new Error(
        `Signal insert failed: ${formatError(
          insertError
        )}`
      );
    }

    console.log(
      "SIGNAL INSERTED:",
      JSON.stringify(
        insertedSignal
      )
    );

    // ========================================================
    // TELEGRAM
    // ========================================================

    const telegram =
      await postToTelegram({
        ...signal,
        id: insertedSignal?.id,
      });

    console.log(
      "TELEGRAM RESULT:",
      JSON.stringify(telegram)
    );

    console.log(
      "========== AUTO GENERATE END =========="
    );

    return new Response(
      JSON.stringify({
        success: true,
        generated: true,
        signal: insertedSignal,
        telegram_posted:
          telegram.success,
        telegram:
          telegram.success
            ? telegram.data
            : telegram.error,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  } catch (error) {
    const errorMessage =
      formatError(error);

    console.error(
      "AUTO GENERATE ERROR:",
      errorMessage
    );

    return new Response(
      JSON.stringify({
        success: false,
        generated: false,
        error: errorMessage,
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
