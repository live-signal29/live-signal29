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
  tp1?: string;
  tp2?: string;
  tp3?: string;
  tp4?: string;
  sl?: string;
  category?: string;
  risk_level?: string;
  signal_type?: string;
  analysis_reason?: string;
}

async function sendTelegramMessage(message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    console.error("Missing Telegram secrets: TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID");
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
          disable_web_page_preview: true,
        }),
      }
    );

    const result = await response.json();
    return response.ok && result.ok === true;
  } catch (error) {
    console.error("Telegram error:", error);
    return false;
  }
}

// FORMAT FOR NEW SIGNAL
function formatSignalMessage(signal: Signal): string {
  const type = String(signal.type || "").toUpperCase();
  const emoji = type === "BUY" ? "🟢" : "🔴";
  const actionEmoji = type === "BUY" ? "🚀 BUY NOW" : "📉 SELL NOW";

  let message = `${emoji} <b>VIP TRADING SIGNAL</b> ${emoji}\n\n`;
  message += `📊 Asset: <b>${signal.pair}</b>\n`;
  message += `📈 Action: <b>${actionEmoji}</b>\n\n`;

  message += `💰 Entry: <code>${signal.entry}</code>\n`;
  if (signal.tp1) message += `🎯 TP1: <code>${signal.tp1}</code>\n`;
  if (signal.tp2) message += `🎯 TP2: <code>${signal.tp2}</code>\n`;
  if (signal.tp3) message += `🎯 TP3: <code>${signal.tp3}</code>\n`;
  if (signal.tp4) message += `🎯 TP4: <code>${signal.tp4}</code>\n`;

  if (signal.sl) message += `🛑 SL: <code>${signal.sl}</code>\n\n`;

  if (signal.risk_level) message += `⚡ Risk: <b>${signal.risk_level}</b>\n`;
  if (signal.signal_type) message += `⏱ Type: <b>${signal.signal_type}</b>\n`;
  if (signal.analysis_reason) message += `\n📝 <i>${signal.analysis_reason}</i>\n`;

  message += `\n━━━━━━━━━━━━━━━\n`;
  message += `🌐 <b><a href="https://unlimiteddownload.vercel.app">TREND IS FRIEND</a></b>`;

  return message;
}

// FORMAT FOR TP / SL UPDATES
function formatUpdateMessage(signal: Signal, status: string): string {
  const upperStatus = status.toUpperCase();
  const isTP = upperStatus.startsWith("TP") || upperStatus.includes("PROFIT");
  let icon = isTP ? "🎯" : "🛑";
  let title = isTP ? `${upperStatus} HIT! 🚀` : "STOP LOSS HIT ⚠️";

  let message = `${icon} <b>${title}</b> ${icon}\n\n`;
  message += `📊 Asset: <b>${signal.pair}</b>\n`;
  if (signal.type) message += `📈 Action: <b>${signal.type.toUpperCase()}</b>\n`;
  if (signal.entry) message += `💰 Entry: <code>${signal.entry}</code>\n\n`;

  if (isTP) {
    message += `✅ Target Status: <b>${upperStatus}</b>\n`;
    message += `💡 <i>Tip: Risk free karne ke liye SL ko entry price (Break-Even) par shift kar lein!</i>\n`;
  } else {
    message += `❌ Trade Closed at Stop Loss.\n`;
  }

  message += `\n━━━━━━━━━━━━━━━\n`;
  message += `🌐 <b><a href="https://unlimiteddownload.vercel.app">TREND IS FRIEND</a></b>`;

  return message;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { signal, action, status } = body;

    const signalData: Signal = signal || body;

    if (!signalData || (!signalData.pair && !signalData.entry)) {
      return new Response(
        JSON.stringify({ success: false, error: "Signal data required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------
    // CATEGORY FILTER LOGIC (Commodities & Ideas Only)
    // -------------------------------------------------------------
    const pairName = (signalData.pair || "").toUpperCase();
    const catName = (signalData.category || "").toLowerCase();

    const isCommodities = 
      catName.includes("commodities") || 
      pairName.includes("XAU") || 
      pairName.includes("GOLD") || 
      pairName.includes("OIL") || 
      pairName.includes("USOIL") || 
      pairName.includes("XAG");

    const isIdea = 
      catName.includes("ideas") || 
      catName.includes("idea") || 
      (signalData.signal_type && signalData.signal_type.toLowerCase().includes("idea"));

    // Agar na Commodities ho na Ideas, toh ignore kar do
    if (!isCommodities && !isIdea) {
      console.log(`Filtered out: ${signalData.pair}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Signal ignored (Only Commodities and Ideas are allowed for Telegram)",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -------------------------------------------------------------
    // POST CREATION
    // -------------------------------------------------------------
    let message = "";
    if (action === "update_signal" || status) {
      message = formatUpdateMessage(signalData, status || "TP/SL Update");
    } else {
      message = formatSignalMessage(signalData);
    }

    const success = await sendTelegramMessage(message);

    return new Response(
      JSON.stringify({
        success,
        message: success ? "Telegram post sent successfully" : "Failed to send Telegram post",
      }),
      { status: success ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
