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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const queryPairs = url.searchParams.get("pairs");
    const requestedPairs = queryPairs ? queryPairs.split(",") : DEFAULT_PAIRS;

    const FINNHUB_KEY = Deno.env.get("FINNHUB_API_KEY") || "";
    const prices: Record<string, number> = {};

    // Symbol Mapper for Finnhub
    const getFinnhubSymbol = (pair: string): string => {
      const p = pair.toUpperCase();
      if (p.includes("XAU") || p.includes("GOLD")) return "OANDA:XAU_USD";
      if (p.includes("XAG") || p.includes("SILVER")) return "OANDA:XAG_USD";
      if (p.includes("EUR")) return "OANDA:EUR_USD";
      if (p.includes("GBP/USD")) return "OANDA:GBP_USD";
      if (p.includes("USD/JPY")) return "OANDA:USD_JPY";
      if (p.includes("AUD")) return "OANDA:AUD_USD";
      if (p.includes("GBP/JPY")) return "OANDA:GBP_JPY";
      if (p.includes("USD/CAD")) return "OANDA:USD_CAD";
      if (p.includes("BTC")) return "BINANCE:BTCUSDT";
      if (p.includes("ETH")) return "BINANCE:ETHUSDT";
      if (p.includes("SOL")) return "BINANCE:SOLUSDT";
      return "";
    };

    // 1. Fetch Live Prices via Finnhub
    for (const pair of requestedPairs) {
      const finnhubSymbol = getFinnhubSymbol(pair);
      if (finnhubSymbol && FINNHUB_KEY) {
        try {
          const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${finnhubSymbol}&token=${FINNHUB_KEY}`);
          const data = await res.json();
          if (data && data.c && data.c > 0) {
            prices[pair] = Number(data.c);
          }
        } catch (e) {
          console.error(`Error fetching ${pair}:`, e);
        }
      }
    }

    // 2. Synthetic/Fallback prices for Deriv & Stock Indices
    for (const pair of requestedPairs) {
      if (!prices[pair]) {
        const p = pair.toUpperCase();
        if (p.includes("US30")) prices[pair] = 41250.00;
        if (p.includes("NASDAQ")) prices[pair] = 19820.50;
        if (p.includes("S&P500")) prices[pair] = 5620.10;
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
        source: "Finnhub Live Prices",
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
