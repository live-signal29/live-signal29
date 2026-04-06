import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GoldPriceData {
  price: number;
  high: number;
  low: number;
}

async function fetchGoldPrice(): Promise<GoldPriceData> {
  // Try Yahoo Finance first
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      const quote = data.chart?.result?.[0]?.indicators?.quote?.[0];
      if (meta?.regularMarketPrice) {
        return {
          price: meta.regularMarketPrice,
          high: quote?.high?.[0] || meta.regularMarketPrice + 15,
          low: quote?.low?.[0] || meta.regularMarketPrice - 15,
        };
      }
    }
  } catch (e) {
    console.log("Yahoo Finance failed:", e);
  }

  // Fallback: metals.dev
  try {
    const res = await fetch("https://api.metals.dev/v1/latest?api_key=demo&currency=USD&unit=oz");
    if (res.ok) {
      const data = await res.json();
      if (data.metals?.gold) {
        const price = data.metals.gold;
        return { price, high: price + 15, low: price - 15 };
      }
    }
  } catch (e) {
    console.log("metals.dev failed:", e);
  }

  throw new Error("Could not fetch gold price from any source");
}

function generateSignals(priceData: GoldPriceData, session: "morning" | "evening") {
  const { price, high, low } = priceData;
  const spread = high - low;
  
  const signalTypes = ["Scalping", "Intraday", "Swing"];
  const riskLevels = ["Low", "Medium", "High"];
  const buyReasons = [
    "Demand zone bounce with bullish engulfing",
    "Trendline support holding on H1",
    "Double bottom formation confirmed",
    "RSI oversold bounce at key level",
    "Order block retest with bullish confirmation",
    "Golden ratio 61.8% retracement support",
    "Bullish MACD crossover on M30",
    "Asian session support zone holding",
  ];
  const sellReasons = [
    "Supply zone rejection with bearish pin bar",
    "Resistance rejection at daily high",
    "Bearish divergence on RSI H1",
    "Head and shoulders pattern completing",
    "MACD bearish crossover near resistance",
    "Failed breakout at upper channel",
    "Overbought conditions on H4",
    "Distribution zone detected on volume",
  ];

  const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

  const signals = [];
  const now = new Date();
  const baseHour = session === "morning" ? 8 : 15;

  // Generate 4 signals: 2 Buy + 2 Sell, 3 free + 1 premium
  const configs = [
    { type: "Buy", premium: false },
    { type: "Sell", premium: false },
    { type: "Buy", premium: false },
    { type: "Sell", premium: true },
  ];

  for (let i = 0; i < configs.length; i++) {
    const { type, premium } = configs[i];
    const isBuy = type === "Buy";

    // Entry price around current price with slight variation
    const entryOffset = rand(-Math.round(spread * 0.3), Math.round(spread * 0.3));
    const entry = Math.round(price + entryOffset);

    // TP and SL based on direction
    const tp1Distance = rand(10, 18);
    const tp2Distance = rand(20, 30);
    const tp3Distance = rand(32, 45);
    const slDistance = rand(12, 20);

    const tp1 = isBuy ? entry + tp1Distance : entry - tp1Distance;
    const tp2 = isBuy ? entry + tp2Distance : entry - tp2Distance;
    const tp3 = isBuy ? entry + tp3Distance : entry - tp3Distance;
    const sl = isBuy ? entry - slDistance : entry + slDistance;

    // Time offset for each signal
    const signalTime = new Date(now);
    signalTime.setUTCHours(baseHour + i, rand(0, 45), 0, 0);

    signals.push({
      pair: "XAU/USD (Gold)",
      type,
      category: "COMMODITIES",
      main_category: "COMMODITIES",
      sub_category: "XAU/USD (Gold)",
      entry: entry.toString(),
      tp1: tp1.toString(),
      tp2: tp2.toString(),
      tp3: tp3.toString(),
      sl: sl.toString(),
      status: "open",
      signal_status: "open",
      is_premium: premium,
      is_activated: true,
      activated_at: signalTime.toISOString(),
      entry_mode: "market",
      signal_type: pick(signalTypes),
      risk_level: pick(riskLevels),
      analysis_reason: isBuy ? pick(buyReasons) : pick(sellReasons),
      tag: null,
      signal_raw_text: null,
      created_at: signalTime.toISOString(),
    });
  }

  return signals;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Determine session based on current UTC hour
    const currentHour = new Date().getUTCHours();
    const session = currentHour < 12 ? "morning" : "evening";

    // Fetch live gold price
    console.log("Fetching live gold price...");
    const priceData = await fetchGoldPrice();
    console.log(`Gold price: $${priceData.price}, High: $${priceData.high}, Low: $${priceData.low}`);

    // Generate 4 signals
    const signals = generateSignals(priceData, session);
    console.log(`Generated ${signals.length} signals for ${session} session`);

    // Insert into database
    const { data, error } = await supabase.from("signals").insert(signals).select("id, pair, type, entry");

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to insert signals", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        session,
        price: priceData.price,
        signals_created: data?.length || 0,
        signals: data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
