import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

const KEY_RE = /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function tgSend(chatId: number | string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return { ok: false, error: "TELEGRAM_BOT_TOKEN missing" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    const r = await res.json();
    return r?.ok ? { ok: true } : { ok: false, error: r?.description || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

const keyMessage = (planLabel: string, key: string) =>
  `✅ <b>Payment Verified!</b>\n\n` +
  `Thank you! Your <b>Live Signals Chinese Bot</b> license is ready.\n\n` +
  `📦 Plan: <b>${esc(planLabel)}</b>\n` +
  `🔑 License Key:\n<code>${esc(key)}</code> <i>(tap to copy)</i>\n\n` +
  `<b>How to activate:</b>\n` +
  `1️⃣ Open the Live Signals app → <b>MT5 Copy</b> → <b>Chinese Bot</b>\n` +
  `2️⃣ Paste your key and tap <b>Activate Bot</b>\n\n` +
  `Need help? Open /support anytime.`;

// Admin-only: approve an order and deliver the key (bot + in-app inbox), reject, or resend.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "POST required" }, 405);

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (!user) return json({ success: false, error: "Not signed in" }, 401);

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ success: false, error: "Admins only" }, 403);

    const body = await req.json();
    const action: "approve" | "reject" | "resend" = body.action;
    const orderId: string = body.order_id;

    const { data: order } = await supabase.from("license_orders").select("*").eq("id", orderId).maybeSingle();
    if (!order) return json({ success: false, error: "Order not found" }, 404);

    const notifyAppUser = async (title: string, message: string) => {
      if (!order.user_id) return;
      try {
        await supabase.from("notifications").insert({
          user_id: order.user_id,
          title,
          message,
          type: "license_order",
          metadata: { order_id: order.id },
        });
      } catch (e) {
        console.error("user notification insert failed:", e);
      }
    };

    if (action === "reject") {
      if (order.status === "approved") return json({ success: false, error: "Already approved" }, 400);
      await supabase
        .from("license_orders")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", order.id);
      let botSent = false;
      if (order.telegram_chat_id) {
        const r = await tgSend(
          order.telegram_chat_id,
          `⚠️ <b>Payment not verified</b>\n\nWe could not verify your payment for <b>${esc(order.plan_label)}</b>.\n\nPlease check the TXID and try again from the main menu, or contact support.`
        );
        botSent = r.ok;
      }
      await notifyAppUser("License payment not verified", `We could not verify your payment for ${order.plan_label}. Please contact support.`);
      return json({ success: true, bot_sent: botSent });
    }

    let key: string = order.license_key;
    if (action === "approve") {
      if (order.status === "approved") return json({ success: false, error: "Already approved" }, 400);
      key = String(body.license_key || "").toUpperCase().trim();
      if (!KEY_RE.test(key)) {
        return json({ success: false, error: "Key must look like XXXX-XXXX-XXXX-XXXX (A-Z, 0-9)" }, 400);
      }
      const { error: upErr } = await supabase
        .from("license_orders")
        .update({
          status: "approved",
          license_key: key,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);
      if (upErr) {
        const dup = String(upErr.message || "").includes("license_key");
        return json({ success: false, error: dup ? "This key already exists. Generate another." : upErr.message }, 400);
      }
    } else if (action === "resend") {
      if (order.status !== "approved" || !key) return json({ success: false, error: "Order is not approved" }, 400);
    } else {
      return json({ success: false, error: "Unknown action" }, 400);
    }

    let botSent = false;
    let botError: string | null = null;
    if (order.telegram_chat_id) {
      const r = await tgSend(order.telegram_chat_id, keyMessage(order.plan_label, key));
      botSent = r.ok;
      botError = r.ok ? null : r.error || null;
      if (botSent) {
        await supabase.from("license_orders").update({ key_sent_via_bot: true }).eq("id", order.id);
      }
    } else {
      botError = "User has not opened the bot yet (no Telegram chat linked).";
    }

    await notifyAppUser("🔑 Your Chinese Bot license key", `Your ${order.plan_label} key: ${key}`);

    return json({ success: true, bot_sent: botSent, bot_error: botError, in_app_notified: !!order.user_id });
  } catch (e) {
    console.error("license-send-key error:", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
