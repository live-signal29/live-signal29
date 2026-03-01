import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Fetch gold price from multiple sources with better error handling
async function fetchGoldPrice(): Promise<number | null> {
  // Source 1: metals.live
  try {
    const response = await fetch("https://api.metals.live/v1/spot/gold", {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0 && data[0].price) {
        console.log("Gold price from metals.live:", data[0].price);
        return parseFloat(data[0].price);
      }
    }
  } catch (e) {
    console.log("metals.live failed:", String(e));
  }

  // Source 2: goldprice.org
  try {
    const response = await fetch("https://data-asg.goldprice.org/dbXRates/USD", {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    });
    if (response.ok) {
      const data = await response.json();
      if (data.items && data.items[0] && data.items[0].xauPrice) {
        console.log("Gold price from goldprice.org:", data.items[0].xauPrice);
        return parseFloat(data.items[0].xauPrice);
      }
    }
  } catch (e) {
    console.log("goldprice.org failed:", String(e));
  }

  // Source 3: metals.dev free API
  try {
    const response = await fetch("https://api.metals.dev/v1/latest?api_key=demo&currency=USD&unit=toz", {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    });
    if (response.ok) {
      const data = await response.json();
      if (data.metals && data.metals.gold) {
        console.log("Gold price from metals.dev:", data.metals.gold);
        return parseFloat(data.metals.gold);
      }
    }
  } catch (e) {
    console.log("metals.dev failed:", String(e));
  }

  console.log("All gold price sources failed");
  return null;
}

// Fetch silver price
async function fetchSilverPrice(): Promise<number | null> {
  // Try metals.dev
  try {
    const response = await fetch("https://api.metals.dev/v1/latest?api_key=demo&currency=USD&unit=toz", {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    });
    if (response.ok) {
      const data = await response.json();
      if (data.metals?.silver) {
        console.log("Silver price from metals.dev:", data.metals.silver);
        return parseFloat(data.metals.silver);
      }
    }
  } catch (e) {
    console.log("Silver metals.dev failed:", String(e));
  }
  
  // Try goldprice.org for silver
  try {
    const response = await fetch("https://data-asg.goldprice.org/dbXRates/USD", {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    });
    if (response.ok) {
      const data = await response.json();
      if (data.items?.[0]?.xagPrice) {
        console.log("Silver from goldprice.org:", data.items[0].xagPrice);
        return parseFloat(data.items[0].xagPrice);
      }
    }
  } catch (e) {
    console.log("Silver goldprice.org failed:", String(e));
  }
  return null;
}

// Fetch crypto prices from CoinGecko
async function fetchCryptoPrices(pairs: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  const coinMap: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'XRP': 'ripple',
    'LTC': 'litecoin',
    'ADA': 'cardano',
    'SOL': 'solana',
    'DOGE': 'dogecoin',
    'DOT': 'polkadot',
    'AVAX': 'avalanche-2',
    'MATIC': 'matic-network',
    'LINK': 'chainlink',
  };

  const coinIds: string[] = [];
  const pairToCoin: Record<string, string> = {};

  for (const pair of pairs) {
    const base = pair.split('/')[0]?.toUpperCase();
    if (base && coinMap[base]) {
      coinIds.push(coinMap[base]);
      pairToCoin[coinMap[base]] = pair;
    }
  }

  if (coinIds.length === 0) return prices;

  try {
    const ids = coinIds.join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      {
        signal: AbortSignal.timeout(8000),
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
      }
    );
    if (response.ok) {
      const data = await response.json();
      for (const [coinId, pair] of Object.entries(pairToCoin)) {
        if (data[coinId]?.usd) {
          prices[pair] = data[coinId].usd;
          console.log(`Crypto price ${pair}: ${data[coinId].usd}`);
        }
      }
    }
  } catch (e) {
    console.log("CoinGecko failed:", String(e));
  }

  return prices;
}

// Fetch forex prices from multiple sources
async function fetchForexPrice(base: string, quote: string): Promise<number | null> {
  // Source 1: frankfurter.app
  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${base}&to=${quote}`,
      { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.rates?.[quote]) {
        return data.rates[quote];
      }
    }
  } catch (e) {
    console.log(`frankfurter failed for ${base}/${quote}:`, String(e));
  }

  // Source 2: exchangerate.host (free tier)
  try {
    const response = await fetch(
      `https://api.exchangerate.host/latest?base=${base}&symbols=${quote}`,
      { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.rates?.[quote]) {
        return data.rates[quote];
      }
    }
  } catch (e) {
    console.log(`exchangerate.host failed for ${base}/${quote}:`, String(e));
  }

  return null;
}

// Main price fetcher for all pairs
async function fetchAllPrices(pairs: string[]): Promise<Record<string, string>> {
  const prices: Record<string, string> = {};
  
  const cryptoPairs: string[] = [];
  const forexPairs: string[] = [];
  const goldPairs: string[] = [];
  const silverPairs: string[] = [];

  for (const pair of pairs) {
    const upper = pair.toUpperCase();
    if (upper.includes("XAU") || upper.includes("GOLD")) {
      goldPairs.push(pair);
    } else if (upper.includes("XAG") || upper.includes("SILVER")) {
      silverPairs.push(pair);
    } else if (['BTC', 'ETH', 'XRP', 'LTC', 'ADA', 'SOL', 'DOGE', 'DOT', 'AVAX', 'MATIC', 'LINK'].some(c => upper.startsWith(c))) {
      cryptoPairs.push(pair);
    } else {
      forexPairs.push(pair);
    }
  }

  // Fetch all categories in parallel
  const [goldPrice, silverPrice, cryptoPrices] = await Promise.all([
    goldPairs.length > 0 ? fetchGoldPrice() : Promise.resolve(null),
    silverPairs.length > 0 ? fetchSilverPrice() : Promise.resolve(null),
    cryptoPairs.length > 0 ? fetchCryptoPrices(cryptoPairs) : Promise.resolve({}),
  ]);

  // Apply gold price
  if (goldPrice) {
    for (const pair of goldPairs) {
      prices[pair] = goldPrice.toFixed(2);
    }
  }

  // Apply silver price
  if (silverPrice) {
    for (const pair of silverPairs) {
      prices[pair] = silverPrice.toFixed(4);
    }
  }

  // Apply crypto prices
  for (const [pair, price] of Object.entries(cryptoPrices)) {
    prices[pair] = price < 1 ? price.toFixed(6) : price < 100 ? price.toFixed(4) : price.toFixed(2);
  }

  // Fetch forex pairs (sequentially to avoid rate limits)
  for (const pair of forexPairs) {
    const cleanPair = pair.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (cleanPair.length >= 6) {
      const base = cleanPair.substring(0, 3);
      const quote = cleanPair.substring(3, 6);
      const price = await fetchForexPrice(base, quote);
      if (price) {
        prices[pair] = price.toFixed(5);
        console.log(`Forex price ${pair}: ${price.toFixed(5)}`);
      }
    }
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
      const pairs = pairsParam.split(",");
      const prices = await fetchAllPrices(pairs);
      
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
      .not("signal_status", "in", '("close","CLOSE")');
    
    if (error) {
      console.error("Error fetching signals:", error);
      throw error;
    }
    
    console.log(`Found ${signals?.length || 0} active signals to update`);
    
    if (!signals || signals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active signals to update", prices: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get unique pairs
    const uniquePairs = [...new Set(signals.map(s => s.pair))];
    console.log("Unique pairs to fetch:", uniquePairs);
    
    // Fetch prices for all pairs
    const prices = await fetchAllPrices(uniquePairs);
    console.log("Fetched prices:", JSON.stringify(prices));
    
    // Update signals with current prices and check TP/SL hits
    let updatedCount = 0;
    let activatedCount = 0;
    
    for (const signal of signals) {
      const currentPrice = prices[signal.pair];
      if (currentPrice) {
        const priceNum = parseFloat(currentPrice);
        const updates: Record<string, any> = { current_price: currentPrice };
        
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
        const lifecycle = String(signal.signal_status || signal.status || '').toLowerCase();

        // LIMIT ORDER ACTIVATION
        const isLimitOrder = signal.entry_mode === 'limit';
        const isPending = lifecycle === 'pending';
        const limitPrice = typeof signal.limit_entry_price === 'number' ? signal.limit_entry_price : 0;

        if (lifecycle === 'close') {
          await supabase.from("signals").update(updates).eq("id", signal.id);
          updatedCount++;
          continue;
        }

        if (isLimitOrder && isPending && limitPrice > 0) {
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

        const isOpen = lifecycle === 'open' || updates.signal_status === 'open';

        if (isOpen) {
          const entryPrice = parsePrice(signal.entry || '');
          
          // TP1
          if (!signal.tp1_hit && signal.tp1) {
            const tp1Price = parsePrice(signal.tp1);
            if (tp1Price > 0 && (isBuy ? priceNum >= tp1Price : priceNum <= tp1Price)) {
              updates.tp1_hit = true;
              updates.profit_note = 'TP 1 Done! Move SL to Entry (B.E) ✅';
              if (entryPrice > 0) updates.sl = String(entryPrice);
              console.log(`TP1 hit for signal ${signal.id}`);
            }
          }

          // TP2
          if (!signal.tp2_hit && signal.tp2) {
            const tp2Price = parsePrice(signal.tp2);
            if (tp2Price > 0 && (isBuy ? priceNum >= tp2Price : priceNum <= tp2Price)) {
              updates.tp2_hit = true;
              updates.profit_note = 'TP 2 Cleared! Secure More Profits 💰';
              console.log(`TP2 hit for signal ${signal.id}`);
            }
          }

          // TP3 - AUTO CLOSE
          if (!signal.tp3_hit && signal.tp3) {
            const tp3Price = parsePrice(signal.tp3);
            if (tp3Price > 0 && (isBuy ? priceNum >= tp3Price : priceNum <= tp3Price)) {
              updates.tp3_hit = true;
              updates.signal_status = 'close';
              updates.status = 'close';
              updates.profit_note = 'Final Target Hit!🎊 Maximum Profit Secured ✅';
              console.log(`TP3 hit for signal ${signal.id} - closing`);
            }
          }

          // TP4
          if (!signal.tp4_hit && signal.tp4) {
            const tp4Price = parsePrice(signal.tp4);
            if (tp4Price > 0 && (isBuy ? priceNum >= tp4Price : priceNum <= tp4Price)) {
              updates.tp4_hit = true;
              console.log(`TP4 hit for signal ${signal.id}`);
            }
          }

          // BREAK EVEN CHECK
          const isTP1Hit = signal.tp1_hit || updates.tp1_hit;
          if (isTP1Hit && !signal.sl_hit && entryPrice > 0) {
            const tolerance = entryPrice * 0.001;
            if (Math.abs(priceNum - entryPrice) <= tolerance) {
              updates.signal_status = 'close';
              updates.status = 'close';
              updates.profit_note = 'TP 1 Done ✅ - Closed at B.E (No Loss)';
              updates.sl_hit = false;
              console.log(`Break-even close for signal ${signal.id}`);
            }
          }

          // SL - ONLY if TP1 NOT hit
          if (!signal.sl_hit && signal.sl && !isTP1Hit) {
            const slPrice = parsePrice(signal.sl);
            if (slPrice > 0 && (isBuy ? priceNum <= slPrice : priceNum >= slPrice)) {
              updates.sl_hit = true;
              updates.signal_status = 'close';
              updates.status = 'close';
              updates.profit_note = 'SL Hit ❌ - Staying patient for a better entry.';
              console.log(`SL hit for signal ${signal.id}`);
            }
          }
        }
        
        await supabase.from("signals").update(updates).eq("id", signal.id);
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
