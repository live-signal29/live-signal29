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

/* =========================================================
   MT5 PRICES
========================================================= */

async function fetchMT5Prices(
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
      }
    );

    if (!response.ok) return result;

    const json = await response.json();
    const prices = json?.prices || {};

    for (const pair of pairs) {
      const value = prices[pair];
      const price = value ? parseFloat(String(value)) : NaN;
      if (Number.isFinite(price) && price > 0) {
        result[pair] = price;
      }
    }

    const keys = Object.keys(prices);
    for (const key of keys) {
      const normalized = String(key).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const value = parseFloat(String(prices[key]));

      if (Number.isFinite(value) && value > 0) {
        if (normalized.includes("XAUUSD") || normalized === "GOLD") {
          result["XAU/USD (Gold)"] = value;
        }
        if (normalized.includes("XAGUSD") || normalized === "SILVER") {
          result["XAG/USD (Silver)"] = value;
        }
        if (normalized.includes("US30") || normalized.includes("DJ30")) {
          result["US30"] = value;
        }
        if (normalized.includes("NASDAQ") || normalized.includes("NAS100")) {
          result["NASDAQ"] = value;
        }
        if (normalized.includes("VOL75") || normalized.includes("VOLATILITY75")) {
          result["VOL 75"] = value;
        }
      }
    }
  } catch (error) {
    console.error("MT5 fetch error:", String(error));
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
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

const buyReasons = [
  "Demand zone bounce with bullish confirmation",
  "Trendline support holding",
  "Double bottom formation",
  "RSI oversold bounce",
  "Bullish order block retest",
  "61.8% Fibonacci support",
  "Smart Money demand zone confirmed",
];

const sellReasons = [
  "Supply zone rejection",
  "Resistance rejection",
  "RSI bearish divergence",
  "Bearish MACD crossover",
  "Failed breakout",
  "Smart Money supply zone confirmed",
];

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

function generateSignal(config: SignalConfig) {
  const { pair, category, mainCategory, subCategory, price, pipMultiplier, decimals } = config;
  const isBuy = Math.random() < 0.5;
  const type = isBuy ? "Buy" : "Sell";

  const spread = Math.max(price.high - price.low, pipMultiplier * 20);
  const offset = rand(-spread * 0.05, spread * 0.05);
  const entry = Number((price.price + offset).toFixed(decimals));

  // Safe SL Gap Adjustment specifically for VOL 75 and Deriv
  const isVol75 = pair.includes("VOL 75");
  const isDeriv = category === "DERIV";

  // Volatility 75 gets minimum 150 to 250 points gap so noise/spread won't hit SL
  const slMult = isVol75 ? rand(150, 250) : isDeriv ? rand(40, 80) : rand(12, 20);
  const tp1Mult = isVol75 ? rand(150, 250) : isDeriv ? rand(40, 80) : rand(15, 25);
  const tp2Mult = isVol75 ? rand(300, 450) : isDeriv ? rand(90, 150) : rand(30, 45);
  const tp3Mult = isVol75 ? rand(500, 700) : isDeriv ? rand(160, 250) : rand(50, 75);

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
    is_premium: Math.random() < 0.2,
    is_activated: true,
    activated_at: now,
    entry_mode: "market",
    signal_type: pick(["Scalping", "Intraday", "Swing"]),
    risk_level: isVol75 ? "High" : pick(["Low", "Medium"]),
    analysis_reason: isBuy ? pick(buyReasons) : pick(sellReasons),
    published: true,
    created_at: now,
    tp1_hit: false,
    tp2_hit: false,
    tp3_hit: false,
  };
}

async function evaluatePair(
  supabase: ReturnType<typeof createClient>,
  pair: string,
  currentPrice: number,
  thresholdPct: number
) {
  const { data: active } = await supabase
    .from("signals")
    .select("id")
    .eq("pair", pair)
    .not("signal_status", "ilike", "close")
    .limit(1)
    .maybeSingle();

  if (active) return { generate: false, reason: "signal_still_open" };

  const { data: last } = await supabase
    .from("signals")
    .select("entry,created_at")
    .eq("pair", pair)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!last?.entry) return { generate: true, reason: "no_prior_signal" };

  const lastPrice = parseFloat(String(last.entry));
  if (!Number.isFinite(lastPrice) || lastPrice <= 0) return { generate: true, reason: "invalid_entry" };

  const move = Math.abs((currentPrice - lastPrice) / lastPrice) * 100;
  if (move >= thresholdPct) return { generate: true, reason: "movement_detected", pctMove: Number(move.toFixed(4)) };

  return { generate: false, reason: "low_movement", pctMove: Number(move.toFixed(4)) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Limit Deriv Signals to Max 5 Per Day
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count: derivCount } = await supabase
      .from("signals")
      .select("id", { count: "exact", head: true })
      .eq("category", "DERIV")
      .gte("created_at", todayStart.toISOString());

    const allowDeriv = (derivCount || 0) < 5;

    // High priority commodities & indices
    const highPriorityPairs = ["XAU/USD (Gold)", "XAG/USD (Silver)", "US30", "NASDAQ", "S&P500"];
    const forex = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "GBP/JPY", "USD/CAD"];
    const crypto = ["BTC/USD", "ETH/USD", "SOL/USD"];
    const deriv = allowDeriv ? ["BOOM 1000", "CRASH 1000", "VOL 75", "BOOM 500", "VOL 100"] : [];

    const allPairs = [...highPriorityPairs, ...forex, ...crypto, ...deriv];
    const mt5 = await fetchMT5Prices(allPairs, supabaseUrl, serviceRoleKey);

    const candidates: SignalConfig[] = [];

    for (const pair of highPriorityPairs) {
      if (!mt5[pair]) continue;
      const p = mt5[pair];
      const isGold = pair.includes("XAU");
      const isSilver = pair.includes("XAG");
      candidates.push({
        pair,
        category: "COMMODITIES",
        mainCategory: "COMMODITIES",
        subCategory: pair,
        price: { price: p, high: p + (isGold ? 10 : 1), low: p - (isGold ? 10 : 1) },
        pipMultiplier: isGold ? 1 : isSilver ? 0.05 : 10,
        decimals: isSilver ? 3 : 2,
        thresholdPct: 0.05,
      });
    }

    for (const pair of forex) {
      if (!mt5[pair]) continue;
      const p = mt5[pair];
      const isJPY = pair.includes("JPY");
      candidates.push({
        pair,
        category: "FOREX",
        mainCategory: "FOREX",
        subCategory: pair,
        price: { price: p, high: p + (isJPY ? 0.4 : 0.004), low: p - (isJPY ? 0.4 : 0.004) },
        pipMultiplier: isJPY ? 0.1 : 0.001,
        decimals: isJPY ? 3 : 5,
        thresholdPct: 0.1,
      });
    }

    if (allowDeriv) {
      for (const pair of deriv) {
        if (!mt5[pair]) continue;
        const p = mt5[pair];
        const isVol75 = pair.includes("VOL 75");
        candidates.push({
          pair,
          category: "DERIV",
          mainCategory: "DERIV/BINARY",
          subCategory: pair,
          price: { price: p, high: p * 1.005, low: p * 0.995 },
          // Pip Multiplier 1.0 for direct point calculations in Volatility 75
          pipMultiplier: isVol75 ? 1.0 : 10, 
          decimals: 2,
          thresholdPct: 0.25,
        });
      }
    }

    const newSignals: any[] = [];
    for (const config of candidates) {
      const current = mt5[config.pair];
      const decision = await evaluatePair(supabase, config.pair, current, config.thresholdPct);

      if (decision.generate) {
        newSignals.push(generateSignal(config));
      }
    }

    if (newSignals.length === 0) {
      return new Response(JSON.stringify({ success: true, generated: false, deriv_daily_count: derivCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.from("signals").insert(newSignals).select("*");

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, generated: true, signals: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
