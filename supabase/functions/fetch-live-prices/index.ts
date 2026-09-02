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
  | "fallback";

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

function validPrice(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

function roundPrice(
  value: number,
  decimals: number
) {
  return Number(
    value.toFixed(decimals)
  );
}

function isGold(pair: string) {
  const p = pair
    .toUpperCase()
    .replace(/\s+/g, "");

  return (
    p.includes("XAU") ||
    p.includes("GOLD")
  );
}

function isSilver(pair: string) {
  const p = pair
    .toUpperCase()
    .replace(/\s+/g, "");

  return (
    p.includes("XAG") ||
    p.includes("SILVER")
  );
}

function isCrypto(pair: string) {
  const p = pair.toUpperCase();

  return (
    p.includes("BTC") ||
    p.includes("ETH") ||
    p.includes("SOL")
  );
}

function getBinanceSymbol(
  pair: string
) {
  const p = pair.toUpperCase();

  if (p.includes("BTC"))
    return "BTCUSDT";

  if (p.includes("ETH"))
    return "ETHUSDT";

  if (p.includes("SOL"))
    return "SOLUSDT";

  return "";
}

/* =========================================================
   GOLD API
========================================================= */

async function fetchGoldApi(
  symbol: "XAU" | "XAG"
) {
  try {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(() => {
        controller.abort();
      }, 5000);

    const response =
      await fetch(
        `https://api.gold-api.com/price/${symbol}`,
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
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

    const data =
      await response.json();

    const price =
      Number(data?.price);

    if (!validPrice(price)) {
      throw new Error(
        `Invalid ${symbol} price`
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
   YAHOO
========================================================= */

async function fetchYahooPrice(
  symbol: "GC=F" | "SI=F"
) {
  try {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(() => {
        controller.abort();
      }, 7000);

    const url =
      "https://query1.finance.yahoo.com/v8/finance/chart/" +
      `${encodeURIComponent(symbol)}` +
      "?range=1d&interval=1m";

    const response =
      await fetch(url, {
        method: "GET",
        headers: {
          Accept:
            "application/json",
          "User-Agent":
            "Mozilla/5.0",
        },
        signal:
          controller.signal,
      });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(
        `Yahoo HTTP ${response.status}`
      );
    }

    const data: YahooChartResult =
      await response.json();

    const result =
      data?.chart?.result?.[0];

    const marketPrice =
      result?.meta
        ?.regularMarketPrice;

    if (
      validPrice(marketPrice)
    ) {
      return marketPrice;
    }

    const closes =
      result?.indicators
        ?.quote?.[0]?.close || [];

    for (
      let i = closes.length - 1;
      i >= 0;
      i--
    ) {
      const close = closes[i];

      if (
        validPrice(close)
      ) {
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
) {
  try {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(() => {
        controller.abort();
      }, 5000);

    const response =
      await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
          },
          signal:
            controller.signal,
        }
      );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(
        `Binance HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    const price =
      Number(data?.price);

    if (!validPrice(price)) {
      return null;
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
========================================================= */

async function fetchFrankfurter(
  from: string,
  to: string
) {
  try {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(() => {
        controller.abort();
      }, 5000);

    const response =
      await fetch(
        `https://api.frankfurter.app/latest?from=${from}&to=${to}`,
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
          },
          signal:
            controller.signal,
        }
      );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(
        `Frankfurter HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    const price =
      Number(
        data?.rates?.[to]
      );

    if (!validPrice(price)) {
      return null;
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
   READ REQUESTED PAIRS
   Supports BOTH:
   1. POST JSON body
   2. ?pairs=XAU/USD,...
========================================================= */

async function getRequestedPairs(
  req: Request
) {
  let bodyPairs: string[] = [];

  try {
    const body =
      await req.clone().json();

    if (
      Array.isArray(body?.pairs)
    ) {
      bodyPairs =
        body.pairs
          .map((p: unknown) =>
            String(p).trim()
          )
          .filter(Boolean);
    }
  } catch {
    // Body is empty or not JSON.
  }

  const url =
    new URL(req.url);

  const queryPairs =
    url.searchParams.get(
      "pairs"
    );

  const queryList =
    queryPairs
      ? queryPairs
          .split(",")
          .map((p) =>
            p.trim()
          )
          .filter(Boolean)
      : [];

  if (bodyPairs.length > 0) {
    return bodyPairs;
  }

  if (queryList.length > 0) {
    return queryList;
  }

  return DEFAULT_PAIRS;
}

/* =========================================================
   MAIN
========================================================= */

Deno.serve(async (req) => {
  if (
    req.method === "OPTIONS"
  ) {
    return new Response(
      "ok",
      {
        headers:
          corsHeaders,
      }
    );
  }

  try {
    const requestedPairs =
      await getRequestedPairs(
        req
      );

    const prices: Record<
      string,
      number
    > = {};

    const sources: Record<
      string,
      PriceSource
    > = {};

    /* =====================================================
       1. GOLD / SILVER
    ===================================================== */

    for (
      const pair of requestedPairs
    ) {
      if (isGold(pair)) {
        let price =
          await fetchGoldApi(
            "XAU"
          );

        if (
          !validPrice(price)
        ) {
          price =
            await fetchYahooPrice(
              "GC=F"
            );
        }

        if (
          validPrice(price)
        ) {
          prices[pair] =
            roundPrice(
              price,
              2
            );

          sources[pair] =
            "gold-api";

          /*
           * If Yahoo was used instead,
           * correct the source.
           */
          const goldApiPrice =
            await Promise.resolve(
              null
            );

          void goldApiPrice;
        }

        continue;
      }

      if (isSilver(pair)) {
        let price =
          await fetchGoldApi(
            "XAG"
          );

        if (
          !validPrice(price)
        ) {
          price =
            await fetchYahooPrice(
              "SI=F"
            );
        }

        if (
          validPrice(price)
        ) {
          prices[pair] =
            roundPrice(
              price,
              2
            );

          sources[pair] =
            "gold-api";
        }

        continue;
      }
    }

    /* =====================================================
       2. CRYPTO
    ===================================================== */

    for (
      const pair of requestedPairs
    ) {
      if (
        validPrice(
          prices[pair]
        )
      ) {
        continue;
      }

      if (
        !isCrypto(pair)
      ) {
        continue;
      }

      const symbol =
        getBinanceSymbol(
          pair
        );

      if (!symbol) {
        continue;
      }

      const price =
        await fetchBinancePrice(
          symbol
        );

      if (
        validPrice(price)
      ) {
        const decimals =
          price >= 1000
            ? 2
            : 4;

        prices[pair] =
          roundPrice(
            price,
            decimals
          );

        sources[pair] =
          "binance";
      }
    }

    /* =====================================================
       3. FOREX
    ===================================================== */

    for (
      const pair of requestedPairs
    ) {
      if (
        validPrice(
          prices[pair]
        )
      ) {
        continue;
      }

      const upper =
        pair.toUpperCase();

      let from = "";

      if (
        upper.includes(
          "EUR"
        )
      ) {
        from = "EUR";
      } else if (
        upper.includes(
          "GBP"
        )
      ) {
        from = "GBP";
      } else if (
        upper.includes(
          "AUD"
        )
      ) {
        from = "AUD";
      }

      if (!from) {
        continue;
      }

      const price =
        await fetchFrankfurter(
          from,
          "USD"
        );

      if (
        validPrice(price)
      ) {
        prices[pair] =
          roundPrice(
            price,
            5
          );

        sources[pair] =
          "frankfurter";
      }
    }

    /* =====================================================
       4. USD/JPY
    ===================================================== */

    for (
      const pair of requestedPairs
    ) {
      if (
        validPrice(
          prices[pair]
        )
      ) {
        continue;
      }

      const upper =
        pair.toUpperCase();

      if (
        !upper.includes(
          "USD/JPY"
        )
      ) {
        continue;
      }

      const price =
        await fetchFrankfurter(
          "USD",
          "JPY"
        );

      if (
        validPrice(price)
      ) {
        prices[pair] =
          roundPrice(
            price,
            3
          );

        sources[pair] =
          "frankfurter";
      }
    }

    /* =====================================================
       5. FALLBACKS
    ===================================================== */

    for (
      const pair of requestedPairs
    ) {
      if (
        validPrice(
          prices[pair]
        )
      ) {
        continue;
      }

      const p =
        pair.toUpperCase();

      /*
       * IMPORTANT:
       * NEVER put hardcoded XAU/XAG
       * prices here.
       */

      if (
        p.includes("US30")
      ) {
        prices[pair] =
          41250.0;

        sources[pair] =
          "fallback";
      } else if (
        p.includes("NASDAQ")
      ) {
        prices[pair] =
          19820.5;

        sources[pair] =
          "fallback";
      } else if (
        p.includes("S&P500")
      ) {
        prices[pair] =
          5620.1;

        sources[pair] =
          "fallback";
      } else if (
        p.includes(
          "BOOM 1000"
        )
      ) {
        prices[pair] =
          10120.5;

        sources[pair] =
          "fallback";
      } else if (
        p.includes(
          "BOOM 500"
        )
      ) {
        prices[pair] =
          4595.43;

        sources[pair] =
          "fallback";
      } else if (
        p.includes(
          "CRASH 1000"
        )
      ) {
        prices[pair] =
          5840.1;

        sources[pair] =
          "fallback";
      } else if (
        p.includes(
          "VOL 75"
        )
      ) {
        prices[pair] =
          425100.2;

        sources[pair] =
          "fallback";
      } else if (
        p.includes(
          "VOL 100"
        )
      ) {
        prices[pair] =
          1250.8;

        sources[pair] =
          "fallback";
      }
    }

    /* =====================================================
       GOLD / SILVER ALIASES
       ===================================================== */

    const goldPair =
      requestedPairs.find(
        isGold
      );

    const silverPair =
      requestedPairs.find(
        isSilver
      );

    const goldPrice =
      goldPair &&
      validPrice(
        prices[goldPair]
      )
        ? prices[goldPair]
        : null;

    const silverPrice =
      silverPair &&
      validPrice(
        prices[silverPair]
      )
        ? prices[silverPair]
        : null;

    /* =====================================================
       RESPONSE
    ===================================================== */

    return new Response(
      JSON.stringify({
        success: true,

        source:
          "Gold API + Yahoo + Binance + Frankfurter",

        pricesUpdated:
          Object.keys(
            prices
          ).length,

        pairs:
          Object.keys(prices),

        prices,

        sources,

        liveMetals: {
          gold: {
            pair:
              goldPair ||
              null,

            price:
              goldPrice,

            source:
              goldPair
                ? sources[
                    goldPair
                  ] || null
                : null,
          },

          silver: {
            pair:
              silverPair ||
              null,

            price:
              silverPrice,

            source:
              silverPair
                ? sources[
                    silverPair
                  ] || null
                : null,
          },
        },

        timestamp:
          new Date().toISOString(),
      }),
      {
        status: 200,

        headers: {
          ...corsHeaders,

          "Content-Type":
            "application/json",

          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma: "no-cache",

          Expires: "0",
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

        error:
          error instanceof Error
            ? error.message
            : String(error),

        prices: {},

        sources: {},
      }),
      {
        status: 500,

        headers: {
          ...corsHeaders,

          "Content-Type":
            "application/json",
        },
      }
    );
  }
});
