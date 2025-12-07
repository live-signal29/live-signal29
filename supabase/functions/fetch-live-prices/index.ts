import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Free forex API - exchangerate.host or alternative
async function fetchForexPrices(pairs: string[]): Promise<Record<string, string>> {
  const prices: Record<string, string> = {};
  
  try {
    // Using exchangerate-api.com free tier for major forex pairs
    for (const pair of pairs) {
      // Parse pair format (e.g., "EURUSD" -> EUR and USD)
      const cleanPair = pair.replace("/", "").toUpperCase();
      
      // Handle different asset types
      if (cleanPair.includes("XAU") || cleanPair.includes("GOLD")) {
        // Gold price - use a simple fetch
        try {
          const goldResponse = await fetch("https://api.exchangerate.host/latest?base=XAU&symbols=USD");
          if (goldResponse.ok) {
            const goldData = await goldResponse.json();
            if (goldData.rates?.USD) {
              prices[pair] = (1 / goldData.rates.USD).toFixed(2);
            }
          }
        } catch (e) {
          console.log("Gold price fetch failed:", e);
        }
        continue;
      }
      
      if (cleanPair.length >= 6) {
        const base = cleanPair.substring(0, 3);
        const quote = cleanPair.substring(3, 6);
        
        try {
          const response = await fetch(
            `https://api.exchangerate.host/latest?base=${base}&symbols=${quote}`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.rates && data.rates[quote]) {
              prices[pair] = data.rates[quote].toFixed(5);
            }
          }
        } catch (e) {
          console.log(`Price fetch failed for ${pair}:`, e);
        }
      }
    }
  } catch (error) {
    console.error("Error fetching prices:", error);
  }
  
  return prices;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all active signals
    const { data: signals, error } = await supabase
      .from("signals")
      .select("id, pair")
      .eq("published", true)
      .in("signal_status", ["OPEN", "LIVE"]);
    
    if (error) {
      throw error;
    }
    
    if (!signals || signals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active signals to update" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get unique pairs
    const uniquePairs = [...new Set(signals.map(s => s.pair))];
    
    // Fetch prices for all pairs
    const prices = await fetchForexPrices(uniquePairs);
    
    // Update signals with current prices
    let updatedCount = 0;
    for (const signal of signals) {
      const currentPrice = prices[signal.pair];
      if (currentPrice) {
        await supabase
          .from("signals")
          .update({ current_price: currentPrice })
          .eq("id", signal.id);
        updatedCount++;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        pricesUpdated: updatedCount,
        pairs: Object.keys(prices)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in fetch-live-prices:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
