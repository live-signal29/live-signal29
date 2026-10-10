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
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Called by the app right after a user submits a Chinese Bot license payment.
// Pings the admin on Telegram and adds an admin-panel notification.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "POST required" }, 405);

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (!user) return json({ success: false, error: "Not signed in" }, 401);

    const { order_id } = await req.json();
    if (!order_id) return json({ success: false, error: "order_id required" }, 400);

    const { data: order } = await supabase
      .from("license_orders")
      .select("*")
      .eq("id", order_id)
      .maybeSingle();
    if (!order || order.user_id !== user.id) return json({ success: false, error: "Order not found" }, 404);
    if (order.status !== "pending") return json({ success: true, skipped: true });

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    // Admin-panel notifications (best effort)
    try {
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins?.length) {
        await supabase.from("notifications").insert(
          admins.map((a: any) => ({
            user_id: a.user_id,
            title: "🤖 New Chinese Bot license order",
            message: `${profile?.full_name || profile?.email || "User"} • ${order.plan_label} • $${Number(order.amount).toFixed(0)} (App)`,
            type: "license_order",
            metadata: { order_id: order.id, source: "app" },
          }))
        );
      }
    } catch (e) {
      console.error("admin notification insert failed:", e);
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
      return json({ success: false, error: "Telegram admin secrets missing" });
    }

    const text =
      `🤖 <b>NEW CHINESE BOT LICENSE ORDER (App)</b>\n` +
      `━━━━━━━━━━━━━━━\n\n` +
      `📦 Plan: <b>${esc(order.plan_label)}</b>\n` +
      `💵 Amount: <b>$${Number(order.amount).toFixed(2)}</b>\n` +
      `🪙 Crypto: ${esc(order.cryptocurrency)}\n` +
      `🧾 TXID: <code>${esc(order.transaction_id)}</code>\n\n` +
      `🙋 Name: <b>${esc(profile?.full_name || "-")}</b>\n` +
      `✉️ Email: <code>${esc(profile?.email || "-")}</code>\n\n` +
      `👉 Verify the TXID, then open Admin Panel → <b>Licenses</b> → Approve &amp; Send Key.`;

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const result = await res.json();
    if (!result?.ok) {
      console.error("license-notify telegram failed:", JSON.stringify(result));
      return json({ success: false, error: result?.description || "Telegram failed" });
    }
    return json({ success: true });
  } catch (e) {
    console.error("license-notify error:", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
