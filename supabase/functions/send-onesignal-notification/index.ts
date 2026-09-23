import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID")!;
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY")!;

async function sendPush(title: string, message: string) {
  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `Basic ${ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["Subscribed Users"],
      headings: { en: title },
      contents: { en: message },
    }),
  });
  const data = await res.json();
  console.log("OneSignal response:", JSON.stringify(data));
  return data;
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { type, table, record, old_record } = payload;

    if (table === "signals" && type === "UPDATE") {
      const oldRow = old_record;
      const newRow = record;

      if (!oldRow.tp1_hit && newRow.tp1_hit) {
        await sendPush("🎯 TP1 Hit!", `${newRow.pair} reached TP1: ${newRow.tp1}`);
      }
      if (!oldRow.tp2_hit && newRow.tp2_hit) {
        await sendPush("🎯 TP2 Hit!", `${newRow.pair} reached TP2: ${newRow.tp2}`);
      }
      if (!oldRow.tp3_hit && newRow.tp3_hit) {
        await sendPush("🎯 TP3 Hit!", `${newRow.pair} reached TP3: ${newRow.tp3}`);
      }
      if (!oldRow.sl_hit && newRow.sl_hit) {
        await sendPush(" Stop Loss Hit", `${newRow.pair} hit SL: ${newRow.sl}`);
      }
      if (oldRow.status !== "CLOSE" && newRow.status === "CLOSE") {
        await sendPush("✅ Signal Closed", `${newRow.pair} signal has been closed`);
      }
    }

    if (table === "signals" && type === "INSERT" && record.published) {
      await sendPush("🔔 New Signal", `${record.pair} — ${record.direction ?? "New trade signal"} posted`);
    }

    if (table === "chart_analysis" && type === "INSERT" && record.published) {
      await sendPush("📊 New Chart Analysis", record.title ?? "New chart analysis posted");
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
