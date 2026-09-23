import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Reuses the same bot as mt5-copier-request, posting to the admin's own
// chat/notification bot rather than the public signals channel.
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");

interface ApplicationBody {
  name?: string;
  whatsapp?: string;
  telegram_username?: string;
  email?: string;
  preferred_broker?: string;
  platform_type?: string;
  broker_server?: string;
  trading_login?: string;
  trading_password?: string;
  account_size?: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "POST method required" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const app: ApplicationBody = await req.json();

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
      console.error(
        "TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID missing — skipping admin notify"
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Telegram admin notification secrets are missing",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let message = `💼 <b>NEW ACCOUNT MANAGEMENT APPLICATION</b>\n`;
    message += `━━━━━━━━━━━━━━━\n\n`;
    message += `🙋 Name: <b>${escapeHtml(app.name)}</b>\n`;
    message += `📞 WhatsApp: <code>${escapeHtml(app.whatsapp)}</code>\n`;
    message += `✈️ Telegram: <code>@${escapeHtml(app.telegram_username)}</code>\n`;
    message += `✉️ Email: <code>${escapeHtml(app.email)}</code>\n`;
    message += `💵 Account Size: <b>${escapeHtml(app.account_size)}</b>\n\n`;
    message += `🏦 Broker: <b>${escapeHtml(app.preferred_broker)}</b>\n`;

    if (app.platform_type) {
      message += `🖥 Platform: ${escapeHtml(app.platform_type)}\n`;
    }

    if (app.broker_server) {
      message += `🌐 Server: <code>${escapeHtml(app.broker_server)}</code>\n`;
    }

    if (app.trading_login) {
      message += `👤 Login: <code>${escapeHtml(app.trading_login)}</code>\n`;
    }

    if (app.trading_password) {
      message += `🔑 Password: <code>${escapeHtml(app.trading_password)}</code>\n`;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_ADMIN_CHAT_ID,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    const result = await response.json();

    if (response.ok && result.ok === true) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.error("Telegram notify failed:", JSON.stringify(result));
    return new Response(
      JSON.stringify({
        success: false,
        error: result?.description || `Telegram HTTP ${response.status}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("account-management-notify error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
