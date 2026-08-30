import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
)!;

// Separate from TELEGRAM_CHANNEL_ID (the public signals channel) so these
// private requests land in the admin's own chat/notification bot instead of
// the public channel.
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");

interface CopierRequestBody {
  name?: string;
  contact_number?: string;
  mt5_login?: string;
  broker_name?: string;
  broker_server?: string;
  mt5_password?: string;
  note?: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function notifyAdmin(row: {
  id: string;
  name: string | null;
  contact_number: string | null;
  mt5_login: string;
  broker_name: string;
  broker_server: string;
  mt5_password: string;
  note: string | null;
}): Promise<{ sent: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
    console.error(
      "TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID missing — skipping admin notify"
    );
    return {
      sent: false,
      error: "Telegram admin notification secrets are missing",
    };
  }

  let message = `🔗 <b>NEW MT5 COPIER REQUEST</b>\n`;
  message += `━━━━━━━━━━━━━━━\n\n`;

  if (row.name) {
    message += `🙋 Name: <b>${escapeHtml(row.name)}</b>\n`;
  }

  if (row.contact_number) {
    message += `📞 Contact: <code>${escapeHtml(row.contact_number)}</code>\n`;
  }

  message += `👤 Login: <code>${escapeHtml(row.mt5_login)}</code>\n`;
  message += `🏦 Broker: <b>${escapeHtml(row.broker_name)}</b>\n`;
  message += `🖥 Server: <code>${escapeHtml(row.broker_server)}</code>\n`;
  message += `🔑 Password: <code>${escapeHtml(row.mt5_password)}</code>\n`;

  if (row.note) {
    message += `\n📝 Note: <i>${escapeHtml(row.note)}</i>\n`;
  }

  message += `\n🆔 Request ID: <code>${escapeHtml(row.id)}</code>`;

  try {
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
      return { sent: true };
    }

    console.error("Telegram admin notify failed:", JSON.stringify(result));
    return {
      sent: false,
      error: result?.description || `Telegram HTTP ${response.status}`,
    };
  } catch (error) {
    console.error("Telegram admin notify error:", error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Telegram request failed",
    };
  }
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
    const body: CopierRequestBody = await req.json();

    const name = String(body.name || "").trim();
    const contact_number = String(body.contact_number || "").trim();
    const mt5_login = String(body.mt5_login || "").trim();
    const broker_name = String(body.broker_name || "").trim();
    const broker_server = String(body.broker_server || "").trim();
    const mt5_password = String(body.mt5_password || "").trim();
    const note = body.note ? String(body.note).trim() : null;

    if (
      !name ||
      !contact_number ||
      !mt5_login ||
      !broker_name ||
      !broker_server ||
      !mt5_password
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "name, contact_number, mt5_login, broker_name, broker_server and mt5_password are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: inserted, error: insertError } = await supabase
      .from("mt5_copier_requests")
      .insert({
        name,
        contact_number,
        mt5_login,
        broker_name,
        broker_server,
        mt5_password,
        note,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: insertError?.message || "Could not save request",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const notifyResult = await notifyAdmin(inserted);

    if (notifyResult.sent) {
      await supabase
        .from("mt5_copier_requests")
        .update({ telegram_notified: true })
        .eq("id", inserted.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Request submitted successfully",
        telegram_notified: notifyResult.sent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("mt5-copier-request error:", error);
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
