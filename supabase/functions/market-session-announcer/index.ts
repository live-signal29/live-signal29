import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =========================================================
// WHY THIS FUNCTION EXISTS
// ---------------------------------------------------------
// Runs on a cron every 15 minutes. Its only job is to notice
// two moments in the week and post ONE Telegram message for
// each, exactly once:
//
//   Friday  ~20:00 UTC  -> "Happy weekend" summary + BTC note
//   Monday  00:00-02:00 UTC -> "Welcome back" / Gold resuming
//
// `market_session_log` is the idempotency guard: since the
// cron fires every 15 minutes, without it we would post the
// same announcement 4-8 times inside the detection window.
// =========================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function isFridayClosingWindow(now: Date): boolean {
  return now.getUTCDay() === 5 && now.getUTCHours() >= 20;
}

function isMondayReopenWindow(now: Date): boolean {
  return now.getUTCDay() === 1 && now.getUTCHours() < 2;
}

// Group entries by the Friday/Monday they belong to (not raw
// calendar date), so the once-per-window check still works
// correctly across the Fri 20:00 -> Mon 02:00 UTC span even
// though it crosses 3 calendar days.
function sessionDateKey(now: Date, type: "friday_close" | "monday_reopen"): string {
  const d = new Date(now);
  if (type === "friday_close") {
    // Same calendar date all through Friday evening — fine as-is.
    return d.toISOString().slice(0, 10);
  }
  // Monday reopen: always key off the Monday's own date.
  return d.toISOString().slice(0, 10);
}

async function alreadyPosted(
  sessionDate: string,
  sessionType: string
): Promise<boolean> {
  const { data } = await supabase
    .from("market_session_log")
    .select("id")
    .eq("session_date", sessionDate)
    .eq("session_type", sessionType)
    .maybeSingle();

  return !!data;
}

async function markPosted(
  sessionDate: string,
  sessionType: string,
  preview: string
) {
  await supabase.from("market_session_log").insert({
    session_date: sessionDate,
    session_type: sessionType,
    message_preview: preview.slice(0, 200),
  });
}

async function getWeekStats() {
  const weekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("signals")
    .select("pair, tp1_hit, tp2_hit, tp3_hit, tp4_hit, sl_hit, created_at")
    .gte("created_at", weekAgo)
    .limit(1000);

  if (error || !data) {
    return { tpHits: 0, slHits: 0, winRate: undefined, bestPair: undefined };
  }

  const tpHits = data.filter(
    (r: any) => r.tp1_hit || r.tp2_hit || r.tp3_hit || r.tp4_hit
  ).length;

  const slHits = data.filter(
    (r: any) => r.sl_hit && !(r.tp1_hit || r.tp2_hit || r.tp3_hit || r.tp4_hit)
  ).length;

  const total = tpHits + slHits;
  const winRate = total > 0 ? Math.round((tpHits / total) * 100) : undefined;

  // Best performer = pair with the most TP hits this week.
  const counts: Record<string, number> = {};
  for (const r of data as any[]) {
    if (r.tp1_hit || r.tp2_hit || r.tp3_hit || r.tp4_hit) {
      counts[r.pair] = (counts[r.pair] || 0) + 1;
    }
  }
  const bestPair = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return { tpHits, slHits, winRate, bestPair };
}

async function postToTelegram(sessionType: string, stats?: unknown) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/telegram-signal-post`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        action: "session_announcement",
        session_type: sessionType,
        stats,
      }),
    }
  );

  return response.json().catch(() => ({ success: false }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const now = new Date();
    const actions: Record<string, unknown> = {};

    if (isFridayClosingWindow(now)) {
      const dateKey = sessionDateKey(now, "friday_close");

      if (!(await alreadyPosted(dateKey, "friday_close"))) {
        const stats = await getWeekStats();
        const result = await postToTelegram("friday_close", stats);

        if (result?.success) {
          await markPosted(
            dateKey,
            "friday_close",
            `TP hits: ${stats.tpHits}, win rate: ${stats.winRate ?? "n/a"}%`
          );
        }

        actions.friday_close = result;
      } else {
        actions.friday_close = "already posted";
      }
    }

    if (isMondayReopenWindow(now)) {
      const dateKey = sessionDateKey(now, "monday_reopen");

      if (!(await alreadyPosted(dateKey, "monday_reopen"))) {
        const result = await postToTelegram("monday_reopen");

        if (result?.success) {
          await markPosted(dateKey, "monday_reopen", "Welcome back message");
        }

        actions.monday_reopen = result;
      } else {
        actions.monday_reopen = "already posted";
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        now: now.toISOString(),
        actions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("market-session-announcer error:", error);
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
