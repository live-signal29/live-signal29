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
  category?: string;
  main_category?: string;
  profit_note?: string;
  tp1_hit?: boolean;
  tp2_hit?: boolean;
  tp3_hit?: boolean;
  tp4_hit?: boolean;
  sl_hit?: boolean;
}

interface Idea {
  title?: string;
  description?: string;
  image_url?: string | null;
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

async function sendTelegramPhoto(
  imageUrl: string,
  caption: string
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    console.error("Missing Telegram secrets");
    return false;
  }

  try {
    // Telegram often rejects SVG URLs as photos. Convert the public SVG
    // through a lightweight image proxy so Telegram receives a real PNG.
    const pngUrl = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&output=png&w=1200`;

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHANNEL_ID,
          photo: pngUrl,
          caption,
          parse_mode: "HTML",
        }),
      }
    );

    const result = await response.json();

    console.log("Telegram photo response:", result);

    if (response.ok && result.ok === true) {
      return true;
    }

    // Photo failed (e.g. bad/unreachable URL) - fall back to a text-only post
    console.error("Telegram sendPhoto failed, falling back to text:", result);
    return await sendTelegramMessage(caption);
  } catch (error) {
    console.error("Telegram photo request error:", error);
    return await sendTelegramMessage(caption);
  }
}

function formatSignalMessage(signal: Signal): string {
  const type = String(signal.type || "").toUpperCase();

  const emoji = type === "BUY" ? "🟢" : "🔴";

  const riskEmoji =
    signal.risk_level === "High"
      ? "🔥"
      : signal.risk_level === "Medium"
      ? "⚡"
      : "✅";

  let message = `${emoji} <b>NEW SIGNAL</b> ${emoji}\n`;
  message += `━━━━━━━━━━━━━━━\n\n`;

  message += `📊 <b>${signal.pair}</b>\n`;
  message += `📈 Direction: <b>${type}</b>\n\n`;

  message += `💰 Entry: <code>${signal.entry}</code>\n`;
  message += `🎯 TP1: <code>${signal.tp1}</code>\n`;

  if (signal.tp2) {
    message += `🎯 TP2: <code>${signal.tp2}</code>\n`;
  }

  if (signal.tp3) {
    message += `🎯 TP3: <code>${signal.tp3}</code>\n`;
  }

  if (signal.tp4) {
    message += `🎯 TP4: <code>${signal.tp4}</code>\n`;
  }

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

  message += `\n📍 <b>Status: Position Opened</b>\n`;

  message += `\n━━━━━━━━━━━━━━━\n`;
  message += `🌐 <b>TREND IS FRIEND</b>`;

  return message;
}

/* =========================================================
   TP/SL UPDATE MESSAGE
   ---------------------------------------------------------
   Deliberately built to LOOK DIFFERENT from a "new signal"
   post at a glance: a bold status headline up top (what just
   happened), a ✅/⏳ progress checklist of every TP level so
   readers can see the whole trade at once, and a clear
   running/closed status line at the bottom.
========================================================= */

const UPDATE_META: Record<
  string,
  { headline: string; banner: string }
> = {
  tp1_hit: { headline: "✅ TP1 ACHIEVED", banner: "🟢" },
  tp2_hit: { headline: "✅ TP2 ACHIEVED", banner: "🟢" },
  tp3_hit: { headline: "🏆 FINAL TARGET HIT", banner: "🟢" },
  tp4_hit: { headline: "✅ TP4 ACHIEVED", banner: "🟢" },
  sl_hit: { headline: "🛑 STOP LOSS HIT", banner: "🔴" },
};

function formatUpdateMessage(
  signal: Signal,
  updateType?: string
): string {
  const type = String(signal.type || "").toUpperCase();

  const isSl = updateType === "sl_hit";
  const isClosingEvent =
    updateType === "tp3_hit" || isSl;

  let meta =
    UPDATE_META[updateType || ""] || {
      headline: "🔔 SIGNAL UPDATE",
      banner: "🔔",
    };

  // SL hit AFTER TP1 means SL had already moved to break-even -
  // that's an even exit, not a loss, so label it distinctly
  // instead of a scary "STOP LOSS HIT".
  if (isSl && signal.tp1_hit) {
    meta = { headline: "⚪ BREAK-EVEN EXIT", banner: "⚪" };
  }

  let message = `${meta.banner} <b>${meta.headline}</b> ${meta.banner}\n`;
  message += `━━━━━━━━━━━━━━━\n\n`;

  message += `📊 <b>${signal.pair}</b>  •  ${type}\n`;
  message += `💰 Entry: <code>${signal.entry}</code>\n\n`;

  message += `<b>Progress:</b>\n`;
  message += `${signal.tp1_hit ? "✅" : "⏳"} TP1: <code>${signal.tp1}</code>\n`;
  if (signal.tp2) {
    message += `${signal.tp2_hit ? "✅" : "⏳"} TP2: <code>${signal.tp2}</code>\n`;
  }
  if (signal.tp3) {
    message += `${signal.tp3_hit ? "✅" : "⏳"} TP3: <code>${signal.tp3}</code>\n`;
  }
  if (signal.tp4) {
    message += `${signal.tp4_hit ? "✅" : "⏳"} TP4: <code>${signal.tp4}</code>\n`;
  }
  message += `${isSl ? "🛑" : "🔒"} SL: <code>${signal.sl}</code>`;
  message += `${signal.tp1_hit && !isSl ? " (Break-Even)" : ""}\n`;

  if (signal.profit_note) {
    message += `\n📝 <i>${signal.profit_note}</i>\n`;
  }

  message += isClosingEvent
    ? `\n🏁 <b>Status: Trade Closed</b>\n`
    : `\n🟢 <b>Status: Trade Running</b>\n`;

  message += `\n━━━━━━━━━━━━━━━\n`;
  message += `🌐 <b>TREND IS FRIEND</b>`;

  return message;
}

function formatIdeaMessage(idea: Idea): string {
  let message = `💡 <b>MARKET IDEA</b> 💡\n\n`;

  if (idea.title) {
    message += `<b>${idea.title}</b>\n\n`;
  }

  if (idea.description) {
    message += `${idea.description}\n`;
  }

  message += `\n━━━━━━━━━━━━━━━\n`;
  message += `🌐 <b>TREND IS FRIEND</b>`;

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

    const { signal, idea, action, update_type } = body;

    let success = false;

    if (action === "new_signal") {
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

      const message = formatSignalMessage(signal);
      success = await sendTelegramMessage(message);
    } else if (action === "update") {
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

      const message = formatUpdateMessage(signal, update_type);
      success = await sendTelegramMessage(message);
    } else if (action === "new_idea") {
      if (!idea) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Idea data required",
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

      const message = formatIdeaMessage(idea);

      success = idea.image_url
        ? await sendTelegramPhoto(idea.image_url, message)
        : await sendTelegramMessage(message);
    } else {
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

    return new Response(
      JSON.stringify({
        success,
        message: success
          ? "Telegram post sent"
          : "Telegram post failed",
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
