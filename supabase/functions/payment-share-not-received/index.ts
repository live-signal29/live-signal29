import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatMoney(n: number | null): string {
  return Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "POST method required" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ success: false, error: "Unauthorized" }, 401);

    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData?.user) return json({ success: false, error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", callerData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ success: false, error: "Forbidden" }, 403);

    if (!TELEGRAM_BOT_TOKEN) return json({ success: false, error: "TELEGRAM_BOT_TOKEN secret is missing" });

    const body = await req.json();
    const id = String(body?.id || "").trim();
    if (!id) return json({ success: false, error: "Missing id" }, 400);

    const { data: row, error: rowError } = await admin
      .from("client_payment_shares").select("*").eq("id", id).single();
    if (rowError || !row) return json({ success: false, error: "Record not found" }, 404);
    if (!row.telegram_chat_id) return json({ success: false, error: "Client has no Telegram chat linked." }, 400);

    let message = `⚠️ <b>PAYMENT NOT RECEIVED</b>\n`;
    message += `━━━━━━━━━━━━━━━\n\n`;
    message += `Hi ${escapeHtml(row.client_name || "there")},\n\n`;
    message += `We have reviewed the payment proof you submitted, but we have <b>not yet received</b> the payment of <b>${formatMoney(row.share_amount)}</b> on our end.\n\n`;
    message += `Please recheck your transaction and resubmit your payment proof (screenshot and transaction ID), or contact our admin team if you need assistance.\n\n`;
    message += `Please choose an option below:`;

    const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: row.telegram_chat_id,
        text: message,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔁 Resubmit Payment Proof", callback_data: `paidshare:${row.id}` }],
            [{ text: "💳 View Payment Details", callback_data: `share:${row.id}` }],
            [{ text: "⏳ I'll Check & Reply Later", callback_data: `later:${row.id}` }],
            [{ text: "🆘 Contact Admin Support", callback_data: `support:${row.id}` }],
          ],
        },
      }),
    });

    const tgResult = await tgResponse.json();
    if (!tgResponse.ok || tgResult.ok !== true) {
      console.error("Telegram send failed:", JSON.stringify(tgResult));
      return json({ success: false, error: tgResult?.description || "Telegram send failed" });
    }

    // Clear old proof so the new screenshot + transaction ID are collected fresh.
    const { error: updateError } = await admin
      .from("client_payment_shares")
      .update({
        status: "payment_not_received",
        payment_proof: null,
        payment_proof_photo: null,
        paid_marked_at: null,
        last_message_sent_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (updateError) return json({ success: false, error: updateError.message }, 500);

    return json({ success: true });
  } catch (error) {
    console.error("payment-share-not-received error:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
