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
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Called by the app after a licensed user submits "Connect your account".
// Sends the account email + password to the admin on Telegram and in the admin panel.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "POST required" }, 405);

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (!user) return json({ success: false, error: "Not signed in" }, 401);

    const { connection_id } = await req.json();
    if (!connection_id) return json({ success: false, error: "connection_id required" }, 400);

    const { data: conn } = await supabase.from("license_connections").select("*").eq("id", connection_id).maybeSingle();
    if (!conn || conn.user_id !== user.id) return json({ success: false, error: "Not found" }, 404);

    const { data: order } = await supabase.from("license_orders").select("*").eq("id", conn.license_order_id).maybeSingle();
    const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();

    const name = profile?.full_name || profile?.email || "User";

    // Admin panel notification
    try {
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins?.length) {
        await supabase.from("notifications").insert(
          admins.map((a: any) => ({
            user_id: a.user_id,
            title: "🔌 Chinese Bot account to connect",
            message: `${name} • ${order?.plan_label || ""} • ${conn.account_email}`,
            type: "license_connection",
            metadata: { connection_id: conn.id, order_id: conn.license_order_id },
          }))
        );
      }
    } catch (e) {
      console.error("admin panel notification failed:", e);
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return json({ success: false, error: "Telegram admin secrets missing" });

    const text =
      `🔌 <b>CHINESE BOT — CONNECT ACCOUNT</b>\n━━━━━━━━━━━━━━━\n\n` +
      `🙋 User: <b>${esc(name)}</b>\n✉️ App email: <code>${esc(profile?.email || "-")}</code>\n` +
      `📦 License: <b>${esc(order?.plan_label || "-")}</b>\n🔑 Key: <code>${esc(order?.license_key || "-")}</code>\n\n` +
      `<b>Account to connect</b>\n📧 Email: <code>${esc(conn.account_email)}</code>\n🔐 Password: <tg-spoiler>${esc(conn.account_password)}</tg-spoiler>\n\n` +
      `👉 Connect it, then open Admin Panel → <b>Licenses</b> → mark as Connected.`;

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_ADMIN_CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    const result = await res.json();
    if (!result?.ok) {
      console.error("license-connection-notify telegram failed:", JSON.stringify(result));
      return json({ success: false, error: result?.description || "Telegram failed" });
    }
    return json({ success: true });
  } catch (e) {
    console.error("license-connection-notify error:", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
