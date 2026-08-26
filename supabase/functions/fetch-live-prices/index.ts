import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl =
  Deno.env.get("SUPABASE_URL")!;

const supabaseServiceKey =
  Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY"
  )!;

const PROVISIONING =
  "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";

const CLIENT_API =
  "https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai";

const KEYS = [
  "METAAPI_TOKEN",
  "MT5_LOGIN",
  "MT5_SERVER",
  "MT5_PASSWORD",
];

let METAAPI_TOKEN = "";
let MT5_LOGIN = "";
let MT5_SERVER = "";
let MT5_PASSWORD = "";

let cachedAccountId:
  string | null = null;

let cachedAccountRegion:
  string | null = null;

let cachedAccountAt = 0;

let credentialsLoadedAt = 0;

function getClientApiBase(): string {
  return cachedAccountRegion
    ? `https://mt-client-api-v1.${cachedAccountRegion}.agiliumtrade.ai`
    : CLIENT_API;
}

/* =========================================================
   LOAD MT5 CREDENTIALS
   DB FIRST + SUPABASE SECRETS FALLBACK
========================================================= */

async function loadCredentials() {
  if (
    Date.now() -
      credentialsLoadedAt <
    30_000
  ) {
    return;
  }

  const admin = createClient(
    supabaseUrl,
    supabaseServiceKey
  );

  const {
    data,
    error
  } = await admin
    .from("integration_settings")
    .select("key,value")
    .in("key", KEYS);

  if (error) {
    console.error(
      "Could not load MT5 settings:",
      error.message
    );
  }

  const dbValues:
    Record<string, string> = {};

  for (const row of data || []) {
    dbValues[row.key] =
      String(
        row.value || ""
      ).trim();
  }

  /*
   * Support BOTH:
   * 1. integration_settings
   * 2. Supabase Secrets
   *
   * DB value gets priority.
   */

  METAAPI_TOKEN =
    dbValues.METAAPI_TOKEN ||
    Deno.env
      .get("METAAPI_TOKEN")
      ?.trim() ||
    "";

  MT5_LOGIN =
    dbValues.MT5_LOGIN ||
    Deno.env
      .get("MT5_LOGIN")
      ?.trim() ||
    "";

  MT5_SERVER =
    dbValues.MT5_SERVER ||
    Deno.env
      .get("MT5_SERVER")
      ?.trim() ||
    "";

  MT5_PASSWORD =
    dbValues.MT5_PASSWORD ||
    Deno.env
      .get("MT5_PASSWORD")
      ?.trim() ||
    "";

  credentialsLoadedAt =
    Date.now();

  console.log(
    "MT5 credentials loaded:",
    Boolean(METAAPI_TOKEN),
    Boolean(MT5_LOGIN),
    Boolean(MT5_SERVER),
    Boolean(MT5_PASSWORD)
  );
}

/* =========================================================
   WAIT FOR MT5 ACCOUNT DEPLOYMENT
========================================================= */

async function waitForAccountDeployment(
  accountId: string,
  maxWaitMs = 30000
): Promise<boolean> {

  const startedAt =
    Date.now();

  while (
    Date.now() - startedAt <
    maxWaitMs
  ) {

    try {

      const response =
        await fetch(
          `${PROVISIONING}/users/current/accounts`,
          {
            headers: {
              "auth-token":
                METAAPI_TOKEN
            },
            signal:
              AbortSignal.timeout(
                10000
              ),
          }
        );

      if (response.ok) {

        const raw =
          await response.json();

        const accounts =
          Array.isArray(raw)
            ? raw
            : raw?.items || [];

        const account =
          accounts.find(
            (a: any) =>
              String(
                a._id || a.id
              ) ===
              String(accountId)
          );

        const state =
          String(
            account?.state || ""
          ).toUpperCase();

        if (
          state === "DEPLOYED"
        ) {
          console.log(
            "MetaApi account is deployed:",
            accountId
          );

          return true;
        }

        if (
          state &&
          ![
            "DEPLOYING",
            "CREATING",
            "CREATED"
          ].includes(state)
        ) {
          console.error(
            "MetaApi account entered unexpected state:",
            state
          );

          return false;
        }
      }

    } catch (error) {

      console.error(
        "MetaApi deployment status check failed:",
        String(error)
      );
    }

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          2000
        )
    );
  }

  console.error(
    "MetaApi account deployment timed out:",
    accountId
  );

  return false;
}

/* =========================================================
   GET / CREATE MT5 ACCOUNT
========================================================= */

async function getMt5AccountId():
  Promise<string | null> {

  await loadCredentials();

  if (
    !METAAPI_TOKEN ||
    !MT5_LOGIN ||
    !MT5_SERVER
  ) {
    console.error(
      "MT5 credentials are incomplete"
    );

    return null;
  }

  if (
    cachedAccountId &&
    Date.now() -
      cachedAccountAt <
      10 * 60 * 1000
  ) {
    return cachedAccountId;
  }

  try {

    const response =
      await fetch(
        `${PROVISIONING}/users/current/accounts`,
        {
          headers: {
            "auth-token":
              METAAPI_TOKEN
          },
          signal:
            AbortSignal.timeout(
              10000
            ),
        }
      );

    if (!response.ok) {

      console.error(
        "MetaApi account list failed:",
        response.status,
        (
          await response.text()
        ).slice(0, 500)
      );

      return null;
    }

    const raw =
      await response.json();

    const accounts =
      Array.isArray(raw)
        ? raw
        : raw?.items || [];

    console.log(
      "MetaApi accounts:",
      accounts.length
    );

    let account =
      accounts.find(
        (a: any) =>
          String(a.login) ===
            String(MT5_LOGIN) &&
          String(a.server)
            .toLowerCase() ===
            String(MT5_SERVER)
              .toLowerCase()
      ) ||
      accounts.find(
        (a: any) =>
          String(a.login) ===
          String(MT5_LOGIN)
      );

    /*
     * CREATE ACCOUNT IF IT DOES NOT EXIST
     */

    if (
      !account &&
      MT5_PASSWORD
    ) {

      console.log(
        "Creating MetaApi MT5 account..."
      );

      const createResponse =
        await fetch(
          `${PROVISIONING}/users/current/accounts`,
          {
            method: "POST",

            headers: {
              "auth-token":
                METAAPI_TOKEN,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name:
                `LiveSignals-${MT5_LOGIN}`,

              type: "cloud",

              login:
                MT5_LOGIN,

              password:
                MT5_PASSWORD,

              server:
                MT5_SERVER,

              platform:
                "mt5",

              magic: 0,
            }),

            signal:
              AbortSignal.timeout(
                15000
              ),
          }
        );

      if (
        createResponse.ok
      ) {

        account =
          await createResponse.json();

        console.log(
          "MetaApi account created"
        );

      } else {

        console.error(
          "MetaApi account creation failed:",
          createResponse.status,
          (
            await createResponse.text()
          ).slice(0, 500)
        );

        return null;
      }
    }

    const accountId =
      account?._id ||
      account?.id;

    if (!accountId) {

      console.error(
        "MetaApi account ID not found"
      );

      return null;
    }

    console.log(
      "MT5 account:",
      accountId,
      "state:",
      account?.state
    );

    /*
     * DEPLOY ACCOUNT
     */

    if (
      account?.state &&
      ![
        "DEPLOYED",
        "DEPLOYING"
      ].includes(
        account.state
      )
    ) {

      console.log(
        "Deploying MT5 account..."
      );

      const deployResponse =
        await fetch(
          `${PROVISIONING}/users/current/accounts/${accountId}/deploy`,
          {
            method: "POST",

            headers: {
              "auth-token":
                METAAPI_TOKEN
            },

            signal:
              AbortSignal.timeout(
                10000
              ),
          }
        );

      console.log(
        "Deploy response:",
        deployResponse.status
      );
    }

    /*
     * Wait until account is actually deployed.
     */

    if (
      String(
        account?.state || ""
      ).toUpperCase() !==
      "DEPLOYED"
    ) {

      const ready =
        await waitForAccountDeployment(
          accountId
        );

      if (!ready) {
        return null;
      }
    }

    cachedAccountId =
      accountId;

    cachedAccountRegion =
      account?.region ||
      account?.primaryReplica
        ?.region ||
      account?.accountReplicas
        ?.find(
          (r: any) =>
            r?.state ===
            "DEPLOYED"
        )?.region ||
      null;

    cachedAccountAt =
      Date.now();

    console.log(
      "MetaApi client region:",
      cachedAccountRegion ||
        "default"
    );

    return accountId;

  } catch (error) {

    console.error(
      "MT5 account error:",
      String(error)
    );

    return null;
  }
}

/* =========================================================
   FIND ACTUAL BROKER SYMBOL
========================================================= */

async function findBrokerSymbol(
  accountId: string,
  appPair: string
): Promise<string | null> {

  const upper =
    appPair
      .toUpperCase()
      .replace(
        /[^A-Z0-9]/g,
        ""
      );

  let preferred: string[] =
    [];

  if (
    upper.includes("XAU") ||
    upper.includes("GOLD")
  ) {

    preferred = [
      "XAUUSD",
      "GOLD"
    ];

  } else if (
    upper.includes("XAG") ||
    upper.includes("SILVER")
  ) {

    preferred = [
      "XAGUSD",
      "SILVER"
    ];

  } else if (
    upper.includes("BTC")
  ) {

    preferred = [
      "BTCUSD"
    ];

  } else if (
    upper.includes("ETH")
  ) {

    preferred = [
      "ETHUSD"
    ];

  } else if (
    upper.includes("SOL")
  ) {

    preferred = [
      "SOLUSD"
    ];

  } else if (
    /BOOM/.test(upper) &&
    upper.includes("1000")
  ) {

    preferred = [
      "BOOM1000",
      "BOOM1000INDEX"
    ];

  } else if (
    /BOOM/.test(upper) &&
    upper.includes("500")
  ) {

    preferred = [
      "BOOM500",
      "BOOM500INDEX"
    ];

  } else if (
    /CRASH/.test(upper) &&
    upper.includes("1000")
  ) {

    preferred = [
      "CRASH1000",
      "CRASH1000INDEX"
    ];

  } else if (
    /CRASH/.test(upper) &&
    upper.includes("500")
  ) {

    preferred = [
      "CRASH500",
      "CRASH500INDEX"
    ];

  } else if (
    /VOL(ATILITY)?/.test(upper) &&
    upper.includes("75")
  ) {

    preferred = [
      "VOLATILITY75INDEX",
      "VOL75",
      "VOLATILITY75"
    ];

  } else if (
    /VOL(ATILITY)?/.test(upper) &&
    upper.includes("100")
  ) {

    preferred = [
      "VOLATILITY100INDEX",
      "VOL100",
      "VOLATILITY100"
    ];

  } else if (
    /VOL(ATILITY)?/.test(upper) &&
    upper.includes("50")
  ) {

    preferred = [
      "VOLATILITY50INDEX",
      "VOL50",
      "VOLATILITY50"
    ];

  } else if (
    /VOL(ATILITY)?/.test(upper) &&
    upper.includes("25")
  ) {

    preferred = [
      "VOLATILITY25INDEX",
      "VOL25",
      "VOLATILITY25"
    ];

  } else if (
    /STEP/.test(upper)
  ) {

    preferred = [
      "STEPINDEX",
      "STEP"
    ];

  } else if (
    /JUMP/.test(upper)
  ) {

    preferred = [
      upper,
      "JUMP"
    ];

  } else if (
    /^[A-Z]{6}$/.test(upper)
  ) {

    preferred = [
      upper
    ];

  } else {

    preferred = [
      upper
    ];
  }

  try {

    const response =
      await fetch(
        `${getClientApiBase()}/users/current/accounts/${accountId}/symbols`,
        {
          headers: {
            "auth-token":
              METAAPI_TOKEN
          },

          signal:
            AbortSignal.timeout(
              10000
            ),
        }
      );

    if (!response.ok) {

      console.error(
        "Could not read MT5 symbols:",
        response.status
      );

      return (
        preferred[0] ||
        null
      );
    }

    const raw =
      await response.json();

    const symbols =
      Array.isArray(raw)
        ? raw
        : raw?.symbols ||
          raw?.items ||
          [];

    if (!symbols.length) {
      return (
        preferred[0] ||
        null
      );
    }

    const names =
      symbols
        .map(
          (s: any) =>
            typeof s === "string"
              ? s
              : s.symbol ||
                s.name
        )
        .filter(Boolean);

    /*
     * EXACT MATCH FIRST
     */

    for (
      const wanted of preferred
    ) {

      const exact =
        names.find(
          (s: string) =>
            s.toUpperCase() ===
            wanted.toUpperCase()
        );

      if (exact) {
        return exact;
      }
    }

    /*
     * PREFIX / SUFFIX MATCH
     */

    for (
      const wanted of preferred
    ) {

      const match =
        names.find(
          (s: string) => {

            const normalized =
              s
                .toUpperCase()
                .replace(
                  /[^A-Z0-9]/g,
                  ""
                );

            return (
              normalized ===
                wanted.toUpperCase() ||
              normalized.startsWith(
                wanted.toUpperCase()
              )
            );
          }
        );

      if (match) {
        return match;
      }
    }

    console.log(
      `No broker symbol found for ${appPair}`
    );

    return null;

  } catch (error) {

    console.error(
      "Symbol lookup error:",
      String(error)
    );

    return (
      preferred[0] ||
      null
    );
  }
}

/* =========================================================
   GET REAL MT5 PRICE
========================================================= */

async function fetchMt5Price(
  accountId: string,
  appPair: string
): Promise<string | null> {

  const symbol =
    await findBrokerSymbol(
      accountId,
      appPair
    );

  if (!symbol) {
    return null;
  }

  try {

    const response =
      await fetch(
        `${getClientApiBase()}/users/current/accounts/${accountId}/symbols/${encodeURIComponent(
          symbol
        )}/current-price?keepSubscription=true`,
        {
          headers: {
            "auth-token":
              METAAPI_TOKEN
          },

          signal:
            AbortSignal.timeout(
              10000
            ),
        }
      );

    if (!response.ok) {

      console.error(
        `MT5 price failed ${appPair} (${symbol}):`,
        response.status,
        (
          await response.text()
        ).slice(0, 300)
      );

      return null;
    }

    const data =
      await response.json();

    const bid =
      Number(data?.bid);

    const ask =
      Number(data?.ask);

    if (
      !bid &&
      !ask
    ) {

      console.error(
        `MT5 returned no bid/ask for ${symbol}`
      );

      return null;
    }

    const price =
      bid > 0 &&
      ask > 0
        ? (bid + ask) / 2
        : bid > 0
        ? bid
        : ask;

    if (
      !price ||
      price <= 0
    ) {
      return null;
    }

    console.log(
      `REAL MT5 PRICE: ${appPair} -> ${symbol} -> ${price}`
    );

    return price.toFixed(
      symbol
        .toUpperCase()
        .includes("JPY")
        ? 3
        : symbol
            .toUpperCase()
            .includes("XAG")
        ? 3
        : symbol
            .toUpperCase()
            .includes("XAU")
        ? 2
        : 5
    );

  } catch (error) {

    console.error(
      `MT5 price error ${appPair}:`,
      String(error)
    );

    return null;
  }
}

/* =========================================================
   FETCH ALL PRICES
   MT5 ONLY
========================================================= */

async function fetchAllPrices(
  pairs: string[]
): Promise<
  Record<string, string>
> {

  const prices:
    Record<string, string> = {};

  const accountId =
    await getMt5AccountId();

  if (!accountId) {

    console.error(
      "No MT5 account available. Returning no prices."
    );

    return prices;
  }

  for (
    const pair of pairs
  ) {

    const price =
      await fetchMt5Price(
        accountId,
        pair
      );

    if (price) {
      prices[pair] =
        price;
    }
  }

  console.log(
    "FINAL MT5 PRICES:",
    JSON.stringify(
      prices
    )
  );

  return prices;
}

/* =========================================================
   PRICE PARSER
========================================================= */

function parsePrice(
  priceStr: string
): number {

  if (!priceStr) {
    return 0;
  }

  if (
    /[a-zA-Z]/.test(
      priceStr.replace(
        /[-–.\s]/g,
        ""
      )
    )
  ) {
    return 0;
  }

  const cleaned =
    priceStr.replace(
      /[^\d.\-–]/g,
      ""
    );

  const parts =
    cleaned.split(
      /[-–]/
    );

  if (
    parts.length >= 2
  ) {

    return (
      parseFloat(parts[0]) +
      parseFloat(parts[1])
    ) / 2;
  }

  return (
    parseFloat(cleaned) ||
    0
  );
}

/* =========================================================
   SERVER
========================================================= */

serve(async (req) => {

  if (
    req.method ===
    "OPTIONS"
  ) {

    return new Response(
      null,
      {
        headers:
          corsHeaders
      }
    );
  }

  try {

    const supabase =
      createClient(
        supabaseUrl,
        supabaseServiceKey
      );

    /* =====================================================
       GET PAIRS FROM REQUEST
    ===================================================== */

    const url =
      new URL(req.url);

    const pairsParam =
      url.searchParams.get(
        "pairs"
      );

    let clientPairs:
      string[] = [];

    if (pairsParam) {

      clientPairs =
        pairsParam
          .split(",")
          .map(
            p => p.trim()
          )
          .filter(Boolean);

    } else if (
      req.method === "POST"
    ) {

      try {

        const body =
          await req.json();

        if (
          body?.pairs &&
          Array.isArray(
            body.pairs
          )
        ) {

          clientPairs =
            body.pairs
              .map(
                (p: any) =>
                  String(p)
              )
              .filter(Boolean);
        }

      } catch {

        clientPairs = [];
      }
    }

    /* =====================================================
       PRICE-ONLY REQUEST
    ===================================================== */

    if (
      clientPairs.length > 0
    ) {

      const prices =
        await fetchAllPrices(
          clientPairs
        );

      return new Response(
        JSON.stringify({
          success:
            Object.keys(
              prices
            ).length > 0,

          source:
            "MT5",

          prices,

          ...(Object.keys(
            prices
          ).length === 0
            ? {
                error:
                  "No MT5 live prices returned. Check MetaApi/MT5 connection and broker symbols."
              }
            : {})
        }),
        {
          headers: {
            ...corsHeaders,

            "Content-Type":
              "application/json"
          }
        }
      );
    }

    /* =====================================================
       FULL SIGNAL UPDATE
    ===================================================== */

    const {
      data: signals,
      error
    } =
      await supabase
        .from("signals")
        .select(
          "id,pair,type,entry,tp1,tp2,tp3,tp4,sl,tp1_hit,tp2_hit,tp3_hit,tp4_hit,sl_hit,status,signal_status,entry_mode,limit_entry_price,is_activated"
        )
        .eq(
          "published",
          true
        )
        .not(
          "signal_status",
          "ilike",
          "close"
        );

    if (error) {

      console.error(
        "Signals fetch error:",
        error
      );

      throw error;
    }

    if (
      !signals ||
      signals.length === 0
    ) {

      return new Response(
        JSON.stringify({
          success: true,

          message:
            "No active signals",

          source:
            "MT5",

          prices: {}
        }),
        {
          headers: {
            ...corsHeaders,

            "Content-Type":
              "application/json"
          }
        }
      );
    }

    const uniquePairs =
      [
        ...new Set(
          signals.map(
            s => s.pair
          )
        )
      ];

    const prices =
      await fetchAllPrices(
        uniquePairs
      );

    let updatedCount =
      0;

    let activatedCount =
      0;

    /* =====================================================
       UPDATE SIGNALS
    ===================================================== */

    for (
      const signal of signals
    ) {

      const currentPrice =
        prices[
          signal.pair
        ];

      if (!currentPrice) {
        continue;
      }

      const priceNum =
        parseFloat(
          currentPrice
        );

      const updates:
        Record<
          string,
          any
        > = {
          current_price:
            currentPrice
        };

      const isBuy =
        signal.type
          ?.toLowerCase() ===
        "buy";

      const lifecycle =
        String(
          signal.signal_status ||
          signal.status ||
          ""
        ).toLowerCase();

      /* LIMIT ORDER */

      const isLimitOrder =
        signal.entry_mode ===
        "limit";

      const isPending =
        lifecycle ===
        "pending";

      const limitPrice =
        typeof signal.limit_entry_price ===
        "number"
          ? signal.limit_entry_price
          : 0;

      if (
        isLimitOrder &&
        isPending &&
        limitPrice > 0
      ) {

        const shouldActivate =
          isBuy
            ? priceNum <=
              limitPrice
            : priceNum >=
              limitPrice;

        if (
          shouldActivate
        ) {

          updates.signal_status =
            "open";

          updates.status =
            "open";

          updates.is_activated =
            true;

          updates.activated_at =
            new Date()
              .toISOString();

          activatedCount++;
        }
      }

      const isOpen =
        lifecycle ===
          "open" ||
        updates.signal_status ===
          "open";

      if (!isOpen) {

        await supabase
          .from("signals")
          .update(
            updates
          )
          .eq(
            "id",
            signal.id
          );

        updatedCount++;

        continue;
      }

      const entryPrice =
        parsePrice(
          signal.entry ||
            ""
        );

      /* TP1 */

      if (
        !signal.tp1_hit &&
        signal.tp1
      ) {

        const tp1Price =
          parsePrice(
            signal.tp1
          );

        if (
          tp1Price > 0 &&
          (
            isBuy
              ? priceNum >=
                tp1Price
              : priceNum <=
                tp1Price
          )
        ) {

          updates.tp1_hit =
            true;

          updates.profit_note =
            "TP 1 Hit ✅ SL moved to B.E";

          if (
            entryPrice > 0
          ) {

            updates.sl =
              String(
                entryPrice
              );
          }
        }
      }

      /* TP2 */

      if (
        !signal.tp2_hit &&
        signal.tp2
      ) {

        const tp2Price =
          parsePrice(
            signal.tp2
          );

        if (
          tp2Price > 0 &&
          (
            isBuy
              ? priceNum >=
                tp2Price
              : priceNum <=
                tp2Price
          )
        ) {

          updates.tp2_hit =
            true;

          updates.profit_note =
            "TP 2 Cleared! Secure More Profits 💰";
        }
      }

      /* TP3 */

      if (
        !signal.tp3_hit &&
        signal.tp3
      ) {

        const tp3Price =
          parsePrice(
            signal.tp3
          );

        if (
          tp3Price > 0 &&
          (
            isBuy
              ? priceNum >=
                tp3Price
              : priceNum <=
                tp3Price
          )
        ) {

          updates.tp3_hit =
            true;

          updates.signal_status =
            "close";

          updates.status =
            "close";

          updates.profit_note =
            "TP 3 Final Target Hit! 🎊 Maximum Profit Secured ✅";
        }
      }

      /* TP4 */

      if (
        !signal.tp4_hit &&
        signal.tp4
      ) {

        const tp4Price =
          parsePrice(
            signal.tp4
          );

        if (
          tp4Price > 0 &&
          (
            isBuy
              ? priceNum >=
                tp4Price
              : priceNum <=
                tp4Price
          )
        ) {

          updates.tp4_hit =
            true;
        }
      }

      /* SL */

      const tp1Hit =
        signal.tp1_hit ||
        updates.tp1_hit;

      if (
        !signal.sl_hit &&
        signal.sl &&
        !tp1Hit
      ) {

        const slPrice =
          parsePrice(
            signal.sl
          );

        if (
          slPrice > 0 &&
          (
            isBuy
              ? priceNum <=
                slPrice
              : priceNum >=
                slPrice
          )
        ) {

          updates.sl_hit =
            true;

          updates.signal_status =
            "close";

          updates.status =
            "close";

          updates.profit_note =
            "SL Hit ❌";
        }
      }

      await supabase
        .from("signals")
        .update(
          updates
        )
        .eq(
          "id",
          signal.id
        );

      updatedCount++;
    }

    return new Response(
      JSON.stringify({
        success: true,

        source:
          "MT5",

        pricesUpdated:
          updatedCount,

        limitOrdersActivated:
          activatedCount,

        pairs:
          Object.keys(
            prices
          ),

        prices
      }),
      {
        headers: {
          ...corsHeaders,

          "Content-Type":
            "application/json"
        }
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

        source:
          "MT5",

        error:
          "MT5 live price service failed"
      }),
      {
        status: 500,

        headers: {
          ...corsHeaders,

          "Content-Type":
            "application/json"
        }
      }
    );
  }
});
