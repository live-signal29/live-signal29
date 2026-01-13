import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Fetch gold price from multiple free sources
async function fetchGoldPrice(): Promise<number | null> {
  // Try Gold API (goldapi.io has 500 free requests/month)
  // Try metals.live API first
  try {
    const response = await fetch("https://api.metals.live/v1/spot/gold", {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0 && data[0].price) {
        console.log("Gold price from metals.live:", data[0].price);
        return parseFloat(data[0].price);
      }
    }
  } catch (e) {
    console.log("metals.live failed:", e);
  }
  
  // Try alternative: goldpricez.com (scraping style)
  try {
    const response = await fetch("https://data-asg.goldprice.org/dbXRates/USD", {
      signal: AbortSignal.timeout(8000),
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.items && data.items[0] && data.items[0].xauPrice) {
        console.log("Gold price from goldprice.org:", data.items[0].xauPrice);
        return parseFloat(data.items[0].xauPrice);
      }
    }
  } catch (e) {
    console.log("goldprice.org failed:", e);
  }
  
  // Fallback to a static approximate value (will be updated when API works)
  console.log("Using fallback gold price");
  return null;
}

// Fetch forex prices
async function fetchForexPrices(pairs: string[]): Promise<Record<string, string>> {
  const prices: Record<string, string> = {};
  
  try {
    for (const pair of pairs) {
      const cleanPair = pair.replace("/", "").toUpperCase();
      
      // Handle gold/XAU pairs
      if (cleanPair.includes("XAU") || cleanPair.includes("GOLD")) {
        const goldPrice = await fetchGoldPrice();
        if (goldPrice) {
          prices[pair] = goldPrice.toFixed(2);
        }
        continue;
      }
      
      // Regular forex pairs using frankfurter (free, no auth)
      if (cleanPair.length >= 6) {
        const base = cleanPair.substring(0, 3);
        const quote = cleanPair.substring(3, 6);
        
        try {
          const response = await fetch(
            `https://api.frankfurter.app/latest?from=${base}&to=${quote}`,
            { signal: AbortSignal.timeout(5000) }
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
    
    // Check if this is a simple price fetch request (from client)
    const url = new URL(req.url);
    const pairsParam = url.searchParams.get("pairs");
    
    if (pairsParam) {
      // Client requesting prices for specific pairs
      const pairs = pairsParam.split(",");
      const prices = await fetchForexPrices(pairs);
      
      return new Response(
        JSON.stringify({ success: true, prices }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Full update mode - get all non-closed signals and update
    const { data: signals, error } = await supabase
      .from("signals")
      .select(
        "id, pair, type, entry, tp1, tp2, tp3, tp4, sl, tp1_hit, tp2_hit, tp3_hit, tp4_hit, sl_hit, status, signal_status, entry_mode, limit_entry_price, is_activated"
      )
      .eq("published", true)
      .neq("signal_status", "close");
    
    if (error) {
      throw error;
    }
    
    if (!signals || signals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active signals to update", prices: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get unique pairs
    const uniquePairs = [...new Set(signals.map(s => s.pair))];
    
    // Fetch prices for all pairs
    const prices = await fetchForexPrices(uniquePairs);
    console.log("Fetched prices:", prices);
    
    // Update signals with current prices and check TP/SL hits + limit order activation
    let updatedCount = 0;
    let activatedCount = 0;
    
    for (const signal of signals) {
      const currentPrice = prices[signal.pair];
      if (currentPrice) {
        const priceNum = parseFloat(currentPrice);
        const updates: Record<string, any> = { current_price: currentPrice };
        
        // Parse entry price helper
        const parsePrice = (priceStr: string): number => {
          if (!priceStr) return 0;
          const cleaned = priceStr.replace(/[^\d.\-–]/g, '');
          const parts = cleaned.split(/[-–]/);
          if (parts.length >= 2) {
            return (parseFloat(parts[0]) + parseFloat(parts[1])) / 2;
          }
          return parseFloat(cleaned) || 0;
        };
        
        const isBuy = signal.type?.toLowerCase() === 'buy';

        // Normalize lifecycle casing (handles "OPEN"/"Close" etc.)
        const lifecycle = String(signal.signal_status || signal.status || '').toLowerCase();

        // LIMIT ORDER ACTIVATION (system standard)
        // Only check orders that are PENDING.
        const isLimitOrder = signal.entry_mode === 'limit';
        const isPending = lifecycle === 'pending';
        const limitPrice = typeof signal.limit_entry_price === 'number' ? signal.limit_entry_price : 0;

        // Skip TP/SL logic for already-closed signals (even if casing differs)
        if (lifecycle === 'close') {
          await supabase
            .from("signals")
            .update(updates)
            .eq("id", signal.id);
          updatedCount++;
          continue;
        }

        if (isLimitOrder && isPending && limitPrice > 0) {
          // LIMIT BUY: Activate ONLY when CurrentPrice <= Entry Price
          // LIMIT SELL: Activate ONLY when CurrentPrice >= Entry Price
          const shouldActivate = isBuy ? (priceNum <= limitPrice) : (priceNum >= limitPrice);

          if (shouldActivate) {
            updates.signal_status = 'open';
            updates.status = 'open';
            updates.is_activated = true;
            updates.activated_at = new Date().toISOString();
            activatedCount++;
            console.log(`Limit order activated for signal ${signal.id} at price ${priceNum}`);
          }
        }

        // Only check TP/SL for OPEN signals (active trades)
        const isOpen = lifecycle === 'open' || updates.signal_status === 'open';

        if (isOpen) {
          // Get entry price for break-even calculations
          const entryPrice = parsePrice(signal.entry || '');
          
          // TP1 - Auto move SL to Entry (Break Even) when TP1 hits
          if (!signal.tp1_hit && signal.tp1) {
            const tp1Price = parsePrice(signal.tp1);
            if (tp1Price > 0 && (isBuy ? priceNum >= tp1Price : priceNum <= tp1Price)) {
              updates.tp1_hit = true;
              updates.profit_note = 'TP 1 Done! Move SL to Entry (B.E) ✅';
              // Auto-move SL to entry (break even)
              if (entryPrice > 0) {
                updates.sl = String(entryPrice);
              }
              console.log(`TP1 hit for signal ${signal.id} - SL moved to breakeven`);
            }
          }

          // TP2 - Growth profit
          if (!signal.tp2_hit && signal.tp2) {
            const tp2Price = parsePrice(signal.tp2);
            if (tp2Price > 0 && (isBuy ? priceNum >= tp2Price : priceNum <= tp2Price)) {
              updates.tp2_hit = true;
              updates.profit_note = 'TP 2 Cleared! Secure More Profits 💰';
              console.log(`TP2 hit for signal ${signal.id}`);
            }
          }

          // TP3 - Max profit - AUTO CLOSE when TP3 hits
          if (!signal.tp3_hit && signal.tp3) {
            const tp3Price = parsePrice(signal.tp3);
            if (tp3Price > 0 && (isBuy ? priceNum >= tp3Price : priceNum <= tp3Price)) {
              updates.tp3_hit = true;
              updates.signal_status = 'close';
              updates.status = 'close';
              updates.profit_note = 'Final Target Hit!🎊 Maximum Profit Secured ✅';
              console.log(`TP3 hit for signal ${signal.id} - closing signal with max profit`);
            }
          }

          // TP4 - only if TP4 has a valid numeric price
          if (!signal.tp4_hit && signal.tp4) {
            const tp4Price = parsePrice(signal.tp4);
            if (tp4Price > 0 && (isBuy ? priceNum >= tp4Price : priceNum <= tp4Price)) {
              updates.tp4_hit = true;
              console.log(`TP4 hit for signal ${signal.id}`);
            }
          }

          // BREAK EVEN CHECK - If TP1 was hit AND price returns to entry
          // This should be checked BEFORE SL check to prevent marking as SL hit
          const isTP1Hit = signal.tp1_hit || updates.tp1_hit;
          if (isTP1Hit && !signal.sl_hit && entryPrice > 0) {
            // Check if price has returned to entry (with small tolerance of 0.1%)
            const tolerance = entryPrice * 0.001;
            const priceAtEntry = Math.abs(priceNum - entryPrice) <= tolerance;
            
            if (priceAtEntry) {
              // Close at break even - NOT as SL hit
              updates.signal_status = 'close';
              updates.status = 'close';
              updates.profit_note = 'TP 1 Done ✅ - Closed at B.E (No Loss)';
              // Explicitly ensure sl_hit stays false
              updates.sl_hit = false;
              console.log(`Break-even close for signal ${signal.id} - TP1 was hit, closed at entry`);
            }
          }

          // SL - ONLY if TP1 is NOT hit, close signal as loss
          if (!signal.sl_hit && signal.sl && !isTP1Hit) {
            const slPrice = parsePrice(signal.sl);
            if (slPrice > 0 && (isBuy ? priceNum <= slPrice : priceNum >= slPrice)) {
              updates.sl_hit = true;
              updates.signal_status = 'close';
              updates.status = 'close';
              updates.profit_note = 'SL Hit ❌ - Staying patient for a better entry.';
              console.log(`SL hit for signal ${signal.id} - closing signal with loss`);
            }
          }
        }
        
        await supabase
          .from("signals")
          .update(updates)
          .eq("id", signal.id);
        updatedCount++;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        pricesUpdated: updatedCount,
        limitOrdersActivated: activatedCount,
        pairs: Object.keys(prices),
        prices
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