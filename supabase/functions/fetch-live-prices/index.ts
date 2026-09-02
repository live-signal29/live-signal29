import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const prices: Record<string, number> = {};

    // 1a. Real spot Gold (XAU) & Silver (XAG) — matches MT5/broker prices.
    // IMPORTANT: We do NOT use Binance PAXGUSDT for gold anymore. PAXG is a
    // tokenized crypto asset that trades at its own premium/discount vs real
    // spot gold, which was causing a ~$100-150 mismatch vs MT5.
    for (const pair of requestedPairs) {
      const upper = pair.toUpperCase();

      if (upper.includes("XAU") || upper.includes("GOLD")) {
        try {
          const res = await fetch("https://api.gold-api.com/price/XAU");
          const data = await res.json();
          if (data && data.price) {
            prices[pair] = Number(parseFloat(data.price).toFixed(2));
          }
        } catch (e) {
          console.error(`Gold spot API error on ${pair}:`, e);
        }
      }

      if (upper.includes("XAG") || upper.includes("SILVER")) {
        try {
          const res = await fetch("https://api.gold-api.com/price/XAG");
          const data = await res.json();
          if (data && data.price) {
            prices[pair] = Number(parseFloat(data.price).toFixed(2));
          }
        } catch (e) {
          console.error(`Silver spot API error on ${pair}:`, e);
        }
      }
    }

    // 1b. Crypto (BTC, ETH, SOL) via Binance (Unlimited & Free) — these are
    // genuinely crypto pairs so the Binance price is correct here.
    for (const pair of requestedPairs) {
      if (prices[pair]) continue;

      const upper = pair.toUpperCase();
      let binanceSymbol = "";

      if (upper.includes("BTC")) binanceSymbol = "BTCUSDT";
      else if (upper.includes("ETH")) binanceSymbol = "ETHUSDT";
      else if (upper.includes("SOL")) binanceSymbol = "SOLUSDT";

      if (binanceSymbol) {
        try {
          const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`);
          const data = await res.json();
          if (data && data.price) {
            prices[pair] = Number(parseFloat(data.price).toFixed(2));
          }
        } catch (e) {
          console.error(`Binance API error on ${pair}:`, e);
        }
      }
    }

    // 2. Fetch Forex (EUR/USD, GBP/USD, etc.) via Frankfurter Free Public API (No Rate Limits)
    for (const pair of requestedPairs) {
      if (!prices[pair]) {
        const upper = pair.toUpperCase();
        if (upper.includes("EUR") || upper.includes("GBP") || upper.includes("JPY") || upper.includes("AUD")) {
          let from = "EUR";
          if (upper.includes("GBP")) from = "GBP";
          if (upper.includes("AUD")) from = "AUD";
          
          try {
            const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=USD`);
            const data = await res.json();
            if (data && data.rates && data.rates.USD) {
              prices[pair] = Number(parseFloat(data.rates.USD).toFixed(4));
            }
          } catch (e) {
            console.error(`Forex API error on ${pair}:`, e);
          }
        }
      }
    }

    // 3. Stock Indices & Deriv Synthetic Pairs Fallbacks
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
        if (p.includes("XAG")) prices[pair] = 28.50;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        source: "Binance Public + Frankfurter API",
        pricesUpdated: Object.keys(prices).length,
        pairs: Object.keys(prices),
        prices,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
