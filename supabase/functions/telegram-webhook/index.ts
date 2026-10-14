import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sendLicenseMenu,
  sendLicensePayment,
  licensePaid,
  licenseCancel,
  licenseText,
  licensePhoto,
  licenseLinkOrder,
  notifyLicenseLead,
} from "./license.ts";
import { sendSignalAccess, signalKeyText } from "./signal.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");
const ENV_WEBHOOK_SECRET_TOKEN = Deno.env.get("TELEGRAM_WEBHOOK_SECRET_TOKEN");

// ---- Editable links / contacts ----
const SUPPORT_TELEGRAM_USERNAME = "forexqueeni";
const SUPPORT_EMAIL = "support.contact90@gmail.com";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=co.median.android.krkqyaz";
const FREE_CHANNEL_URL = "https://t.me/livesignals_trading";
const EXNESS_URL = "https://one.exnessonelink.com/a/dy8mlu37tb";
const EXNESS_PARTNER_CODE = "dy8mlu37tb";
const TRENDO_URL = "https://trendo.com/invite?market=googleplay&code=3317391";
const GROUP_URL = "https://t.me/livesignals_tradings";
// Fill this in when available (empty = command shows a support fallback)
const XM_URL = "";
// Banner photo shown above the main menu (falls back to a text-only menu if the link doesn't load)
const BANNER_URL = "https://chinese-bot29.vercel.app/banner.jpg";

let cachedDbSecret: string | null | undefined;
async function getWebhookSecret(
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  if (ENV_WEBHOOK_SECRET_TOKEN) return ENV_WEBHOOK_SECRET_TOKEN;
  if (cachedDbSecret) return cachedDbSecret;
  const { data } = await supabase
    .from("bot_secrets")
    .select("value")
    .eq("key", "telegram_webhook_secret")
    .maybeSingle();
  cachedDbSecret = data?.value ?? null;
  return cachedDbSecret;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function tg(method: string, payload: Record<string, unknown>) {
  if (!TELEGRAM_BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json?.ok) console.error(`${method} error:`, JSON.stringify(json));
    return json;
  } catch (e) {
    console.error(`${method} failed:`, e);
    return null;
  }
}

async function sendPlainMessage(chatId: number | string, text: string) {
  return tg("sendMessage", { chat_id: chatId, text });
}

async function sendHtmlMessage(
  chatId: number | string,
  text: string,
  reply_markup?: Record<string, unknown>
) {
  const res = await tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup });
  if (res && res.ok === false && reply_markup) {
    return tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
  }
  return res;
}

// Sends a stored screenshot (multipart upload) — only used after an admin taps "View Screenshot".
async function sendPhotoBlob(
  chatId: number | string,
  blob: Blob,
  caption: string,
  replyTo?: number
) {
  if (!TELEGRAM_BOT_TOKEN) return null;
  try {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("photo", blob, "screenshot.jpg");
    form.append("caption", caption);
    form.append("parse_mode", "HTML");
    if (replyTo) form.append("reply_to_message_id", String(replyTo));
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      body: form,
    });
    const json = await res.json();
    if (!json?.ok) console.error("sendPhoto error:", JSON.stringify(json));
    return json;
  } catch (e) {
    console.error("sendPhoto failed:", e);
    return null;
  }
}

async function answerCallback(callbackQueryId: string, text?: string, showAlert = false) {
  return tg("answerCallbackQuery", { callback_query_id: callbackQueryId, text, show_alert: showAlert });
}

async function callFormStep(body: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/handle-form-step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("Form step error:", error);
  }
}

// Edits the tapped message in place when possible (text, or the caption of the banner photo),
// otherwise sends a new one.
async function renderMenu(
  chatId: number | string,
  text: string,
  inline_keyboard: unknown[],
  messageId?: number
) {
  if (messageId) {
    const res = await tg("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard },
    });
    if (res?.ok) return res;
    const cap = await tg("editMessageCaption", {
      chat_id: chatId,
      message_id: messageId,
      caption: text,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard },
    });
    if (cap?.ok) return cap;
  }
  return sendHtmlMessage(chatId, text, { inline_keyboard });
}

// Shared helpers handed to the license module (license.ts)
function licenseCtx(supabase: ReturnType<typeof createClient>) {
  return {
    supabase,
    adminChatId: TELEGRAM_ADMIN_CHAT_ID,
    esc: escapeHtml,
    sendHtml: sendHtmlMessage,
    render: renderMenu,
    tg,
  };
}

function fromInfo(from: any): { username: string | null; name: string | null } {
  const name = [from?.first_name, from?.last_name].filter(Boolean).join(" ").trim();
  return { username: from?.username ?? null, name: name || null };
}

function mainMenuKeyboard() {
  return [
    [{ text: "📡 Open Signal Tool", callback_data: "sig_open" }],
    [
      { text: "📈 Copy Trading", callback_data: "start_copy_trading_form" },
      { text: "👤 Account Mgmt", callback_data: "start_account_mgmt_form" },
    ],
    [
      { text: "🔑 License Key", callback_data: "lic_menu" },
      { text: "🏦 Choose Broker", callback_data: "choose_broker" },
    ],
    [
      { text: "📱 Get the App ↗", url: PLAY_STORE_URL },
      { text: "📢 Free Channel ↗", url: FREE_CHANNEL_URL },
    ],
    [{ text: "⚙️ More Options", callback_data: "more_options" }],
  ];
}

function moreMenuKeyboard() {
  return [
    [
      { text: "📊 My Status", callback_data: "check_status" },
      { text: "🔄 Reconnect", callback_data: "reconnect" },
    ],
    [
      { text: "🔴 Disconnect", callback_data: "show_disconnect" },
      { text: "📖 Guide Me", callback_data: "guide" },
    ],
    [
      { text: "❓ Help", callback_data: "help" },
      { text: "💬 Support", callback_data: "support" },
    ],
    [{ text: "⬅️ Back to Main Menu", callback_data: "show_menu" }],
  ];
}

const MAIN_MENU_TEXT = `<b>Live Signals</b>\nWelcome back. What would you like to do?`;

// Banner photo + menu. Falls back to the plain text menu if the banner can't be sent.
async function showMainMenu(chatId: number | string, messageId?: number) {
  const reply_markup = { inline_keyboard: mainMenuKeyboard() };

  if (messageId) {
    // tapped message is already the banner photo -> just swap its caption + buttons
    const edited = await tg("editMessageCaption", {
      chat_id: chatId,
      message_id: messageId,
      caption: MAIN_MENU_TEXT,
      parse_mode: "HTML",
      reply_markup,
    });
    if (edited?.ok) return edited;
  }

  const photo = await tg("sendPhoto", {
    chat_id: chatId,
    photo: BANNER_URL,
    caption: MAIN_MENU_TEXT,
    parse_mode: "HTML",
    reply_markup,
  });
  if (photo?.ok) {
    if (messageId) await tg("deleteMessage", { chat_id: chatId, message_id: messageId });
    return photo;
  }

  return renderMenu(chatId, MAIN_MENU_TEXT, mainMenuKeyboard(), messageId);
}

async function showMoreMenu(chatId: number | string, messageId?: number) {
  return renderMenu(
    chatId,
    `<b>⚙️ More Options</b>\n\nChoose an option:`,
    moreMenuKeyboard(),
    messageId
  );
}

// The tapped button on the main / more menu turns green (Telegram button style "success").
async function markTapped(callback: any) {
  try {
    const kb = callback?.message?.reply_markup?.inline_keyboard;
    const data = callback?.data;
    if (!kb || !data) return;
    const flat = kb.flat();
    if (!flat.some((b: any) => b.callback_data === "sig_open" || b.callback_data === "check_status")) return;
    const next = kb.map((row: any[]) =>
      row.map((b: any) => {
        const { style: _s, ...rest } = b;
        return b.callback_data === data ? { ...rest, style: "success" } : rest;
      })
    );
    await tg("editMessageReplyMarkup", {
      chat_id: callback.message.chat.id,
      message_id: callback.message.message_id,
      reply_markup: { inline_keyboard: next },
    });
  } catch (e) {
    console.error("markTapped failed:", e);
  }
}

// Confirmation sent when a website request is linked to the user's Telegram chat.
function linkedConfirmationText(
  name: string | null | undefined,
  status: string | null | undefined,
  kind: "copy" | "account" | "recovery"
): string {
  const label =
    kind === "copy"
      ? "Copy Trading request"
      : kind === "recovery"
        ? "Loss Recovery request"
        : "Account Management request";
  const current = String(status || "pending").toLowerCase();
  const who = name || "your account";

  if (current === "pending") {
    return (
      `✓ Linked to: ${who}\n\n` +
      `Your ${label} has been submitted successfully! ` +
      `Our team will verify your details and update you here soon.\n\n` +
      `Status: pending`
    );
  }

  return (
    `✓ Linked to: ${who}\n\n` +
    `Your ${label} is already linked to this chat.\n\n` +
    `Status: ${current}`
  );
}

// ===== Shared content (used by both buttons and slash commands) =====
async function sendHelp(chatId: number | string) {
  return sendHtmlMessage(
    chatId,
    `<b>❓ Frequently Asked Questions:</b>

<b>Q: How long does approval take?</b>
A: Usually within 24 hours.

<b>Q: Can I edit my account details?</b>
A: Submit a new request from the form.

<b>Q: What if I want to stop copying?</b>
A: Open "⚙️ More Options" → "🔴 Disconnect" anytime.

<b>Q: Can I reconnect later?</b>
A: Yes, open "⚙️ More Options" → "🔄 Reconnect" to send a reconnect request.

<b>Q: Is my password safe?</b>
A: Yes, stored securely in our database.

<b>Still need help?</b>
Open "⚙️ More Options" → "💬 Support" to contact us.`
  );
}

async function sendSupport(chatId: number | string) {
  return sendHtmlMessage(
    chatId,
    `<b>💬 Support:</b>

We're here to help!

✈️ <b>Telegram:</b> @${SUPPORT_TELEGRAM_USERNAME}
📧 <b>Email:</b> ${SUPPORT_EMAIL}
⏰ <b>Response Time:</b> Usually within 1 hour

<b>What can we help with?</b>
• Account setup issues
• Payment problems
• Technical questions
• Feature requests
• General inquiries`,
    {
      inline_keyboard: [
        [{ text: "✈️ Message on Telegram", url: `https://t.me/${SUPPORT_TELEGRAM_USERNAME}` }],
        [{ text: "⬅️ Back to Menu", callback_data: "show_menu" }],
      ],
    }
  );
}

async function sendLinkMessage(
  chatId: number | string,
  text: string,
  buttonText: string,
  url: string
) {
  return sendHtmlMessage(chatId, text, {
    inline_keyboard: [
      [{ text: buttonText, url }],
      [{ text: "⬅️ Back to Menu", callback_data: "show_menu" }],
    ],
  });
}

async function sendLinkUnavailable(chatId: number | string, what: string) {
  return sendHtmlMessage(
    chatId,
    `<b>${escapeHtml(what)}</b>\n\nThis link is not available right now. Please contact our support team and we'll help you.`,
    {
      inline_keyboard: [
        [{ text: "💬 Contact Support", url: `https://t.me/${SUPPORT_TELEGRAM_USERNAME}` }],
        [{ text: "⬅️ Back to Menu", callback_data: "show_menu" }],
      ],
    }
  );
}

// /signals and /forex: just point people to the channel and the app
async function sendChannelAndApp(chatId: number | string, title: string) {
  return sendHtmlMessage(
    chatId,
    `<b>${title}</b>\n\nGet live signals instantly on our Telegram channel and in the official app.`,
    {
      inline_keyboard: [
        [{ text: "📢 Join Telegram Channel", url: FREE_CHANNEL_URL }],
        [{ text: "📱 Get the App • Google Play ▶️", url: PLAY_STORE_URL }],
        [{ text: "⬅️ Back to Menu", callback_data: "show_menu" }],
      ],
    }
  );
}

// /gold and /crypto: only currently OPEN signals for the right pairs
async function sendOpenSignals(
  supabase: ReturnType<typeof createClient>,
  chatId: number | string,
  kind: "gold" | "crypto"
) {
  const title = kind === "gold"
    ? "🥇 Open Signals • Gold, Silver, US30, NASDAQ"
    : "🪙 Open Crypto Signals";

  const pairFilter = kind === "gold"
    ? ["XAU", "XAG", "US30", "NASDAQ"].map((p) => `pair.ilike.%${p}%`).join(",")
    : ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "LTC"]
        .map((p) => `pair.ilike.%${p}%`)
        .join(",") + ",category.eq.CRYPTO";

  const { data: rows, error } = await supabase
    .from("signals")
    .select("pair,type,category,entry,tp1,tp2,tp3,sl,signal_status")
    .eq("published", true)
    .ilike("signal_status", "open")
    .or("is_premium.is.null,is_premium.eq.false")
    .or(pairFilter)
    .order("created_at", { ascending: false })
    .limit(10);

  const keyboard = {
    inline_keyboard: [
      [{ text: "📢 Free Signals Channel", url: FREE_CHANNEL_URL }],
      [{ text: "📱 Get the App • More Signals", url: PLAY_STORE_URL }],
      [{ text: "⬅️ Back to Menu", callback_data: "show_menu" }],
    ],
  };

  if (error) {
    console.error("signals query failed:", error);
    await sendHtmlMessage(chatId, `<b>${title}</b>\n\nCould not load signals right now. Please try again in a moment.`, keyboard);
    return;
  }

  if (!rows || rows.length === 0) {
    await sendHtmlMessage(chatId, `<b>${title}</b>\n\nNo open signals right now. Join our channel to get new signals instantly.`, keyboard);
    return;
  }

  let msg = `<b>${title}</b>\n\n`;
  for (const s of rows as any[]) {
    const dot = String(s.type).toLowerCase() === "buy" ? "🟢" : "🔴";
    msg += `${dot} <b>${escapeHtml(s.pair)}</b> — ${escapeHtml(String(s.type).toUpperCase())}\n`;
    msg += `Entry: <code>${escapeHtml(s.entry)}</code>\n`;
    if (s.tp1) msg += `TP1: <code>${escapeHtml(s.tp1)}</code>\n`;
    if (s.tp2) msg += `TP2: <code>${escapeHtml(s.tp2)}</code>\n`;
    if (s.tp3) msg += `TP3: <code>${escapeHtml(s.tp3)}</code>\n`;
    msg += `SL: <code>${escapeHtml(s.sl)}</code>\n\n`;
  }
  msg += `<i>Trading involves risk. Use proper risk management.</i>`;

  await sendHtmlMessage(chatId, msg, keyboard);
}

// Handles slash commands from the bot's command menu. Returns true if handled.
async function handleCommand(
  supabase: ReturnType<typeof createClient>,
  chatId: number,
  cmd: string,
  from: { username: string | null; name: string | null }
): Promise<boolean> {
  switch (cmd) {
    case "signal":
    case "tool":
      await sendSignalAccess(licenseCtx(supabase), chatId, from);
      return true;
    case "license":
    case "key":
      await notifyLicenseLead(licenseCtx(supabase), from, chatId, "/" + cmd);
      await sendLicenseMenu(licenseCtx(supabase), chatId);
      return true;
    case "download":
    case "apps":
      await sendLinkMessage(
        chatId,
        `<b>📱 Download Our App</b>\n\nInstall the official app to get live signals, charts and copy trading updates.`,
        "📱 Mobile App • Google Play ▶️",
        PLAY_STORE_URL
      );
      return true;
    case "signals":
      await sendChannelAndApp(chatId, "📊 Latest Trading Signals");
      return true;
    case "forex":
      await sendChannelAndApp(chatId, "💱 Forex Trading Signals");
      return true;
    case "gold":
    case "crypto":
      await sendOpenSignals(supabase, chatId, cmd);
      return true;
    case "broker":
    case "exness":
      await sendLinkMessage(
        chatId,
        `<b>🏦 Exness Broker</b>\n\nOpen your trading account through our partner link.\nPartner code: <code>${EXNESS_PARTNER_CODE}</code> <i>(tap to copy)</i>`,
        "🏦 Open Exness Account",
        EXNESS_URL
      );
      return true;
    case "xm":
      if (XM_URL) {
        await sendLinkMessage(chatId, `<b>🏦 XM Broker</b>\n\nOpen your XM trading account through our link.`, "🏦 Open XM Account", XM_URL);
      } else {
        await sendLinkUnavailable(chatId, "🏦 XM Broker");
      }
      return true;
    case "trendo":
      await sendLinkMessage(
        chatId,
        `<b>🎁 Trendo Market</b>\n\nRegister Now! A $200 Reward Is Waiting… Download and register with our invite link.`,
        "🎁 Register on Trendo • $200 Reward",
        TRENDO_URL
      );
      return true;
    case "channel":
      await sendLinkMessage(
        chatId,
        `<b>📢 Official Telegram Channel</b>\n\nJoin our channel for free live signals and market updates.`,
        "📢 Join Channel",
        FREE_CHANNEL_URL
      );
      return true;
    case "group":
      await sendLinkMessage(
        chatId,
        `<b>👥 Official Telegram Group</b>\n\nJoin our community group.`,
        "👥 Join Group",
        GROUP_URL
      );
      return true;
    case "support":
      await sendSupport(chatId);
      return true;
    case "help":
      await sendHelp(chatId);
      return true;
    default:
      return false;
  }
}

// ===== Reconnect / Disconnect requests =====
// Tells the admin (Telegram + admin panel notification) and records the action.
async function notifyAdmins(
  supabase: ReturnType<typeof createClient>,
  request: any,
  action: "disconnect" | "reconnect",
  previousStatus: string,
  newStatus: string,
  username: string | null
) {
  const isDisc = action === "disconnect";
  const title = isDisc ? "🔴 Disconnect request" : "🔄 Reconnect request";

  if (TELEGRAM_ADMIN_CHAT_ID) {
    await sendHtmlMessage(
      TELEGRAM_ADMIN_CHAT_ID,
      `${isDisc ? "⚠️" : "🔄"} <b>${isDisc ? "COPIER DISCONNECT" : "COPIER RECONNECT REQUEST"} (Bot)</b>\n\n` +
        `🙋 Name: <b>${escapeHtml(request.name || "Unknown")}</b>\n` +
        `👤 MT5: <code>${escapeHtml(request.mt5_login)}</code>\n` +
        `🏦 Broker: ${escapeHtml(request.broker_name)}\n` +
        `✈️ Telegram: ${username ? "@" + escapeHtml(username) : "-"}\n` +
        `📌 Status: ${escapeHtml(previousStatus)} → <b>${escapeHtml(newStatus)}</b>\n` +
        `🕒 ${new Date().toLocaleString()}\n\n` +
        (isDisc
          ? `<i>User disconnected this account.</i>`
          : `<i>Please review this account in the admin panel.</i>`)
    );
  }

  try {
    await supabase.from("copier_action_requests").insert({
      copier_request_id: request.id,
      action,
      previous_status: previousStatus,
      telegram_chat_id: request.telegram_chat_id,
    });

    const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      await supabase.from("notifications").insert(
        admins.map((a: any) => ({
          user_id: a.user_id,
          title,
          message: `${request.name || "User"} • MT5 ${request.mt5_login} • ${previousStatus} → ${newStatus}`,
          type: "copier_action",
          metadata: {
            copier_request_id: request.id,
            action,
            mt5_login: request.mt5_login,
            telegram_username: username,
          },
        }))
      );
    }
  } catch (e) {
    console.error("admin notification failed:", e);
  }
}

// Loads a copier request only if it belongs to this Telegram user.
async function getOwnedRequest(
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  chatId: number | string
) {
  const { data } = await supabase
    .from("mt5_copier_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (!data) return { request: null, reason: "Request not found." };
  if (!data.telegram_chat_id || String(data.telegram_chat_id) !== String(chatId)) {
    return { request: null, reason: "Not authorized." };
  }
  return { request: data, reason: null };
}

// Returns the newest non-expired form session for this chat; wipes expired ones.
async function getActiveSession(supabase: ReturnType<typeof createClient>, chatId: number) {
  const { data: rows } = await supabase
    .from("bot_form_sessions")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .order("created_at", { ascending: false });

  const now = new Date();
  const list = rows ?? [];
  const active = list.find((r: any) => new Date(r.expires_at || 0) > now) ?? null;
  const staleIds = list.filter((r: any) => r !== active).map((r: any) => r.id);
  if (staleIds.length) await supabase.from("bot_form_sessions").delete().in("id", staleIds);
  return active;
}

async function startForm(
  supabase: ReturnType<typeof createClient>,
  chatId: number,
  formType: "copy_trading" | "account_management"
) {
  const active = await getActiveSession(supabase, chatId);
  if (active) {
    const label = active.form_type === "copy_trading" ? "Copy Trading" : "Account Management";
    await sendHtmlMessage(
      chatId,
      `You already have an active <b>${label}</b> form.\n\nContinue answering it, or cancel it to start a new request.`,
      {
        inline_keyboard: [
          [{ text: "✗ Cancel & start new", callback_data: `cancel_form:${active.id}` }],
        ],
      }
    );
    return;
  }

  const expiresAt = new Date(Date.now() + 30 * 60000).toISOString();
  const { data: created, error } = await supabase
    .from("bot_form_sessions")
    .insert({
      telegram_chat_id: chatId,
      form_type: formType,
      current_step: 1,
      form_data: {},
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("session insert failed:", error);
    await sendPlainMessage(chatId, "Could not start the form. Please try again.");
    return;
  }

  const title = formType === "copy_trading" ? "📈 Copy Trading Form" : "👤 Account Management Form";
  await sendHtmlMessage(
    chatId,
    `<b>${title}</b>\n\nPlease enter your name\n(e.g. Ali Khan)\n\n<i>Type /cancel anytime to exit.</i>`
  );
}

async function submitForm(
  supabase: ReturnType<typeof createClient>,
  chatId: number,
  sessionId: string,
  username: string | null
) {
  // Claim the session atomically so a double tap can't submit twice
  const { data: claimed } = await supabase
    .from("bot_form_sessions")
    .delete()
    .eq("id", sessionId)
    .select("*");

  const session = claimed?.[0];
  if (!session) {
    await sendPlainMessage(chatId, "This form was already submitted or cancelled.");
    return;
  }

  const fd = session.form_data ?? {};
  const now = new Date().toISOString();
  const pwSpoiler = `<tg-spoiler>${escapeHtml(fd.mt5_password)}</tg-spoiler>`;
  let ok = false;

  try {
    if (session.form_type === "copy_trading") {
      const { data: row, error } = await supabase
        .from("mt5_copier_requests")
        .insert({
          name: fd.name,
          mt5_login: fd.mt5_login,
          broker_name: fd.broker_name,
          broker_server: fd.broker_server,
          mt5_password: fd.mt5_password,
          contact_number: fd.contact_number || null,
          note: fd.note || null,
          status: "pending",
          telegram_username: username,
          telegram_chat_id: chatId,
          telegram_linked_at: now,
        })
        .select("id")
        .single();

      if (error || !row) throw new Error(error?.message || "insert failed");
      ok = true;

      if (TELEGRAM_ADMIN_CHAT_ID) {
        await sendHtmlMessage(
          TELEGRAM_ADMIN_CHAT_ID,
          `📥 <b>NEW COPY TRADING REQUEST (Bot)</b>\n\n` +
            `🙋 Name: <b>${escapeHtml(fd.name)}</b>\n` +
            `👤 Login: <code>${escapeHtml(fd.mt5_login)}</code>\n` +
            `🔑 Password: ${pwSpoiler}\n` +
            `🏦 Broker: ${escapeHtml(fd.broker_name)}\n` +
            `🌐 Server: <code>${escapeHtml(fd.broker_server)}</code>\n` +
            `📞 WhatsApp: ${escapeHtml(fd.contact_number || "-")}\n` +
            `✈️ Telegram: ${username ? "@" + escapeHtml(username) : "-"}\n` +
            `📝 Notes: ${escapeHtml(fd.note || "-")}`
        );
      }
    } else {
      const { data: row, error } = await supabase
        .from("account_management_applications")
        .insert({
          name: fd.name,
          whatsapp: fd.contact_number || "N/A",
          preferred_broker: fd.broker_name,
          platform_type: "MT5",
          broker_server: fd.broker_server,
          trading_login: fd.mt5_login,
          trading_password: fd.mt5_password,
          account_size: fd.account_size || null,
          note: fd.note || null,
          submission_type: "trading_account",
          status: "pending",
          telegram_username: username,
          telegram_chat_id: chatId,
          telegram_linked_at: now,
        })
        .select("id")
        .single();

      if (error || !row) throw new Error(error?.message || "insert failed");
      ok = true;

      if (TELEGRAM_ADMIN_CHAT_ID) {
        await sendHtmlMessage(
          TELEGRAM_ADMIN_CHAT_ID,
          `💼 <b>NEW ACCOUNT MANAGEMENT APPLICATION (Bot)</b>\n\n` +
            `🙋 Name: <b>${escapeHtml(fd.name)}</b>\n` +
            `📞 WhatsApp: ${escapeHtml(fd.contact_number || "-")}\n` +
            `✈️ Telegram: ${username ? "@" + escapeHtml(username) : "-"}\n` +
            `💵 Account Size: <b>${escapeHtml(fd.account_size || "-")}</b>\n\n` +
            `🏦 Broker: <b>${escapeHtml(fd.broker_name)}</b>\n` +
            `🖥 Platform: MT5\n` +
            `🌐 Server: <code>${escapeHtml(fd.broker_server)}</code>\n` +
            `👤 Login: <code>${escapeHtml(fd.mt5_login)}</code>\n` +
            `🔑 Password: ${pwSpoiler}\n` +
            `📝 Notes: ${escapeHtml(fd.note || "-")}`
        );
      }
    }
  } catch (error) {
    console.error("Form submission error:", error);
  }

  if (!ok) {
    // Restore the session (same id) so the user can retry or cancel
    await supabase.from("bot_form_sessions").insert({
      id: session.id,
      telegram_chat_id: session.telegram_chat_id,
      form_type: session.form_type,
      current_step: session.current_step,
      form_data: session.form_data,
      expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
    });
    await sendHtmlMessage(chatId, "⚠️ Error submitting form. Please try again.", {
      inline_keyboard: [
        [{ text: "✓ Submit", callback_data: `submit_form:${session.id}` }],
        [{ text: "✗ Cancel", callback_data: `cancel_form:${session.id}` }],
      ],
    });
    return;
  }

  await sendHtmlMessage(
    chatId,
    `<b>✓ Request Submitted!</b>

Your ${session.form_type === "copy_trading" ? "Copy Trading" : "Account Management"} request has been submitted.

Admin will review and contact you soon.

<i>Check "📊 My Status" (⚙️ More Options) for updates.</i>`,
    { inline_keyboard: [[{ text: "⬅️ Main Menu", callback_data: "show_menu" }]] }
  );
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("ok", { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const secret = await getWebhookSecret(supabase);
    if (secret) {
      const provided = req.headers.get("x-telegram-bot-api-secret-token");
      if (provided !== secret) {
        return new Response("forbidden", { status: 403 });
      }
    }
  } catch (e) {
    console.error("webhook secret lookup failed:", e);
  }

  try {
    const update = await req.json();
    const callback = update?.callback_query;
    const message = update?.message;
    const chatId: number | undefined = callback?.message?.chat?.id || message?.chat?.id;
    const fromId = callback?.from?.id || message?.from?.id;
    const data: string | undefined = callback?.data;
    const text: string | undefined = message?.text;
    const callbackMessageId: number | undefined = callback?.message?.message_id;
    const from = fromInfo(callback?.from || message?.from);

    if (!chatId) return new Response("ok", { status: 200 });

    if (callback) {
      // Turn the tapped main-menu button green
      await markTapped(callback);

      // ===== SIGNAL TOOL (licensed users) =====
      if (data === "sig_open") {
        await answerCallback(callback.id);
        await sendSignalAccess(licenseCtx(supabase), chatId, from);
        return new Response("ok", { status: 200 });
      }

      // ===== CHINESE BOT LICENSE KEY =====
      if (data === "lic_menu" || data === "lic_plans") {
        await answerCallback(callback.id);
        if (data === "lic_menu") await notifyLicenseLead(licenseCtx(supabase), from, chatId, "Main Menu button");
        await sendLicenseMenu(licenseCtx(supabase), chatId, callbackMessageId);
        return new Response("ok", { status: 200 });
      }

      const licPlan = data?.match(/^lic_plan:(weekly|6m|lifetime)$/);
      if (licPlan) {
        await answerCallback(callback.id);
        await sendLicensePayment(licenseCtx(supabase), chatId, licPlan[1], "0", callbackMessageId);
        return new Response("ok", { status: 200 });
      }

      const licPay = data?.match(/^lic_pay:(weekly|6m|lifetime):([A-Z0-9_]+)$/);
      if (licPay) {
        await answerCallback(callback.id);
        await sendLicensePayment(licenseCtx(supabase), chatId, licPay[1], licPay[2], callbackMessageId);
        return new Response("ok", { status: 200 });
      }

      const licPaid = data?.match(/^lic_paid:(weekly|6m|lifetime):([A-Z0-9_]+)$/);
      if (licPaid) {
        await answerCallback(callback.id);
        await licensePaid(licenseCtx(supabase), chatId, from, licPaid[1], licPaid[2]);
        return new Response("ok", { status: 200 });
      }

      if (data === "lic_cancel") {
        await answerCallback(callback.id, "Cancelled");
        await licenseCancel(licenseCtx(supabase), chatId);
        await showMainMenu(chatId);
        return new Response("ok", { status: 200 });
      }

      // ===== VIEW SCREENSHOT (admin notification button) =====
      const shotMatch = data?.match(/^shot:([ca]):([0-9a-f-]{36})$/i);
      if (shotMatch) {
        if (!TELEGRAM_ADMIN_CHAT_ID || String(chatId) !== String(TELEGRAM_ADMIN_CHAT_ID)) {
          await answerCallback(callback.id, "Not authorized.", true);
          return new Response("ok", { status: 200 });
        }
        const table = shotMatch[1].toLowerCase() === "c" ? "mt5_copier_requests" : "account_management_applications";
        const { data: shotRow } = await supabase
          .from(table)
          .select("name, screenshot_path")
          .eq("id", shotMatch[2])
          .maybeSingle();
        if (!shotRow?.screenshot_path) {
          await answerCallback(callback.id, "No screenshot found.", true);
          return new Response("ok", { status: 200 });
        }
        const { data: blob } = await supabase.storage
          .from("application-screenshots")
          .download(shotRow.screenshot_path);
        if (!blob) {
          await answerCallback(callback.id, "Could not load screenshot.", true);
          return new Response("ok", { status: 200 });
        }
        await answerCallback(callback.id);
        await sendPhotoBlob(
          chatId,
          blob,
          `📸 Screenshot — ${escapeHtml(shotRow.name || "Request")}`,
          callbackMessageId
        );
        return new Response("ok", { status: 200 });
      }

      // ===== MORE OPTIONS (submenu) =====
      if (data === "more_options") {
        await answerCallback(callback.id);
        await showMoreMenu(chatId, callbackMessageId);
        return new Response("ok", { status: 200 });
      }

      // ===== CHECK STATUS =====
      if (data === "check_status") {
        await answerCallback(callback.id);
        const { data: requests } = await supabase
          .from("mt5_copier_requests")
          .select("*")
          .eq("telegram_chat_id", chatId)
          .order("created_at", { ascending: true });

        if (!requests || requests.length === 0) {
          await sendPlainMessage(chatId, "You don't have any Copy Trading requests.");
          return new Response("ok", { status: 200 });
        }

        let statusMsg = "<b>📊 Your Status:</b>\n\n";
        requests.forEach((r: any, idx: number) => {
          statusMsg += `<b>Request ${idx + 1}:</b>\n`;
          statusMsg += `Name: ${escapeHtml(r.name)}\n`;
          statusMsg += `MT5: <code>${escapeHtml(r.mt5_login)}</code>\n`;
          statusMsg += `Status: <b>${escapeHtml(r.status)}</b>\n`;
          if (r.disconnected_at) {
            statusMsg += `Disconnected: ${new Date(r.disconnected_at).toLocaleDateString()}\n`;
          }
          statusMsg += "\n";
        });

        await sendHtmlMessage(chatId, statusMsg);
        return new Response("ok", { status: 200 });
      }

      // ===== RECONNECT LIST (pending / rejected / disconnected) =====
      if (data === "reconnect") {
        await answerCallback(callback.id);
        const { data: requests } = await supabase
          .from("mt5_copier_requests")
          .select("*")
          .eq("telegram_chat_id", chatId)
          .in("status", ["pending", "rejected", "disconnected"])
          .order("created_at", { ascending: true });

        if (!requests || requests.length === 0) {
          await sendPlainMessage(chatId, "You don't have any accounts to reconnect.");
          return new Response("ok", { status: 200 });
        }

        let reconnectMsg = "<b>🔄 Reconnect Your Accounts:</b>\n\n";
        const buttons: any[] = [];
        requests.forEach((r: any) => {
          reconnectMsg += `• ${escapeHtml(r.name)} (${escapeHtml(r.mt5_login)}) — <b>${escapeHtml(r.status)}</b>\n`;
          buttons.push([{ text: `🔄 Reconnect ${r.mt5_login}`, callback_data: `reconnect:${r.id}` }]);
        });
        buttons.push([{ text: "⬅️ Back", callback_data: "more_options" }]);

        await sendHtmlMessage(chatId, reconnectMsg, { inline_keyboard: buttons });
        return new Response("ok", { status: 200 });
      }

      // ===== RECONNECT: ask to confirm =====
      const reconnectAsk = data?.match(/^reconnect:(.+)$/);
      if (reconnectAsk) {
        const { request, reason } = await getOwnedRequest(supabase, reconnectAsk[1], chatId);
        if (!request) {
          await answerCallback(callback.id, reason ?? "Not found.", true);
          return new Response("ok", { status: 200 });
        }
        if (!["pending", "rejected", "disconnected"].includes(request.status)) {
          await answerCallback(callback.id, `This account is already ${request.status}.`, true);
          return new Response("ok", { status: 200 });
        }
        await answerCallback(callback.id);
        await sendHtmlMessage(
          chatId,
          `🔄 <b>Reconnect request</b>\n\nSend a reconnect request for MT5 account <code>${escapeHtml(request.mt5_login)}</code>?\n\nCurrent status: <b>${escapeHtml(request.status)}</b>\nOur team will review it.`,
          {
            inline_keyboard: [
              [
                { text: "✓ Yes, Reconnect", callback_data: `confirm_reconnect:${request.id}` },
                { text: "✗ Cancel", callback_data: `cancel_reconnect:${request.id}` },
              ],
            ],
          }
        );
        return new Response("ok", { status: 200 });
      }

      // ===== CONFIRM RECONNECT =====
      const confirmReconnect = data?.match(/^confirm_reconnect:(.+)$/);
      if (confirmReconnect) {
        const { request, reason } = await getOwnedRequest(supabase, confirmReconnect[1], chatId);
        if (!request) {
          await answerCallback(callback.id, reason ?? "Not found.", true);
          return new Response("ok", { status: 200 });
        }
        if (!["pending", "rejected", "disconnected"].includes(request.status)) {
          await answerCallback(callback.id, `This account is already ${request.status}.`, true);
          return new Response("ok", { status: 200 });
        }

        await answerCallback(callback.id);
        const previousStatus = request.status;
        // rejected / disconnected go back into the admin's pending queue; pending stays pending
        if (previousStatus !== "pending") {
          await supabase
            .from("mt5_copier_requests")
            .update({
              status: "pending",
              disconnected_at: null,
              disconnect_reason: null,
              telegram_notified: false,
            })
            .eq("id", request.id);
        }

        await notifyAdmins(supabase, request, "reconnect", previousStatus, "pending", callback.from?.username ?? null);
        await sendHtmlMessage(
          chatId,
          `✓ <b>Reconnect request sent</b>\n\nAccount: <code>${escapeHtml(request.mt5_login)}</code>\n\nOur team will review it and you'll be notified here.`
        );
        return new Response("ok", { status: 200 });
      }

      const cancelReconnect = data?.match(/^cancel_reconnect:(.+)$/);
      if (cancelReconnect) {
        await answerCallback(callback.id);
        await sendPlainMessage(chatId, "✓ Reconnect request cancelled.");
        return new Response("ok", { status: 200 });
      }

      // ===== DISCONNECT LIST (all connected accounts) =====
      if (data === "show_disconnect") {
        await answerCallback(callback.id);
        const { data: requests } = await supabase
          .from("mt5_copier_requests")
          .select("*")
          .eq("telegram_chat_id", chatId)
          .eq("status", "connected")
          .order("created_at", { ascending: true });

        if (!requests || requests.length === 0) {
          await sendPlainMessage(chatId, "You don't have any connected accounts to disconnect.");
          return new Response("ok", { status: 200 });
        }

        let disconnectMsg = "<b>🔴 Disconnect Your Accounts:</b>\n\n";
        const buttons: any[] = [];
        requests.forEach((r: any) => {
          disconnectMsg += `• ${escapeHtml(r.name)} (${escapeHtml(r.mt5_login)})\n`;
          buttons.push([{ text: `🔴 Disconnect ${r.mt5_login}`, callback_data: `disconnect:${r.id}` }]);
        });
        buttons.push([{ text: "⬅️ Back", callback_data: "more_options" }]);

        await sendHtmlMessage(chatId, disconnectMsg, { inline_keyboard: buttons });
        return new Response("ok", { status: 200 });
      }

      // ===== CHOOSE BROKER =====
      if (data === "choose_broker") {
        await answerCallback(callback.id);
        await sendHtmlMessage(
          chatId,
          `<b>🏦 Choose Broker</b>

Open your trading account through our partner link:

🖇️ <b>Exness</b>
Partner code: <code>${EXNESS_PARTNER_CODE}</code> <i>(tap to copy)</i>

🎁 <b>Register Now! A $200 Reward Is Waiting…</b>
<b>Trendo</b> – download and register with our invite link.`,
          {
            inline_keyboard: [
              [{ text: "🏦 Open Exness Account", url: EXNESS_URL }],
              [{ text: "🎁 Register on Trendo • $200 Reward", url: TRENDO_URL }],
              [{ text: "⬅️ Back to Menu", callback_data: "show_menu" }],
            ],
          }
        );
        return new Response("ok", { status: 200 });
      }

      // ===== GUIDE ME =====
      if (data === "guide") {
        await answerCallback(callback.id);
        await sendHtmlMessage(
          chatId,
          `<b>📖 Guide - How to Use Copy Trading:</b>

<b>Step 1: Copy Trading Form</b>
Click "📈 Copy Trading" to submit your MT5 account details.

<b>Step 2: Admin Review</b>
Our admin will review your request and contact you.

<b>Step 3: Activation</b>
Once approved, your account will be connected and copying will start.

<b>Step 4: Monitor</b>
Open "⚙️ More Options" → "📊 My Status" anytime to see your account status.

<b>Step 5: Disconnect Anytime</b>
Open "⚙️ More Options" → "🔴 Disconnect" to stop copying if needed.

<b>Need Help?</b>
Open "⚙️ More Options" → "💬 Support" to get in touch with us.`
        );
        return new Response("ok", { status: 200 });
      }

      // ===== HELP =====
      if (data === "help") {
        await answerCallback(callback.id);
        await sendHelp(chatId);
        return new Response("ok", { status: 200 });
      }

      // ===== SUPPORT =====
      if (data === "support") {
        await answerCallback(callback.id);
        await sendSupport(chatId);
        return new Response("ok", { status: 200 });
      }

      // ===== SHOW MENU =====
      if (data === "show_menu") {
        await answerCallback(callback.id);
        await showMainMenu(chatId, callbackMessageId);
        return new Response("ok", { status: 200 });
      }

      // ===== DISCONNECT: ask to confirm =====
      const disconnectMatch = data?.match(/^disconnect:(.+)$/);
      if (disconnectMatch) {
        const { request, reason } = await getOwnedRequest(supabase, disconnectMatch[1], chatId);
        if (!request) {
          await answerCallback(callback.id, reason ?? "Not found.", true);
          return new Response("ok", { status: 200 });
        }

        if (request.status === "disconnected") {
          await answerCallback(callback.id, "Already disconnected.");
          await sendPlainMessage(chatId, "✓ This account is already disconnected.");
          return new Response("ok", { status: 200 });
        }

        if (request.status !== "connected") {
          await answerCallback(callback.id, `This account is ${request.status}, not connected.`, true);
          return new Response("ok", { status: 200 });
        }

        await answerCallback(callback.id);
        await sendHtmlMessage(
          chatId,
          `⚠️ <b>Are you sure?</b>

Disconnect MT5 account <code>${escapeHtml(request.mt5_login)}</code>?

This will stop copying your trades.`,
          {
            inline_keyboard: [
              [
                { text: "✓ Yes, Disconnect", callback_data: `confirm_disconnect:${request.id}` },
                { text: "✗ Cancel", callback_data: `cancel_disconnect:${request.id}` },
              ],
            ],
          }
        );
        return new Response("ok", { status: 200 });
      }

      // ===== CONFIRM DISCONNECT =====
      const confirmMatch = data?.match(/^confirm_disconnect:(.+)$/);
      if (confirmMatch) {
        const { request, reason } = await getOwnedRequest(supabase, confirmMatch[1], chatId);
        if (!request) {
          await answerCallback(callback.id, reason ?? "Not found.", true);
          return new Response("ok", { status: 200 });
        }

        if (request.status !== "connected") {
          await answerCallback(callback.id, `This account is already ${request.status}.`, true);
          return new Response("ok", { status: 200 });
        }

        await answerCallback(callback.id);
        await supabase
          .from("mt5_copier_requests")
          .update({
            status: "disconnected",
            disconnected_at: new Date().toISOString(),
            disconnect_reason: "user_initiated",
          })
          .eq("id", request.id);

        await sendHtmlMessage(
          chatId,
          `✓ <b>Account disconnected</b>\n\nAccount: <code>${escapeHtml(request.mt5_login)}</code>\n\nYou can reconnect anytime from "⚙️ More Options" → "🔄 Reconnect".`
        );

        await notifyAdmins(supabase, request, "disconnect", "connected", "disconnected", callback.from?.username ?? null);
        return new Response("ok", { status: 200 });
      }

      const cancelMatch = data?.match(/^cancel_disconnect:(.+)$/);
      if (cancelMatch) {
        await answerCallback(callback.id);
        await sendPlainMessage(chatId, "✓ Disconnect cancelled. Your account remains connected.");
        return new Response("ok", { status: 200 });
      }

      // ===== FORM HANDLERS =====
      const submitMatch = data?.match(/^submit_form:(.+)$/);
      if (submitMatch) {
        await answerCallback(callback.id);
        await submitForm(supabase, chatId, submitMatch[1], callback.from?.username ?? null);
        return new Response("ok", { status: 200 });
      }

      const skipMatch = data?.match(/^skip_form:(.+)$/);
      if (skipMatch) {
        await answerCallback(callback.id);
        await callFormStep({ chat_id: chatId, session_id: skipMatch[1], user_answer: "skip" });
        return new Response("ok", { status: 200 });
      }

      const editMatch = data?.match(/^edit_form:([^:]+):(\d+)$/);
      if (editMatch) {
        await answerCallback(callback.id);
        await callFormStep({
          chat_id: chatId,
          session_id: editMatch[1],
          action: "edit",
          step: Number(editMatch[2]),
        });
        return new Response("ok", { status: 200 });
      }

      const reviewMatch = data?.match(/^review_form:(.+)$/);
      if (reviewMatch) {
        await answerCallback(callback.id);
        const { data: s } = await supabase
          .from("bot_form_sessions")
          .select("form_data")
          .eq("id", reviewMatch[1])
          .maybeSingle();
        if (s?.form_data?.__edit) {
          const fd = { ...s.form_data };
          delete fd.__edit;
          await supabase.from("bot_form_sessions").update({ form_data: fd }).eq("id", reviewMatch[1]);
        }
        await callFormStep({ chat_id: chatId, session_id: reviewMatch[1], action: "review" });
        return new Response("ok", { status: 200 });
      }

      const cancelFormMatch = data?.match(/^cancel_form:(.+)$/);
      if (cancelFormMatch) {
        const sessionId = cancelFormMatch[1];
        await answerCallback(callback.id, "Form cancelled");
        await supabase.from("bot_form_sessions").delete().eq("id", sessionId);
        await sendHtmlMessage(chatId, "<b>✗ Form cancelled.</b>");
        await showMainMenu(chatId);
        return new Response("ok", { status: 200 });
      }

      if (data === "start_copy_trading_form") {
        await answerCallback(callback.id);
        await startForm(supabase, chatId, "copy_trading");
        return new Response("ok", { status: 200 });
      }

      if (data === "start_account_mgmt_form") {
        await answerCallback(callback.id);
        await startForm(supabase, chatId, "account_management");
        return new Response("ok", { status: 200 });
      }

      await answerCallback(callback.id);
      return new Response("ok", { status: 200 });
    }

    // ===== /cancel =====
    if (text?.trim().toLowerCase().startsWith("/cancel")) {
      await supabase.from("bot_form_sessions").delete().eq("telegram_chat_id", chatId);
      await licenseCancel(licenseCtx(supabase), chatId);
      await sendPlainMessage(chatId, "✗ Form cancelled.");
      await showMainMenu(chatId);
      return new Response("ok", { status: 200 });
    }

    // ===== PHOTO (payment screenshot for a license order) =====
    if (message?.photo && !text) {
      const handledPhoto = await licensePhoto(licenseCtx(supabase), chatId, from, message.photo);
      if (handledPhoto) return new Response("ok", { status: 200 });
    }

    // ===== TEXT MESSAGE HANDLERS =====
    if (text && !text.startsWith("/")) {
      const session = await getActiveSession(supabase, chatId);

      if (session) {
        await callFormStep({
          chat_id: chatId,
          session_id: session.id,
          user_answer: text,
          message_id: message?.message_id,
        });
        return new Response("ok", { status: 200 });
      }

      // TXID for a Chinese Bot license order
      const handledTxid = await licenseText(licenseCtx(supabase), chatId, from, text);
      if (handledTxid) return new Response("ok", { status: 200 });

      // A license key typed in the chat -> Signal Tool access
      const handledKey = await signalKeyText(licenseCtx(supabase), chatId, from, text);
      if (handledKey) return new Response("ok", { status: 200 });
    }

    // ===== SLASH COMMANDS (bot command menu) =====
    if (text?.startsWith("/") && !text.startsWith("/start")) {
      const cmd = text.trim().split(/\s+/)[0].slice(1).split("@")[0].toLowerCase();
      const handled = await handleCommand(supabase, chatId, cmd, from);
      if (handled) return new Response("ok", { status: 200 });
    }

    // ===== /start =====
    if (text?.startsWith("/start")) {
      const parts = text.trim().split(/\s+/);
      const payload = parts[1];

      // App's "Get License Key DM on Telegram" button
      if (payload === "license") {
        await notifyLicenseLead(licenseCtx(supabase), from, chatId, "App • Get License Key DM");
        await sendLicenseMenu(licenseCtx(supabase), chatId);
        return new Response("ok", { status: 200 });
      }

      // App's "Open Signal Tool" button (payload carries the license order id)
      if (payload?.startsWith("sig_")) {
        await sendSignalAccess(licenseCtx(supabase), chatId, from, payload.slice(4));
        return new Response("ok", { status: 200 });
      }

      // App order -> link this chat so the key can be delivered here
      if (payload?.startsWith("lo_")) {
        await licenseLinkOrder(licenseCtx(supabase), chatId, payload.slice(3), from);
        return new Response("ok", { status: 200 });
      }

      if (payload?.startsWith("am_")) {
        const appId = payload.slice("am_".length);
        const { data: appRow } = await supabase
          .from("account_management_applications")
          .select("id, name, status, service_type")
          .eq("id", appId)
          .maybeSingle();

        if (!appRow) {
          await sendPlainMessage(chatId, "Application not found.");
          return new Response("ok", { status: 200 });
        }

        await supabase
          .from("account_management_applications")
          .update({
            telegram_chat_id: chatId,
            telegram_linked_at: new Date().toISOString(),
          })
          .eq("id", appId);

        await sendPlainMessage(
          chatId,
          linkedConfirmationText(
            appRow.name,
            appRow.status,
            appRow.service_type === "recovery" ? "recovery" : "account"
          )
        );
        return new Response("ok", { status: 200 });
      }

      if (payload) {
        const { data: reqRow } = await supabase
          .from("mt5_copier_requests")
          .select("id, name, status")
          .eq("id", payload)
          .maybeSingle();

        if (!reqRow) {
          await sendPlainMessage(chatId, "MT5 Copier request not found.");
          return new Response("ok", { status: 200 });
        }

        await supabase
          .from("mt5_copier_requests")
          .update({
            telegram_chat_id: chatId,
            telegram_linked_at: new Date().toISOString(),
          })
          .eq("id", payload);

        await sendPlainMessage(chatId, linkedConfirmationText(reqRow.name, reqRow.status, "copy"));
        return new Response("ok", { status: 200 });
      }

      await showMainMenu(chatId);
      return new Response("ok", { status: 200 });
    }

    await sendPlainMessage(chatId, "Use the buttons or type /start for the main menu.");
    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("telegram-webhook error:", error);
    return new Response("ok", { status: 200 });
  }
});
