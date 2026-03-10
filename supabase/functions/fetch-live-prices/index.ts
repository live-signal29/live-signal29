import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Yahoo Finance helper ───
async function fetchYahooPrice(symbol: string): Promise<number | null> {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`,
      { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (r.ok) {
      const d = await r.json();
      const price = d?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price) { console.log(`Yahoo ${symbol}: ${price}`); return price; }
    } else await r.text();
  } catch (e) { console.log(`Yahoo ${symbol} fail:`, String(e)); }
  return null;
}

// ─── GOLD ───
async function fetchGoldPrice(): Promise<number | null> {
  // Source 1: Yahoo Finance GC=F (Gold Futures) - most reliable
  const yahooPrice = await fetchYahooPrice("GC=F");
  if (yahooPrice) return yahooPrice;

  // Source 2: metals.live
  try {
    const r = await fetch("https://api.metals.live/v1/spot/gold", {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    });
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d) && d.length > 0 && d[0].price) {
        console.log("Gold metals.live:", d[0].price);
        return parseFloat(d[0].price);
      }
    } else await r.text();
  } catch (e) { console.log("metals.live fail:", String(e)); }

  // Source 3: goldprice.org
  try {
    const r = await fetch("https://data-asg.goldprice.org/dbXRates/USD", {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    });
    if (r.ok) {
      const d = await r.json();
      if (d.items?.[0]?.xauPrice) {
        console.log("Gold goldprice.org:", d.items[0].xauPrice);
        return parseFloat(d.items[0].xauPrice);
      }
    } else await r.text();
  } catch (e) { console.log("goldprice.org fail:", String(e)); }

  return null;
}

// ─── SILVER ───
async function fetchSilverPrice(): Promise<number | null> {
  // Source 1: Yahoo Finance SI=F (Silver Futures)
  const yahooPrice = await fetchYahooPrice("SI=F");
  if (yahooPrice) return yahooPrice;

  // Source 2: goldprice.org
  try {
    const r = await fetch("https://data-asg.goldprice.org/dbXRates/USD", {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    });
    if (r.ok) {
      const d = await r.json();
      if (d.items?.[0]?.xagPrice) {
        console.log("Silver goldprice.org:", d.items[0].xagPrice);
        return parseFloat(d.items[0].xagPrice);
      }
    } else await r.text();
  } catch (e) { console.log("Silver goldprice.org fail:", String(e)); }

  // Source 3: metals.live
  try {
    const r = await fetch("https://api.metals.live/v1/spot/silver", {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    });
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d) && d.length > 0 && d[0].price) {
        console.log("Silver metals.live:", d[0].price);
        return parseFloat(d[0].price);
      }
    } else await r.text();
  } catch (e) { console.log("Silver metals.live fail:", String(e)); }

  return null;
}

// ─── CRYPTO via CoinGecko ───
async function fetchCryptoPrices(pairs: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  const coinMap: Record<string, string> = {
    BTC: "bitcoin", ETH: "ethereum", XRP: "ripple", LTC: "litecoin",
    ADA: "cardano", SOL: "solana", DOGE: "dogecoin", DOT: "polkadot",
    AVAX: "avalanche-2", MATIC: "matic-network", LINK: "chainlink",
  };

  const coinIds: string[] = [];
  const pairToCoin: Record<string, string> = {};

  for (const pair of pairs) {
    const base = pair.split("/")[0]?.toUpperCase();
    if (base && coinMap[base]) {
      coinIds.push(coinMap[base]);
      pairToCoin[coinMap[base]] = pair;
    }
  }
  if (coinIds.length === 0) return prices;

  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(",")}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(8000), headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" } }
    );
    if (r.ok) {
      const d = await r.json();
      for (const [coinId, pair] of Object.entries(pairToCoin)) {
        if (d[coinId]?.usd) {
          prices[pair] = d[coinId].usd;
          console.log(`Crypto ${pair}: ${d[coinId].usd}`);
        }
      }
    } else await r.text();
  } catch (e) { console.log("CoinGecko fail:", String(e)); }

  return prices;
}

// ─── OIL via Yahoo Finance ───
async function fetchOilPrice(): Promise<{ crude: number | null; brent: number | null }> {
  let crude: number | null = null;
  let brent: number | null = null;

  for (const [symbol, label] of [["CL=F", "crude"], ["BZ=F", "brent"]] as const) {
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`,
        { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (r.ok) {
        const d = await r.json();
        const price = d?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price) {
          console.log(`Oil ${label}: ${price}`);
          if (label === "crude") crude = price; else brent = price;
        }
      } else await r.text();
    } catch (e) { console.log(`Yahoo ${label} fail:`, String(e)); }
  }
  return { crude, brent };
}

// ─── INDICES via Yahoo Finance ───
async function fetchIndexPrices(pairs: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  const indexMap: Record<string, string> = {
    US30: "YM=F", NASDAQ: "NQ=F", "S&P500": "ES=F",
    DAX: "GC=F", FTSE100: "^FTSE", NIKKEI: "^N225", "NATURAL GAS": "NG=F",
  };

  for (const pair of pairs) {
    const upper = pair.toUpperCase();
    let yahooSymbol: string | null = null;
    for (const [key, sym] of Object.entries(indexMap)) {
      if (upper.includes(key)) { yahooSymbol = sym; break; }
    }
    if (!yahooSymbol) continue;

    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`,
        { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (r.ok) {
        const d = await r.json();
        const price = d?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price) {
          prices[pair] = price;
          console.log(`Index ${pair}: ${price}`);
        }
      } else await r.text();
    } catch (e) { console.log(`Yahoo ${pair} fail:`, String(e)); }
  }
  return prices;
}

// ─── FOREX via Frankfurter ───
async function fetchForexPrice(base: string, quote: string): Promise<number | null> {
  try {
    const r = await fetch(
      `https://api.frankfurter.app/latest?from=${base}&to=${quote}`,
      { signal: AbortSignal.timeout(5000), headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (r.ok) {
      const d = await r.json();
      if (d.rates?.[quote]) return d.rates[quote];
    } else await r.text();
  } catch (e) { console.log(`Forex ${base}/${quote} fail:`, String(e)); }
  return null;
}

// ─── MAIN PRICE FETCHER ───
async function fetchAllPrices(pairs: string[]): Promise<Record<string, string>> {
  const prices: Record<string, string> = {};
  const cryptoPairs: string[] = [];
  const forexPairs: string[] = [];
  const goldPairs: string[] = [];
  const silverPairs: string[] = [];
  const oilCrudePairs: string[] = [];
  const oilBrentPairs: string[] = [];
  const indexPairs: string[] = [];
  const syntheticKeywords = ["BOOM", "CRASH", "VOL", "V75", "R_"];

  for (const pair of pairs) {
    const upper = pair.toUpperCase();
    if (syntheticKeywords.some(k => upper.includes(k))) continue;
    
    if (upper.includes("XAU") || upper.includes("GOLD")) goldPairs.push(pair);
    else if (upper.includes("XAG") || upper.includes("SILVER")) silverPairs.push(pair);
    else if (upper.includes("OIL") && upper.includes("CRUDE")) oilCrudePairs.push(pair);
    else if (upper.includes("OIL") && upper.includes("BRENT")) oilBrentPairs.push(pair);
    else if (upper.includes("NATURAL GAS")) indexPairs.push(pair);
    else if (["US30", "NASDAQ", "S&P500", "DAX", "FTSE", "NIKKEI"].some(idx => upper.includes(idx))) indexPairs.push(pair);
    else if (["BTC", "ETH", "XRP", "LTC", "ADA", "SOL", "DOGE", "DOT", "AVAX", "MATIC", "LINK"].some(c => upper.startsWith(c))) cryptoPairs.push(pair);
    else forexPairs.push(pair);
  }

  const needOil = oilCrudePairs.length > 0 || oilBrentPairs.length > 0;

  const [goldPrice, silverPrice, cryptoPrices, oilPrices, indexResults] = await Promise.all([
    goldPairs.length > 0 ? fetchGoldPrice() : Promise.resolve(null),
    silverPairs.length > 0 ? fetchSilverPrice() : Promise.resolve(null),
    cryptoPairs.length > 0 ? fetchCryptoPrices(cryptoPairs) : Promise.resolve({}),
    needOil ? fetchOilPrice() : Promise.resolve({ crude: null, brent: null }),
    indexPairs.length > 0 ? fetchIndexPrices(indexPairs) : Promise.resolve({}),
  ]);

  if (goldPrice) goldPairs.forEach(p => { prices[p] = goldPrice.toFixed(2); });
  if (silverPrice) silverPairs.forEach(p => { prices[p] = silverPrice.toFixed(4); });
  
  for (const [pair, price] of Object.entries(cryptoPrices)) {
    prices[pair] = price < 1 ? price.toFixed(6) : price < 100 ? price.toFixed(4) : price.toFixed(2);
  }
  
  if (oilPrices.crude) oilCrudePairs.forEach(p => { prices[p] = oilPrices.crude!.toFixed(2); });
  if (oilPrices.brent) oilBrentPairs.forEach(p => { prices[p] = oilPrices.brent!.toFixed(2); });
  
  for (const [pair, price] of Object.entries(indexResults)) {
    prices[pair] = price.toFixed(2);
  }

  // Fetch forex pairs sequentially (rate limited API)
  for (const pair of forexPairs) {
    const cleanPair = pair.replace(/[^A-Za-z]/g, "").toUpperCase();
    if (cleanPair.length >= 6) {
      const base = cleanPair.substring(0, 3);
      const quote = cleanPair.substring(3, 6);
      const price = await fetchForexPrice(base, quote);
      if (price) {
        prices[pair] = price.toFixed(5);
        console.log(`Forex ${pair}: ${price.toFixed(5)}`);
      }
    }
  }

  return prices;
}

// ─── HELPER: Parse TP/SL price values ───
function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  // Skip non-numeric values like "OPEN", "BE", "SL OPEN"
  if (/[a-zA-Z]/.test(priceStr.replace(/[-–.\s]/g, ''))) return 0;
  const cleaned = priceStr.replace(/[^\d.\-–]/g, "");
  const parts = cleaned.split(/[-–]/);
  if (parts.length >= 2) {
    return (parseFloat(parts[0]) + parseFloat(parts[1])) / 2;
  }
  return parseFloat(cleaned) || 0;
}

// ─── SERVE ───
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const pairsParam = url.searchParams.get("pairs");

    // ── CLIENT-SIDE PRICE-ONLY REQUEST (GET or POST with pairs) ──
    let clientPairs: string[] | null = null;
    if (pairsParam) {
      clientPairs = pairsParam.split(",").map(p => p.trim()).filter(Boolean);
    } else if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.pairs && Array.isArray(body.pairs)) {
          clientPairs = body.pairs.filter(Boolean);
        }
      } catch { /* not JSON body, proceed to full update */ }
    }

    if (clientPairs && clientPairs.length > 0) {
      const prices = await fetchAllPrices(clientPairs);
      return new Response(
        JSON.stringify({ success: true, prices }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── FULL UPDATE MODE: fetch active signals, update prices + TP/SL ──
    const { data: signals, error } = await supabase
      .from("signals")
      .select("id, pair, type, entry, tp1, tp2, tp3, tp4, sl, tp1_hit, tp2_hit, tp3_hit, tp4_hit, sl_hit, status, signal_status, entry_mode, limit_entry_price, is_activated")
      .eq("published", true)
      .not("signal_status", "ilike", "close");

    if (error) { console.error("Signals fetch error:", error); throw error; }
    console.log(`Active signals: ${signals?.length || 0}`);

    if (!signals || signals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active signals", prices: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uniquePairs = [...new Set(signals.map(s => s.pair))];
    console.log("Pairs:", uniquePairs);

    const prices = await fetchAllPrices(uniquePairs);
    console.log("Prices:", JSON.stringify(prices));

    let updatedCount = 0;
    let activatedCount = 0;

    for (const signal of signals) {
      const currentPrice = prices[signal.pair];
      if (!currentPrice) continue;

      const priceNum = parseFloat(currentPrice);
      const updates: Record<string, any> = { current_price: currentPrice };
      const isBuy = signal.type?.toLowerCase() === "buy";
      const lifecycle = String(signal.signal_status || signal.status || "").toLowerCase();

      if (lifecycle === "close") {
        await supabase.from("signals").update(updates).eq("id", signal.id);
        updatedCount++;
        continue;
      }

      // ── LIMIT ORDER ACTIVATION ──
      const isLimitOrder = signal.entry_mode === "limit";
      const isPending = lifecycle === "pending";
      const limitPrice = typeof signal.limit_entry_price === "number" ? signal.limit_entry_price : 0;

      if (isLimitOrder && isPending && limitPrice > 0) {
        const shouldActivate = isBuy ? priceNum <= limitPrice : priceNum >= limitPrice;
        if (shouldActivate) {
          updates.signal_status = "open";
          updates.status = "open";
          updates.is_activated = true;
          updates.activated_at = new Date().toISOString();
          activatedCount++;
          console.log(`Limit activated: ${signal.id} @ ${priceNum}`);
        }
      }

      const isOpen = lifecycle === "open" || updates.signal_status === "open";
      if (!isOpen) {
        await supabase.from("signals").update(updates).eq("id", signal.id);
        updatedCount++;
        continue;
      }

      const entryPrice = parsePrice(signal.entry || "");

      // ── TP1: Auto move SL to entry (breakeven) ──
      if (!signal.tp1_hit && signal.tp1) {
        const tp1Price = parsePrice(signal.tp1);
        if (tp1Price > 0 && (isBuy ? priceNum >= tp1Price : priceNum <= tp1Price)) {
          updates.tp1_hit = true;
          updates.profit_note = "TP 1 Hit ✅ SL moved to B.E";
          if (entryPrice > 0) updates.sl = String(entryPrice);
          console.log(`TP1 hit: ${signal.id}`);
        }
      }

      // ── TP2 ──
      if (!signal.tp2_hit && signal.tp2) {
        const tp2Price = parsePrice(signal.tp2);
        if (tp2Price > 0 && (isBuy ? priceNum >= tp2Price : priceNum <= tp2Price)) {
          updates.tp2_hit = true;
          updates.profit_note = "TP 2 Cleared! Secure More Profits 💰";
          console.log(`TP2 hit: ${signal.id}`);
        }
      }

      // ── TP3: AUTO CLOSE ──
      if (!signal.tp3_hit && signal.tp3) {
        const tp3Price = parsePrice(signal.tp3);
        if (tp3Price > 0 && (isBuy ? priceNum >= tp3Price : priceNum <= tp3Price)) {
          updates.tp3_hit = true;
          updates.signal_status = "close";
          updates.status = "close";
          updates.profit_note = "TP 3 Final Target Hit! 🎊 Maximum Profit Secured ✅";
          console.log(`TP3 hit + close: ${signal.id}`);
        }
      }

      // ── TP4 ──
      if (!signal.tp4_hit && signal.tp4) {
        const tp4Price = parsePrice(signal.tp4);
        if (tp4Price > 0 && (isBuy ? priceNum >= tp4Price : priceNum <= tp4Price)) {
          updates.tp4_hit = true;
          console.log(`TP4 hit: ${signal.id}`);
        }
      }

      // ── BREAK EVEN CHECK ──
      const isTP1Hit = signal.tp1_hit || updates.tp1_hit;
      if (isTP1Hit && !signal.sl_hit && entryPrice > 0) {
        const tolerance = entryPrice * 0.001;
        if (Math.abs(priceNum - entryPrice) <= tolerance) {
          updates.signal_status = "close";
          updates.status = "close";
          updates.profit_note = "Signal Closed at Breakeven after TP1 ✅";
          updates.sl_hit = false;
          console.log(`B.E close: ${signal.id}`);
        }
      }

      // ── SL: ONLY if TP1 NOT hit ──
      if (!signal.sl_hit && signal.sl && !isTP1Hit) {
        const slPrice = parsePrice(signal.sl);
        if (slPrice > 0 && (isBuy ? priceNum <= slPrice : priceNum >= slPrice)) {
          updates.sl_hit = true;
          updates.signal_status = "close";
          updates.status = "close";
          updates.profit_note = "SL Hit ❌ - Staying patient for a better entry.";
          console.log(`SL hit: ${signal.id}`);
        }
      }

      await supabase.from("signals").update(updates).eq("id", signal.id);
      updatedCount++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        pricesUpdated: updatedCount,
        limitOrdersActivated: activatedCount,
        pairs: Object.keys(prices),
        prices,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-live-prices error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
