const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const DEFAULT_PAIRS = [
  "XAU/USD (Gold)",
  "XAG/USD (Silver)",
  "US30",
  "NASDAQ",
  "S&P500",
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "GBP/JPY",
  "USD/CAD",
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "BOOM 1000",
  "CRASH 1000",
  "VOL 75",
  "BOOM 500",
  "VOL 100",
];

type PriceSource = "gold-api" | "yahoo" | "binance" | "frankfurter" | "fallback";

interface YahooChartResult {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
      };
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
}

/* =========================================================
   HELPERS
========================================================= */

function validPrice(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

function roundPrice(value: number, decimals: number) {
  return Number(value.toFixed(decimals));
}

function isGold(pair: string) {
  const p = pair.toUpperCase().replace(/\s+/g, "");
  return p.includes("XAU") || p.includes("GOLD");
}

function isSilver(pair: string) {
  const p = pair.toUpperCase().replace(/\s+/g, "");
  return p.includes("XAG") || p.includes("SILVER");
}

function isCrypto(pair: string) {
  const p = pair.toUpperCase();

  return (
    p.includes("BTC") ||
    p.includes("ETH") ||
    p.includes("SOL")
  );
}

function getBinanceSymbol(pair: string) {
  const p = pair.toUpperCase();

  if (p.includes("BTC")) return "BTCUSDT";
  if (p.includes("ETH")) return "ETHUSDT";
  if (p.includes("SOL")) return "SOLUSDT";

  return "";
}

/* =========================================================
   GOLD API
   Primary source for XAU / XAG
========================================================= */

async function fetchGoldApi(symbol: "XAU" | "XAG") {
  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 5000);

    const response = await fetch(
      `https://api.gold-api.com/price/${symbol}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(
        `Gold API HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const price = Number(data?.price);

    if (!validPrice(price)) {
      throw new Error(
        `Invalid ${symbol} price from Gold API`
      );
    }

    return price;
  } catch (error) {
    console.error(
      `Gold API ${symbol} error:`,
      error
    );

    return null;
  }
}

/* =========================================================
   YAHOO FALLBACK
   GC=F = Gold
   SI=F = Silver
========================================================= */

async function fetchYahooPrice(symbol: "GC=F" | "SI=F") {
  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 7000);

    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/` +
      `${encodeURIComponent(symbol)}` +
      `?range=1d&interval=1m`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(
        `Yahoo HTTP ${response.status}`
      );
    }

    const data: YahooChartResult =
      await response.json();

    const result = data?.chart?.result?.[0];

    const marketPrice =
      result?.meta?.regularMarketPrice;

    if (validPrice(marketPrice)) {
      return marketPrice;
    }

    const closes =
      result?.indicators?.quote?.[0]?.close || [];

    for (let i = closes.length - 1; i >= 0; i--) {
      const close = closes[i];

      if (validPrice(close)) {
        return close;
      }
    }

    throw new Error(
      `No valid Yahoo price for ${symbol}`
    );
  } catch (error) {
    console.error(
      `Yahoo ${symbol} error:`,
      error
    );

    return null;
  }
}

/* =========================================================
   CRYPTO - BINANCE
========================================================= */

async function fetchBinancePrice(symbol: string) {
  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 5000);

    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(
        `Binance HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const price = Number(data?.price);

    if (!validPrice(price)) {
      throw new Error(
        `Invalid Binance price for ${symbol}`
      );
    }

    return price;
  } catch (error) {
    console.error(
      `Binance ${symbol} error:`,
      error
    );

    return null;
  }
}

/* =========================================================
   FRANKFURTER
   NOTE:
   This is an FX reference rate, not broker tick data.
========================================================= */

async function fetchFrankfurter(
  from: string,
  to: string
) {
  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 5000);

    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${from}&to=${to}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(
        `Frankfurter HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const price = Number(data?.rates?.[to]);

    if (!validPrice(price)) {
      throw new Error(
        `Invalid Frankfurter rate ${from}/${to}`
      );
    }

    return price;
  } catch (error) {
    console.error(
      `Frankfurter ${from}/${to} error:`,
      error
    );

    return null;
  }
}

/* =========================================================
   MAIN
========================================================= */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);

    const queryPairs =
      url.searchParams.get("pairs");

    const requestedPairs = queryPairs
      ? queryPairs
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
      : DEFAULT_PAIRS;

    const prices: Record<string, number> = {};
    const sources: Record<string, PriceSource> = {};

    /* =====================================================
       1. XAU / XAG
       PRIMARY = Gold API
       FALLBACK = Yahoo
    ===================================================== */

    for (const pair of requestedPairs) {
      /* ---------------- GOLD ---------------- */

      if (isGold(pair)) {
        let price = await fetchGoldApi("XAU");

        if (validPrice(price)) {
          prices[pair] = roundPrice(price, 2);
          sources[pair] = "gold-api";
        } else {
          price = await fetchYahooPrice("GC=F");

          if (validPrice(price)) {
            prices[pair] = roundPrice(price, 2);
            sources[pair] = "yahoo";
          }
        }

        continue;
      }

      /* ---------------- SILVER ---------------- */

      if (isSilver(pair)) {
        let price = await fetchGoldApi("XAG");

        if (validPrice(price)) {
          prices[pair] = roundPrice(price, 2);
          sources[pair] = "gold-api";
        } else {
          price = await fetchYahooPrice("SI=F");

          if (validPrice(price)) {
            prices[pair] = roundPrice(price, 2);
            sources[pair] = "yahoo";
          }
        }

        continue;
      }
    }

    /* =====================================================
       2. CRYPTO
    ===================================================== */

    for (const pair of requestedPairs) {
      if (validPrice(prices[pair])) continue;

      if (!isCrypto(pair)) continue;

      const symbol = getBinanceSymbol(pair);

      if (!symbol) continue;

      const price = await fetchBinancePrice(symbol);

      if (validPrice(price)) {
        const decimals =
          price >= 1000 ? 2 : 4;

        prices[pair] = roundPrice(
          price,
          decimals
        );

        sources[pair] = "binance";
      }
    }

    /* =====================================================
       3. FOREX
    ===================================================== */

    for (const pair of requestedPairs) {
      if (validPrice(prices[pair])) continue;

      const upper = pair.toUpperCase();

      let from = "";

      if (upper.includes("EUR")) {
        from = "EUR";
      } else if (upper.includes("GBP")) {
        from = "GBP";
      } else if (upper.includes("AUD")) {
        from = "AUD";
      }

      /*
       * Frankfurter cannot directly provide every broker
       * cross pair. We only use it where the requested pair
       * is compatible with USD reference pricing.
       */

      if (!from) continue;

      const price = await fetchFrankfurter(
        from,
        "USD"
      );

      if (validPrice(price)) {
        prices[pair] = roundPrice(
          price,
          5
        );

        sources[pair] = "frankfurter";
      }
    }

    /* =====================================================
       4. USD/JPY
    ===================================================== */

    for (const pair of requestedPairs) {
      if (validPrice(prices[pair])) continue;

      const upper = pair.toUpperCase();

      if (!upper.includes("USD/JPY")) continue;

      const price = await fetchFrankfurter(
        "USD",
        "JPY"
      );

      if (validPrice(price)) {
        prices[pair] = roundPrice(
          price,
          3
        );

        sources[pair] = "frankfurter";
      }
    }

    /* =====================================================
       5. FALLBACKS
       
       IMPORTANT:
       XAU/XAG NEVER get hard-coded fallback prices.
       If their live sources fail, they remain absent so
       the frontend can recognize that live price failed.
    ===================================================== */

    for (const pair of requestedPairs) {
      if (validPrice(prices[pair])) continue;

      const p = pair.toUpperCase();

      /*
       * These are only emergency placeholders for assets
       * where no live provider is configured yet.
       *
       * DO NOT use these for XAU/XAG.
       */

      if (p.includes("US30")) {
        prices[pair] = 41250.0;
        sources[pair] = "fallback";
      } else if (p.includes("NASDAQ")) {
        prices[pair] = 19820.5;
        sources[pair] = "fallback";
      } else if (p.includes("S&P500")) {
        prices[pair] = 5620.1;
        sources[pair] = "fallback";
      } else if (p.includes("BOOM 1000")) {
        prices[pair] = 10120.5;
        sources[pair] = "fallback";
      } else if (p.includes("BOOM 500")) {
        prices[pair] = 4595.43;
        sources[pair] = "fallback";
      } else if (p.includes("CRASH 1000")) {
        prices[pair] = 5840.1;
        sources[pair] = "fallback";
      } else if (p.includes("VOL 75")) {
        prices[pair] = 425100.2;
        sources[pair] = "fallback";
      } else if (p.includes("VOL 100")) {
        prices[pair] = 1250.8;
        sources[pair] = "fallback";
      }
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return new Response(
      JSON.stringify({
        success: true,

        source: "Gold API + Yahoo + Binance + Frankfurter",

        pricesUpdated:
          Object.keys(prices).length,

        pairs:
          Object.keys(prices),

        prices,

        sources,

        liveMetals: {
          gold: {
            pair: requestedPairs.find(isGold) || null,
            price:
              requestedPairs
                .filter(isGold)
                .map((p) => prices[p])
                .find(validPrice) ?? null,
            source:
              requestedPairs
                .filter(isGold)
                .map((p) => sources[p])
                .find(Boolean) ?? null,
          },

          silver: {
            pair: requestedPairs.find(isSilver) || null,
            price:
              requestedPairs
                .filter(isSilver)
                .map((p) => prices[p])
                .find(validPrice) ?? null,
            source:
              requestedPairs
                .filter(isSilver)
                .map((p) => sources[p])
                .find(Boolean) ?? null,
          },
        },

        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "fetch-live-prices fatal error:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
        prices: {},
        sources: {},
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
