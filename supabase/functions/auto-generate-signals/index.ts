import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

interface PriceData {
  price: number;
  high: number;
  low: number;
}

interface SignalConfig {
  pair: string;
  category: string;
  mainCategory: string;
  subCategory: string;
  price: PriceData;
  pipMultiplier: number;
  decimals: number;
  thresholdPct: number;
}

/* =========================================================
   FREE FALLBACK PRICE FETCHERS (Deriv & Crypto)
========================================================= */

async function fetchDerivPrice(symbol: string): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");
      const timeout = setTimeout(() => {
        try { ws.close(); } catch (_) {}
        resolve(null);
      }, 4000);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            ticks_history: symbol,
            adjust_start_time: 1,
            count: 1,
            end: "latest",
            start: 1,
            style: "ticks",
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const prices = data?.history?.prices;
          if (Array.isArray(prices) && prices.length > 0) {
            clearTimeout(timeout);
            try { ws.close(); } catch (_) {}
            resolve(Number(prices[prices.length - 1]));
          }
        } catch (_) {}
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        try { ws.close(); } catch (_) {}
        resolve(null);
      };
    } catch (_) {
      resolve(null);
    }
  });
}

async function fetchCryptoPrice(symbol: string): Promise<number | null> {
  try {
    const formattedSymbol = symbol.replace("/", "").toUpperCase();
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${formattedSymbol}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const json = await res.json();
      return Number(json.price);
    }
  } catch (_) {}
  return null;
}

/* =========================================================
   FETCH LIVE PRICES FROM EDGE FUNCTION + FALLBACKS
========================================================= */

async function fetchPricesFromService(
  pairs: string[],
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/fetch-live-prices?pairs=${encodeURIComponent(
        pairs.join(",")
      )}`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (response.ok) {
      const json = await response.json();
      const prices = json?.prices || {};

      for (const [pairKey, rawVal] of Object.entries(prices)) {
        const val = Number(rawVal);
        if (Number.isFinite(val) && val > 0) {
          result[pairKey] = val;
        }
      }
    }
  } catch (error) {
    console.error("fetch-live-prices service call error:", String(error));
  }

  // Fallbacks for critical assets if primary fetch returns missing
  if (!result["XAU/USD (Gold)"]) {
    const gold = await fetchDerivPrice("frxXAUUSD");
    if (gold) result["XAU/USD (Gold)"] = gold;
  }
  if (!result["EUR/USD"]) {
    const eur = await fetchDerivPrice("frxEURUSD");
    if (eur) result["EUR/USD"] = eur;
  }
  if (!result["GBP/USD"]) {
    const gbp = await fetchDerivPrice("frxGBPUSD");
    if (gbp) result["GBP/USD"] = gbp;
  }
  if (!result["BTC/USD"]) {
    const btc = await fetchCryptoPrice("BTCUSDT");
    if (btc) result["BTC/USD"] = btc;
  }
  if (!result["ETH/USD"]) {
    const eth = await fetchCryptoPrice("ETHUSDT");
    if (eth) result["ETH/USD"] = eth;
  }
  if (!result["VOL 75"]) {
    const v75 = await fetchDerivPrice("R_75");
    if (v75) result["VOL 75"] = v75;
  }
  if (!result["BOOM 1000"]) {
    const b1000 = await fetchDerivPrice("BOOM1000");
    if (b1000) result["BOOM 1000"] = b1000;
  }
  if (!result["CRASH 1000"]) {
    const c1000 = await fetchDerivPrice("CRASH1000");
    if (c1000) result["CRASH 1000"] = c1000;
  }

  return result;
}

/* =========================================================
   HELPERS & SIGNAL GENERATOR
========================================================= */

function pick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

const buyReasons = [
  "Demand zone bounce with bullish confirmation",
  "Trendline support holding",
  "Bullish order block retest",
  "Smart Money demand zone confirmed",
  "Bullish market structure",
  "Support zone reaction",
  "Liquidity sweep followed by bullish confirmation",
  "Fair Value Gap bullish reaction",
];

const sellReasons = [
  "Supply zone rejection",
  "Resistance rejection",
  "Bearish market structure",
  "Bearish order block retest",
  "Smart Money supply zone confirmed",
  "Failed breakout",
  "Liquidity sweep followed by bearish confirmation",
  "Fair Value Gap bearish reaction",
];

function generateSignal(config: SignalConfig) {
  const {
    pair,
    category,
    mainCategory,
    subCategory,
    price,
    pipMultiplier,
    decimals,
  } = config;

  const isGold = pair === "XAU/USD (Gold)";
  const isSilver = pair === "XAG/USD (Silver)";
  const isIndex = pair === "US30" || pair === "NASDAQ" || pair === "S&P500";
  const isVol75 = pair === "VOL 75";
  const isDeriv = category === "DERIV";

  const isBuy = Math.random() >= 0.5;
  const type = isBuy ? "Buy" : "Sell";

  const spread = Math.max(price.high - price.low, pipMultiplier * 20);
  const offset = rand(-spread * 0.02, spread * 0.02);
  const entry = Number((price.price + offset).toFixed(decimals));

  let slMult = 0;
  let tp1Mult = 0;
  let tp2Mult = 0;
  let tp3Mult = 0;

  if (isGold) {
    slMult = rand(25, 45);
    tp1Mult = rand(35, 60);
    tp2Mult = rand(65, 100);
    tp3Mult = rand(110, 160);
  } else if (isSilver) {
    slMult = rand(18, 30);
    tp1Mult = rand(28, 45);
    tp2Mult = rand(50, 75);
    tp3Mult = rand(85, 120);
  } else if (isIndex) {
    slMult = rand(20, 35);
    tp1Mult = rand(30, 50);
    tp2Mult = rand(55, 85);
    tp3Mult = rand(90, 130);
  } else if (isVol75) {
    slMult = rand(150, 250);
    tp1Mult = rand(150, 250);
    tp2Mult = rand(300, 450);
    tp3Mult = rand(500, 700);
  } else if (isDeriv) {
    slMult = rand(40, 80);
    tp1Mult = rand(40, 80);
    tp2Mult = rand(90, 150);
    tp3Mult = rand(160, 250);
  } else {
    slMult = rand(12, 20);
    tp1Mult = rand(15, 25);
    tp2Mult = rand(30, 45);
    tp3Mult = rand(50, 75);
  }

  const slDistance = slMult * pipMultiplier;
  const tp1Distance = tp1Mult * pipMultiplier;
  const tp2Distance = tp2Mult * pipMultiplier;
  const tp3Distance = tp3Mult * pipMultiplier;

  const sl = Number((isBuy ? entry - slDistance : entry + slDistance).toFixed(decimals));
  const tp1 = Number((isBuy ? entry + tp1Distance : entry - tp1Distance).toFixed(decimals));
  const tp2 = Number((isBuy ? entry + tp2Distance : entry - tp2Distance).toFixed(decimals));
  const tp3 = Number((isBuy ? entry + tp3Distance : entry - tp3Distance).toFixed(decimals));

  const now = new Date().toISOString();

  return {
    pair,
    type,
    category,
    main_category: mainCategory,
    sub_category: subCategory,
    entry: String(entry),
    tp1: String(tp1),
    tp2: String(tp2),
    tp3: String(tp3),
    sl: String(sl),
    status: "open",
    signal_status: "open",
    is_premium: false,
    is_activated: true,
    activated_at: now,
    entry_mode: "market",
    signal_type: pick(["Scalping", "Intraday", "Swing"]),
    risk_level: isVol75 || isIndex ? "High" : isGold ? "Medium" : pick(["Low", "Medium"]),
    analysis_reason: isBuy ? pick(buyReasons) : pick(sellReasons),
    published: true,
    created_at: now,
    tp1_hit: false,
    tp2_hit: false,
    tp3_hit: false,
  };
}

/* =========================================================
   EVALUATE PAIR & NOTIFICATIONS
========================================================= */

async function evaluatePair(
  supabase: ReturnType<typeof createClient>,
  pair: string
) {
  const { data: active, error: activeError } = await supabase
    .from("signals")
    .select("id")
    .eq("pair", pair)
    .eq("signal_status", "open")
    .limit(1)
    .maybeSingle();

  if (activeError) {
    console.error("Active signal evaluation error:", activeError.message);
  }

  if (active) {
    return { generate: false, reason: "signal_still_open" };
  }

  return { generate: true, reason: "hourly_signal_slot" };
}

async function postTelegramSignal(
  supabaseUrl: string,
  serviceRoleKey: string,
  signal: any
) {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/telegram-signal-post`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ signal, action: "new_signal" }),
      }
    );
    const text = await response.text();
    return { success: response.ok, response: text };
  } catch (error) {
    return { success: false, response: String(error) };
  }
}

async function executeMT5DemoTrade(
  supabaseUrl: string,
  serviceRoleKey: string,
  signal: any
) {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/mt5-demo-trade`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "open_multi",
          signal_id: signal.id,
          symbol: signal.pair,
          trade_type: String(signal.type).toLowerCase(),
          entry: Number(signal.entry),
          sl: Number(signal.sl),
          tp1: Number(signal.tp1),
          tp2: Number(signal.tp2),
          tp3: Number(signal.tp3),
          lot_size: 0.01,
        }),
      }
    );
    const text = await response.text();
    return { success: response.ok, response: text };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/* =========================================================
   MAIN DENO SERVER
========================================================= */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count: derivCount } = await supabase
      .from("signals")
      .select("id", { count: "exact", head: true })
      .eq("category", "DERIV")
      .gte("created_at", todayStart.toISOString());

    const allowDeriv = (derivCount || 0) < 5;

    const commodities = [
      "XAU/USD (Gold)",
      "XAG/USD (Silver)",
      "US30",
      "NASDAQ",
      "S&P500",
    ];

    const forex = [
      "EUR/USD",
      "GBP/USD",
      "USD/JPY",
      "AUD/USD",
      "GBP/JPY",
      "USD/CAD",
    ];

    const crypto = ["BTC/USD", "ETH/USD", "SOL/USD"];

    const deriv = allowDeriv
      ? ["BOOM 1000", "CRASH 1000", "VOL 75", "BOOM 500", "VOL 100"]
      : [];

    const allPairs = [...commodities, ...forex, ...crypto, ...deriv];

    const prices = await fetchPricesFromService(allPairs, supabaseUrl, serviceRoleKey);
    const candidates: SignalConfig[] = [];

    for (const pair of commodities) {
      const p = prices[pair];
      if (!p) continue;

      const isGold = pair === "XAU/USD (Gold)";
      const isSilver = pair === "XAG/USD (Silver)";
      const isIndex = pair === "US30" || pair === "NASDAQ" || pair === "S&P500";

      candidates.push({
        pair,
        category: "COMMODITIES",
        mainCategory: "COMMODITIES",
        subCategory: pair,
        price: {
          price: p,
          high: p + (isGold ? 10 : isSilver ? 1 : isIndex ? 100 : 1),
          low: p - (isGold ? 10 : isSilver ? 1 : isIndex ? 100 : 1),
        },
        pipMultiplier: isGold ? 1 : isSilver ? 0.05 : 1,
        decimals: isSilver ? 3 : 2,
        thresholdPct: isGold ? 0.03 : 0.05,
      });
    }

    for (const pair of forex) {
      const p = prices[pair];
      if (!p) continue;

      const isJPY = pair.includes("JPY");
      candidates.push({
        pair,
        category: "FOREX",
        mainCategory: "FOREX",
        subCategory: pair,
        price: {
          price: p,
          high: p + (isJPY ? 0.4 : 0.004),
          low: p - (isJPY ? 0.4 : 0.004),
        },
        pipMultiplier: isJPY ? 0.1 : 0.001,
        decimals: isJPY ? 3 : 5,
        thresholdPct: 0.1,
      });
    }

    for (const pair of crypto) {
      const p = prices[pair];
      if (!p) continue;
      candidates.push({
        pair,
        category: "CRYPTO",
        mainCategory: "CRYPTO",
        subCategory: pair,
        price: { price: p, high: p * 1.01, low: p * 0.99 },
        pipMultiplier: 1,
        decimals: 2,
        thresholdPct: 0.25,
      });
    }

    if (allowDeriv) {
      for (const pair of deriv) {
        const p = prices[pair];
        if (!p) continue;

        const isVol75 = pair === "VOL 75";
        candidates.push({
          pair,
          category: "DERIV",
          mainCategory: "DERIV/BINARY",
          subCategory: pair,
          price: { price: p, high: p * 1.005, low: p * 0.995 },
          pipMultiplier: isVol75 ? 1 : 10,
          decimals: 2,
          thresholdPct: 0.25,
        });
      }
    }

    const available = candidates.filter((x) => !!prices[x.pair]);

    if (!available.length) {
      return new Response(
        JSON.stringify({
          success: false,
          generated: false,
          error: "No live prices available from MT5 or Fallback APIs",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const weightedPool: SignalConfig[] = [];
    function add(pairName: string, weight: number) {
      const item = available.find((x) => x.pair === pairName);
      if (!item) return;
      for (let i = 0; i < weight; i++) {
        weightedPool.push(item);
      }
    }

    add("XAU/USD (Gold)", 55);
    add("XAG/USD (Silver)", 12);
    add("US30", 9);
    add("NASDAQ", 8);
    add("S&P500", 6);

    for (const pair of forex) add(pair, 1);
    for (const pair of crypto) add(pair, 1);
    for (const pair of deriv) add(pair, 1);

    const shuffled = [...weightedPool].sort(() => Math.random() - 0.5);
    const orderedPairs: SignalConfig[] = [];
    const seen = new Set<string>();

    for (const item of shuffled) {
      if (seen.has(item.pair)) continue;
      seen.add(item.pair);
      orderedPairs.push(item);
    }

    for (const item of available) {
      if (seen.has(item.pair)) continue;
      seen.add(item.pair);
      orderedPairs.push(item);
    }

    let selected: SignalConfig | null = null;
    let decision: any = null;

    for (const config of orderedPairs) {
      const result = await evaluatePair(supabase, config.pair);
      if (!result.generate) continue;

      selected = config;
      decision = result;
      break;
    }

    if (!selected) {
      return new Response(
        JSON.stringify({
          success: true,
          generated: false,
          reason: "All available pairs already have open signals",
          deriv_daily_count: derivCount || 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const signal = generateSignal(selected);

    const { data, error } = await supabase
      .from("signals")
      .insert(signal)
      .select("*")
      .single();

    if (error) throw error;

    const telegram = await postTelegramSignal(supabaseUrl, serviceRoleKey, data);
    const mt5Execution = await executeMT5DemoTrade(supabaseUrl, serviceRoleKey, data);

    return new Response(
      JSON.stringify({
        success: true,
        generated: true,
        pair: selected.pair,
        category: selected.category,
        decision,
        signal: data,
        telegram,
        mt5_trade: mt5Execution,
        deriv_daily_count: derivCount || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("AUTO SIGNAL ERROR:", error);
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
