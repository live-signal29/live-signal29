import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHANNEL_ID = Deno.env.get("TELEGRAM_CHANNEL_ID");

interface Signal {
  id?: string;
  pair: string;
  type: string;
  entry: string;
  tp1: string;
  tp2?: string;
  tp3?: string;
  tp4?: string;
  sl: string;
  risk_level?: string;
  signal_type?: string;
  analysis_reason?: string;
}

async function sendTelegramMessage(message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    console.error("Missing Telegram secrets");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHANNEL_ID,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    const result = await response.json();

    console.log("Telegram response:", result);

    return response.ok && result.ok === true;
  } catch (error) {
    console.error("Telegram request error:", error);
    return false;
  }
}

function formatSignalMessage(signal: Signal): string {
  const type = String(signal.type || "").toUpperCase();

  const emoji = type === "BUY" ? "🟢" : "🔴";
  const actionEmoji = type === "BUY" ? "🚀 BUY NOW" : "📉 SELL NOW";

  const riskEmoji =
    signal.risk_level === "High"
      ? "🔥 High"
      : signal.risk_level === "Medium"
      ? "⚡ Medium"
      : "🛡️ Low";

  let message = `${emoji} <b>VIP TRADING SIGNAL</b> ${emoji}\n\n`;

  message += `📊 Asset: <b>${signal.pair}</b>\n`;
  message += `📈 Action: <b>${actionEmoji}</b>\n\n`;

  message += `💰 Entry Zone: <code>${signal.entry}</code>\n`;
  message += `🎯 TP 1: <code>${signal.tp1}</code>\n`;

  if (signal.tp2) {
    message += `🎯 TP 2: <code>${signal.tp2}</code>\n`;
  }

  if (signal.tp3) {
    message += `🎯 TP 3: <code>${signal.tp3}</code>\n`;
  }

  if (signal.tp4) {
    message += `🎯 TP 4: <code>${signal.tp4}</code>\n`;
  }

  message += `🛑 Stop Loss: <code>${signal.sl}</code>\n\n`;

  if (signal.risk_level) {
    message += `${riskEmoji} Risk Level\n`;
  }

  if (signal.signal_type) {
    message += `⏱ Trade Type: <b>${signal.signal_type}</b>\n`;
  }

  if (signal.analysis_reason) {
    message += `\n📝 <i>${signal.analysis_reason}</i>\n`;
  }

  message += `\n💡 <b>Auto Note:</b> TP1 hit hone par SL entry level par shift kar dein.\n`;

  message += `\n━━━━━━━━━━━━━━━\n`;
  message += `🌐 <b><a href="https://unlimiteddownload.vercel.app">TREND IS FRIEND</a></b>`;

  return message;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();

    const { signal, action } = body;

    if (!signal) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Signal data required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (action !== "new_signal") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid action",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const message = formatSignalMessage(signal);

    const success = await sendTelegramMessage(message);

    return new Response(
      JSON.stringify({
        success,
        message: success
          ? "Telegram signal sent"
          : "Telegram signal failed",
      }),
      {
        status: success ? 200 : 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Telegram function error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
