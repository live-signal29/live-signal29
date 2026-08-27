import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROVISIONING =
  "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";

const DEFAULT_CLIENT_API =
  "https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai";

interface TradeRequest {
  action: "open" | "open_multi" | "check" | "close" | "stats";
  signal_id?: string;
  symbol?: string;
  trade_type?: "buy" | "sell";
  entry?: number;
  sl?: number;
  tp?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  lot_size?: number;
  trade_id?: string;
  tp_level?: number;
}

interface Credentials {
  token: string;
  login: string;
  password: string;
  server: string;
}

// =========================================================
// LOAD MT5 CREDENTIALS
// =========================================================

async function loadCredentials(
  supabase: any
): Promise<Credentials> {
  const keys = [
    "METAAPI_TOKEN",
    "MT5_LOGIN",
    "MT5_PASSWORD",
    "MT5_SERVER",
  ];

  const values: Record<string, string> = {};

  try {
    const { data, error } = await supabase
      .from("integration_settings")
      .select("key,value")
      .in("key", keys);

    if (error) {
      console.error(
        "integration_settings error:",
        error.message
      );
    }

    for (const row of data || []) {
      values[row.key] = String(row.value || "").trim();
    }
  } catch (error) {
    console.error(
      "integration_settings fetch failed:",
      String(error)
    );
  }

  const token =
    values.METAAPI_TOKEN ||
    Deno.env.get("METAAPI_TOKEN")?.trim() ||
    "";

  const login =
    values.MT5_LOGIN ||
    Deno.env.get("MT5_LOGIN")?.trim() ||
    "";

  const password =
    values.MT5_PASSWORD ||
    Deno.env.get("MT5_PASSWORD")?.trim() ||
    "";

  const server =
    values.MT5_SERVER ||
    Deno.env.get("MT5_SERVER")?.trim() ||
    "";

  console.log(
    "MT5 credentials loaded:",
    "token=" + Boolean(token),
    "login=" + Boolean(login),
    "password=" + Boolean(password),
    "server=" + Boolean(server)
  );

  return {
    token,
    login,
    password,
    server,
  };
}

// =========================================================
// MAIN SERVER
// =========================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const SUPABASE_URL =
      Deno.env.get("SUPABASE_URL")!;

    const SUPABASE_SERVICE_ROLE_KEY =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    const creds = await loadCredentials(supabase);

    if (!creds.token) {
      throw new Error(
        "MetaApi token not configured (checked integration_settings table and secrets)"
      );
    }

    if (!creds.login || !creds.server) {
      throw new Error(
        "MT5 login/server not configured (checked integration_settings table and secrets)"
      );
    }

    const body: TradeRequest = await req.json();

    console.log(
      "MT5 Demo Trade request:",
      body.action
    );

    const {
      accountId,
      clientApi,
    } = await getOrCreateMetaApiAccount(
      creds.token,
      creds.login,
      creds.password,
      creds.server
    );

    switch (body.action) {
      case "open":
        return await openTrade(
          supabase,
          creds.token,
          accountId,
          clientApi,
          body
        );

      case "open_multi":
        return await openMultiTrade(
          supabase,
          creds.token,
          accountId,
          clientApi,
          body
        );

      case "check":
        return await checkTrades(
          supabase,
          creds.token,
          accountId,
          clientApi
        );

      case "close":
        return await closeTrade(
          supabase,
          creds.token,
          accountId,
          clientApi,
          body.trade_id!
        );

      case "stats":
        return await getStats(supabase);

      default:
        throw new Error("Invalid action");
    }
  } catch (error) {
    console.error(
      "MT5 Demo Trade error:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
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

// =========================================================
// GET OR CREATE METAAPI ACCOUNT
// =========================================================

async function getOrCreateMetaApiAccount(
  token: string,
  login: string,
  password: string,
  server: string
): Promise<{
  accountId: string;
  clientApi: string;
}> {
  const listResponse = await fetch(
    `${PROVISIONING}/users/current/accounts`,
    {
      headers: {
        "auth-token": token,
      },
    }
  );

  if (!listResponse.ok) {
    throw new Error(
      `Failed to list MetaApi accounts: ${await listResponse.text()}`
    );
  }

  const raw = await listResponse.json();

  const accounts = Array.isArray(raw)
    ? raw
    : raw?.items || [];

  let account =
    accounts.find(
      (acc: any) =>
        String(acc.login) === String(login) &&
        String(acc.server || "").toLowerCase() ===
          String(server).toLowerCase()
    ) ||
    accounts.find(
      (acc: any) =>
        String(acc.login) === String(login)
    );

  if (!account) {
    console.log(
      "Creating new MetaApi account..."
    );

    const createResponse = await fetch(
      `${PROVISIONING}/users/current/accounts`,
      {
        method: "POST",
        headers: {
          "auth-token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Demo-${login}`,
          type: "cloud",
          login: login,
          password: password,
          server: server,
          platform: "mt5",
          magic: 123456,
        }),
      }
    );

    if (!createResponse.ok) {
      throw new Error(
        `Failed to create MetaApi account: ${await createResponse.text()}`
      );
    }

    account = await createResponse.json();

    console.log(
      "Created MetaApi account:",
      account._id || account.id
    );
  } else {
    console.log(
      "Using existing MetaApi account:",
      account._id || account.id
    );
  }

  const accountId =
    account._id || account.id;

  const state = String(
    account?.state || ""
  ).toUpperCase();

  if (
    state &&
    state !== "DEPLOYED" &&
    state !== "DEPLOYING"
  ) {
    await fetch(
      `${PROVISIONING}/users/current/accounts/${accountId}/deploy`,
      {
        method: "POST",
        headers: {
          "auth-token": token,
        },
      }
    );

    await new Promise((resolve) =>
      setTimeout(resolve, 5000)
    );
  }

  const region =
    account?.region ||
    account?.primaryReplica?.region ||
    null;

  const clientApi = region
    ? `https://mt-client-api-v1.${region}.agiliumtrade.ai`
    : DEFAULT_CLIENT_API;

  console.log(
    "MT5 account ready:",
    accountId,
    "region:",
    region || "default"
  );

  return {
    accountId,
    clientApi,
  };
}

// =========================================================
// NORMALIZE SYMBOL
// =========================================================

function normalizeSym(v: string): string {
  return String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

// =========================================================
// SYMBOL ALIASES
// =========================================================

function getSymbolAliases(
  appSymbol: string
): string[] {
  const n = normalizeSym(appSymbol);

  if (
    n.includes("XAU") ||
    n.includes("GOLD")
  ) {
    return [
      "XAUUSD",
      "GOLD",
      "XAUUSDM",
    ];
  }

  if (
    n.includes("XAG") ||
    n.includes("SILVER")
  ) {
    return [
      "XAGUSD",
      "SILVER",
    ];
  }

  if (
    n.includes("BOOM") &&
    n.includes("1000")
  ) {
    return [
      "BOOM1000INDEX",
      "BOOM1000",
    ];
  }

  if (
    n.includes("BOOM") &&
    n.includes("500")
  ) {
    return [
      "BOOM500INDEX",
      "BOOM500",
    ];
  }

  if (
    n.includes("CRASH") &&
    n.includes("1000")
  ) {
    return [
      "CRASH1000INDEX",
      "CRASH1000",
    ];
  }

  if (
    n.includes("CRASH") &&
    n.includes("500")
  ) {
    return [
      "CRASH500INDEX",
      "CRASH500",
    ];
  }

  if (
    n.includes("VOL") &&
    n.includes("75")
  ) {
    return [
      "VOLATILITY75INDEX",
      "VOL75",
      "V75",
    ];
  }

  if (
    n.includes("VOL") &&
    n.includes("100")
  ) {
    return [
      "VOLATILITY100INDEX",
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

  return [n];
}

// =========================================================
// RESOLVE BROKER SYMBOL
// =========================================================

async function resolveBrokerSymbol(
  token: string,
  clientApi: string,
  accountId: string,
  appSymbol: string
): Promise<string> {
  try {
    const response = await fetch(
      `${clientApi}/users/current/accounts/${accountId}/symbols`,
      {
        headers: {
          "auth-token": token,
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      return appSymbol;
    }

    const raw = await response.json();

    const list: string[] = (
      Array.isArray(raw)
        ? raw
        : raw?.symbols ||
          raw?.items ||
          []
    )
      .map((s: any) =>
        typeof s === "string"
          ? s
          : s?.symbol || s?.name
      )
      .filter(Boolean);

    const normalized = list.map(
      (s) => ({
        original: s,
        n: normalizeSym(s),
      })
    );

    const aliases =
      getSymbolAliases(appSymbol);

    // EXACT MATCH
    for (const alias of aliases) {
      const wanted =
        normalizeSym(alias);

      const exact =
        normalized.find(
          (x) => x.n === wanted
        );

      if (exact) {
        console.log(
          `Symbol EXACT: ${appSymbol} -> ${exact.original}`
        );

        return exact.original;
      }
    }

    // PREFIX MATCH
    for (const alias of aliases) {
      const wanted =
        normalizeSym(alias);

      const match =
        normalized.find(
          (x) =>
            x.n.startsWith(wanted) ||
            wanted.startsWith(x.n)
        );

      if (match) {
        console.log(
          `Symbol PREFIX: ${appSymbol} -> ${match.original}`
        );

        return match.original;
      }
    }

    // CONTAINS MATCH
    for (const alias of aliases) {
      const wanted =
        normalizeSym(alias);

      if (wanted.length < 4) {
        continue;
      }

      const match =
        normalized.find(
          (x) =>
            x.n.includes(wanted)
        );

      if (match) {
        console.log(
          `Symbol CONTAINS: ${appSymbol} -> ${match.original}`
        );

        return match.original;
      }
    }

    console.log(
      `No broker symbol match for ${appSymbol}, using as-is`
    );

    return appSymbol;
  } catch (error) {
    console.error(
      "resolveBrokerSymbol error:",
      String(error)
    );

    return appSymbol;
  }
}

// =========================================================
// RESOLVE BROKER VALID VOLUME
// =========================================================

async function resolveValidVolume(
  token: string,
  clientApi: string,
  accountId: string,
  brokerSymbol: string,
  requestedVolume: number
): Promise<number> {
  try {
    const response = await fetch(
      `${clientApi}/users/current/accounts/${accountId}/symbols/${encodeURIComponent(
        brokerSymbol
      )}/specification`,
      {
        headers: {
          "auth-token": token,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return requestedVolume;
    }

    const spec =
      await response.json();

    const minVolume =
      Number(spec?.minVolume) || 0;

    const maxVolume =
      Number(spec?.maxVolume) ||
      Infinity;

    const step =
      Number(spec?.volumeStep) ||
      minVolume ||
      0.01;

    if (!minVolume) {
      return requestedVolume;
    }

    let volume =
      requestedVolume;

    if (volume < minVolume) {
      volume = minVolume;
    }

    if (volume > maxVolume) {
      volume = maxVolume;
    }

    if (step > 0) {
      const steps = Math.round(
        (volume - minVolume) /
          step
      );

      volume =
        minVolume +
        steps * step;
    }

    volume = Number(
      volume.toFixed(2)
    );

    console.log(
      `Volume for ${brokerSymbol}: requested ${requestedVolume} -> broker min ${minVolume}/step ${step} -> using ${volume}`
    );

    return volume;
  } catch (error) {
    console.error(
      "resolveValidVolume error:",
      String(error)
    );

    return requestedVolume;
  }
}

// =========================================================
// OPEN SINGLE TRADE
// =========================================================

async function openTrade(
  supabase: any,
  token: string,
  accountId: string,
  clientApi: string,
  body: TradeRequest
): Promise<Response> {
  const result =
    await placeSingleTrade(
      supabase,
      token,
      accountId,
      clientApi,
      body
    );

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: result.error,
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

  return new Response(
    JSON.stringify({
      success: true,
      trade_id:
        result.trade_id,
      mt5_ticket:
        result.mt5_ticket,
      message:
        "Trade opened successfully",
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

// =========================================================
// OPEN MULTI TRADE
// =========================================================

async function openMultiTrade(
  supabase: any,
  token: string,
  accountId: string,
  clientApi: string,
  body: TradeRequest
): Promise<Response> {
  const {
    tp1,
    tp2,
    tp3,
    sl,
    lot_size = 0.01,
  } = body;

  const legs: {
    tp_level: number;
    tp: number | undefined;
  }[] = [
    {
      tp_level: 1,
      tp: tp1,
    },
    {
      tp_level: 2,
      tp: tp2,
    },
    {
      tp_level: 3,
      tp: tp3,
    },
  ].filter(
    (leg) =>
      leg.tp &&
      leg.tp > 0
  );

  if (legs.length === 0) {
    return new Response(
      JSON.stringify({
        error:
          "At least one of tp1/tp2/tp3 is required for open_multi",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  }

  const results: any[] = [];

  for (const leg of legs) {
    const result =
      await placeSingleTrade(
        supabase,
        token,
        accountId,
        clientApi,
        {
          ...body,
          tp: leg.tp,
          sl,
          lot_size,
          tp_level:
            leg.tp_level,
        }
      );

    results.push({
      tp_level:
        leg.tp_level,
      ...result,
    });
  }

  const opened =
    results.filter(
      (r) => r.success
    ).length;

  return new Response(
    JSON.stringify({
      success:
        opened > 0,
      opened,
      total:
        legs.length,
      results,
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

// =========================================================
// COMMODITY DETECTION
// =========================================================

function isCommoditySymbol(
  appSymbol: string,
  brokerSymbol: string
): boolean {
  const app =
    normalizeSym(appSymbol);

  const broker =
    normalizeSym(brokerSymbol);

  const commodityKeywords = [
    "XAU",
    "GOLD",
    "XAUUSD",
    "XAG",
    "SILVER",
    "XAGUSD",
    "PLATINUM",
    "PALLADIUM",
    "COPPER",
    "WTI",
    "BRENT",
    "USOIL",
    "UKOIL",
    "OIL",
    "CRUDE",
    "NATGAS",
    "GAS",
  ];

  return (
    commodityKeywords.some(
      (keyword) =>
        app.includes(keyword)
    ) ||
    commodityKeywords.some(
      (keyword) =>
        broker.includes(keyword)
    )
  );
}

// =========================================================
// PLACE SINGLE TRADE
// =========================================================

async function placeSingleTrade(
  supabase: any,
  token: string,
  accountId: string,
  clientApi: string,
  body: TradeRequest
): Promise<{
  success: boolean;
  trade_id?: string;
  mt5_ticket?: any;
  error?: string;
}> {
  const {
    signal_id,
    symbol,
    trade_type,
    entry,
    sl,
    tp,
    lot_size = 0.01,
    tp_level,
  } = body;

  if (!symbol || !trade_type) {
    return {
      success: false,
      error:
        "Symbol and trade type required",
    };
  }

  // Resolve broker's real symbol
  const brokerSymbol =
    await resolveBrokerSymbol(
      token,
      clientApi,
      accountId,
      symbol
    );

  console.log(
    `Symbol resolved: ${symbol} -> ${brokerSymbol}`
  );

  // =======================================================
  // FIX:
  // ALL COMMODITIES = 0.50 LOT
  //
  // XAUUSD / GOLD
  // XAGUSD / SILVER
  // OIL / WTI / BRENT
  // COPPER
  // PLATINUM
  // PALLADIUM
  // NATGAS
  // etc.
  //
  // Frontend lot_size is ignored for commodities.
  // =======================================================

  const commodity =
    isCommoditySymbol(
      symbol,
      brokerSymbol
    );

  const requestedVolume =
    commodity
      ? 0.50
      : lot_size;

  console.log(
    commodity
      ? `COMMODITY TRADE: ${symbol} -> FIXED LOT 0.50`
      : `NORMAL TRADE: ${symbol} -> LOT ${lot_size}`
  );

  // Respect broker min/max/step
  const validVolume =
    await resolveValidVolume(
      token,
      clientApi,
      accountId,
      brokerSymbol,
      requestedVolume
    );

  console.log(
    `FINAL MT5 VOLUME: ${brokerSymbol} -> ${validVolume}`
  );

  // =======================================================
  // INSERT PENDING TRADE
  // =======================================================

  const {
    data: tradeRecord,
    error: insertError,
  } = await supabase
    .from("mt5_demo_trades")
    .insert({
      signal_id,
      symbol,
      trade_type,
      entry_price: entry,
      sl_price: sl,
      tp_price: tp,
      lot_size: validVolume,
      status: "pending",
      tp_level:
        tp_level ?? null,
    })
    .select()
    .single();

  if (insertError) {
    return {
      success: false,
      error:
        `Failed to create trade record: ${insertError.message}`,
    };
  }

  try {
    // =====================================================
    // METAAPI TRADE PAYLOAD
    // =====================================================

    const tradePayload: any = {
      actionType:
        trade_type.toUpperCase() ===
        "BUY"
          ? "ORDER_TYPE_BUY"
          : "ORDER_TYPE_SELL",

      symbol:
        brokerSymbol,

      // FINAL VOLUME
      volume:
        validVolume,

      comment:
        tp_level
          ? `LiveSignal TP${tp_level}`
          : "LiveSignal",
    };

    if (sl && sl > 0) {
      tradePayload.stopLoss =
        sl;
    }

    if (tp && tp > 0) {
      tradePayload.takeProfit =
        tp;
    }

    console.log(
      "Opening MT5 trade:",
      tradePayload
    );

    // =====================================================
    // SEND ORDER
    // =====================================================

    const tradeResponse =
      await fetch(
        `${clientApi}/users/current/accounts/${accountId}/trade`,
        {
          method: "POST",
          headers: {
            "auth-token":
              token,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            tradePayload
          ),
        }
      );

    const tradeResult =
      await tradeResponse.json();

    console.log(
      "Trade result:",
      tradeResult
    );

    const ticket =
      tradeResult.positionId ||
      tradeResult.orderId;

    const isRejected =
      !tradeResponse.ok ||
      tradeResult.error ||
      !ticket ||
      (
        tradeResult.numericCode !==
          undefined &&
        tradeResult.numericCode !==
          0 &&
        tradeResult.numericCode !==
          10009
      ) ||
      (
        tradeResult.stringCode &&
        ![
          "TRADE_RETCODE_DONE",
          "TRADE_RETCODE_PLACED",
        ].includes(
          tradeResult.stringCode
        )
      );

    if (isRejected) {
      throw new Error(
        tradeResult.message ||
          tradeResult.stringCode ||
          tradeResult.error ||
          `Broker rejected the order (no ticket returned): ${JSON.stringify(
            tradeResult
          )}`
      );
    }

    // =====================================================
    // UPDATE SUCCESS
    // =====================================================

    await supabase
      .from("mt5_demo_trades")
      .update({
        mt5_ticket:
          ticket,
        status:
          "open",
        open_time:
          new Date().toISOString(),
        entry_price:
          tradeResult.price ||
          entry,
      })
      .eq(
        "id",
        tradeRecord.id
      );

    return {
      success: true,
      trade_id:
        tradeRecord.id,
      mt5_ticket:
        ticket,
    };
  } catch (error) {
    // =====================================================
    // UPDATE ERROR
    // =====================================================

    await supabase
      .from("mt5_demo_trades")
      .update({
        status:
          "error",
        error_message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      })
      .eq(
        "id",
        tradeRecord.id
      );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    };
  }
}

// =========================================================
// CHECK TRADES
// =========================================================

async function checkTrades(
  supabase: any,
  token: string,
  accountId: string,
  clientApi: string
): Promise<Response> {
  const {
    data: openTrades,
    error,
  } = await supabase
    .from("mt5_demo_trades")
    .select("*")
    .eq(
      "status",
      "open"
    );

  if (error) {
    throw new Error(
      `Failed to fetch open trades: ${error.message}`
    );
  }

  if (
    !openTrades ||
    openTrades.length === 0
  ) {
    return new Response(
      JSON.stringify({
        message:
          "No open trades to check",
        updated: 0,
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

  // =======================================================
  // CURRENT POSITIONS
  // =======================================================

  const positionsResponse =
    await fetch(
      `${clientApi}/users/current/accounts/${accountId}/positions`,
      {
        headers: {
          "auth-token":
            token,
        },
      }
    );

  const positions =
    await positionsResponse.json();

  console.log(
    "Current positions:",
    positions
  );

  // =======================================================
  // HISTORY
  // =======================================================

  const historyResponse =
    await fetch(
      `${clientApi}/users/current/accounts/${accountId}/history-deals?startTime=${new Date(
        Date.now() -
          7 *
            24 *
            60 *
            60 *
            1000
      ).toISOString()}`,
      {
        headers: {
          "auth-token":
            token,
        },
      }
    );

  const history =
    await historyResponse.json();

  console.log(
    "Recent history:",
    history
  );

  let updated = 0;

  // =======================================================
  // CHECK EVERY TRADE
  // =======================================================

  for (const trade of openTrades) {
    const openPosition =
      positions.find(
        (p: any) =>
          p.id ===
            trade.mt5_ticket ||
          p.positionId ===
            trade.mt5_ticket
      );

    if (openPosition) {
      // Still open
      await supabase
        .from("mt5_demo_trades")
        .update({
          profit_loss:
            openPosition.profit,
        })
        .eq(
          "id",
          trade.id
        );
    } else {
      // Closed
      const closedDeal =
        history.find(
          (h: any) =>
            h.positionId ===
              trade.mt5_ticket &&
            h.entryType ===
              "DEAL_ENTRY_OUT"
        );

      if (closedDeal) {
        const result =
          closedDeal.profit > 0
            ? "win"
            : closedDeal.profit < 0
            ? "loss"
            : "breakeven";

        await supabase
          .from("mt5_demo_trades")
          .update({
            status:
              "closed",
            close_time:
              closedDeal.time,
            close_price:
              closedDeal.price,
            profit_loss:
              closedDeal.profit,
            result,
          })
          .eq(
            "id",
            trade.id
          );

        updated++;

        console.log(
          `Trade ${trade.id} closed with ${result}: $${closedDeal.profit}`
        );

        // TP1 -> BE
        if (
          trade.tp_level ===
            1 &&
          result === "win" &&
          trade.signal_id
        ) {
          await moveSiblingsToBreakeven(
            supabase,
            token,
            clientApi,
            accountId,
            trade,
            positions
          );
        }
      }
    }
  }

  return new Response(
    JSON.stringify({
      message:
        "Trades checked",
      updated,
      open_positions:
        positions.length,
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

// =========================================================
// MOVE TP2 / TP3 TO BREAKEVEN
// =========================================================

async function moveSiblingsToBreakeven(
  supabase: any,
  token: string,
  clientApi: string,
  accountId: string,
  tp1Trade: any,
  positions: any[]
): Promise<void> {
  const {
    data: siblings,
    error,
  } = await supabase
    .from("mt5_demo_trades")
    .select("*")
    .eq(
      "signal_id",
      tp1Trade.signal_id
    )
    .eq(
      "status",
      "open"
    )
    .in(
      "tp_level",
      [2, 3]
    );

  if (
    error ||
    !siblings ||
    siblings.length === 0
  ) {
    return;
  }

  const breakevenPrice =
    tp1Trade.entry_price;

  for (const sibling of siblings) {
    if (
      Number(
        sibling.sl_price
      ) ===
      Number(
        breakevenPrice
      )
    ) {
      continue;
    }

    const position =
      positions.find(
        (p: any) =>
          p.id ===
            sibling.mt5_ticket ||
          p.positionId ===
            sibling.mt5_ticket
      );

    if (!position) {
      continue;
    }

    try {
      const response =
        await fetch(
          `${clientApi}/users/current/accounts/${accountId}/trade`,
          {
            method: "POST",
            headers: {
              "auth-token":
                token,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              actionType:
                "POSITION_MODIFY",

              positionId:
                sibling.mt5_ticket,

              stopLoss:
                breakevenPrice,

              takeProfit:
                position.takeProfit,
            }),
          }
        );

      const result =
        await response.json();

      const ok =
        response.ok &&
        !result.error &&
        (
          result.numericCode ===
            undefined ||
          result.numericCode ===
            0 ||
          result.numericCode ===
            10009
        );

      if (ok) {
        await supabase
          .from(
            "mt5_demo_trades"
          )
          .update({
            sl_price:
              breakevenPrice,
          })
          .eq(
            "id",
            sibling.id
          );

        console.log(
          `Moved TP${sibling.tp_level} trade ${sibling.id} SL to breakeven (${breakevenPrice})`
        );
      } else {
        console.error(
          `Failed to move SL to breakeven for trade ${sibling.id}:`,
          result
        );
      }
    } catch (err) {
      console.error(
        `Breakeven modify error for trade ${sibling.id}:`,
        String(err)
      );
    }
  }
}

// =========================================================
// CLOSE TRADE
// =========================================================

async function closeTrade(
  supabase: any,
  token: string,
  accountId: string,
  clientApi: string,
  tradeId: string
): Promise<Response> {
  const {
    data: trade,
    error,
  } = await supabase
    .from("mt5_demo_trades")
    .select("*")
    .eq(
      "id",
      tradeId
    )
    .single();

  if (error || !trade) {
    throw new Error(
      "Trade not found"
    );
  }

  if (
    trade.status !==
    "open"
  ) {
    throw new Error(
      "Trade is not open"
    );
  }

  // =======================================================
  // CLOSE POSITION
  // =======================================================

  const closeResponse =
    await fetch(
      `${clientApi}/users/current/accounts/${accountId}/trade`,
      {
        method: "POST",
        headers: {
          "auth-token":
            token,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          actionType:
            "POSITION_CLOSE_ID",
          positionId:
            trade.mt5_ticket,
        }),
      }
    );

  const closeResult =
    await closeResponse.json();

  console.log(
    "Close result:",
    closeResult
  );

  if (!closeResponse.ok) {
    throw new Error(
      closeResult.message ||
        "Failed to close trade"
    );
  }

  // =======================================================
  // UPDATE CLOSED TRADE
  // =======================================================

  await supabase
    .from("mt5_demo_trades")
    .update({
      status:
        "closed",

      close_time:
        new Date().toISOString(),

      close_price:
        closeResult.price,

      profit_loss:
        closeResult.profit ||
        0,

      result:
        (closeResult.profit ||
          0) > 0
          ? "win"
          : (closeResult.profit ||
              0) < 0
          ? "loss"
          : "breakeven",
    })
    .eq(
      "id",
      tradeId
    );

  return new Response(
    JSON.stringify({
      success: true,
      message:
        "Trade closed",
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

// =========================================================
// STATS
// =========================================================

async function getStats(
  supabase: any
): Promise<Response> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_mt5_demo_stats",
    {
      p_days: 30,
    }
  );

  if (error) {
    throw new Error(
      `Failed to get stats: ${error.message}`
    );
  }

  return new Response(
    JSON.stringify(
      data?.[0] || {
        total_trades: 0,
        total_wins: 0,
        total_losses: 0,
        total_breakeven: 0,
        total_profit: 0,
        win_rate: 0,
        accuracy_percent: 0,
      }
    ),
    {
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    }
  );
}
