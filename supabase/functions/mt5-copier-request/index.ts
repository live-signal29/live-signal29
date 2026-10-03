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

interface CopierRequestBody {
  name?: string;
  contact_number?: string;
  telegram_username?: string;
  mt5_login?: string;
  broker_name?: string;
  broker_server?: string;
  mt5_password?: string;
  note?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function validateWhatsAppNumber(phone: string): { valid: boolean; error?: string } {
  const cleanPhone = phone.trim();
  if (!cleanPhone.startsWith("+")) {
    return { valid: false, error: "WhatsApp number must start with '+' and country code (e.g. +923001234567)." };
  }
  const digitsOnly = cleanPhone.substring(1);
  if (!/^\d+$/.test(digitsOnly)) {
    return { valid: false, error: "WhatsApp number must contain only digits after '+'." };
  }
  if (cleanPhone.startsWith("+92") || cleanPhone.startsWith("+91")) {
    if (digitsOnly.length !== 12) {
      return {
        valid: false,
        error: `Incomplete number! ${cleanPhone.startsWith("+92") ? "Pakistani" : "Indian"} numbers must have exactly 10 digits after the country code.`,
      };
    }
  } else if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    return { valid: false, error: "Please enter a valid complete WhatsApp number with full country code." };
  }
  return { valid: true };
}

async function getBotUsername(): Promise<string | null> {
  if (!TELEGRAM_BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
    const result = await res.json();
    return result?.ok && result.result?.username ? (result.result.username as string) : null;
  } catch (e) {
    console.error("getBotUsername error:", e);
    return null;
  }
}

async function notifyAdmin(row: Record<string, any>): Promise<{ sent: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
    console.error("TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID missing — skipping admin notify");
    return { sent: false, error: "Telegram admin notification secrets are missing" };
  }

  let message = `🔗 <b>NEW MT5 COPIER REQUEST</b>\n━━━━━━━━━━━━━━━\n\n`;
  if (row.name) message += `🙋 Name: <b>${escapeHtml(row.name)}</b>\n`;
  if (row.contact_number) message += `💬 WhatsApp: <code>${escapeHtml(row.contact_number)}</code>\n`;
  if (row.telegram_username) message += `✈️ Telegram: @${escapeHtml(row.telegram_username)}\n`;
  message += `👤 Login: <code>${escapeHtml(row.mt5_login)}</code>\n`;
  message += `🏦 Broker: <b>${escapeHtml(row.broker_name)}</b>\n`;
  message += `🖥 Server: <code>${escapeHtml(row.broker_server)}</code>\n`;
  message += `🔑 Password: <tg-spoiler>${escapeHtml(row.mt5_password)}</tg-spoiler>\n`;
  if (row.note) message += `\n📝 Note: <i>${escapeHtml(row.note)}</i>\n`;
  message += `\n🆔 Request ID: <code>${escapeHtml(row.id)}</code>`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const result = await response.json();
    if (response.ok && result.ok === true) return { sent: true };
    console.error("Telegram admin notify failed:", JSON.stringify(result));
    return { sent: false, error: result?.description || `Telegram HTTP ${response.status}` };
  } catch (error) {
    console.error("Telegram admin notify error:", error);
    return { sent: false, error: error instanceof Error ? error.message : "Telegram request failed" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "POST method required" }, 405);

  try {
    const body: CopierRequestBody = await req.json();

    const name = String(body.name || "").trim();
    const contact_number = String(body.contact_number || "").trim();
    const telegram_username = String(body.telegram_username || "").trim().replace(/^@/, "") || null;
    const mt5_login = String(body.mt5_login || "").trim();
    const broker_name = String(body.broker_name || "").trim();
    const broker_server = String(body.broker_server || "").trim();
    const mt5_password = String(body.mt5_password || "").trim();
    const note = body.note ? String(body.note).trim() : null;

    if (!name || !contact_number || !mt5_login || !broker_name || !broker_server || !mt5_password) {
      return json({
        success: false,
        error: "name, contact_number, mt5_login, broker_name, broker_server and mt5_password are required",
      }, 400);
    }
    if (!/^\d+$/.test(mt5_login)) {
      return json({ success: false, error: "MT5 login must contain numbers only." }, 400);
    }
    const phoneCheck = validateWhatsAppNumber(contact_number);
    if (!phoneCheck.valid) {
      return json({ success: false, error: phoneCheck.error || "Invalid WhatsApp number provided." }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: inserted, error: insertError } = await supabase
      .from("mt5_copier_requests")
      .insert({
        name,
        contact_number,
        telegram_username,
        mt5_login,
        broker_name,
        broker_server,
        mt5_password,
        note,
        status: "pending",
        is_public: true,
        profit_amount: 0,
        loss_amount: 0,
        profit_percent: 0,
        loss_percent: 0,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      console.error("Insert error:", insertError);
      return json({ success: false, error: insertError?.message || "Could not save request" }, 500);
    }

    const [notifyResult, botUsername] = await Promise.all([notifyAdmin(inserted), getBotUsername()]);

    if (notifyResult.sent) {
      await supabase.from("mt5_copier_requests").update({ telegram_notified: true }).eq("id", inserted.id);
    }

    // The bot's /start handler links a raw request id to its Telegram chat.
    const telegram_link = botUsername ? `https://t.me/${botUsername}?start=${inserted.id}` : null;

    return json({
      success: true,
      message: "Request submitted successfully",
      telegram_notified: notifyResult.sent,
      telegram_link,
      id: inserted.id,
    });
  } catch (error) {
    console.error("mt5-copier-request error:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
