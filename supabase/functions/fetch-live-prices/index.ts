import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FINNHUB_API_KEY = Deno.env.get("FINNHUB_API_KEY") || "";

/* =========================================================
   NORMALIZE SYMBOL
========================================================= */
function normalizeSymbol(value: string): string {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/* =========================================================
   DERIV SYNTHETIC INDICES
========================================================= */
const DERIV_WS_URL = "wss://ws.derivws.com/websockets/v3?app_id=1089";

function getDerivSymbol(appPair: string): string | null {
  const n = normalizeSymbol(appPair);
  if (n.includes("BOOM") && n.includes("1000")) return "BOOM1000";
  if (n.includes("BOOM") && n.includes("500")) return "BOOM500";
  if (n.includes("CRASH") && n.includes("1000")) return "CRASH1000";
  if (n.includes("CRASH") && n.includes("500")) return "CRASH500";
  if (n.includes("STEP")) return "stpRNG";
  if (n.includes("JUMP")) {
    if (n.includes("10")) return "JD10";
    if (n.includes("25")) return "JD25";
    if (n.includes("50")) return "JD50";
    if (n.includes("75")) return "JD75";
    if (n.includes("100")) return "JD100";
    return null;
  }
  if (n.includes("VOL")) {
    const oneSecond = n.includes("1S") || n.includes("1SEC");
    if (n.includes("100")) return oneSecond ? "1HZ100V" : "R_100";
    if (n.includes("75")) return oneSecond ? "1HZ75V" : "R_75";
    if (n.includes("50")) return oneSecond ? "1HZ50V" : "R_50";
    if (n.includes("25")) return oneSecond ? "1HZ25V" : "R_25";
    if (n.includes("10")) return oneSecond ? "1HZ10V" : "R_10";
  }
  return null;
}

async function fetchDerivPricesBatch(symbols: string[]): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  if (symbols.length === 0) return results;

  return await new Promise((resolve) => {
    let settled = false;
    let ws: WebSocket;
    const pending = new Map<number, string>();
    let reqCounter = 1;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(overallTimer);
      try { ws?.close(); } catch {}
      resolve(results);
    };

    const overallTimer = setTimeout(() => {
      finish();
    }, 10000);

    try {
      ws = new WebSocket(DERIV_WS_URL);
    } catch {
      clearTimeout(overallTimer);
      resolve(results);
      return;
    }

    ws.onopen = () => {
      for (const symbol of symbols) {
        const reqId = reqCounter++;
        pending.set(reqId, symbol);
        ws.send(JSON.stringify({
          ticks_history: symbol,
          adjust_start_time: 1,
          count: 1,
          end: "latest",
          start: 1,
          style: "ticks",
          req_id: reqId,
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(typeof event.data === "string" ? event.data : "{}");
        const reqId = Number(data?.req_id) || 0;
        const symbol = pending.get(reqId);
        if (!symbol) return;

        if (!data?.error) {
          const prices = data?.history?.prices;
          if (Array.isArray(prices) && prices.length > 0) {
            const price = Number(prices[prices.length - 1]);
            if (price > 0) results[symbol] = price.toFixed(2);
          }
        }
        pending.delete(reqId);
        if (pending.size === 0) finish();
      } catch {}
    };

    ws.onerror = () => finish();
    ws.onclose = () => finish();
  });
}

/* =========================================================
   FINNHUB PRICES (GOLD, BTC, FOREX)
========================================================= */
async function fetchFinnhubPrice(pair: string): Promise<string | null> {
  if (!FINNHUB_API_KEY) return null;
  const n = normalizeSymbol(pair);

  try {
    // Crypto (BTC/USD)
    if (n.includes("BTC")) {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=BINANCE:BTCUSDT&token=${FINNHUB_API_KEY}`);
      const data = await res.json();
      return data?.c ? Number(data.c).toFixed(2) : null;
    }

    // Gold (XAU/USD)
    if (n.includes("XAU") || n.includes("GOLD")) {
      const res = await fetch(`https://finnhub.io/api/v1/forex/rates?base=XAU&token=${FINNHUB_API_KEY}`);
      const data = await res.json();
      return data?.quote?.USD ? Number(data.quote.USD).toFixed(2) : null;
    }

    // Major Forex Pairs (EURUSD, GBPUSD, etc.)
    if (n.length === 6) {
      const base = n.substring(0, 3);
      const target = n.substring(3, 6);
      const res = await fetch(`https://finnhub.io/api/v1/forex/rates?base=${base}&token=${FINNHUB_API_KEY}`);
      const data = await res.json();
      if (data?.quote && data.quote[target]) {
        const decimals = target === "JPY" ? 3 : 5;
        return Number(data.quote[target]).toFixed(decimals);
      }
    }
  } catch (error) {
    console.error(`Finnhub error for ${pair}:`, String(error));
  }
  return null;
}

/* =========================================================
   FETCH ALL PRICES
========================================================= */
async function fetchAllPrices(pairs: string[]): Promise<Record<string, string>> {
  const prices: Record<string, string> = {};
  const derivPairs: { pair: string; symbol: string }[] = [];
  const finnhubPairs: string[] = [];

  for (const pair of pairs) {
    const derivSymbol = getDerivSymbol(pair);
    if (derivSymbol) {
      derivPairs.push({ pair, symbol: derivSymbol });
    } else {
      finnhubPairs.push(pair);
    }
  }

  // 1. Fetch Deriv Synthetic Prices
  if (derivPairs.length > 0) {
    const uniqueSymbols = [...new Set(derivPairs.map((d) => d.symbol))];
    const symbolPrices = await fetchDerivPricesBatch(uniqueSymbols);
    for (const { pair, symbol } of derivPairs) {
      if (symbolPrices[symbol]) prices[pair] = symbolPrices[symbol];
    }
  }

  // 2. Fetch Finnhub Prices
  for (const pair of finnhubPairs) {
    const price = await fetchFinnhubPrice(pair);
    if (price) prices[pair] = price;
  }

  return prices;
}

function parsePrice(value: string): number {
  if (!value) return 0;
  const cleaned = String(value).replace(/[^\d.\-]/g, "");
  return parseFloat(cleaned) || 0;
}

/* =========================================================
   TELEGRAM NOTIFICATIONS
========================================================= */
async function notifyTelegramUpdate(signal: Record<string, any>, updateType: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/telegram-signal-post`, {
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
    });
  } catch (error) {
    console.error(`Telegram update notify error:`, String(error));
  }
}

/* =========================================================
   SERVER ROUTE
========================================================= */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const url = new URL(req.url);
    let pairs: string[] = [];

    const pairsParam = url.searchParams.get("pairs");
    if (pairsParam) {
      pairs = pairsParam.split(",").map((x) => x.trim()).filter(Boolean);
    } else if (req.method === "POST") {
      try {
        const body = await req.json();
        if (Array.isArray(body?.pairs)) {
          pairs = body.pairs.map((x: any) => String(x)).filter(Boolean);
        }
      } catch {}
    }

    /* DIRECT PRICE REQUEST */
    if (pairs.length > 0) {
      const prices = await fetchAllPrices(pairs);
      return new Response(
        JSON.stringify({ success: Object.keys(prices).length > 0, source: "Finnhub+Deriv", prices }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* UPDATE SIGNALS AUTOMATICALLY */
    const { data: signals, error } = await supabase
      .from("signals")
      .select("id,pair,type,entry,tp1,tp2,tp3,tp4,sl,tp1_hit,tp2_hit,tp3_hit,tp4_hit,sl_hit,status,signal_status,entry_mode,limit_entry_price,is_activated,published")
      .eq("published", true)
      .not("signal_status", "ilike", "close");

    if (error) throw error;

    if (!signals || signals.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active signals", source: "Finnhub+Deriv", prices: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uniquePairs = [...new Set(signals.map((s) => s.pair))];
    const prices = await fetchAllPrices(uniquePairs);

    let updatedCount = 0;
    let activatedCount = 0;
    const telegramPromises: Promise<void>[] = [];

    for (const signal of signals) {
      const current = prices[signal.pair];
      if (!current) continue;

      const currentPrice = parseFloat(current);
      const updates: Record<string, any> = { current_price: current };
      const runningState: Record<string, any> = { ...signal };
      const hitEvents: { type: string; snapshot: Record<string, any> }[] = [];

      const isBuy = String(signal.type || "").toLowerCase() === "buy";
      const lifecycle = String(signal.signal_status || signal.status || "").toLowerCase();
      const isLimit = signal.entry_mode === "limit";
      const isPending = lifecycle === "pending";
      const limit = typeof signal.limit_entry_price === "number" ? signal.limit_entry_price : 0;

      if (isLimit && isPending && limit > 0) {
        const activate = isBuy ? currentPrice <= limit : currentPrice >= limit;
        if (activate) {
          updates.signal_status = "open";
          updates.status = "open";
          updates.is_activated = true;
          updates.activated_at = new Date().toISOString();
          activatedCount++;
        }
      }

      const isOpen = lifecycle === "open" || updates.signal_status === "open";
      if (!isOpen) {
        await supabase.from("signals").update(updates).eq("id", signal.id);
        updatedCount++;
        continue;
      }

      const entry = parsePrice(signal.entry || "");

      // TP1
      if (!signal.tp1_hit && signal.tp1) {
        const tp = parsePrice(signal.tp1);
        if (tp > 0 && (isBuy ? currentPrice >= tp : currentPrice <= tp)) {
          updates.tp1_hit = true;
          updates.profit_note = "TP 1 Hit ✅ SL moved to B.E";
          if (entry > 0) updates.sl = String(entry);
          runningState.tp1_hit = true;
          runningState.profit_note = updates.profit_note;
          if (updates.sl) runningState.sl = updates.sl;
          hitEvents.push({ type: "tp1_hit", snapshot: { ...runningState } });
        }
      }

      // TP2
      if (!signal.tp2_hit && signal.tp2) {
        const tp = parsePrice(signal.tp2);
        if (tp > 0 && (isBuy ? currentPrice >= tp : currentPrice <= tp)) {
          updates.tp2_hit = true;
          updates.profit_note = "TP 2 Cleared! Secure More Profits 💰";
          runningState.tp2_hit = true;
          runningState.profit_note = updates.profit_note;
          hitEvents.push({ type: "tp2_hit", snapshot: { ...runningState } });
        }
      }

      // TP3
      if (!signal.tp3_hit && signal.tp3) {
        const tp = parsePrice(signal.tp3);
        if (tp > 0 && (isBuy ? currentPrice >= tp : currentPrice <= tp)) {
          updates.tp3_hit = true;
          updates.signal_status = "close";
          updates.status = "close";
          updates.profit_note = "TP 3 Final Target Hit! 🎊 Maximum Profit Secured ✅";
          runningState.tp3_hit = true;
          runningState.profit_note = updates.profit_note;
          hitEvents.push({ type: "tp3_hit", snapshot: { ...runningState } });
        }
      }

      // TP4
      if (!signal.tp4_hit && signal.tp4) {
        const tp = parsePrice(signal.tp4);
        if (tp > 0 && (isBuy ? currentPrice >= tp : currentPrice <= tp)) {
          updates.tp4_hit = true;
          updates.profit_note = "TP 4 Hit 🚀";
          runningState.tp4_hit = true;
          runningState.profit_note = updates.profit_note;
          hitEvents.push({ type: "tp4_hit", snapshot: { ...runningState } });
        }
      }

      // SL
      const tp1Hit = signal.tp1_hit || updates.tp1_hit;
      if (!signal.sl_hit && signal.sl && !tp1Hit) {
        const sl = parsePrice(signal.sl);
        if (sl > 0 && (isBuy ? currentPrice <= sl : currentPrice >= sl)) {
          updates.sl_hit = true;
          updates.signal_status = "close";
          updates.status = "close";
          updates.profit_note = signal.tp1_hit ? "Break-Even Exit ⚪ (TP1 was already secured)" : "SL Hit ❌";
          runningState.sl_hit = true;
          runningState.profit_note = updates.profit_note;
          hitEvents.push({ type: "sl_hit", snapshot: { ...runningState } });
        }
      }

      await supabase.from("signals").update(updates).eq("id", signal.id);
      updatedCount++;

      for (const event of hitEvents) {
        telegramPromises.push(notifyTelegramUpdate(event.snapshot, event.type));
      }
    }

    await Promise.allSettled(telegramPromises);

    return new Response(
      JSON.stringify({
        success: true,
        source: "Finnhub+Deriv",
        pricesUpdated: updatedCount,
        limitOrdersActivated: activatedCount,
        pairs: Object.keys(prices),
        prices,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-live-prices error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        source: "Finnhub+Deriv",
        error: error instanceof Error ? error.message : "Live price service failed",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
