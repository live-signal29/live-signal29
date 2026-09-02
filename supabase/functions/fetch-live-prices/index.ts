const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "GET, POST, OPTIONS",
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

type PriceSource =
  | "gold-api"
  | "yahoo"
  | "binance"
  | "frankfurter"
  | "stooq";

interface YahooChartResult {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
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

function roundPrice(
  value: number,
  decimals: number
): number {
  return Number(value.toFixed(decimals));
}

function isGold(pair: string): boolean {
  const p = pair.toUpperCase().replace(/\s+/g, "");

  return (
    p.includes("XAU") ||
    p.includes("GOLD")
  );
}

function isSilver(pair: string): boolean {
  const p = pair.toUpperCase().replace(/\s+/g, "");

  return (
    p.includes("XAG") ||
    p.includes("SILVER")
  );
}

function isCrypto(pair: string): boolean {
  const p = pair.toUpperCase();

  return (
    p.includes("BTC") ||
    p.includes("ETH") ||
    p.includes("SOL")
  );
}

function getBinanceSymbol(pair: string): string {
  const p = pair.toUpperCase();

  if (p.includes("BTC")) return "BTCUSDT";
  if (p.includes("ETH")) return "ETHUSDT";
  if (p.includes("SOL")) return "SOLUSDT";

  return "";
}

/* =========================================================
   FAST FETCH
========================================================= */

async function fetchWithTimeout(
  url: string,
  timeoutMs = 4000
): Promise<Response> {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    return await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "User-Agent": "Forex7StarZ-LivePrice/1.0",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

/* =========================================================
   GOLD / SILVER - GOLD API
========================================================= */

async function fetchMetalApi(
  symbol: "XAU" | "XAG"
): Promise<number | null> {
  try {
    const response = await fetchWithTimeout(
      `https://api.gold-api.com/price/${symbol}`,
      3500
    );

    if (!response.ok) {
      throw new Error(
        `Gold API ${symbol}: HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const price = Number(data?.price);

    if (!validPrice(price)) {
      throw new Error(
        `Invalid ${symbol} price`
      );
    }

    return price;
  } catch (error) {
    console.error(
      `Metal API ${symbol} error:`,
      error
    );

    return null;
  }
}

/* =========================================================
   GOLD / SILVER - YAHOO FALLBACK
========================================================= */

async function fetchYahooPrice(
  symbol: string
): Promise<number | null> {
  try {
    const url =
      "https://query1.finance.yahoo.com/v8/finance/chart/" +
      `${encodeURIComponent(symbol)}` +
      "?range=1d&interval=1m";

    const response = await fetchWithTimeout(
      url,
      4500
    );

    if (!response.ok) {
      throw new Error(
        `Yahoo ${symbol}: HTTP ${response.status}`
      );
    }

    const data: YahooChartResult =
      await response.json();

    const result =
      data?.chart?.result?.[0];

    const marketPrice =
      result?.meta?.regularMarketPrice;

    if (validPrice(marketPrice)) {
      return marketPrice;
    }

    const closes =
      result?.indicators?.quote?.[0]?.close || [];

    for (
      let i = closes.length - 1;
      i >= 0;
      i--
    ) {
      const close = closes[i];

      if (validPrice(close)) {
        return close;
      }
    }

    return null;
  } catch (error) {
    console.error(
      `Yahoo ${symbol} error:`,
      error
    );

    return null;
  }
}

/* =========================================================
   BINANCE
========================================================= */

async function fetchBinancePrice(
  symbol: string
): Promise<number | null> {
  try {
    const response = await fetchWithTimeout(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      3000
    );

    if (!response.ok) {
      throw new Error(
        `Binance ${symbol}: HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const price = Number(data?.price);

    return validPrice(price)
      ? price
      : null;
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
========================================================= */

async function fetchFrankfurter(
  from: string,
  to: string
): Promise<number | null> {
  try {
    const response = await fetchWithTimeout(
      `https://api.frankfurter.app/latest?from=${from}&to=${to}`,
      4000
    );

    if (!response.ok) {
      throw new Error(
        `Frankfurter ${from}/${to}: HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const price =
      Number(data?.rates?.[to]);

    return validPrice(price)
      ? price
      : null;
  } catch (error) {
    console.error(
      `Frankfurter ${from}/${to} error:`,
      error
    );

    return null;
  }
}

/* =========================================================
   STOOQ FALLBACK FOR INDICES
========================================================= */

async function fetchStooqPrice(
  symbol: string
): Promise<number | null> {
  try {
    const response = await fetchWithTimeout(
      `https://stooq.com/q/l/?s=${symbol}&f=sd2t2ohlcv&h&e=json`,
      4000
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    const row = data?.data?.[0];

    const close = Number(row?.close);

    return validPrice(close)
      ? close
      : null;
  } catch (error) {
    console.error(
      `Stooq ${symbol} error:`,
      error
    );

    return null;
  }
}

/* =========================================================
   REQUEST PAIRS
========================================================= */

async function getRequestedPairs(
  req: Request
): Promise<string[]> {
  let bodyPairs: string[] = [];

  try {
    const body = await req.clone().json();

    if (Array.isArray(body?.pairs)) {
      bodyPairs = body.pairs
        .map((p: unknown) => String(p).trim())
        .filter(Boolean);
    }
  } catch {
    // GET request / no JSON
  }

  const url = new URL(req.url);

  const queryPairs =
    url.searchParams.get("pairs");

  const queryList = queryPairs
    ? queryPairs
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  if (bodyPairs.length > 0) {
    return [...new Set(bodyPairs)];
  }

  if (queryList.length > 0) {
    return [...new Set(queryList)];
  }

  return DEFAULT_PAIRS;
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
    const requestedPairs =
      await getRequestedPairs(req);

    const prices: Record<string, number> = {};
    const sources: Record<string, PriceSource> = {};

    /* =====================================================
       GOLD + SILVER
       BOTH RUN AT SAME TIME
    ===================================================== */

    const goldPairs =
      requestedPairs.filter(isGold);

    const silverPairs =
      requestedPairs.filter(isSilver);

    const [
      goldApi,
      silverApi,
      goldYahoo,
      silverYahoo,
    ] = await Promise.all([
      goldPairs.length
        ? fetchMetalApi("XAU")
        : Promise.resolve(null),

      silverPairs.length
        ? fetchMetalApi("XAG")
        : Promise.resolve(null),

      goldPairs.length
        ? fetchYahooPrice("GC=F")
        : Promise.resolve(null),

      silverPairs.length
        ? fetchYahooPrice("SI=F")
        : Promise.resolve(null),
    ]);

    /* =====================================================
       GOLD
    ===================================================== */

    const finalGold =
      validPrice(goldApi)
        ? goldApi
        : validPrice(goldYahoo)
        ? goldYahoo
        : null;

    const goldSource: PriceSource | null =
      validPrice(goldApi)
        ? "gold-api"
        : validPrice(goldYahoo)
        ? "yahoo"
        : null;

    if (validPrice(finalGold)) {
      for (const pair of goldPairs) {
        prices[pair] =
          roundPrice(finalGold, 2);

        sources[pair] =
          goldSource!;
      }
    }

    /* =====================================================
       SILVER
    ===================================================== */

    const finalSilver =
      validPrice(silverApi)
        ? silverApi
        : validPrice(silverYahoo)
        ? silverYahoo
        : null;

    const silverSource: PriceSource | null =
      validPrice(silverApi)
        ? "gold-api"
        : validPrice(silverYahoo)
        ? "yahoo"
        : null;

    if (validPrice(finalSilver)) {
      for (const pair of silverPairs) {
        prices[pair] =
          roundPrice(finalSilver, 2);

        sources[pair] =
          silverSource!;
      }
    }

    /* =====================================================
       CRYPTO
       BTC / ETH / SOL IN PARALLEL
    ===================================================== */

    const cryptoTasks =
      requestedPairs
        .filter(
          (pair) =>
            isCrypto(pair) &&
            !validPrice(prices[pair])
        )
        .map(async (pair) => {
          const symbol =
            getBinanceSymbol(pair);

          if (!symbol) return;

          const price =
            await fetchBinancePrice(symbol);

          if (validPrice(price)) {
            const decimals =
              price >= 1000 ? 2 : 4;

            prices[pair] =
              roundPrice(
                price,
                decimals
              );

            sources[pair] =
              "binance";
          }
        });

    await Promise.all(cryptoTasks);

    /* =====================================================
       FOREX
    ===================================================== */

    const forexMap: Record<
      string,
      [string, string]
    > = {
      "EUR/USD": ["EUR", "USD"],
      "GBP/USD": ["GBP", "USD"],
      "AUD/USD": ["AUD", "USD"],
      "USD/CAD": ["USD", "CAD"],
      "USD/JPY": ["USD", "JPY"],
    };

    const forexTasks =
      requestedPairs
        .filter(
          (pair) =>
            !validPrice(prices[pair]) &&
            forexMap[pair]
        )
        .map(async (pair) => {
          const [from, to] =
            forexMap[pair];

          const price =
            await fetchFrankfurter(
              from,
              to
            );

          if (validPrice(price)) {
            const decimals =
              to === "JPY"
                ? 3
                : 5;

            prices[pair] =
              roundPrice(
                price,
                decimals
              );

            sources[pair] =
              "frankfurter";
          }
        });

    await Promise.all(forexTasks);

    /* =====================================================
       GBP/JPY
       Frankfurter does not always provide
       direct GBP/JPY in the desired response,
       so calculate GBP/USD × USD/JPY.
    ===================================================== */

    if (
      requestedPairs.includes(
        "GBP/JPY"
      ) &&
      !validPrice(
        prices["GBP/JPY"]
      )
    ) {
      const [
        gbpUsd,
        usdJpy,
      ] = await Promise.all([
        fetchFrankfurter(
          "GBP",
          "USD"
        ),
        fetchFrankfurter(
          "USD",
          "JPY"
        ),
      ]);

      if (
        validPrice(gbpUsd) &&
        validPrice(usdJpy)
      ) {
        prices["GBP/JPY"] =
          roundPrice(
            gbpUsd * usdJpy,
            3
          );

        sources["GBP/JPY"] =
          "frankfurter";
      }
    }

    /* =====================================================
       INDICES
    ===================================================== */

    const indexMap: Record<
      string,
      string
    > = {
      "US30": "^DJI",
      "NASDAQ": "^IXIC",
      "S&P500": "^GSPC",
    };

    const indexTasks =
      requestedPairs
        .filter(
          (pair) =>
            indexMap[pair] &&
            !validPrice(prices[pair])
        )
        .map(async (pair) => {
          const price =
            await fetchYahooPrice(
              indexMap[pair]
            );

          if (validPrice(price)) {
            prices[pair] =
              roundPrice(
                price,
                2
              );

            sources[pair] =
              "yahoo";
          }
        });

    await Promise.all(indexTasks);

    /* =====================================================
       DERIV
       
       IMPORTANT:
       No fake hardcoded market price.
       If no real provider exists, pair stays
       unavailable instead of generating a fake price.
    ===================================================== */

    const derivPairs =
      requestedPairs.filter(
        (pair) =>
          pair === "BOOM 1000" ||
          pair === "CRASH 1000" ||
          pair === "VOL 75" ||
          pair === "BOOM 500" ||
          pair === "VOL 100"
      );

    for (const pair of derivPairs) {
      console.log(
        `No external live provider configured for ${pair}`
      );
    }

    /* =====================================================
       FINAL RESPONSE
    ===================================================== */

    const unavailable =
      requestedPairs.filter(
        (pair) =>
          !validPrice(prices[pair])
      );

    return new Response(
      JSON.stringify({
        success: true,

        pricesUpdated:
          Object.keys(prices).length,

        requested:
          requestedPairs.length,

        unavailable,

        prices,

        sources,

        liveMetals: {
          gold: {
            price:
              finalGold,

            source:
              goldSource,
          },

          silver: {
            price:
              finalSilver,

            source:
              silverSource,
          },
        },

        timestamp:
          new Date().toISOString(),

        serverTime:
          Date.now(),
      }),
      {
        status: 200,

        headers: {
          ...corsHeaders,

          "Content-Type":
            "application/json",

          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",

          Pragma: "no-cache",

          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "fetch-live-prices error:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        prices: {},
        sources: {},
        error:
          error instanceof Error
            ? error.message
            : String(error),
      }),
      {
        status: 500,

        headers: {
          ...corsHeaders,

          "Content-Type":
            "application/json",

          "Cache-Control":
            "no-store",
        },
      }
    );
  }
});
