import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PROVISIONING =
  "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";

const DEFAULT_CLIENT_API =
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

let credentialsLoadedAt = 0;
let cachedAccountId: string | null = null;
let cachedRegion: string | null = null;
let cachedAccountAt = 0;
let cachedConnectionStatus = "";
let lastMt5Error = "";

function clientApi(): string {
  return cachedRegion
    ? `https://mt-client-api-v1.${cachedRegion}.agiliumtrade.ai`
    : DEFAULT_CLIENT_API;
}

/* =========================================================
   LOAD CREDENTIALS
========================================================= */

async function loadCredentials() {
  if (Date.now() - credentialsLoadedAt < 30000) return;

  const admin = createClient(
    SUPABASE_URL,
    SERVICE_KEY
  );

  const { data, error } = await admin
    .from("integration_settings")
    .select("key,value")
    .in("key", KEYS);

  if (error) {
    console.error(
      "integration_settings error:",
      error.message
    );
  }

  const values: Record<string, string> = {};

  for (const row of data || []) {
    values[row.key] = String(row.value || "").trim();
  }

  METAAPI_TOKEN =
    values.METAAPI_TOKEN ||
    Deno.env.get("METAAPI_TOKEN")?.trim() ||
    "";

  MT5_LOGIN =
    values.MT5_LOGIN ||
    Deno.env.get("MT5_LOGIN")?.trim() ||
    "";

  MT5_SERVER =
    values.MT5_SERVER ||
    Deno.env.get("MT5_SERVER")?.trim() ||
    "";

  MT5_PASSWORD =
    values.MT5_PASSWORD ||
    Deno.env.get("MT5_PASSWORD")?.trim() ||
    "";

  credentialsLoadedAt = Date.now();

  console.log(
    "Credentials:",
    Boolean(METAAPI_TOKEN),
    Boolean(MT5_LOGIN),
    Boolean(MT5_SERVER),
    Boolean(MT5_PASSWORD)
  );
}

/* =========================================================
   GET / CREATE MT5 ACCOUNT
========================================================= */

async function getAccountId(): Promise<string | null> {
  await loadCredentials();

  if (!METAAPI_TOKEN || !MT5_LOGIN || !MT5_SERVER) {
    lastMt5Error =
      "MT5 credentials incomplete. Check METAAPI_TOKEN, MT5_LOGIN and MT5_SERVER.";
    console.error(lastMt5Error);
    return null;
  }

  // Do not keep using a cached account which was previously DEPLOYING/DISCONNECTED.
  if (
    cachedAccountId &&
    cachedConnectionStatus === "CONNECTED" &&
    Date.now() - cachedAccountAt < 2 * 60 * 1000
  ) {
    return cachedAccountId;
  }

  try {
    const response = await fetch(
      `${PROVISIONING}/users/current/accounts?limit=1000`,
      {
        headers: {
          "auth-token": METAAPI_TOKEN,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      const body = (await response.text()).slice(0, 800);
      lastMt5Error = `MetaApi account list failed (${response.status}): ${body}`;
      console.error(lastMt5Error);
      return null;
    }

    const raw = await response.json();
    const accounts = Array.isArray(raw) ? raw : raw?.items || [];

    let account =
      accounts.find(
        (a: any) =>
          String(a.login) === String(MT5_LOGIN) &&
          String(a.server || "").toLowerCase() ===
            String(MT5_SERVER).toLowerCase()
      ) ||
      accounts.find(
        (a: any) => String(a.login) === String(MT5_LOGIN)
      );

    if (!account && MT5_PASSWORD) {
      console.log("Creating MetaApi account...");

      const createResponse = await fetch(
        `${PROVISIONING}/users/current/accounts`,
        {
          method: "POST",
          headers: {
            "auth-token": METAAPI_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `LiveSignals-${MT5_LOGIN}`,
            type: "cloud",
            login: MT5_LOGIN,
            password: MT5_PASSWORD,
            server: MT5_SERVER,
            platform: "mt5",
            magic: 0,
          }),
          signal: AbortSignal.timeout(20000),
        }
      );

      if (!createResponse.ok) {
        const body = (await createResponse.text()).slice(0, 1000);
        lastMt5Error =
          `MetaApi account creation failed (${createResponse.status}): ${body}`;
        console.error(lastMt5Error);
        return null;
      }

      account = await createResponse.json();
    }

    const accountId = account?._id || account?.id;

    if (!accountId) {
      lastMt5Error =
        `No MetaApi account found for MT5 login ${MT5_LOGIN} / server ${MT5_SERVER}.`;
      console.error(lastMt5Error);
      return null;
    }

    // A MetaApi account can be DEPLOYED while the terminal is still connecting.
    // Wait briefly for CONNECTED before asking the client API for symbols/prices.
    const maxAttempts = 8;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let state = String(account?.state || "").toUpperCase();
      let connectionStatus = String(
        account?.connectionStatus || ""
      ).toUpperCase();

      if (state !== "DEPLOYED") {
        const deploy = await fetch(
          `${PROVISIONING}/users/current/accounts/${accountId}/deploy`,
          {
            method: "POST",
            headers: {
              "auth-token": METAAPI_TOKEN,
            },
            signal: AbortSignal.timeout(10000),
          }
        );

        if (!deploy.ok && deploy.status !== 204) {
          const body = (await deploy.text()).slice(0, 800);
          console.error(
            "Deploy request failed:",
            deploy.status,
            body
          );
        }
      }

      // Refresh account state/connection status after deploy or while connecting.
      const statusResponse = await fetch(
        `${PROVISIONING}/users/current/accounts/${accountId}`,
        {
          headers: {
            "auth-token": METAAPI_TOKEN,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (statusResponse.ok) {
        account = await statusResponse.json();
        state = String(account?.state || "").toUpperCase();
        connectionStatus = String(
          account?.connectionStatus || ""
        ).toUpperCase();

        console.log(
          `MetaApi account ${accountId}: state=${state}, connection=${connectionStatus}, attempt=${attempt + 1}/${maxAttempts}`
        );

        if (
          state === "DEPLOYED" &&
          connectionStatus === "CONNECTED"
        ) {
          cachedAccountId = accountId;
          cachedRegion =
            account?.region ||
            account?.primaryReplica?.region ||
            null;
          cachedAccountAt = Date.now();
          cachedConnectionStatus = connectionStatus;
          lastMt5Error = "";
          return accountId;
        }

        if (
          connectionStatus === "DISCONNECTED_FROM_BROKER" ||
          state === "DEPLOY_FAILED" ||
          state === "UNDEPLOYED"
        ) {
          lastMt5Error =
            `MetaApi broker connection failed: state=${state}, connection=${connectionStatus}. Check MT5 login, password and exact server name.`;
          console.error(lastMt5Error);
          break;
        }
      } else {
        console.error(
          "MetaApi account status failed:",
          statusResponse.status,
          (await statusResponse.text()).slice(0, 500)
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    // Even if CONNECTED was not observed during the short wait, keep the account
    // id and let the symbol/price retries below have a chance to succeed.
    cachedAccountId = accountId;
    cachedRegion =
      account?.region ||
      account?.primaryReplica?.region ||
      null;
    cachedAccountAt = Date.now();
    cachedConnectionStatus = String(
      account?.connectionStatus || ""
    ).toUpperCase();

    if (!lastMt5Error) {
      lastMt5Error =
        `MetaApi account is not connected yet: ${cachedConnectionStatus || "UNKNOWN"}.`;
    }

    return accountId;
  } catch (error) {
    lastMt5Error = `getAccountId error: ${String(error)}`;
    console.error(lastMt5Error);
    return null;
  }
}

/* =========================================================
   NORMALIZE SYMBOL
========================================================= */

function normalizeSymbol(value: string): string {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/* =========================================================
   DERIV SYNTHETIC INDICES (VOL / BOOM / CRASH / STEP / JUMP)
   These symbols do NOT exist on regular MT5 forex brokers
   (they are only offered on Deriv's own platform), so they
   must be priced directly from Deriv's public API instead
   of going through the MetaApi/MT5 broker symbol lookup.
========================================================= */

const DERIV_WS_URL =
  "wss://ws.derivws.com/websockets/v3?app_id=1089";

function getDerivSymbol(
  appPair: string
): string | null {
  const n = normalizeSymbol(appPair);

  if (n.includes("BOOM") && n.includes("1000")) {
    return "BOOM1000";
  }

  if (n.includes("BOOM") && n.includes("500")) {
    return "BOOM500";
  }

  if (n.includes("CRASH") && n.includes("1000")) {
    return "CRASH1000";
  }

  if (n.includes("CRASH") && n.includes("500")) {
    return "CRASH500";
  }

  if (n.includes("STEP")) {
    return "stpRNG";
  }

  if (n.includes("JUMP")) {
    if (n.includes("10")) return "JD10";
    if (n.includes("25")) return "JD25";
    if (n.includes("50")) return "JD50";
    if (n.includes("75")) return "JD75";
    if (n.includes("100")) return "JD100";
    return null;
  }

  // "VOL" / "VOLATILITY" indices - check longest numbers first
  // so "VOL100" isn't wrongly matched by the "10" check.
  if (n.includes("VOL")) {
    const oneSecond = n.includes("1S") || n.includes("1SEC");

    if (n.includes("100")) {
      return oneSecond ? "1HZ100V" : "R_100";
    }
    if (n.includes("75")) {
      return oneSecond ? "1HZ75V" : "R_75";
    }
    if (n.includes("50")) {
      return oneSecond ? "1HZ50V" : "R_50";
    }
    if (n.includes("25")) {
      return oneSecond ? "1HZ25V" : "R_25";
    }
    if (n.includes("10")) {
      return oneSecond ? "1HZ10V" : "R_10";
    }
  }

  return null;
}

/*
 * Fetches prices for MULTIPLE Deriv symbols over a SINGLE
 * WebSocket connection (one request per symbol, matched back
 * by req_id). Opening one connection per symbol in parallel
 * triggers Deriv's per-IP/app connection & rate limits, which
 * is why only some synthetic indices (e.g. VOL 25/50/100)
 * were updating while others (CRASH 500, BOOM 500, VOL 75,
 * etc.) kept silently failing and stayed frozen on their old
 * value. A single shared connection avoids that entirely.
 */
async function fetchDerivPricesBatch(
  symbols: string[]
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  if (symbols.length === 0) {
    return results;
  }

  return await new Promise((resolve) => {
    let settled = false;
    let ws: WebSocket;

    // req_id -> symbol, so we know which response belongs to which symbol
    const pending = new Map<number, string>();
    let reqCounter = 1;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(overallTimer);
      try {
        ws?.close();
      } catch {
        // ignore
      }
      resolve(results);
    };

    const overallTimer = setTimeout(() => {
      console.error(
        "Deriv batch timeout, still pending:",
        [...pending.values()].join(", ")
      );
      finish();
    }, 12000);

    try {
      ws = new WebSocket(DERIV_WS_URL);
    } catch (error) {
      console.error(
        "Deriv WS init error (batch):",
        String(error)
      );
      clearTimeout(overallTimer);
      resolve(results);
      return;
    }

    ws.onopen = () => {
      for (const symbol of symbols) {
        const reqId = reqCounter++;
        pending.set(reqId, symbol);

        ws.send(
          JSON.stringify({
            ticks_history: symbol,
            adjust_start_time: 1,
            count: 1,
            end: "latest",
            start: 1,
            style: "ticks",
            req_id: reqId,
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(
          typeof event.data === "string"
            ? event.data
            : "{}"
        );

        const reqId = Number(data?.req_id) || 0;
        const symbol = pending.get(reqId);

        if (!symbol) return;

        if (data?.error) {
          console.error(
            `Deriv error ${symbol}:`,
            data.error?.message || data.error
          );
        } else {
          const prices = data?.history?.prices;

          if (Array.isArray(prices) && prices.length > 0) {
            const price = Number(
              prices[prices.length - 1]
            );

            if (price > 0) {
              results[symbol] = price.toFixed(2);
              console.log(
                `REAL DERIV PRICE: ${symbol} -> ${price}`
              );
            }
          }
        }

        pending.delete(reqId);

        if (pending.size === 0) {
          finish();
        }
      } catch (error) {
        console.error(
          "Deriv batch parse error:",
          String(error)
        );
      }
    };

    ws.onerror = () => {
      console.error("Deriv WS error (batch)");
      finish();
    };

    ws.onclose = () => {
      finish();
    };
  });
}

/* =========================================================
   SYMBOL ALIASES
========================================================= */

function getSymbolAliases(
  appPair: string
): string[] {
  const n = normalizeSymbol(appPair);

  if (n.includes("XAU") || n.includes("GOLD")) {
    return [
      "XAUUSD",
      "GOLD",
      "XAUUSDM",
      "XAUUSD.A",
      "XAUUSD.M",
    ];
  }

  if (n.includes("XAG") || n.includes("SILVER")) {
    return [
      "XAGUSD",
      "SILVER",
    ];
  }

  const crypto: Record<string, string[]> = {
    BTCUSD: [
      "BTCUSD",
      "BTCUSDT",
      "BTCUSD.M",
      "BTCUSDm",
    ],
    ETHUSD: [
      "ETHUSD",
      "ETHUSDT",
      "ETHUSD.M",
      "ETHUSDm",
    ],
    SOLUSD: [
      "SOLUSD",
      "SOLUSDT",
      "SOLUSD.M",
      "SOLUSDm",
    ],
    XRPUSD: [
      "XRPUSD",
      "XRPUSDT",
      "XRPUSD.M",
      "XRPUSDm",
    ],
    DOGEUSD: [
      "DOGEUSD",
      "DOGEUSDT",
      "DOGEUSD.M",
      "DOGEUSDm",
    ],
  };

  if (crypto[n]) {
    return crypto[n];
  }

  if (
    n.includes("BOOM") &&
    n.includes("1000")
  ) {
    return [
      "BOOM1000",
      "BOOM1000INDEX",
      "BOOM1000INDEX.M",
      "BOOM1000.M",
    ];
  }

  if (
    n.includes("BOOM") &&
    n.includes("500")
  ) {
    return [
      "BOOM500",
      "BOOM500INDEX",
      "BOOM500INDEX.M",
      "BOOM500.M",
    ];
  }

  if (
    n.includes("CRASH") &&
    n.includes("1000")
  ) {
    return [
      "CRASH1000",
      "CRASH1000INDEX",
      "CRASH1000INDEX.M",
      "CRASH1000.M",
    ];
  }

  if (
    n.includes("CRASH") &&
    n.includes("500")
  ) {
    return [
      "CRASH500",
      "CRASH500INDEX",
      "CRASH500INDEX.M",
      "CRASH500.M",
    ];
  }

  if (
    n.includes("VOL") &&
    n.includes("75")
  ) {
    return [
      "VOLATILITY75INDEX",
      "VOLATILITY75",
      "VOL75",
      "V75",
      "VOLATILITY75INDEX.M",
      "VOL75.M",
    ];
  }

  if (
    n.includes("VOL") &&
    n.includes("100")
  ) {
    return [
      "VOLATILITY100INDEX",
      "VOLATILITY100",
      "VOL100",
      "V100",
    ];
  }

  if (
    n.includes("VOL") &&
    n.includes("50")
  ) {
    return [
      "VOLATILITY50INDEX",
      "VOLATILITY50",
      "VOL50",
      "V50",
    ];
  }

  if (
    n.includes("VOL") &&
    n.includes("25")
  ) {
    return [
      "VOLATILITY25INDEX",
      "VOLATILITY25",
      "VOL25",
      "V25",
    ];
  }

  if (n.includes("STEP")) {
    return [
      "STEPINDEX",
      "STEP",
    ];
  }

  if (n.includes("JUMP")) {
    return [
      n,
      "JUMP",
    ];
  }

  if (/^[A-Z]{6}$/.test(n)) {
    return [n];
  }

  return [n];
}

/* =========================================================
   GET BROKER SYMBOLS
========================================================= */

async function getBrokerSymbols(
  accountId: string
): Promise<string[]> {
  let lastStatus = "";

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(
        `${clientApi()}/users/current/accounts/${accountId}/symbols`,
        {
          headers: {
            "auth-token": METAAPI_TOKEN,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) {
        lastStatus = `${response.status}: ${(await response.text()).slice(0, 500)}`;
        console.error(
          `Broker symbols failed (attempt ${attempt}/4):`,
          lastStatus
        );
      } else {
        const raw = await response.json();

        const list = Array.isArray(raw)
          ? raw
          : raw?.symbols || raw?.items || [];

        const symbols = list
          .map((s: any) =>
            typeof s === "string" ? s : s?.symbol || s?.name
          )
          .filter(Boolean);

        if (symbols.length > 0) {
          return symbols;
        }

        lastStatus = "MetaApi returned an empty broker symbol list";
        console.error(lastStatus);
      }
    } catch (error) {
      lastStatus = String(error);
      console.error(
        `getBrokerSymbols error (attempt ${attempt}/4):`,
        lastStatus
      );
    }

    if (attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  lastMt5Error = `No broker symbols received. ${lastStatus}`.trim();
  return [];
}

/* =========================================================
   FIND BROKER SYMBOL - STRONG MATCHING
========================================================= */

async function findBrokerSymbol(
  accountId: string,
  appPair: string,
  brokerSymbols: string[]
): Promise<string | null> {
  const aliases =
    getSymbolAliases(appPair);

  const normalizedBroker =
    brokerSymbols.map((symbol) => ({
      original: symbol,
      normalized: normalizeSymbol(symbol),
    }));

  /* EXACT */
  for (const alias of aliases) {
    const wanted = normalizeSymbol(alias);

    const exact =
      normalizedBroker.find(
        (x) =>
          x.normalized === wanted
      );

    if (exact) {
      console.log(
        `SYMBOL EXACT: ${appPair} -> ${exact.original}`
      );
      return exact.original;
    }
  }

  /* STARTS WITH */
  for (const alias of aliases) {
    const wanted = normalizeSymbol(alias);

    const match =
      normalizedBroker.find(
        (x) =>
          x.normalized.startsWith(wanted) ||
          wanted.startsWith(x.normalized)
      );

    if (match) {
      console.log(
        `SYMBOL PREFIX: ${appPair} -> ${match.original}`
      );
      return match.original;
    }
  }

  /* CONTAINS */
  for (const alias of aliases) {
    const wanted = normalizeSymbol(alias);

    if (wanted.length < 4) continue;

    const match =
      normalizedBroker.find(
        (x) =>
          x.normalized.includes(wanted)
      );

    if (match) {
      console.log(
        `SYMBOL CONTAINS: ${appPair} -> ${match.original}`
      );
      return match.original;
    }
  }

  console.log(
    `NO BROKER SYMBOL: ${appPair}`,
    aliases
  );

  return null;
}

/* =========================================================
   GET PRICE
========================================================= */

async function fetchMt5Price(
  accountId: string,
  symbol: string
): Promise<string | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(
        `${clientApi()}/users/current/accounts/${accountId}/symbols/${encodeURIComponent(
          symbol
        )}/current-price?keepSubscription=true`,
        {
          headers: {
            "auth-token": METAAPI_TOKEN,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        const body = (await response.text()).slice(0, 500);
        console.error(
          `Price failed ${symbol} (attempt ${attempt}/3):`,
          response.status,
          body
        );
        lastMt5Error =
          `Price request failed for ${symbol}: HTTP ${response.status}`;
      } else {
        const data = await response.json();

        const bid = Number(data?.bid);
        const ask = Number(data?.ask);

        const price =
          bid > 0 && ask > 0
            ? (bid + ask) / 2
            : bid > 0
            ? bid
            : ask;

        if (price > 0) {
          const n = normalizeSymbol(symbol);

          let decimals = 5;

          if (n.includes("JPY")) {
            decimals = 3;
          } else if (n.includes("XAU") || n.includes("GOLD")) {
            decimals = 2;
          } else if (n.includes("XAG") || n.includes("SILVER")) {
            decimals = 3;
          } else if (
            n.includes("BTC") ||
            n.includes("ETH") ||
            n.includes("SOL") ||
            n.includes("XRP") ||
            n.includes("DOGE") ||
            n.includes("VOL") ||
            n.includes("BOOM") ||
            n.includes("CRASH") ||
            n.includes("STEP") ||
            n.includes("JUMP")
          ) {
            decimals = 2;
          }

          console.log(`REAL MT5 PRICE: ${symbol} -> ${price}`);
          lastMt5Error = "";
          return price.toFixed(decimals);
        }

        lastMt5Error = `MetaApi returned no valid bid/ask for ${symbol}`;
      }
    } catch (error) {
      lastMt5Error = `Price error ${symbol}: ${String(error)}`;
      console.error(lastMt5Error);
    }

    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return null;
}

/* =========================================================
   FETCH ALL
========================================================= */

async function fetchAllPrices(
  pairs: string[]
): Promise<Record<string, string>> {
  const prices: Record<string, string> = {};

  /*
   * STEP 1 - Deriv synthetic indices (Volatility / Boom / Crash /
   * Step / Jump). These are NOT available on regular MT5 forex
   * brokers, so they are priced straight from Deriv's own public
   * API rather than through the MetaApi/MT5 broker symbol lookup.
   */
  const derivPairs: { pair: string; symbol: string }[] = [];
  const remainingPairs: string[] = [];

  for (const pair of pairs) {
    const derivSymbol = getDerivSymbol(pair);

    if (derivSymbol) {
      derivPairs.push({ pair, symbol: derivSymbol });
    } else {
      remainingPairs.push(pair);
    }
  }

  if (derivPairs.length > 0) {
    const uniqueSymbols = [
      ...new Set(
        derivPairs.map((d) => d.symbol)
      ),
    ];

    let symbolPrices =
      await fetchDerivPricesBatch(
        uniqueSymbols
      );

    // Retry once for any symbols that didn't come back the first
    // time (transient WS hiccup / Deriv momentarily busy), instead
    // of leaving that pair frozen on its old price for this cycle.
    const missing = uniqueSymbols.filter(
      (s) => !symbolPrices[s]
    );

    if (missing.length > 0) {
      console.log(
        "Retrying Deriv fetch for:",
        missing.join(", ")
      );

      const retryPrices =
        await fetchDerivPricesBatch(missing);

      symbolPrices = {
        ...symbolPrices,
        ...retryPrices,
      };
    }

    for (const { pair, symbol } of derivPairs) {
      const price = symbolPrices[symbol];

      if (price) {
        prices[pair] = price;
      } else {
        console.log(
          `Deriv price unavailable for ${pair} (${symbol})`
        );
      }
    }
  }

  console.log(
    "DERIV PRICES:",
    JSON.stringify(prices)
  );

  /*
   * STEP 2 - Everything else (regular forex, metals, crypto)
   * goes through the MT5/MetaApi broker as before.
   */
  if (remainingPairs.length === 0) {
    return prices;
  }

  const accountId =
    await getAccountId();

  if (!accountId) {
    return prices;
  }

  const brokerSymbols =
    await getBrokerSymbols(
      accountId
    );

  if (!brokerSymbols.length) {
    console.error(
      "No broker symbols received"
    );
    return prices;
  }

  console.log(
    `Broker symbols loaded: ${brokerSymbols.length}`
  );

  for (const pair of remainingPairs) {
    const symbol =
      await findBrokerSymbol(
        accountId,
        pair,
        brokerSymbols
      );

    if (!symbol) {
      console.log(
        `Skipping ${pair}: broker symbol not found`
      );
      continue;
    }

    const price =
      await fetchMt5Price(
        accountId,
        symbol
      );

    if (price) {
      prices[pair] = price;
    }
  }

  console.log(
    "FINAL PRICES:",
    JSON.stringify(prices)
  );

  return prices;
}

/* =========================================================
   PARSE PRICE
========================================================= */

function parsePrice(
  value: string
): number {
  if (!value) return 0;

  const cleaned =
    String(value).replace(
      /[^\d.\-]/g,
      ""
    );

  return parseFloat(cleaned) || 0;
}

/* =========================================================
   TELEGRAM TP/SL UPDATE NOTIFICATION
========================================================= */

async function notifyTelegramUpdate(
  signal: Record<string, any>,
  updateType: string
): Promise<void> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/telegram-signal-post`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
        body: JSON.stringify({
          action: "update",
          update_type: updateType,
          signal: {
            pair: signal.pair,
            type: signal.type,
            entry: signal.entry,
            tp1: signal.tp1,
            tp2: signal.tp2,
            tp3: signal.tp3,
            tp4: signal.tp4,
            sl: signal.sl,
            profit_note: signal.profit_note,
            tp1_hit: signal.tp1_hit,
            tp2_hit: signal.tp2_hit,
            tp3_hit: signal.tp3_hit,
            tp4_hit: signal.tp4_hit,
            sl_hit: signal.sl_hit,
          },
        }),
      }
    );

    const result = await response.json();
    console.log(
      `Telegram update (${updateType}) for ${signal.pair}:`,
      JSON.stringify(result)
    );
  } catch (error) {
    console.error(
      `Telegram update notify error for ${signal.pair}:`,
      String(error)
    );
  }
}

/* =========================================================
   SERVER
========================================================= */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const supabase =
      createClient(
        SUPABASE_URL,
        SERVICE_KEY
      );

    const url =
      new URL(req.url);

    let pairs: string[] = [];

    const pairsParam =
      url.searchParams.get(
        "pairs"
      );

    if (pairsParam) {
      pairs = pairsParam
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    } else if (
      req.method === "POST"
    ) {
      try {
        const body =
          await req.json();

        if (
          Array.isArray(
            body?.pairs
          )
        ) {
          pairs =
            body.pairs
              .map((x: any) =>
                String(x)
              )
              .filter(Boolean);
        }
      } catch {}
    }

    /* =====================================================
       PRICE REQUEST
    ===================================================== */

    if (pairs.length > 0) {
      const prices =
        await fetchAllPrices(
          pairs
        );

      return new Response(
        JSON.stringify({
          success: Object.keys(prices).length > 0,
          source: Object.keys(prices).some((key) => getDerivSymbol(key))
            ? "MT5+DERIV"
            : "MT5",
          prices,
          diagnostics: Object.keys(prices).length > 0
            ? null
            : lastMt5Error || "No live prices returned by MetaApi/Deriv",
        }),
        {
          status: Object.keys(prices).length > 0 ? 200 : 503,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /* =====================================================
       UPDATE ACTIVE SIGNALS
    ===================================================== */

    const { data: signals, error } =
      await supabase
        .from("signals")
        .select(
          "id,pair,type,entry,tp1,tp2,tp3,tp4,sl,tp1_hit,tp2_hit,tp3_hit,tp4_hit,sl_hit,status,signal_status,entry_mode,limit_entry_price,is_activated,published"
        )
        .eq("published", true)
        .not(
          "signal_status",
          "ilike",
          "close"
        );

    if (error) {
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
          source: "MT5",
          prices: {},
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    const uniquePairs =
      [
        ...new Set(
          signals.map(
            (s) => s.pair
          )
        ),
      ];

    const prices =
      await fetchAllPrices(
        uniquePairs
      );

    let updatedCount = 0;
    let activatedCount = 0;
    const telegramPromises: Promise<void>[] = [];

    for (const signal of signals) {
      const current =
        prices[signal.pair];

      if (!current) continue;

      const currentPrice =
        parseFloat(current);

      const updates: Record<
        string,
        any
      > = {
        current_price: current,
      };

      // Snapshot of the signal that we progressively update as each
      // level is detected below - this is what actually gets sent to
      // Telegram per event, so a TP1 post shows ONLY TP1 as done even
      // if TP2/TP3 also got crossed later in this same price check.
      const runningState: Record<string, any> = {
        ...signal,
      };

      const hitEvents: {
        type: string;
        snapshot: Record<string, any>;
      }[] = [];

      const isBuy =
        String(signal.type || "")
          .toLowerCase() ===
        "buy";

      const lifecycle =
        String(
          signal.signal_status ||
            signal.status ||
            ""
        ).toLowerCase();

      const isLimit =
        signal.entry_mode ===
        "limit";

      const isPending =
        lifecycle === "pending";

      const limit =
        typeof signal.limit_entry_price ===
        "number"
          ? signal.limit_entry_price
          : 0;

      if (
        isLimit &&
        isPending &&
        limit > 0
      ) {
        const activate =
          isBuy
            ? currentPrice <= limit
            : currentPrice >= limit;

        if (activate) {
          updates.signal_status =
            "open";
          updates.status = "open";
          updates.is_activated = true;
          updates.activated_at =
            new Date().toISOString();

          activatedCount++;
        }
      }

      const isOpen =
        lifecycle === "open" ||
        updates.signal_status ===
          "open";

      if (!isOpen) {
        await supabase
          .from("signals")
          .update(updates)
          .eq("id", signal.id);

        updatedCount++;
        continue;
      }

      const entry =
        parsePrice(
          signal.entry || ""
        );

      /* TP1 */
      if (
        !signal.tp1_hit &&
        signal.tp1
      ) {
        const tp =
          parsePrice(signal.tp1);

        if (
          tp > 0 &&
          (isBuy
            ? currentPrice >= tp
            : currentPrice <= tp)
        ) {
          updates.tp1_hit = true;
          updates.profit_note =
            "TP 1 Hit ✅ SL moved to B.E";

          if (entry > 0) {
            updates.sl =
              String(entry);
          }

          runningState.tp1_hit = true;
          runningState.profit_note =
            updates.profit_note;
          if (updates.sl) {
            runningState.sl =
              updates.sl;
          }

          hitEvents.push({
            type: "tp1_hit",
            snapshot: { ...runningState },
          });
        }
      }

      /* TP2 */
      if (
        !signal.tp2_hit &&
        signal.tp2
      ) {
        const tp =
          parsePrice(signal.tp2);

        if (
          tp > 0 &&
          (isBuy
            ? currentPrice >= tp
            : currentPrice <= tp)
        ) {
          updates.tp2_hit = true;
          updates.profit_note =
            "TP 2 Cleared! Secure More Profits 💰";

          runningState.tp2_hit = true;
          runningState.profit_note =
            updates.profit_note;

          hitEvents.push({
            type: "tp2_hit",
            snapshot: { ...runningState },
          });
        }
      }

      /* TP3 */
      if (
        !signal.tp3_hit &&
        signal.tp3
      ) {
        const tp =
          parsePrice(signal.tp3);

        if (
          tp > 0 &&
          (isBuy
            ? currentPrice >= tp
            : currentPrice <= tp)
        ) {
          updates.tp3_hit = true;
          updates.signal_status =
            "close";
          updates.status = "close";
          updates.profit_note =
            "TP 3 Final Target Hit! 🎊 Maximum Profit Secured ✅";

          runningState.tp3_hit = true;
          runningState.profit_note =
            updates.profit_note;

          hitEvents.push({
            type: "tp3_hit",
            snapshot: { ...runningState },
          });
        }
      }

      /* TP4 */
      if (
        !signal.tp4_hit &&
        signal.tp4
      ) {
        const tp =
          parsePrice(signal.tp4);

        if (
          tp > 0 &&
          (isBuy
            ? currentPrice >= tp
            : currentPrice <= tp)
        ) {
          updates.tp4_hit = true;
          updates.profit_note =
            "TP 4 Hit 🚀";

          runningState.tp4_hit = true;
          runningState.profit_note =
            updates.profit_note;

          hitEvents.push({
            type: "tp4_hit",
            snapshot: { ...runningState },
          });
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
        const sl =
          parsePrice(signal.sl);

        if (
          sl > 0 &&
          (isBuy
            ? currentPrice <= sl
            : currentPrice >= sl)
        ) {
          updates.sl_hit = true;
          updates.signal_status =
            "close";
          updates.status = "close";
          updates.profit_note =
            signal.tp1_hit
              ? "Break-Even Exit ⚪ (TP1 was already secured)"
              : "SL Hit ❌";

          runningState.sl_hit = true;
          runningState.profit_note =
            updates.profit_note;

          hitEvents.push({
            type: "sl_hit",
            snapshot: { ...runningState },
          });
        }
      }

      await supabase
        .from("signals")
        .update(updates)
        .eq("id", signal.id);

      updatedCount++;

      // Post every newly-hit TP/SL level to Telegram (one message per
      // event, using that event's own progressive snapshot so a TP1
      // post never shows TP2/TP3 as already done).
      for (const event of hitEvents) {
        telegramPromises.push(
          notifyTelegramUpdate(
            event.snapshot,
            event.type
          )
        );
      }
    }

    await Promise.allSettled(telegramPromises);

    return new Response(
      JSON.stringify({
        success: true,
        source: "MT5",
        pricesUpdated:
          updatedCount,
        limitOrdersActivated:
          activatedCount,
        pairs:
          Object.keys(prices),
        prices,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
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
        source: "MT5",
        error:
          error instanceof Error
            ? error.message
            : "MT5 live price service failed",
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
