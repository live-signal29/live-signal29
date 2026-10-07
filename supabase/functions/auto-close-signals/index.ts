import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PROMO_BATCH_SIZE = 5;
const PROMO_MIN_WINS = 3;

async function fetchLivePrices(pairs) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-live-prices?pairs=${pairs.join(",")}`, {
    headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY },
  });
  if (!response.ok) throw new Error(`Live price function failed: ${response.status}`);
  const data = await response.json();
  const prices = data?.prices || data || {};
  const aliases = {
    "XAU/USD (Gold)": ["XAUUSD", "GOLD", "XAU/USD (Gold)"],
    "XAG/USD (Silver)": ["XAGUSD", "SILVER", "XAG/USD (Silver)"],
    "BTC/USD": ["BTCUSD", "BTCUSDT", "BTC/USD"],
    "ETH/USD": ["ETHUSD", "ETHUSDT", "ETH/USD"],
    "SOL/USD": ["SOLUSD", "SOLUSDT", "SOL/USD"],
    "EUR/USD": ["EURUSD", "EUR/USD"],
    "GBP/USD": ["GBPUSD", "GBP/USD"],
    "USD/JPY": ["USDJPY", "USD/JPY"],
    "AUD/USD": ["AUDUSD", "AUD/USD"],
    "GBP/JPY": ["GBPJPY", "GBP/JPY"],
    "USD/CAD": ["USDCAD", "USD/CAD"],
    "US30": ["US30", "DJI", "DOW"],
    "NASDAQ": ["NASDAQ", "NAS100", "USTEC"],
    "S&P500": ["SP500", "US500"],
    "BOOM 1000": ["BOOM1000", "BOOM 1000"],
    "CRASH 1000": ["CRASH1000", "CRASH 1000"],
    "VOL 75": ["VOL75", "VOL 75"],
    "BOOM 500": ["BOOM500", "BOOM 500"],
    "VOL 100": ["VOL100", "VOL 100"],
  };
  const result = {};
  for (const pair of pairs) {
    const possibleKeys = aliases[pair] || [pair];
    for (const key of possibleKeys) {
      if (prices[key] !== undefined) {
        const n = Number(typeof prices[key] === "object" ? prices[key].price : prices[key]);
        if (Number.isFinite(n) && n > 0) { result[pair] = n; break; }
      }
    }
  }
  return result;
}

function num(v) {
  if (v === null || v === undefined) return NaN;
  const n = Number(String(v).replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function isBuySignal(row) {
  const dir = String(row.type || row.action || row.direction || "").trim().toLowerCase();
  return dir === "buy";
}

function checkHit(currentPrice, targetPrice, isBuy, isSL) {
  if (!Number.isFinite(currentPrice) || !Number.isFinite(targetPrice)) return false;
  if (isSL) return isBuy ? currentPrice <= targetPrice : currentPrice >= targetPrice;
  return isBuy ? currentPrice >= targetPrice : currentPrice <= targetPrice;
}

function getPipMultiplier(pair, category) {
  const p = String(pair || "").toUpperCase();
  if (p.includes("XAU") || p.includes("GOLD")) return 10;
  if (p.includes("XAG") || p.includes("SILVER")) return 100;
  if (p.includes("JPY")) return 100;
  if (String(category || "").toUpperCase() === "FOREX") return 10000;
  return 1;
}

const UPDATE_ORDER = ["sl_hit", "tp4_hit", "tp3_hit", "tp2_hit", "tp1_hit"];

async function notifyTelegram(row, updateType) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/telegram-signal-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY },
      body: JSON.stringify({ action: "update", update_type: updateType, signal: { ...row, type: row.type || row.action || row.direction } }),
    });
  } catch (error) {
    console.error("auto-close: telegram notify failed", error);
  }
}

async function notifyPromo(winCount, closedCount) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/telegram-signal-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, apikey: SUPABASE_SERVICE_ROLE_KEY },
      body: JSON.stringify({ action: "promo_announcement", promo_stats: { winCount, closedCount } }),
    });
  } catch (error) {
    console.error("auto-close: promo notify failed", error);
  }
}

async function checkAndPostPromo() {
  const { count: totalClosed, error: countError } = await supabase
    .from("signals")
    .select("id", { count: "exact", head: true })
    .eq("status", "CLOSED");

  if (countError || !totalClosed) return;

  const batchNumber = Math.floor(totalClosed / PROMO_BATCH_SIZE);
  if (batchNumber < 1) return;

  const { data: alreadyLogged } = await supabase
    .from("promo_batch_log")
    .select("batch_number")
    .eq("batch_number", batchNumber)
    .maybeSingle();

  if (alreadyLogged) return;

  const { data: lastClosed, error: lastClosedError } = await supabase
    .from("signals")
    .select("tp1_hit, tp2_hit, tp3_hit, tp4_hit")
    .eq("status", "CLOSED")
    .order("updated_at", { ascending: false })
    .limit(PROMO_BATCH_SIZE);

  if (lastClosedError || !lastClosed || lastClosed.length < PROMO_BATCH_SIZE) return;

  const winCount = lastClosed.filter((r) => r.tp1_hit || r.tp2_hit || r.tp3_hit || r.tp4_hit).length;

  if (winCount < PROMO_MIN_WINS) {
    await supabase.from("promo_batch_log").insert({
      batch_number: batchNumber,
      win_count: winCount,
      closed_count: PROMO_BATCH_SIZE,
      message_preview: `Skipped - only ${winCount}/${PROMO_BATCH_SIZE} wins`,
    });
    return;
  }

  await notifyPromo(winCount, PROMO_BATCH_SIZE);

  await supabase.from("promo_batch_log").insert({
    batch_number: batchNumber,
    win_count: winCount,
    closed_count: PROMO_BATCH_SIZE,
    message_preview: `Posted - ${winCount}/${PROMO_BATCH_SIZE} wins`,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { data: rows, error } = await supabase.from("signals").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw error;

    const openRows = (rows || []).filter((r) => {
      const st = String(r.status || "").toUpperCase();
      const ss = String(r.signal_status || "").toUpperCase();
      return st !== "CLOSED" && ss !== "CLOSE" && ss !== "CLOSED";
    });

    if (openRows.length === 0) {
      await checkAndPostPromo();
      return new Response(JSON.stringify({ success: true, checked: 0, closed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pairs = [...new Set(openRows.map((r) => r.pair))];
    const livePrices = await fetchLivePrices(pairs);

    let closedCount = 0;
    const results = [];

    for (const row of openRows) {
      const currentPrice = livePrices[row.pair];
      const entry = num(row.entry);
      const sl = num(row.sl ?? row.stop_loss);
      const tp1 = num(row.tp1 ?? row.target1);
      const tp2 = num(row.tp2 ?? row.target2);
      const tp3 = num(row.tp3 ?? row.target3);
      const tp4 = num(row.tp4);
      const isBuy = isBuySignal(row);
      const pipMultiplier = getPipMultiplier(row.pair, row.category);
      const updates = {};
      let newlyHit = null;

      if (Number.isFinite(currentPrice) && Number.isFinite(entry)) {
        const tp1Hit = row.tp1_hit || checkHit(currentPrice, tp1, isBuy, false);
        const tp2Hit = row.tp2_hit || checkHit(currentPrice, tp2, isBuy, false);
        const tp3Hit = row.tp3_hit || checkHit(currentPrice, tp3, isBuy, false);
        const tp4Hit = row.tp4_hit || checkHit(currentPrice, tp4, isBuy, false);
        const slHit = checkHit(currentPrice, sl, isBuy, true);

        if (tp1Hit && !row.tp1_hit) { updates.tp1_hit = true; updates.sl = String(entry); updates.profit_note = "TP 1 Hit \u2705 Boom Boom! \ud83d\udcaf We're in profit now"; }
        if (tp2Hit && !row.tp2_hit) { updates.tp2_hit = true; updates.profit_note = "TP 2 Hit \u2705 Let's gooo! \ud83d\ude80 More profit secured"; }
        if (tp3Hit && !row.tp3_hit) { updates.tp3_hit = true; updates.profit_note = "TP 3 Hit \ud83c\udf8a Massive win! Maximum profit secured"; }
        if (tp4Hit && !row.tp4_hit) { updates.tp4_hit = true; updates.profit_note = "TP 4 Hit \ud83c\udfc6 Final target smashed! Maximum profit secured"; }

        const highestTp = tp4Hit ? tp4 : tp3Hit ? tp3 : tp2Hit ? tp2 : tp1Hit ? tp1 : null;
        const finalTargetHit = Number.isFinite(tp4) ? tp4Hit : tp3Hit;

        if (slHit) {
          updates.sl_hit = true;
          if (highestTp !== null) {
            const tpLevel = tp4Hit ? 4 : tp3Hit ? 3 : tp2Hit ? 2 : 1;
            updates.profit_note = `Closed at Breakeven \u2705 TP${tpLevel} profit secured`;
          } else {
            updates.profit_note = "SL Hit \u274c - Staying patient for a better entry.";
          }
        }

        if (slHit || finalTargetHit) {
          updates.status = "CLOSED";
          updates.signal_status = "CLOSE";
          updates.auto_closed = true;
          const exitLevel = highestTp !== null ? highestTp : slHit ? sl : null;
          if (Number.isFinite(exitLevel) && Number.isFinite(entry)) {
            const priceDiff = Math.abs(exitLevel - entry);
            const pips = priceDiff * pipMultiplier;
            updates.pips_result = pips.toFixed(1);
          }
        }

        for (const key of UPDATE_ORDER) {
          if (updates[key] === true && !row[key]) { newlyHit = key; break; }
        }
      }

      // NOTE (2026-10-07, owner request): the old time-based expiry was REMOVED
      // from here. A signal now stays open until its TP3 (or TP4) or SL is hit,
      // however long that takes -- it is never closed just because time passed.

      if (Object.keys(updates).length === 0) continue;

      const { error: updateError } = await supabase.from("signals").update(updates).eq("id", row.id);
      if (updateError) { console.error(`Failed to update signal ${row.id}:`, updateError); continue; }

      if (updates.status === "CLOSED") closedCount++;
      results.push({ id: row.id, pair: row.pair, updates });

      if (newlyHit) {
        await notifyTelegram({ ...row, ...updates }, newlyHit);
      }
    }

    if (closedCount > 0) {
      await checkAndPostPromo();
    }

    return new Response(JSON.stringify({ success: true, checked: openRows.length, closed: closedCount, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("AUTO CLOSE ERROR:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
