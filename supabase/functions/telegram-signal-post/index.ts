import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  id?: string;
  title?: string;
  description?: string;
  image_url?: string | null;
  chart_url?: string | null;

  category?: string;
  main_category?: string;
  pair?: string;
  symbol?: string;

  type?: string;
  direction?: string;

  entry?: string;
  tp?: string;
  tp1?: string;
  tp2?: string;
  sl?: string;

  analysis?: string;
  analysis_reason?: string;
  timeframe?: string;
  risk_level?: string;
}

/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* =========================================================
   TELEGRAM CONFIG CHECK
========================================================= */

function telegramConfigured(): boolean {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is missing");
    return false;
  }

  if (!TELEGRAM_CHANNEL_ID) {
    console.error("TELEGRAM_CHANNEL_ID is missing");
    return false;
  }

  return true;
}

/* =========================================================
   SEND TELEGRAM TEXT
========================================================= */

async function sendTelegramMessage(
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!telegramConfigured()) {
    return {
      success: false,
      error: "Telegram secrets are missing",
    };
  }

  // Telegram sendMessage has a 4096-character limit.
  const safeMessage = String(message || "").slice(0, 4090);

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
          text: safeMessage,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    const result = await response.json();

    console.log(
      "Telegram sendMessage:",
      response.status,
      JSON.stringify(result)
    );

    if (response.ok && result?.ok === true) {
      return { success: true };
    }

    // HTML formatting can fail because of unexpected characters.
    // Retry as plain text so the post is never lost just because of formatting.
    const plainText = safeMessage
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]*>/g, "");

    const retry = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHANNEL_ID,
          text: plainText.slice(0, 4090),
          disable_web_page_preview: true,
        }),
      }
    );

    const retryResult = await retry.json();

    console.log(
      "Telegram plain-text retry:",
      retry.status,
      JSON.stringify(retryResult)
    );

    if (retry.ok && retryResult?.ok === true) {
      return { success: true };
    }

    return {
      success: false,
      error:
        retryResult?.description ||
        result?.description ||
        `Telegram HTTP ${response.status}`,
    };
  } catch (error) {
    console.error("Telegram request error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Telegram request failed",
    };
  }
}

/* =========================================================
   SEND TELEGRAM PHOTO
========================================================= */

async function sendTelegramPhoto(
  imageUrl: string,
  caption: string
): Promise<{ success: boolean; error?: string }> {
  if (!telegramConfigured()) {
    return {
      success: false,
      error: "Telegram secrets are missing",
    };
  }

  if (!imageUrl) {
    return sendTelegramMessage(caption);
  }

  try {
    /*
     * Telegram can reject some SVG/chart URLs.
     * weserv converts the public image into PNG.
     */
    const pngUrl =
      `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}` +
      `&output=png&w=1200`;

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

    console.log("Telegram sendPhoto:", JSON.stringify(result));

    if (response.ok && result.ok === true) {
      return {
        success: true,
      };
    }

    console.error(
      "Telegram sendPhoto failed:",
      JSON.stringify(result)
    );

    /*
     * If image fails, do NOT lose the idea.
     * Send the idea as text instead.
     */
    const fallback = await sendTelegramMessage(caption);

    if (fallback.success) {
      return {
        success: true,
      };
    }

    return {
      success: false,
      error:
        result?.description ||
        fallback.error ||
        "Telegram photo failed",
    };
  } catch (error) {
    console.error("Telegram photo error:", error);

    /*
     * Image error should not stop the idea post.
     */
    const fallback = await sendTelegramMessage(caption);

    if (fallback.success) {
      return {
        success: true,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : fallback.error || "Telegram photo request failed",
    };
  }
}

/* =========================================================
   NEW SIGNAL
========================================================= */

function formatSignalMessage(signal: Signal): string {
  const type = escapeHtml(
    String(signal.type || "").toUpperCase()
  );

  const emoji = type === "BUY" ? "🟢" : "🔴";

  const riskEmoji =
    signal.risk_level === "High"
      ? "🔥"
      : signal.risk_level === "Medium"
      ? "⚡"
      : "✅";

  let message = `${emoji} <b>NEW SIGNAL</b> ${emoji}\n`;
  message += `━━━━━━━━━━━━━━━\n\n`;

  message += `📊 <b>${escapeHtml(signal.pair)}</b>\n`;
  message += `📈 Direction: <b>${type}</b>\n\n`;

  message += `💰 Entry: <code>${escapeHtml(signal.entry)}</code>\n`;
  message += `🎯 TP1: <code>${escapeHtml(signal.tp1)}</code>\n`;

  if (signal.tp2) {
    message += `🎯 TP2: <code>${escapeHtml(signal.tp2)}</code>\n`;
  }

  if (signal.tp3) {
    message += `🎯 TP3: <code>${escapeHtml(signal.tp3)}</code>\n`;
  }

  if (signal.tp4) {
    message += `🎯 TP4: <code>${escapeHtml(signal.tp4)}</code>\n`;
  }

  message += `🛑 SL: <code>${escapeHtml(signal.sl)}</code>\n\n`;

  if (signal.risk_level) {
    message += `${riskEmoji} Risk: ${escapeHtml(signal.risk_level)}\n`;
  }

  if (signal.signal_type) {
    message += `⏱ Type: ${escapeHtml(signal.signal_type)}\n`;
  }

  if (signal.analysis_reason) {
    message += `\n📝 <i>${escapeHtml(signal.analysis_reason)}</i>\n`;
  }

  message += `\n📍 <b>Status: Position Opened</b>\n`;

  message += `\n━━━━━━━━━━━━━━━\n`;
  message += `🌐 <b>TREND IS FRIEND</b>`;

  return message;
}

/* =========================================================
   SIGNAL UPDATE
========================================================= */

const UPDATE_META: Record<
  string,
  { headline: string; banner: string }
> = {
  tp1_hit: {
    headline: "✅ TP1 ACHIEVED",
    banner: "🟢",
  },
  tp2_hit: {
    headline: "✅ TP2 ACHIEVED",
    banner: "🟢",
  },
  tp3_hit: {
    headline: "🏆 FINAL TARGET HIT",
    banner: "🟢",
  },
  tp4_hit: {
    headline: "✅ TP4 ACHIEVED",
    banner: "🟢",
  },
  sl_hit: {
    headline: "🛑 STOP LOSS HIT",
    banner: "🔴",
  },
};

function formatUpdateMessage(
  signal: Signal,
  updateType?: string
): string {
  const type = escapeHtml(
    String(signal.type || "").toUpperCase()
  );

  const isSl = updateType === "sl_hit";

  const isClosingEvent =
    updateType === "tp3_hit" ||
    updateType === "tp4_hit" ||
    isSl;

  let meta =
    UPDATE_META[updateType || ""] || {
      headline: "🔔 SIGNAL UPDATE",
      banner: "🔔",
    };

  if (isSl && signal.tp1_hit) {
    meta = {
      headline: "⚪ BREAK-EVEN EXIT",
      banner: "⚪",
    };
  }

  let message =
    `${meta.banner} <b>${meta.headline}</b> ${meta.banner}\n`;

  message += `━━━━━━━━━━━━━━━\n\n`;

  message +=
    `📊 <b>${escapeHtml(signal.pair)}</b>  •  ${type}\n`;

  message +=
    `💰 Entry: <code>${escapeHtml(signal.entry)}</code>\n\n`;

  message += `<b>Progress:</b>\n`;

  message +=
    `${signal.tp1_hit ? "✅" : "⏳"} TP1: ` +
    `<code>${escapeHtml(signal.tp1)}</code>\n`;

  if (signal.tp2) {
    message +=
      `${signal.tp2_hit ? "✅" : "⏳"} TP2: ` +
      `<code>${escapeHtml(signal.tp2)}</code>\n`;
  }

  if (signal.tp3) {
    message +=
      `${signal.tp3_hit ? "✅" : "⏳"} TP3: ` +
      `<code>${escapeHtml(signal.tp3)}</code>\n`;
  }

  if (signal.tp4) {
    message +=
      `${signal.tp4_hit ? "✅" : "⏳"} TP4: ` +
      `<code>${escapeHtml(signal.tp4)}</code>\n`;
  }

  message +=
    `${isSl ? "🛑" : "🔒"} SL: ` +
    `<code>${escapeHtml(signal.sl)}</code>`;

  message +=
    `${signal.tp1_hit && !isSl ? " (Break-Even)" : ""}\n`;

  if (signal.profit_note) {
    message +=
      `\n📝 <i>${escapeHtml(signal.profit_note)}</i>\n`;
  }

  message += isClosingEvent
    ? `\n🏁 <b>Status: Trade Closed</b>\n`
    : `\n🟢 <b>Status: Trade Running</b>\n`;

  message += `\n━━━━━━━━━━━━━━━\n`;
  message += `🌐 <b>TREND IS FRIEND</b>`;

  return message;
}

/* =========================================================
   NEW IDEA
========================================================= */

function formatIdeaMessage(idea: Idea): string {
  const category =
    idea.category ||
    idea.main_category ||
    "Market Ideas";

  const pair =
    idea.pair ||
    idea.symbol ||
    "";

  const direction =
    idea.direction ||
    idea.type ||
    "";

  let message = `💡 <b>MARKET IDEA</b> 💡\n`;
  message += `━━━━━━━━━━━━━━━\n\n`;

  /*
   * CATEGORY
   */
  message += `📂 <b>Category:</b> ${escapeHtml(category)}\n`;

  /*
   * PAIR
   */
  if (pair) {
    message += `📊 <b>Pair:</b> ${escapeHtml(pair)}\n`;
  }

  /*
   * DIRECTION
   */
  if (direction) {
    const upperDirection =
      String(direction).toUpperCase();

    const directionEmoji =
      upperDirection === "BUY"
        ? "🟢"
        : upperDirection === "SELL"
        ? "🔴"
        : "📈";

    message +=
      `${directionEmoji} <b>Direction:</b> ` +
      `${escapeHtml(upperDirection)}\n`;
  }

  /*
   * TIMEFRAME
   */
  if (idea.timeframe) {
    message +=
      `⏱ <b>Timeframe:</b> ` +
      `${escapeHtml(idea.timeframe)}\n`;
  }

  /*
   * ENTRY / TP / SL
   */
  if (idea.entry) {
    message +=
      `💰 <b>Entry:</b> ` +
      `<code>${escapeHtml(idea.entry)}</code>\n`;
  }

  if (idea.tp1 || idea.tp) {
    message +=
      `🎯 <b>TP:</b> ` +
      `<code>${escapeHtml(
        idea.tp1 || idea.tp
      )}</code>\n`;
  }

  if (idea.tp2) {
    message +=
      `🎯 <b>TP2:</b> ` +
      `<code>${escapeHtml(idea.tp2)}</code>\n`;
  }

  if (idea.sl) {
    message +=
      `🛑 <b>SL:</b> ` +
      `<code>${escapeHtml(idea.sl)}</code>\n`;
  }

  /*
   * RISK
   */
  if (idea.risk_level) {
    message +=
      `⚠️ <b>Risk:</b> ` +
      `${escapeHtml(idea.risk_level)}\n`;
  }

  /*
   * TITLE
   */
  if (idea.title) {
    message +=
      `\n<b>${escapeHtml(idea.title)}</b>\n`;
  }

  /*
   * DESCRIPTION
   */
  if (idea.description) {
    message +=
      `\n${escapeHtml(idea.description)}\n`;
  }

  /*
   * ANALYSIS
   */
  const analysis =
    idea.analysis ||
    idea.analysis_reason ||
    "";

  if (analysis) {
    message +=
      `\n📝 <b>Chart Analysis</b>\n`;
    message +=
      `<i>${escapeHtml(analysis)}</i>\n`;
  }

  message += `\n━━━━━━━━━━━━━━━\n`;
  message += `🌐 <b>TREND IS FRIEND</b>`;

  return message;
}

/* =========================================================
   DETECT IDEA ACTION
   ---------------------------------------------------------
   Supports:
   new_idea
   idea
   market_idea
   auto_idea
   auto_ideas
========================================================= */

function isIdeaAction(action: unknown): boolean {
  const value = String(action || "")
    .trim()
    .toLowerCase();

  return [
    "new_idea",
    "idea",
    "market_idea",
    "auto_idea",
    "auto_ideas",
  ].includes(value);
}

/* =========================================================
   MAIN SERVER
========================================================= */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "POST method required",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const body = await req.json();

    console.log(
      "Telegram function received:",
      JSON.stringify(body)
    );

    const {
      signal,
      idea,
      action,
      update_type,
    } = body;

    // Older auto-signal callers sent the signal object without
    // a top-level action. Keep that format working.
    const resolvedAction =
      action ||
      (signal?.action
        ? "new_signal"
        : signal?.direction
        ? "new_signal"
        : idea
        ? "new_idea"
        : null);

    let result: {
      success: boolean;
      error?: string;
    };

    /* =====================================================
       NEW SIGNAL
    ===================================================== */

    if (resolvedAction === "new_signal") {
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

      const message =
        formatSignalMessage(signal);

      result =
        await sendTelegramMessage(message);
    }

    /* =====================================================
       SIGNAL UPDATE
    ===================================================== */

    else if (action === "update") {
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

      const message =
        formatUpdateMessage(
          signal,
          update_type
        );

      result =
        await sendTelegramMessage(message);
    }

    /* =====================================================
       NEW / AUTO IDEA
    ===================================================== */

    else if (
      isIdeaAction(resolvedAction) ||
      idea
    ) {
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

      const message =
        formatIdeaMessage(idea);

      /*
       * Support both image_url and chart_url.
       */
      const imageUrl =
        idea.image_url ||
        idea.chart_url ||
        null;

      console.log(
        "Auto idea detected:",
        JSON.stringify({
          action: resolvedAction,
          category:
            idea.category ||
            idea.main_category ||
            null,
          pair:
            idea.pair ||
            idea.symbol ||
            null,
          imageUrl,
        })
      );

      if (imageUrl) {
        result =
          await sendTelegramPhoto(
            imageUrl,
            message
          );
      } else {
        result =
          await sendTelegramMessage(message);
      }
    }

    /* =====================================================
       INVALID ACTION
    ===================================================== */

    else {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid action",
          received_action: resolvedAction || action || null,
          hint:
            "Use new_signal, update, or new_idea",
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

    console.log(
      "Telegram final result:",
      JSON.stringify(result)
    );

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success
          ? "Telegram post sent successfully"
          : "Telegram post failed",
        error: result.error || null,
      }),
      {
        status: result.success ? 200 : 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Telegram function error:",
      error
    );

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
