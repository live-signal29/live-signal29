import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHANNEL_ID = Deno.env.get("TELEGRAM_CHANNEL_ID");

/* =========================================================
   MARKET SESSION
========================================================= */

type MarketPhase = "weekday" | "weekend";

function getMarketPhase(now: Date = new Date()): MarketPhase {
  const day = now.getUTCDay();
  const hour = now.getUTCHours();

  if (day === 0 || day === 6) return "weekend";
  if (day === 5 && hour >= 20) return "weekend";

  return "weekday";
}

const GOLD_KEYWORDS = ["XAU", "GOLD"];

const WEEKEND_KEYWORDS = [
  "BTC",
  "ETH",
  "SOL",
  "CRYPTO",
  "BOOM",
  "CRASH",
  "VOL 75",
  "VOL 100",
  "VOL75",
  "VOL100",
];

function isAllowedForChannel(
  pair: unknown,
  phase: MarketPhase
): boolean {
  const p = String(pair || "").toUpperCase();

  if (!p) return true;

  if (phase === "weekday") {
    return GOLD_KEYWORDS.some((k) => p.includes(k));
  }

  return WEEKEND_KEYWORDS.some((k) => p.includes(k));
}

/* =========================================================
   TYPES
========================================================= */

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

  telegram_message_id?: number | string;
  telegram_chat_id?: string;
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
   TELEGRAM CONFIG
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
): Promise<{
  success: boolean;
  error?: string;
  message_id?: number;
  chat_id?: string;
}> {
  if (!telegramConfigured()) {
    return {
      success: false,
      error: "Telegram secrets are missing",
    };
  }

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
      return {
        success: true,
        message_id: result?.result?.message_id,
        chat_id: String(TELEGRAM_CHANNEL_ID),
      };
    }

    /* Plain text fallback */
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
      return {
        success: true,
        message_id: retryResult?.result?.message_id,
        chat_id: String(TELEGRAM_CHANNEL_ID),
      };
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
   EDIT TELEGRAM MESSAGE
========================================================= */

async function editTelegramMessage(
  messageId: number,
  chatId: string,
  message: string
): Promise<{
  success: boolean;
  error?: string;
  message_id?: number;
  chat_id?: string;
}> {
  if (!telegramConfigured()) {
    return {
      success: false,
      error: "Telegram secrets are missing",
    };
  }

  const safeMessage = String(message || "").slice(0, 4090);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId || TELEGRAM_CHANNEL_ID,
          message_id: messageId,
          text: safeMessage,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    const result = await response.json();

    console.log(
      "Telegram editMessageText:",
      response.status,
      JSON.stringify(result)
    );

    if (response.ok && result?.ok === true) {
      return {
        success: true,
        message_id: messageId,
        chat_id: chatId,
      };
    }

    if (
      String(result?.description || "")
        .toLowerCase()
        .includes("message is not modified")
    ) {
      return {
        success: true,
        message_id: messageId,
        chat_id: chatId,
      };
    }

    return {
      success: false,
      error:
        result?.description ||
        `Telegram HTTP ${response.status}`,
    };
  } catch (error) {
    console.error("Telegram edit error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Telegram edit failed",
    };
  }
}

/* =========================================================
   SEND TELEGRAM PHOTO
========================================================= */

async function sendTelegramPhoto(
  imageUrl: string,
  caption: string
): Promise<{
  success: boolean;
  error?: string;
  message_id?: number;
  chat_id?: string;
}> {
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

    console.log(
      "Telegram sendPhoto:",
      JSON.stringify(result)
    );

    if (response.ok && result.ok === true) {
      return {
        success: true,
        message_id: result?.result?.message_id,
        chat_id: String(TELEGRAM_CHANNEL_ID),
      };
    }

    console.error(
      "Telegram sendPhoto failed:",
      JSON.stringify(result)
    );

    const fallback =
      await sendTelegramMessage(caption);

    if (fallback.success) {
      return {
        success: true,
        message_id: fallback.message_id,
        chat_id: fallback.chat_id,
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

    const fallback =
      await sendTelegramMessage(caption);

    if (fallback.success) {
      return {
        success: true,
        message_id: fallback.message_id,
        chat_id: fallback.chat_id,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : fallback.error ||
            "Telegram photo request failed",
    };
  }
}

/* =========================================================
   NEW SIGNAL MESSAGE
========================================================= */

function formatSignalMessage(
  signal: Signal
): string {
  const type = String(
    signal.type ||
      (signal as any).action ||
      (signal as any).direction ||
      ""
  ).toUpperCase();

  const directionEmoji =
    type === "BUY"
      ? "💹"
      : type === "SELL"
      ? "🔻"
      : "📊";

  let message =
    `New Signal 🚦               °trend is friend°\n`;

  message +=
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  message +=
    `📊 <b>${escapeHtml(signal.pair)}</b>  ` +
    `${type} ${directionEmoji}         ` +
    `<b>(Open)</b>\n\n`;

  message +=
    `💰 Entry: <code>${escapeHtml(
      signal.entry
    )}</code>\n`;

  message +=
    `🎯 TP1: <code>${escapeHtml(
      signal.tp1
    )}</code>\n`;

  if (signal.tp2) {
    message +=
      `🎯 TP2: <code>${escapeHtml(
        signal.tp2
      )}</code>\n`;
  }

  if (signal.tp3) {
    message +=
      `🎯 TP3: <code>${escapeHtml(
        signal.tp3
      )}</code>\n`;
  }

  if (signal.tp4) {
    message +=
      `🎯 TP4: <code>${escapeHtml(
        signal.tp4
      )}</code>\n`;
  }

  message +=
    `❌ SL: <code>${escapeHtml(
      signal.sl
    )}</code>\n`;

  message +=
    `━━━━━━━━━━━━━━━\n`;

  message +=
    `⏱ Type: ${
      signal.signal_type
        ? escapeHtml(signal.signal_type)
        : "Scalping"
    }\n`;

  return message;
}

/* =========================================================
   SIGNAL UPDATE HEADLINES
========================================================= */

const UPDATE_META: Record<
  string,
  {
    headline: string;
    banner: string;
  }
> = {
  tp1_hit: {
    headline: "TP 1 Achieved ✅",
    banner: "",
  },

  tp2_hit: {
    headline: "TP 2 Achieved ✅",
    banner: "",
  },

  tp3_hit: {
    headline:
      "🏆 FINAL TARGET HIT 🟢✅✅✅",
    banner: "",
  },

  tp4_hit: {
    headline:
      "🏆 FINAL TARGET HIT 🟢✅✅✅",
    banner: "",
  },

  sl_hit: {
    headline:
      "🛑 STOP LOSS HIT 🔴",
    banner: "",
  },

  expired: {
    headline:
      "⚪ BREAK-EVEN EXIT ⚪",
    banner: "",
  },
};

/* =========================================================
   SIGNAL UPDATE MESSAGE
========================================================= */

function formatUpdateMessage(
  signal: Signal,
  updateType?: string
): string {
  const type = String(
    signal.type ||
      (signal as any).action ||
      (signal as any).direction ||
      ""
  ).toUpperCase();

  const isSl =
    updateType === "sl_hit";

  const isClosingEvent =
    updateType === "tp3_hit" ||
    updateType === "tp4_hit" ||
    updateType === "expired" ||
    isSl;

  let meta =
    UPDATE_META[updateType || ""] || {
      headline: "🔔 SIGNAL UPDATE",
      banner: "",
    };

  /*
   * TP1 hit ke baad agar SL hit hota hai,
   * usay Break-Even Exit show karein.
   */
  if (isSl && signal.tp1_hit) {
    meta = {
      headline:
        "⚪ BREAK-EVEN EXIT ⚪",
      banner: "",
    };
  }

  let message =
    `${meta.headline}\n`;

  message +=
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  message +=
    `📊 <b>${escapeHtml(
      signal.pair
    )}</b>  ${type}\n\n`;

  message +=
    `💰 Entry: <code>${escapeHtml(
      signal.entry
    )}</code>\n`;

  message +=
    `${signal.tp1_hit ? "✅" : "⏳"} TP1: ` +
    `<code>${escapeHtml(
      signal.tp1
    )}</code>\n`;

  if (signal.tp2) {
    message +=
      `${signal.tp2_hit ? "✅" : "⏳"} TP2: ` +
      `<code>${escapeHtml(
        signal.tp2
      )}</code>\n`;
  }

  if (signal.tp3) {
    message +=
      `${signal.tp3_hit ? "✅" : "⏳"} TP3: ` +
      `<code>${escapeHtml(
        signal.tp3
      )}</code>\n`;
  }

  if (signal.tp4) {
    message +=
      `${signal.tp4_hit ? "✅" : "⏳"} TP4: ` +
      `<code>${escapeHtml(
        signal.tp4
      )}</code>\n`;
  }

  message +=
    `❌ SL: <code>${escapeHtml(
      signal.sl
    )}</code>\n`;

  message +=
    `━━━━━━━━━━━━━━━\n`;

  /*
   * EXACT RESULT TEXT
   */

  if (updateType === "tp1_hit") {
    message +=
      `TP 1 Hit ✅ SL moved to B.E\n`;
  }

  if (updateType === "tp2_hit") {
    message +=
      `TP 2 Secured! 💰 Enjoy Profit 💵\n`;
  }

  if (
    updateType === "tp3_hit" ||
    updateType === "tp4_hit"
  ) {
    message +=
      `TP 3 Hit Final target Hit 🎉 Maximum Profit Secured 💵✅\n`;
  }

  if (isSl && signal.tp1_hit) {
    message +=
      `Signal Closed at Breakeven💵\n`;
  }

  if (isSl && !signal.tp1_hit) {
    message +=
      `SL Hit ❌\n`;
  }

  if (updateType === "expired") {
    message +=
      `Signal Closed at Breakeven💵\n`;
  }

  /*
   * Existing database profit_note preserve.
   * Duplicate text ko dobara show nahi karega.
   */
  if (
    signal.profit_note &&
    ![
      "TP 1 Hit ✅ SL moved to B.E",
      "TP 2 Secured! 💰 Enjoy Profit 💵",
      "TP 3 Hit Final target Hit 🎉 Maximum Profit Secured 💵✅",
      "SL Hit ❌",
      "Signal Closed at Breakeven💵",
    ].includes(signal.profit_note)
  ) {
    message +=
      `\n📝 <i>${escapeHtml(
        signal.profit_note
      )}</i>\n`;
  }

  if (isClosingEvent) {
    message +=
      `\n🏁 <b>Status: Trade Closed</b>\n`;
  } else {
    message +=
      `\n🟢 <b>Status: Trade Running</b>\n`;
  }

  message +=
    `\n━━━━━━━━━━━━━━━\n`;

  message +=
    `°trend is friend°`;

  return message;
}

/* =========================================================
   NEW IDEA MESSAGE
========================================================= */

function formatIdeaMessage(
  idea: Idea
): string {
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

  let message =
    `💡 <b>MARKET IDEA</b> 💡\n`;

  message +=
    `━━━━━━━━━━━━━━━\n\n`;

  message +=
    `📂 <b>Category:</b> ` +
    `${escapeHtml(category)}\n`;

  if (pair) {
    message +=
      `📊 <b>Pair:</b> ` +
      `${escapeHtml(pair)}\n`;
  }

  if (direction) {
    const upperDirection =
      String(direction).toUpperCase();

    const directionEmoji =
      upperDirection === "BUY"
        ? "💹"
        : upperDirection === "SELL"
        ? "🔻"
        : "📈";

    message +=
      `${directionEmoji} <b>Direction:</b> ` +
      `${escapeHtml(
        upperDirection
      )}\n`;
  }

  if (idea.timeframe) {
    message +=
      `⏱ <b>Timeframe:</b> ` +
      `${escapeHtml(
        idea.timeframe
      )}\n`;
  }

  if (idea.entry) {
    message +=
      `💰 <b>Entry:</b> ` +
      `<code>${escapeHtml(
        idea.entry
      )}</code>\n`;
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
      `<code>${escapeHtml(
        idea.tp2
      )}</code>\n`;
  }

  if (idea.sl) {
    message +=
      `🛑 <b>SL:</b> ` +
      `<code>${escapeHtml(
        idea.sl
      )}</code>\n`;
  }

  if (idea.risk_level) {
    message +=
      `⚠️ <b>Risk:</b> ` +
      `${escapeHtml(
        idea.risk_level
      )}\n`;
  }

  if (idea.title) {
    message +=
      `\n<b>${escapeHtml(
        idea.title
      )}</b>\n`;
  }

  if (idea.description) {
    message +=
      `\n${escapeHtml(
        idea.description
      )}\n`;
  }

  const analysis =
    idea.analysis ||
    idea.analysis_reason ||
    "";

  if (analysis) {
    message +=
      `\n📝 <b>Chart Analysis</b>\n`;

    message +=
      `<i>${escapeHtml(
        analysis
      )}</i>\n`;
  }

  message +=
    `\n━━━━━━━━━━━━━━━\n`;

  message +=
    `🌐 <b>trend is friend</b>`;

  return message;
}

/* =========================================================
   SESSION ANNOUNCEMENT
========================================================= */

interface WeekStats {
  tpHits?: number;
  slHits?: number;
  winRate?: number;
  bestPair?: string;
}

function formatSessionMessage(
  sessionType: string,
  stats?: WeekStats
): string {
  if (sessionType === "friday_close") {
    let message =
      `🌙 <b>MARKET CLOSED FOR THE WEEKEND</b> 🌙\n`;

    message +=
      `━━━━━━━━━━━━━━━\n\n`;

    message +=
      `Gold, Silver &amp; Forex markets are now closed until Monday.\n\n`;

    if (
      stats &&
      (stats.tpHits || stats.slHits)
    ) {
      message +=
        `📊 <b>This Week's Performance</b>\n`;

      message +=
        `✅ Targets hit: <b>${stats.tpHits ?? 0}</b>\n`;

      if (stats.slHits !== undefined) {
        message +=
          `🛑 SL hit: <b>${stats.slHits}</b>\n`;
      }

      if (stats.winRate !== undefined) {
        message +=
          `🏆 Win rate: <b>${stats.winRate}%</b>\n`;
      }

      if (stats.bestPair) {
        message +=
          `⭐ Top performer: <b>${escapeHtml(
            stats.bestPair
          )}</b>\n`;
      }

      message += `\n`;
    }

    message +=
      `🟠 <b>BTC signals continue all weekend</b> for our crypto traders.\n\n`;

    message +=
      `Have a great weekend, everyone! 🎉\n`;

    message +=
      `See you Monday for fresh Gold signals.\n`;

    message +=
      `\n━━━━━━━━━━━━━━━\n`;

    message +=
      `🌐 <b>trend is friend</b>`;

    return message;
  }

  if (sessionType === "monday_reopen") {
    let message =
      `☀️ <b>WELCOME BACK, TRADERS</b> ☀️\n`;

    message +=
      `━━━━━━━━━━━━━━━\n\n`;

    message +=
      `Gold &amp; Forex markets are open again!\n\n`;

    message +=
      `🥇 <b>XAUUSD signals starting soon</b> — stay tuned 👀\n\n`;

    message +=
      `Wishing everyone a profitable week ahead 💪\n`;

    message +=
      `\n━━━━━━━━━━━━━━━\n`;

    message +=
      `🌐 <b>trend is friend</b>`;

    return message;
  }

  return `🔔 <b>Market Update</b>`;
}

/* =========================================================
   IDEA ACTION DETECTOR
========================================================= */

function isIdeaAction(
  action: unknown
): boolean {
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
      session_type,
      stats,
      force,
    } = body;

    const phase = getMarketPhase();

    /*
     * Old auto-signal callers compatibility
     */
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
      message_id?: number;
      chat_id?: string;
      skipped?: boolean;
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

      /*
       * Weekday = Gold only
       * Weekend = Crypto / Synthetic
       */
      if (
        !force &&
        !isAllowedForChannel(
          signal.pair,
          phase
        )
      ) {
        console.log(
          `Skipping Telegram post: ${signal.pair} not allowed in "${phase}" session`
        );

        result = {
          success: true,
          skipped: true,
          error:
            `Pair "${signal.pair}" not posted — outside allowed "${phase}" session`,
        };
      } else {
        const message =
          formatSignalMessage(signal);

        result =
          await sendTelegramMessage(
            message
          );
      }
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

      if (
        !force &&
        !isAllowedForChannel(
          signal.pair,
          phase
        )
      ) {
        console.log(
          `Skipping Telegram update: ${signal.pair} not allowed in "${phase}" session`
        );

        result = {
          success: true,
          skipped: true,
          error:
            `Pair "${signal.pair}" update not posted — outside allowed "${phase}" session`,
        };
      } else {
        const message =
          formatUpdateMessage(
            signal,
            update_type
          );

        const existingMessageId =
          signal.telegram_message_id;

        const existingChatId =
          signal.telegram_chat_id ||
          TELEGRAM_CHANNEL_ID;

        if (existingMessageId) {
          result =
            await editTelegramMessage(
              Number(existingMessageId),
              String(existingChatId),
              message
            );

          /*
           * If original message cannot be edited,
           * send a fresh update.
           */
          if (!result.success) {
            console.log(
              "Edit failed, falling back to new message:",
              result.error
            );

            result =
              await sendTelegramMessage(
                message
              );
          }
        } else {
          result =
            await sendTelegramMessage(
              message
            );
        }
      }
    }

    /* =====================================================
       SESSION ANNOUNCEMENT
    ===================================================== */

    else if (
      action === "session_announcement"
    ) {
      if (!session_type) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "session_type is required",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type":
                "application/json",
            },
          }
        );
      }

      const message =
        formatSessionMessage(
          session_type,
          stats
        );

      result =
        await sendTelegramMessage(
          message
        );
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
            error:
              "Idea data required",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type":
                "application/json",
            },
          }
        );
      }

      const message =
        formatIdeaMessage(idea);

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
          await sendTelegramMessage(
            message
          );
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

          received_action:
            resolvedAction ||
            action ||
            null,

          hint:
            "Use new_signal, update, or new_idea",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
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
          ? result.skipped
            ? "Skipped (outside allowed market session)"
            : "Telegram post sent successfully"
          : "Telegram post failed",

        skipped:
          result.skipped || false,

        message_id:
          result.message_id ?? null,

        chat_id:
          result.chat_id ?? null,

        error:
          result.error || null,
      }),
      {
        status: result.success
          ? 200
          : 500,

        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
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
          "Content-Type":
            "application/json",
        },
      }
    );
  }
});
