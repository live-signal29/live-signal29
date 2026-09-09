import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =========================================================
// WHY THIS FUNCTION EXISTS
// -----------------------------------------------------------
// Closing OPEN signals (TP/SL hit detection) previously only
// happened in the BROWSER:
//   - src/hooks/useLivePrices.ts -> useAutoTPSLUpdate()
//     -> defined, but never actually called anywhere in the app.
//   - src/hooks/useSignalTimer.ts -> markSignalExpired()
//     -> only fires if a signal has expiry_time set AND someone
//        has that signal card open in a browser tab right now.
//        Auto-generated signals never had expiry_time set.
//
// Net effect: nothing ever closed auto-generated signals.
// auto-generate-signals' `evaluatePair()` check ("only one OPEN
// signal per pair") then kept seeing a pair as free/blocked based
// on a status that could never change, so signals piled up
// instead of one closing before the next opened.
//
// This function does the same TP1-4 / SL check as the (dead)
// client hook, but runs server-side on a cron schedule so it
// works with zero users on the site. It also force-closes a
// signal once its expiry_time has passed with nothing hit, so a
// pair can never stay "stuck open" forever and block new signals.
// =========================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// =========================================================
// LIVE PRICES (same alias table as auto-generate-signals)
// =========================================================

async function fetchLivePrices(pairs: string[]) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/fetch-live-prices?pairs=${pairs.join(",")}`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Live price function failed: ${response.status}`);
  }

  const data = await response.json();
  const prices = data?.prices || data || {};

  const aliases: Record<string, string[]> = {
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

  const result: Record<string, number> = {};

  for (const pair of pairs) {
    const possibleKeys = aliases[pair] || [pair];
    for (const key of possibleKeys) {
      if (prices[key] !== undefined) {
        const num = Number(
          typeof prices[key] === "object" ? prices[key].price : prices[key]
        );
        if (Number.isFinite(num) && num > 0) {
          result[pair] = num;
          break;
        }
      }
    }
  }

  return result;
}

// =========================================================
// HELPERS
// =========================================================

function num(v: unknown): number {
  if (v === null || v === undefined) return NaN;
  const n = Number(String(v).replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function isBuySignal(row: any): boolean {
  const dir = String(row.type || row.action || row.direction || "")
    .trim()
    .toLowerCase();
  return dir === "buy";
}

function checkHit(
  currentPrice: number,
  targetPrice: number,
  isBuy: boolean,
  isSL: boolean
): boolean {
  if (!Number.isFinite(currentPrice) || !Number.isFinite(targetPrice)) {
    return false;
  }
  if (isSL) {
    return isBuy ? currentPrice <= targetPrice : currentPrice >= targetPrice;
  }
  return isBuy ? currentPrice >= targetPrice : currentPrice <= targetPrice;
}

const UPDATE_ORDER = ["sl_hit", "tp4_hit", "tp3_hit", "tp2_hit", "tp1_hit"];

async function notifyTelegram(row: any, updateType: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/telegram-signal-post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        action: "update",
        update_type: updateType,
        signal: {
          ...row,
          type: row.type || row.action || row.direction,
        },
      }),
    });
  } catch (error) {
    console.error("auto-close: telegram notify failed", error);
  }
}

// =========================================================
// MAIN
// =========================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Pull recent signals and filter to "still open" in JS, since
    // different parts of the app have historically written OPEN
    // status with different casing into either `status` or
    // `signal_status`.
    const { data: rows, error } = await supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    const openRows = (rows || []).filter((r: any) => {
      const st = String(r.status || "").toUpperCase();
      const ss = String(r.signal_status || "").toUpperCase();
      return st !== "CLOSED" && ss !== "CLOSE" && ss !== "CLOSED";
    });

    if (openRows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, checked: 0, closed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pairs = [...new Set(openRows.map((r: any) => r.pair))];
    const livePrices = await fetchLivePrices(pairs);

    let closedCount = 0;
    const results: any[] = [];

    for (const row of openRows) {
      const currentPrice = livePrices[row.pair];
      const entry = num(row.entry);
      const sl = num(row.sl ?? row.stop_loss);
      const tp1 = num(row.tp1 ?? row.target1);
      const tp2 = num(row.tp2 ?? row.target2);
      const tp3 = num(row.tp3 ?? row.target3);
      const tp4 = num(row.tp4);

      const isBuy = isBuySignal(row);

      const updates: Record<string, any> = {};
      let newlyHit: string | null = null;

      if (Number.isFinite(currentPrice) && Number.isFinite(entry)) {
        const tp1Hit = row.tp1_hit || checkHit(currentPrice, tp1, isBuy, false);
        const tp2Hit = row.tp2_hit || checkHit(currentPrice, tp2, isBuy, false);
        const tp3Hit = row.tp3_hit || checkHit(currentPrice, tp3, isBuy, false);
        const tp4Hit = row.tp4_hit || checkHit(currentPrice, tp4, isBuy, false);
        const anyTpHit = tp1Hit || tp2Hit || tp3Hit || tp4Hit;

        // Mirror the app's existing rule: don't flag SL once a TP
        // has already been hit (protects against a single noisy
        // tick flip-flopping the outcome).
        const slHit =
          !anyTpHit && checkHit(currentPrice, sl, isBuy, true);

        // NOTE: assigned in ascending TP order so that if multiple
        // targets get crossed in a single tick, the note reflects
        // the highest one reached (mirrors the old client logic).
        if (tp1Hit && !row.tp1_hit) {
          updates.tp1_hit = true;
          updates.sl = String(entry);
          updates.profit_note = "TP 1 Hit ✅ SL moved to B.E";
        }
        if (tp2Hit && !row.tp2_hit) {
          updates.tp2_hit = true;
          updates.profit_note = "TP 2 Hit ✅ More Profit Secured 💰";
        }
        if (tp3Hit && !row.tp3_hit) {
          updates.tp3_hit = true;
          updates.profit_note = "TP 3 Hit 🎊 Maximum Profit Secured ✅";
        }
        if (tp4Hit && !row.tp4_hit) {
          updates.tp4_hit = true;
          updates.profit_note = "TP 4 Final Target Hit 🎊 Maximum Profit Secured ✅";
        }
        if (slHit) {
          updates.sl_hit = true;
          updates.profit_note = "SL Hit ❌ - Staying patient for a better entry.";
        }

        // Final target = highest defined TP (tp4 if present, else tp3).
        const finalTargetHit = Number.isFinite(tp4) ? tp4Hit : tp3Hit;

        if (slHit || finalTargetHit) {
          // IMPORTANT: the frontend (SignalsDashboard.tsx,
          // useSignalNotifications, useAccuracyStats, etc.) all
          // check `signal_status !== "CLOSE"` — exact string, no
          // "D" — to decide what still counts as open. `status`
          // is the separate column the generator's evaluatePair()
          // checks, and everywhere else in the app writes "CLOSED"
          // (with D) for that one. Match both conventions exactly
          // or the signal closes in the backend but still visually
          // shows as OPEN on the dashboard.
          updates.status = "CLOSED";
          updates.signal_status = "CLOSE";
          updates.auto_closed = true;
        }

        for (const key of UPDATE_ORDER) {
          if (updates[key] === true && !row[key]) {
            newlyHit = key;
            break;
          }
        }
      }

      // Safety net: if the signal has passed its expiry_time and
      // nothing has hit yet, force-close it as expired so a pair
      // can never block new signal generation forever.
      if (
        !updates.status &&
        row.expiry_time &&
        new Date(row.expiry_time).getTime() < Date.now()
      ) {
        updates.status = "CLOSED";
        updates.signal_status = "CLOSE";
        updates.auto_closed = true;
      }

      if (Object.keys(updates).length === 0) continue;

      const { error: updateError } = await supabase
        .from("signals")
        .update(updates)
        .eq("id", row.id);

      if (updateError) {
        console.error(`Failed to update signal ${row.id}:`, updateError);
        continue;
      }

      if (updates.status === "CLOSED") closedCount++;

      results.push({ id: row.id, pair: row.pair, updates });

      if (newlyHit) {
        await notifyTelegram({ ...row, ...updates }, newlyHit);
      } else if (updates.status === "CLOSED") {
        // Expired with nothing hit — still worth a quiet close note.
        await notifyTelegram({ ...row, ...updates }, "expired");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: openRows.length,
        closed: closedCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AUTO CLOSE ERROR:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
