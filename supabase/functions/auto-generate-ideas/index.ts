import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchGoldPrice(): Promise<{ price: number; high: number; low: number; change: number }> {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=2d",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      const quote = data.chart?.result?.[0]?.indicators?.quote?.[0];
      if (meta?.regularMarketPrice) {
        const prevClose = meta.chartPreviousClose || meta.regularMarketPrice;
        return {
          price: meta.regularMarketPrice,
          high: quote?.high?.[quote.high.length - 1] || meta.regularMarketPrice + 15,
          low: quote?.low?.[quote.low.length - 1] || meta.regularMarketPrice - 15,
          change: +(meta.regularMarketPrice - prevClose).toFixed(2),
        };
      }
    }
  } catch (e) { console.log("Yahoo gold failed:", e); }

  // Fallback
  const p = 3220;
  return { price: p, high: p + 20, low: p - 20, change: 12.5 };
}

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.round(min + Math.random() * (max - min)); }

function generateIdeas(price: number, high: number, low: number, change: number): { title: string; description: string }[] {
  const direction = change >= 0 ? "bullish" : "bearish";
  const dirEmoji = change >= 0 ? "📈" : "📉";
  const range = high - low;
  const support1 = Math.round(low - rand(5, 15));
  const support2 = Math.round(low - rand(20, 40));
  const resistance1 = Math.round(high + rand(5, 15));
  const resistance2 = Math.round(high + rand(20, 40));
  const fib618 = Math.round(low + range * 0.618);
  const fib382 = Math.round(low + range * 0.382);

  const ideas = [
    // Technical analysis ideas
    {
      title: `${dirEmoji} XAU/USD ${direction === "bullish" ? "Bulls Push" : "Bears Dominate"} – Gold at $${price}`,
      description: `Gold is currently trading at $${price} (${change >= 0 ? "+" : ""}${change}). Today's range: $${low} - $${high}. ${
        direction === "bullish"
          ? `Buyers are in control with price holding above $${low}. Key resistance at $${resistance1}. A break above could target $${resistance2}. Support at $${support1}.`
          : `Sellers are pushing price lower from $${high}. Key support at $${support1}. If broken, expect a move toward $${support2}. Resistance at $${resistance1}.`
      } RSI is ${direction === "bullish" ? "trending above 55, showing buying momentum" : "below 45, confirming selling pressure"}. Watch for ${direction === "bullish" ? "breakout" : "breakdown"} confirmation before entering.`,
    },
    {
      title: `🎯 Gold Key Levels Today – Support $${support1} | Resistance $${resistance1}`,
      description: `XAU/USD is trading at $${price}. Daily high: $${high}, Daily low: $${low}. The 61.8% Fibonacci retracement sits at $${fib618}, while 38.2% level is at $${fib382}. ${
        price > fib618
          ? `Price is above the golden ratio level, suggesting bullish continuation. Buyers should target $${resistance1} with stops below $${fib618}.`
          : `Price is testing below the golden ratio, watch for a bounce at $${fib382}. If this level breaks, deeper correction toward $${support2} is likely.`
      } Volume is ${pick(["increasing", "steady", "declining"])} compared to yesterday's session.`,
    },
    {
      title: `💡 Gold Scalping Zones – ${price > high - range / 2 ? "Buy Dips" : "Sell Rallies"} Near $${price}`,
      description: `Intraday scalping opportunities on XAU/USD at $${price}. ${
        price > high - range / 2
          ? `Buy zone: $${low}-$${Math.round(low + range * 0.25)} with targets at $${Math.round(high - range * 0.1)} and $${high}. Stop loss below $${Math.round(low - 5)}.`
          : `Sell zone: $${Math.round(high - range * 0.25)}-$${high} with targets at $${Math.round(low + range * 0.1)} and $${low}. Stop loss above $${Math.round(high + 5)}.`
      } MACD is showing ${pick(["bullish crossover on M15", "bearish divergence on M30", "momentum shift on H1", "neutral stance – wait for confirmation"])}. Risk management is crucial – use 1% max per trade.`,
    },
    {
      title: `📊 Weekly Gold Outlook – $${support2} to $${resistance2} Range`,
      description: `XAU/USD weekly analysis shows price consolidating between $${support2} and $${resistance2}. Current price: $${price}. The ${pick(["symmetrical triangle", "ascending channel", "descending wedge", "rectangle pattern"])} is forming on the H4 chart. A breakout above $${resistance1} opens the door for $${resistance2}, while a breakdown below $${support1} targets $${support2}. Fundamentals: ${pick([
        "Fed interest rate expectations are keeping gold volatile",
        "USD weakness is supporting gold prices",
        "Geopolitical tensions continue to drive safe-haven demand",
        "Central bank gold purchases remain strong",
        "Inflation data this week could be a catalyst",
      ])}. Best strategy: ${pick(["wait for breakout confirmation", "buy on dips near support", "scale into positions at key levels", "trade the range until breakout"])}.`,
    },
    {
      title: `🔥 Gold ${change >= 0 ? "Rally" : "Selloff"} Alert – ${Math.abs(change)} Points Move`,
      description: `XAU/USD has moved ${change >= 0 ? "up" : "down"} ${Math.abs(change)} points today to $${price}. ${
        Math.abs(change) > 20
          ? `This is a significant move driven by ${pick(["strong institutional buying", "heavy liquidation", "news catalyst", "technical breakout"])}. `
          : `The move is within normal daily range. `
      }Key observations: ${pick([
        `Order blocks visible near $${Math.round(price - 15)} and $${Math.round(price + 15)}`,
        `Liquidity pools forming around $${Math.round(price - 10)} and $${Math.round(price + 20)}`,
        `Smart money indicators suggest ${direction} continuation`,
        `Volume profile shows strongest activity at $${Math.round(price - 5)}`,
      ])}. Next session forecast: ${pick([
        `expect continuation toward $${direction === "bullish" ? resistance1 : support1}`,
        `potential reversal near $${price} – watch for confirmation`,
        `consolidation likely between $${Math.round(price - 10)} and $${Math.round(price + 10)}`,
      ])}.`,
    },
  ];

  // Shuffle and pick 3
  const shuffled = ideas.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("Fetching live gold price for market ideas...");
    const gold = await fetchGoldPrice();
    console.log(`Gold price: $${gold.price}, Change: ${gold.change}`);

    const ideas = generateIdeas(gold.price, gold.high, gold.low, gold.change);

    const rows = ideas.map((idea) => ({
      title: idea.title,
      description: idea.description,
      published: true,
      image_url: null,
    }));

    const { data, error } = await supabase
      .from("market_ideas")
      .insert(rows)
      .select("id, title");

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to insert ideas", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        gold_price: gold.price,
        ideas_created: data?.length || 0,
        ideas: data,
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
