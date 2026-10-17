import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHANNEL_ID = Deno.env.get("TELEGRAM_CHANNEL_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type MarketPhase = "weekday" | "weekend";

function getMarketPhase(now: Date = new Date()): MarketPhase {
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  if (day === 0 || day === 6) return "weekend";
  if (day === 5 && hour >= 20) return "weekend";
  return "weekday";
}

const WEEKEND_KEYWORDS = ["BTC","ETH","SOL","CRYPTO","BOOM","CRASH","VOL 75","VOL 100","VOL75","VOL100"];

function isAllowedForChannel(pair, phase) {
  const p = String(pair || "").toUpperCase();
  if (!p) return true;
  if (phase === "weekend") return WEEKEND_KEYWORDS.some((k) => p.includes(k));
  return true;
}

async function isPairApproved(pair) {
  const p = String(pair || "").trim();
  if (!p) return false;
  try {
    const { data, error } = await supabase
      .from("telegram_pair_approvals")
      .select("is_approved")
      .eq("pair", p)
      .maybeSingle();
    if (error) {
      console.error("telegram_pair_approvals lookup failed:", error.message);
      return false;
    }
    return !!data?.is_approved;
  } catch (error) {
    console.error("telegram_pair_approvals lookup exception:", error);
    return false;
  }
}

function telegramConfigured() {
  if (!TELEGRAM_BOT_TOKEN) { console.error("TELEGRAM_BOT_TOKEN is missing"); return false; }
  if (!TELEGRAM_CHANNEL_ID) { console.error("TELEGRAM_CHANNEL_ID is missing"); return false; }
  return true;
}

async function sendTelegramMessage(message, replyToMessageId, replyChatId) {
  if (!telegramConfigured()) return { success: false, error: "Telegram secrets are missing" };
  const safeMessage = String(message || "").slice(0, 4090);
  const chatId = String(replyChatId || TELEGRAM_CHANNEL_ID);
  let replyId;
  if (replyToMessageId !== undefined && replyToMessageId !== null && String(replyToMessageId).trim() !== "") {
    const parsed = Number(replyToMessageId);
    if (Number.isFinite(parsed) && parsed > 0) replyId = parsed;
  }
  const body = { chat_id: chatId, text: safeMessage, parse_mode: "HTML", disable_web_page_preview: true };
  if (replyId !== undefined) {
    body.reply_parameters = { message_id: replyId, allow_sending_without_reply: false, quote: "New Signal 📢" };
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    });
    const result = await response.json();
    if (response.ok && result?.ok === true) return { success: true, message_id: result?.result?.message_id, chat_id: chatId };

    const plainText = safeMessage.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]*>/g, "");
    const plainBody = { chat_id: chatId, text: plainText.slice(0, 4090), disable_web_page_preview: true };
    if (replyId !== undefined) plainBody.reply_parameters = { message_id: replyId, allow_sending_without_reply: false, quote: "New Signal 📢" };

    const retry = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plainBody)
    });
    const retryResult = await retry.json();
    if (retry.ok && retryResult?.ok === true) return { success: true, message_id: retryResult?.result?.message_id, chat_id: chatId };

    return { success: false, error: retryResult?.description || result?.description || `Telegram HTTP ${response.status}` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Telegram request failed" };
  }
}

async function sendTelegramPhoto(imageUrl, caption) {
  if (!telegramConfigured()) return { success: false, error: "Telegram secrets are missing" };
  if (!imageUrl) return sendTelegramMessage(caption);
  try {
    const pngUrl = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&output=png&w=1200`;
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHANNEL_ID, photo: pngUrl, caption, parse_mode: "HTML" })
    });
    const result = await response.json();
    if (response.ok && result.ok === true) return { success: true, message_id: result?.result?.message_id, chat_id: String(TELEGRAM_CHANNEL_ID) };
    const fallback = await sendTelegramMessage(caption);
    if (fallback.success) return { success: true, message_id: fallback.message_id, chat_id: fallback.chat_id };
    return { success: false, error: result?.description || fallback.error || "Telegram photo failed" };
  } catch (error) {
    const fallback = await sendTelegramMessage(caption);
    if (fallback.success) return { success: true, message_id: fallback.message_id, chat_id: fallback.chat_id };
    return { success: false, error: error instanceof Error ? error.message : fallback.error || "Telegram photo request failed" };
  }
}

function formatSignalMessage(signal, manualPremium = false) {
  const rawType = String(signal.type || signal.action || signal.direction || "").toUpperCase();
  const directionEmoji = rawType === "BUY" ? "📈" : rawType === "SELL" ? "📉" : "";
  // "(premium)" is shown only for signals added manually from the Admin Panel and marked premium.
  // Auto-generated signals never get it.
  let message = manualPremium ? `New Signal 📢 (premium)\n` : `New Signal 📢\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `📊 ${escapeHtml(signal.pair)}  ${escapeHtml(rawType)} ${directionEmoji}\n`;
  message += `                                      (Open)\n\n`;
  message += `💰 Entry: ${escapeHtml(signal.entry)}\n`;
  message += `🎯 TP1: ${escapeHtml(signal.tp1)}\n`;
  if (signal.tp2) message += `🎯 TP2: ${escapeHtml(signal.tp2)}\n`;
  if (signal.tp3) message += `🎯 TP3: ${escapeHtml(signal.tp3)}\n`;
  if (signal.tp4) message += `🎯 TP4: ${escapeHtml(signal.tp4)}\n`;
  message += `⚠️ SL: ${escapeHtml(signal.sl)}\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += signal.signal_type ? `⏱ Type: ${escapeHtml(signal.signal_type)}\n` : `⏱ Type: Scalping\n`;
  return message;
}

const UPDATE_META = {
  tp1_hit: { headline: "TP 1 Hit ✅ Boom Boom! 💯 We're in profit now", banner: "🎯" },
  tp2_hit: { headline: "TP 2 Hit ✅ Let's gooo! 🚀 More profit secured", banner: "🎯" },
  tp3_hit: { headline: "TP 3 Hit 🎉 Massive win! Maximum profit secured", banner: "🏆" },
  tp4_hit: { headline: "TP 4 Hit 🏆 Final target smashed! Maximum profit secured", banner: "🏆" },
  sl_hit: { headline: "SL Hit", banner: "⚪" },
  expired: { headline: "⏱ SIGNAL EXPIRED", banner: "⚪" },
};

function formatUpdateMessage(signal, updateType) {
  const isSl = updateType === "sl_hit";
  let meta = UPDATE_META[updateType || ""] || { headline: "🔔 SIGNAL UPDATE", banner: "🔔" };
  if (isSl && (signal.tp1_hit || signal.tp2_hit || signal.tp3_hit || signal.tp4_hit)) {
    const level = signal.tp4_hit ? 4 : signal.tp3_hit ? 3 : signal.tp2_hit ? 2 : 1;
    meta = { headline: `Closed at Breakeven ✅ TP${level} profit secured`, banner: "⚪" };
  }
  return `${meta.banner} <b>${escapeHtml(meta.headline)}</b> ${meta.banner}`;
}

function formatIdeaMessage(idea) {
  const category = idea.category || idea.main_category || "Market Ideas";
  const pair = idea.pair || idea.symbol || "";
  const direction = idea.direction || idea.type || "";
  let message = `💡 <b>MARKET IDEA</b> 💡\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;
  message += `📂 <b>Category:</b> ${escapeHtml(category)}\n`;
  if (pair) message += `📊 <b>Pair:</b> ${escapeHtml(pair)}\n`;
  if (direction) {
    const upperDirection = String(direction).toUpperCase();
    const directionEmoji = upperDirection === "BUY" ? "📈" : upperDirection === "SELL" ? "📉" : "📈";
    message += `${directionEmoji} <b>Direction:</b> ${escapeHtml(upperDirection)}\n`;
  }
  if (idea.timeframe) message += `⏱ <b>Timeframe:</b> ${escapeHtml(idea.timeframe)}\n`;
  if (idea.entry) message += `💰 <b>Entry:</b> <code>${escapeHtml(idea.entry)}</code>\n`;
  if (idea.tp1 || idea.tp) message += `🎯 <b>TP:</b> <code>${escapeHtml(idea.tp1 || idea.tp)}</code>\n`;
  if (idea.tp2) message += `🎯 <b>TP2:</b> <code>${escapeHtml(idea.tp2)}</code>\n`;
  if (idea.sl) message += `⚠️ <b>SL:</b> <code>${escapeHtml(idea.sl)}</code>\n`;
  if (idea.risk_level) message += `⚠️ <b>Risk:</b> ${escapeHtml(idea.risk_level)}\n`;
  if (idea.title) message += `\n<b>${escapeHtml(idea.title)}</b>\n`;
  if (idea.description) message += `\n${escapeHtml(idea.description)}\n`;
  const analysis = idea.analysis || idea.analysis_reason || "";
  if (analysis) { message += `\n📝 <b>Chart Analysis</b>\n`; message += `<i>${escapeHtml(analysis)}</i>\n`; }
  message += `\n━━━━━━━━━━━━━━━━━━\n`;
  message += `🌐 <b>trend is friend</b>`;
  return message;
}

function formatSessionMessage(sessionType, stats) {
  if (sessionType === "friday_close") {
    let message = `🌙 <b>MARKET CLOSED FOR THE WEEKEND</b> 🌙\n`;
    message += `━━━━━━━━━━━━━━━━━━\n\n`;
    message += `Gold, Silver &amp; Forex markets are now closed until Monday.\n\n`;
    if (stats && (stats.tpHits || stats.slHits)) {
      message += `📊 <b>This Week's Performance</b>\n`;
      message += `✅ Targets hit: <b>${stats.tpHits ?? 0}</b>\n`;
      if (stats.slHits !== undefined) message += `⚠️ SL hit: <b>${stats.slHits}</b>\n`;
      if (stats.winRate !== undefined) message += `🏆 Win rate: <b>${stats.winRate}%</b>\n`;
      if (stats.bestPair) message += `⭐ Top performer: <b>${escapeHtml(stats.bestPair)}</b>\n`;
      message += `\n`;
    }
    message += `🟠 <b>BTC signals continue all weekend</b> for our crypto traders.\n\n`;
    message += `Have a great weekend, everyone! 🎉\n`;
    message += `See you Monday for fresh Gold signals.\n`;
    message += `\n━━━━━━━━━━━━━━━━━━\n`;
    message += `🌐 <b>trend is friend</b>`;
    return message;
  }
  if (sessionType === "monday_reopen") {
    let message = `☀️ <b>WELCOME BACK, TRADERS</b> ☀️\n`;
    message += `━━━━━━━━━━━━━━━━━━\n\n`;
    message += `Gold &amp; Forex markets are open again!\n\n`;
    message += `🥇 <b>XAUUSD signals starting soon</b> — stay tuned 👀\n\n`;
    message += `Wishing everyone a profitable week ahead 💪\n`;
    message += `\n━━━━━━━━━━━━━━━━━━\n`;
    message += `🌐 <b>trend is friend</b>`;
    return message;
  }
  return `🔔 <b>Market Update</b>`;
}

const BROKER_LINK = "https://one.exnessonelink.com/a/dy8mlu37tb";
const BROKER_PARTNER_CODE = "dy8mlu37tb";
const APP_LINK = "https://trendo.com/invite?market=googleplay&code=3317391";

function formatPromoMessage(stats) {
  const winCount = stats?.winCount ?? 3;
  const closedCount = stats?.closedCount ?? 5;
  let message = `🔥 <b>TARGET HIT!</b> 🔥\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;
  message += `✅ Our today <b>${closedCount} signals</b> — <b>${winCount}/${closedCount} hit target</b>! 🎯\n\n`;
  message += `Want to trade with us? Join now 👇\n\n`;
  message += `📎 <b>Broker Account (Exness)</b>\n`;
  message += `👉 <a href="${BROKER_LINK}">Create Account Now</a>\n`;
  message += `Partner Code: <code>${escapeHtml(BROKER_PARTNER_CODE)}</code>\n\n`;
  message += `📱 <b>Register Now! $200 Reward Waiting</b>\n`;
  message += `👉 <a href="${APP_LINK}">Download &amp; Join</a>\n`;
  message += `\n━━━━━━━━━━━━━━━━━━\n`;
  message += `🌐 <b>trend is friend</b>`;
  return message;
}

function isIdeaAction(action) {
  const value = String(action || "").trim().toLowerCase();
  return ["new_idea","idea","market_idea","auto_idea","auto_ideas"].includes(value);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "POST method required" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  try {
    const body = await req.json();
    const { signal, idea, action, update_type, session_type, stats, promo_stats, force, manual } = body;
    const phase = getMarketPhase();
    const resolvedAction = action || (signal?.action ? "new_signal" : signal?.direction ? "new_signal" : idea ? "new_idea" : null);
    let result;

    if (resolvedAction === "new_signal") {
      if (!signal) return new Response(JSON.stringify({ success: false, error: "Signal data required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const sessionOk = force || isAllowedForChannel(signal.pair, phase);
      const approved = force || (await isPairApproved(signal.pair));
      if (!sessionOk) {
        result = { success: true, skipped: true, error: `Pair "${signal.pair}" not posted — outside allowed "${phase}" session` };
      } else if (!approved) {
        result = { success: true, skipped: true, error: `Pair "${signal.pair}" not posted — not approved for Telegram (add/enable it in telegram_pair_approvals)` };
      } else {
        result = await sendTelegramMessage(formatSignalMessage(signal, manual === true && signal.is_premium === true));
      }
    } else if (action === "update") {
      if (!signal) return new Response(JSON.stringify({ success: false, error: "Signal data required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const existingMessageId = signal.telegram_message_id;
      const existingChatId = signal.telegram_chat_id || TELEGRAM_CHANNEL_ID;
      const hasValidMessageId = existingMessageId !== undefined && existingMessageId !== null && String(existingMessageId).trim() !== "" && Number.isFinite(Number(existingMessageId)) && Number(existingMessageId) > 0;

      const sessionOk = force || hasValidMessageId || isAllowedForChannel(signal.pair, phase);
      const approved = force || hasValidMessageId || (await isPairApproved(signal.pair));

      if (!sessionOk) {
        result = { success: true, skipped: true, error: `Pair "${signal.pair}" update not posted — outside allowed "${phase}" session` };
      } else if (!approved) {
        result = { success: true, skipped: true, error: `Pair "${signal.pair}" update not posted — not approved for Telegram` };
      } else {
        const message = formatUpdateMessage(signal, update_type);
        if (hasValidMessageId) {
          result = await sendTelegramMessage(message, Number(existingMessageId), String(existingChatId));
        } else {
          const rawType = String(signal.type || signal.action || signal.direction || "").toUpperCase();
          const standaloneMessage = `${message}\n\n📊 ${escapeHtml(signal.pair)} ${escapeHtml(rawType)} — Entry: ${escapeHtml(signal.entry)}`;
          result = await sendTelegramMessage(standaloneMessage);
        }
      }
    } else if (action === "session_announcement") {
      if (!session_type) return new Response(JSON.stringify({ success: false, error: "session_type is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      result = await sendTelegramMessage(formatSessionMessage(session_type, stats));
    } else if (action === "promo_announcement") {
      result = await sendTelegramMessage(formatPromoMessage(promo_stats));
    } else if (isIdeaAction(resolvedAction) || idea) {
      if (!idea) return new Response(JSON.stringify({ success: false, error: "Idea data required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const message = formatIdeaMessage(idea);
      const imageUrl = idea.image_url || idea.chart_url || null;
      result = imageUrl ? await sendTelegramPhoto(imageUrl, message) : await sendTelegramMessage(message);
    } else {
      return new Response(JSON.stringify({ success: false, error: "Invalid action", received_action: resolvedAction || action || null, hint: "Use new_signal, update, session_announcement, promo_announcement, or new_idea" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: result.success,
      message: result.success ? (result.skipped ? "Skipped (session or approval filter)" : "Telegram post sent successfully") : "Telegram post failed",
      skipped: result.skipped || false,
      message_id: result.message_id ?? null,
      chat_id: result.chat_id ?? null,
      error: result.error || null,
    }), { status: result.success ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
