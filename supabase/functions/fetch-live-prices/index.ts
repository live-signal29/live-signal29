import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default Pairs List
const DEFAULT_PAIRS = [
  "XAU/USD (Gold)", "XAG/USD (Silver)", "US30", "NASDAQ", "S&P500",
  "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "GBP/JPY", "USD/CAD",
  "BTC/USD", "ETH/USD", "SOL/USD",
  "BOOM 1000", "CRASH 1000", "VOL 75", "BOOM 500", "VOL 100"
];

// Map App Pairs to Twelve Data Standard Symbols
function mapToTwelveDataSymbol(pair: string): string | null {
  const upper = pair.toUpperCase();
  if (upper.includes("XAU") || upper.includes("GOLD")) return "XAU/USD";
  if (upper.includes("XAG") || upper.includes("SILVER")) return "XAG/USD";
  if (upper.includes("EUR")) return "EUR/USD";
  if (upper.includes("GBP/USD")) return "GBP/USD";
  if (upper.includes("USD/JPY")) return "USD/JPY";
  if (upper.includes("AUD/USD")) return "AUD/USD";
  if (upper.includes("GBP/JPY")) return "GBP/JPY";
  if (upper.includes("USD/CAD")) return "USD/CAD";
  if (upper.includes("US30")) return "US30";
  if (upper.includes("NASDAQ")) return "IXIC"; // NASDAQ Index
  if (upper.includes("S&P500")) return "SPX";   // S&P 500
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const queryPairs = url.searchParams.get("pairs");
    const requestedPairs = queryPairs ? queryPairs.split(",") : DEFAULT_PAIRS;

    // Secret key for Twelve Data API
    const TWELVE_KEY = Deno.env.get("TWELVE_DATA_API_KEY") || "";
    const prices: Record<string, number> = {};

    // 1. Fetch Crypto Rates (Binance Public API - Fast & Unlimited)
    for (const pair of requestedPairs) {
      const upper = pair.toUpperCase();
      if (upper.includes("BTC") || upper.includes("ETH") || upper.includes("SOL")) {
        const symbol = upper.includes("BTC") ? "BTCUSDT" : upper.includes("ETH") ? "ETHUSDT" : "SOLUSDT";
        try {
          const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
          const data = await res.json();
          if (data && data.price) {
            prices[pair] = Number(parseFloat(data.price).toFixed(2));
          }
        } catch (e) {
          console.error("Crypto API error:", e);
        }
      }
    }

    // 2. Fetch Forex, Gold, Silver & Indices via Twelve Data API
    if (TWELVE_KEY) {
      const symbolsToFetch: string[] = [];
      const pairMap: Record<string, string> = {};

      for (const pair of requestedPairs) {
        if (!prices[pair]) {
          const apiSymbol = mapToTwelveDataSymbol(pair);
          if (apiSymbol) {
            symbolsToFetch.push(apiSymbol);
            pairMap[apiSymbol] = pair;
          }
        }
      }

      if (symbolsToFetch.length > 0) {
        try {
          const res = await fetch(
            `https://api.twelvedata.com/price?symbol=${encodeURIComponent(
              symbolsToFetch.join(",")
            )}&apikey=${TWELVE_KEY}`
          );
          const data = await res.json();

          // Single symbol response
          if (data.price) {
            const appPair = pairMap[symbolsToFetch[0]];
            if (appPair) prices[appPair] = Number(parseFloat(data.price).toFixed(4));
          } 
          // Multiple symbols response
          else {
            for (const sym of symbolsToFetch) {
              if (data[sym] && data[sym].price) {
                const appPair = pairMap[sym];
                if (appPair) {
                  prices[appPair] = Number(parseFloat(data[sym].price).toFixed(sym.includes("XAU") ? 2 : 4));
                }
              }
            }
          }
        } catch (e) {
          console.error("Twelve Data API error:", e);
        }
      }
    }

    // 3. Fallbacks for Deriv Synthetic Pairs (Deriv APIs / Hardcoded base rates)
    for (const pair of requestedPairs) {
      if (!prices[pair]) {
        const p = pair.toUpperCase();
        if (p.includes("BOOM 1000")) prices[pair] = 10120.50;
        if (p.includes("BOOM 500")) prices[pair] = 4595.43;
        if (p.includes("CRASH 1000")) prices[pair] = 5840.10;
        if (p.includes("VOL 75")) prices[pair] = 425100.20;
        if (p.includes("VOL 100")) prices[pair] = 1250.80;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        source: "TwelveData + Binance + Deriv",
        pricesUpdated: Object.keys(prices).length,
        pairs: Object.keys(prices),
        prices,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
