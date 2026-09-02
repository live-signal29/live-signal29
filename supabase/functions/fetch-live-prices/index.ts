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
  const p = pair
    .toUpperCase()
    .replace(/\s+/g, "");

  return (
    p.includes("XAU") ||
    p.includes("GOLD")
  );
}

function isSilver(pair: string): boolean {
  const p = pair
    .toUpperCase()
    .replace(/\s+/g, "");

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

function getBinanceSymbol(
  pair: string
): string {
  const p = pair.toUpperCase();

  if (p.includes("BTC")) {
    return "BTCUSDT";
  }

  if (p.includes("ETH")) {
    return "ETHUSDT";
  }

  if (p.includes("SOL")) {
    return "SOLUSDT";
  }

  return "";
}

/* =========================================================
   FETCH WITH TIMEOUT
========================================================= */

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  headers: Record<string, string> = {}
): Promise<Response> {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    return await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

/* =========================================================
   GOLD API
========================================================= */

async function fetchGoldApi(
  symbol: "XAU" | "XAG"
): Promise<number | null> {
  try {
    const response =
      await fetchWithTimeout(
        `https://api.gold-api.com/price/${symbol}`,
        3500,
        {
          Accept:
            "application/json",
        }
      );

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
   YAHOO FALLBACK
========================================================= */

async function fetchYahooPrice(
  symbol: "GC=F" | "SI=F"
): Promise<number | null> {
  try {
    const url =
      "https://query1.finance.yahoo.com/v8/finance/chart/" +
      `${encodeURIComponent(symbol)}` +
      "?range=1d&interval=1m";

    const response =
      await fetchWithTimeout(
        url,
        4500,
        {
          Accept:
            "application/json",
          "User-Agent":
            "Mozilla/5.0",
        }
      );

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
): Promise<number | null> {
  try {
    const response =
      await fetchWithTimeout(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
        3500,
        {
          Accept:
            "application/json",
        }
      );

    if (!response.ok) {
      throw new Error(
        `Binance HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    const price =
      Number(data?.price);

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
    const response =
      await fetchWithTimeout(
        `https://api.frankfurter.app/latest?from=${from}&to=${to}`,
        4000,
        {
          Accept:
            "application/json",
        }
      );

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
   READ REQUESTED PAIRS
========================================================= */

async function getRequestedPairs(
  req: Request
): Promise<string[]> {
  let bodyPairs: string[] = [];

  try {
    const body =
      await req.clone().json();

    if (
      Array.isArray(
        body?.pairs
      )
    ) {
      bodyPairs =
        body.pairs
          .map((p: unknown) =>
            String(p).trim()
          )
          .filter(Boolean);
    }
  } catch {
    // No JSON body.
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

  if (
    bodyPairs.length > 0
  ) {
    return [
      ...new Set(
        bodyPairs
      ),
    ];
  }

  if (
    queryList.length > 0
  ) {
    return [
      ...new Set(
        queryList
      ),
    ];
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
       GOLD + SILVER
       IMPORTANT:
       Both are requested IN PARALLEL.
    ===================================================== */

    const goldPairs =
      requestedPairs.filter(
        isGold
      );

    const silverPairs =
      requestedPairs.filter(
        isSilver
      );

    const [
      goldApiPrice,
      silverApiPrice,
    ] = await Promise.all([
      goldPairs.length > 0
        ? fetchGoldApi("XAU")
        : Promise.resolve(null),

      silverPairs.length > 0
        ? fetchGoldApi("XAG")
        : Promise.resolve(null),
    ]);

    /*
     * Gold fallback
     */
    let goldPrice =
      goldApiPrice;

    let goldSource:
      | PriceSource
      | null =
      validPrice(
        goldPrice
      )
        ? "gold-api"
        : null;

    if (
      goldPairs.length > 0 &&
      !validPrice(goldPrice)
    ) {
      goldPrice =
        await fetchYahooPrice(
          "GC=F"
        );

      if (
        validPrice(goldPrice)
      ) {
        goldSource =
          "yahoo";
      }
    }

    /*
     * Silver fallback
     */
    let silverPrice =
      silverApiPrice;

    let silverSource:
      | PriceSource
      | null =
      validPrice(
        silverPrice
      )
        ? "gold-api"
        : null;

    if (
      silverPairs.length > 0 &&
      !validPrice(
        silverPrice
      )
    ) {
      silverPrice =
        await fetchYahooPrice(
          "SI=F"
        );

      if (
        validPrice(silverPrice)
      ) {
        silverSource =
          "yahoo";
      }
    }

    /*
     * Assign Gold to every requested
     * Gold alias.
     */
    if (
      validPrice(goldPrice)
    ) {
      for (
        const pair of goldPairs
      ) {
        prices[pair] =
          roundPrice(
            goldPrice,
            2
          );

        sources[pair] =
          goldSource ||
          "gold-api";
      }
    }

    /*
     * Assign Silver to every requested
     * Silver alias.
     */
    if (
      validPrice(
        silverPrice
      )
    ) {
      for (
        const pair of silverPairs
      ) {
        prices[pair] =
          roundPrice(
            silverPrice,
            2
          );

        sources[pair] =
          silverSource ||
          "gold-api";
      }
    }

    /* =====================================================
       CRYPTO
       All crypto requests run in PARALLEL.
    ===================================================== */

    const cryptoRequests =
      requestedPairs
        .filter(
          (pair) =>
            !validPrice(
              prices[pair]
            ) &&
            isCrypto(pair)
        )
        .map(
          async (pair) => {
            const symbol =
              getBinanceSymbol(
                pair
              );

            if (!symbol) {
              return;
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
        );

    await Promise.all(
      cryptoRequests
    );

    /* =====================================================
       FOREX
       Requests run in PARALLEL.
    ===================================================== */

    const forexRequests =
      requestedPairs
        .filter(
          (pair) =>
            !validPrice(
              prices[pair]
            )
        )
        .map(
          async (pair) => {
            const upper =
              pair.toUpperCase();

            let from =
              "";

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
              return;
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
        );

    await Promise.all(
      forexRequests
    );

    /* =====================================================
       USD/JPY
    ===================================================== */

    const usdJpyPairs =
      requestedPairs.filter(
        (pair) =>
          !validPrice(
            prices[pair]
          ) &&
          pair
            .toUpperCase()
            .includes(
              "USD/JPY"
            )
      );

    if (
      usdJpyPairs.length > 0
    ) {
      const price =
        await fetchFrankfurter(
          "USD",
          "JPY"
        );

      if (
        validPrice(price)
      ) {
        for (
          const pair of usdJpyPairs
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
    }

    /* =====================================================
       FALLBACKS
       Gold/Silver NEVER use hardcoded prices.
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
       LIVE METALS
    ===================================================== */

    const finalGoldPair =
      requestedPairs.find(
        isGold
      ) || null;

    const finalSilverPair =
      requestedPairs.find(
        isSilver
      ) || null;

    const finalGoldPrice =
      finalGoldPair &&
      validPrice(
        prices[
          finalGoldPair
        ]
      )
        ? prices[
            finalGoldPair
          ]
        : null;

    const finalSilverPrice =
      finalSilverPair &&
      validPrice(
        prices[
          finalSilverPair
        ]
      )
        ? prices[
            finalSilverPair
          ]
        : null;

    /* =====================================================
       RESPONSE
    ===================================================== */

    return new Response(
      JSON.stringify({
        success: true,

        pricesUpdated:
          Object.keys(
            prices
          ).length,

        pairs:
          Object.keys(
            prices
          ),

        prices,

        sources,

        liveMetals: {
          gold: {
            pair:
              finalGoldPair,

            price:
              finalGoldPrice,

            source:
              finalGoldPair
                ? sources[
                    finalGoldPair
                  ] || null
                : null,
          },

          silver: {
            pair:
              finalSilverPair,

            price:
              finalSilverPrice,

            source:
              finalSilverPair
                ? sources[
                    finalSilverPair
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
