import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
   MT5 LIVE PRICES
========================================================= */

async function fetchMT5Prices(
  pairs: string[],
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/fetch-live-prices?pairs=${encodeURIComponent(
          pairs.join(",")
        )}`,
        {
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(30000),
        }
      );

      const text = await response.text();
      let json: any = {};

      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        console.error(
          "MT5 price endpoint returned non-JSON:",
          response.status,
          text.slice(0, 1000)
        );
      }

      if (!response.ok) {
        console.error(
          `MT5 price endpoint failed (attempt ${attempt}/2):`,
          response.status,
          json?.diagnostics || text.slice(0, 1000)
        );

        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }

        return result;
      }

      const prices = json?.prices || {};

      for (const pair of pairs) {
        const value = Number(prices[pair]);

        if (Number.isFinite(value) && value > 0) {
          result[pair] = value;
        }
      }

      for (const key of Object.keys(prices)) {
        const normalized = String(key)
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "");

        const value = Number(prices[key]);

        if (!Number.isFinite(value) || value <= 0) continue;

        if (normalized.includes("XAUUSD") || normalized === "GOLD") {
          result["XAU/USD (Gold)"] = value;
        }
        if (normalized.includes("XAGUSD") || normalized === "SILVER") {
          result["XAG/USD (Silver)"] = value;
        }
        if (
          normalized.includes("US30") ||
          normalized.includes("DJ30") ||
          normalized.includes("DOW")
        ) {
          result["US30"] = value;
        }
        if (
          normalized.includes("NASDAQ") ||
          normalized.includes("NAS100") ||
          normalized.includes("USTEC")
        ) {
          result["NASDAQ"] = value;
        }
        if (
          normalized.includes("SP500") ||
          normalized.includes("US500") ||
          normalized.includes("SPX")
        ) {
          result["S&P500"] = value;
        }
        if (normalized.includes("VOL75")) {
          result["VOL 75"] = value;
        }
        if (normalized.includes("VOL100")) {
          result["VOL 100"] = value;
        }
        if (normalized.includes("BOOM1000")) {
          result["BOOM 1000"] = value;
        }
        if (normalized.includes("CRASH1000")) {
          result["CRASH 1000"] = value;
        }
        if (normalized.includes("BOOM500")) {
          result["BOOM 500"] = value;
        }
      }

      return result;
    } catch (error) {
      console.error(
        `MT5 price endpoint error (attempt ${attempt}/2):`,
        String(error)
      );

      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  return result;
}

/* =========================================================
   HELPERS
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

/* =========================================================
   GENERATE SIGNAL
========================================================= */

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
  const isIndex =
    pair === "US30" || pair === "NASDAQ" || pair === "S&P500";
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
   EVALUATE PAIR
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
    console.error("Active signal check error:", activeError.message);
  }

  if (active) {
    return { generate: false, reason: "signal_still_open" };
  }

  return { generate: true, reason: "hourly_signal_slot" };
}

/* =========================================================
   POST TELEGRAM & EXECUTE MT5 DEMO TRADE
========================================================= */

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
    console.log("Telegram response:", response.status, text);
    return { success: response.ok, status: response.status, response: text };
  } catch (error) {
    console.error("Telegram error:", String(error));
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
    console.log("MT5 Auto-Trade Execution Response:", response.status, text);
    return { success: response.ok, response: text };
  } catch (error) {
    console.error("MT5 Auto-Trade Execution Error:", String(error));
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

    const mt5 = await fetchMT5Prices(allPairs, supabaseUrl, serviceRoleKey);
    const candidates: SignalConfig[] = [];

    for (const pair of commodities) {
      const p = mt5[pair];
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
      const p = mt5[pair];
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
      const p = mt5[pair];
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
        const p = mt5[pair];
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

    const available = candidates.filter((x) => !!mt5[x.pair]);

    if (!available.length) {
      return new Response(
        JSON.stringify({
          success: false,
          generated: false,
          error:
            "No live prices available from MT5/MetaApi or Deriv. Check the fetch-live-prices function logs and MT5 credentials.",
          requested_pairs: allPairs,
          deriv_daily_count: derivCount || 0,
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

    /* Executing both Telegram & MT5 Execution */
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
