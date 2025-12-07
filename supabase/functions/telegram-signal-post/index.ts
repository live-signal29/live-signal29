import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHANNEL_ID = Deno.env.get("TELEGRAM_CHANNEL_ID");

interface Signal {
  id: string;
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
    console.error("Telegram credentials not configured");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHANNEL_ID,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    const result = await response.json();
    if (!result.ok) {
      console.error("Telegram API error:", result);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return false;
  }
}

function formatSignalMessage(signal: Signal): string {
  const emoji = signal.type.toUpperCase() === "BUY" ? "🟢" : "🔴";
  const riskEmoji = signal.risk_level === "High" ? "🔥" : signal.risk_level === "Medium" ? "⚡" : "✅";
  
  let message = `${emoji} <b>NEW SIGNAL</b> ${emoji}\n\n`;
  message += `📊 <b>${signal.pair}</b>\n`;
  message += `📈 Type: <b>${signal.type.toUpperCase()}</b>\n\n`;
  message += `💰 Entry: <code>${signal.entry}</code>\n`;
  message += `🎯 TP1: <code>${signal.tp1}</code>\n`;
  if (signal.tp2) message += `🎯 TP2: <code>${signal.tp2}</code>\n`;
  if (signal.tp3) message += `🎯 TP3: <code>${signal.tp3}</code>\n`;
  if (signal.tp4) message += `🎯 TP4: <code>${signal.tp4}</code>\n`;
  message += `🛑 SL: <code>${signal.sl}</code>\n\n`;
  
  if (signal.risk_level) {
    message += `${riskEmoji} Risk: ${signal.risk_level}\n`;
  }
  if (signal.signal_type) {
    message += `⏱ Type: ${signal.signal_type}\n`;
  }
  if (signal.analysis_reason) {
    message += `\n📝 <i>${signal.analysis_reason}</i>\n`;
  }
  
  message += `\n━━━━━━━━━━━━━━━\n`;
  message += `🌐 <b>TREND IS FRIEND</b>`;
  
  return message;
}

async function sendTPSLUpdate(signal: Signal, updateType: string): Promise<boolean> {
  let emoji = "";
  let status = "";
  
  switch (updateType) {
    case "tp1_hit":
      emoji = "🎯";
      status = "TP1 HIT";
      break;
    case "tp2_hit":
      emoji = "🎯🎯";
      status = "TP2 HIT";
      break;
    case "tp3_hit":
      emoji = "🎯🎯🎯";
      status = "TP3 HIT";
      break;
    case "tp4_hit":
      emoji = "🎯🎯🎯🎯";
      status = "ALL TP HIT";
      break;
    case "sl_hit":
      emoji = "🛑";
      status = "STOP LOSS HIT";
      break;
    default:
      emoji = "📢";
      status = "SIGNAL UPDATE";
  }
  
  const message = `${emoji} <b>${status}</b>\n\n📊 <b>${signal.pair}</b> - ${signal.type.toUpperCase()}\n\n━━━━━━━━━━━━━━━\n🌐 <b>TREND IS FRIEND</b>`;
  
  return await sendTelegramMessage(message);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { signal, action, update_type } = await req.json();

    if (!signal) {
      return new Response(
        JSON.stringify({ error: "Signal data required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let success = false;
    
    if (action === "new_signal") {
      const message = formatSignalMessage(signal);
      success = await sendTelegramMessage(message);
    } else if (action === "update") {
      success = await sendTPSLUpdate(signal, update_type);
    }

    return new Response(
      JSON.stringify({ success, message: success ? "Message sent" : "Failed to send" }),
      { status: success ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in telegram-signal-post:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
