// Bot side of the standalone Signal Tool: everyone gets the site link; licensed users also get their key.
// The site URL is read from bot_secrets (key = 'signal_site_url') so it can be set/changed without redeploying.

type Ctx = {
  supabase: any;
  adminChatId?: string;
  esc: (v: unknown) => string;
  sendHtml: (chatId: number | string, text: string, markup?: Record<string, unknown>) => Promise<any>;
};

type From = { username?: string | null; name?: string | null };

const KEY_RE = /^[A-Za-z0-9]{4}(-?[A-Za-z0-9]{4}){3}$/;
const usable = (o: any) => o && o.status === "approved" && (!o.expires_at || new Date(o.expires_at) > new Date());
const menuKb = () => [{ text: "⬅️ Main Menu", callback_data: "show_menu" }];

async function getSiteUrl(ctx: Ctx): Promise<string | null> {
  const { data } = await ctx.supabase.from("bot_secrets").select("value").eq("key", "signal_site_url").maybeSingle();
  const v = String(data?.value ?? "").trim();
  return /^https?:\/\//i.test(v) ? v : null;
}

async function sendSetupSoon(ctx: Ctx, chatId: number) {
  await ctx.sendHtml(
    chatId,
    `📡 <b>Signal Tool</b>\n\nThe Signal Tool is being set up and will be available very soon. We will notify you here.`,
    { inline_keyboard: [menuKb()] }
  );
}

// Licensed user: site link + their own key
async function sendAccess(ctx: Ctx, chatId: number, order: any) {
  const url = await getSiteUrl(ctx);
  if (!url) return sendSetupSoon(ctx, chatId);
  await ctx.sendHtml(
    chatId,
    `📡 <b>Signal Tool</b>\n<i>Live Signals • Chinese Bot</i>\n\n` +
      `✅ Your <b>${ctx.esc(order.plan_label)}</b> license is active.\n\n` +
      `<b>How to get in:</b>\n` +
      `1️⃣ Copy your license key:\n<code>${ctx.esc(order.license_key)}</code> <i>(tap to copy)</i>\n` +
      `2️⃣ Tap <b>Open Signal Tool</b> below\n` +
      `3️⃣ Paste the key on the site and press <b>Activate</b>\n\n` +
      `🔒 Your key works on <b>one device</b> only. Do not share it.\n` +
      `⚠️ Signals are not guaranteed. Trade only what you can afford to lose.`,
    { inline_keyboard: [[{ text: "🌐 Open Signal Tool", url }], menuKb()] }
  );
}

// Everyone else: site link + buy button (the site itself still needs a valid key)
async function sendPublicAccess(ctx: Ctx, chatId: number) {
  const url = await getSiteUrl(ctx);
  if (!url) return sendSetupSoon(ctx, chatId);
  await ctx.sendHtml(
    chatId,
    `📡 <b>Signal Tool</b>\n<i>Live Signals • Chinese Bot</i>\n\n` +
      `1️⃣ Tap <b>Open Signal Tool</b> below\n` +
      `2️⃣ Enter your license key and press <b>Activate Bot</b>\n\n` +
      `🔑 No key yet? Tap <b>Get a License Key</b>. Your key is sent here right after your payment is verified.\n\n` +
      `🔒 One key works on <b>one device</b> only.\n` +
      `⚠️ Signals are not guaranteed. Trade only what you can afford to lose.`,
    {
      inline_keyboard: [
        [{ text: "🌐 Open Signal Tool", url }],
        [{ text: "🤖 Get a License Key", callback_data: "lic_menu" }],
        menuKb(),
      ],
    }
  );
}

// /signal, "Open Signal Tool" button, or deep link with an order id (?start=sig_<orderId>)
export async function sendSignalAccess(ctx: Ctx, chatId: number, from: From, orderId?: string) {
  let order: any = null;

  if (orderId) {
    const { data } = await ctx.supabase.from("license_orders").select("*").eq("id", orderId).maybeSingle();
    if (usable(data)) {
      order = data;
      // remember this chat so future /signal and key deliveries work without the app
      if (!data.telegram_chat_id) {
        await ctx.supabase
          .from("license_orders")
          .update({ telegram_chat_id: chatId, telegram_username: from.username || data.telegram_username || null })
          .eq("id", orderId);
      }
    }
  } else {
    const { data } = await ctx.supabase
      .from("license_orders")
      .select("*")
      .eq("telegram_chat_id", chatId)
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(5);
    order = (data ?? []).find(usable) ?? null;
  }

  if (!order) return sendPublicAccess(ctx, chatId);
  return sendAccess(ctx, chatId, order);
}

// A plain message that looks like a license key. Returns true when it was handled.
export async function signalKeyText(ctx: Ctx, chatId: number, from: From, text: string): Promise<boolean> {
  const t = text.trim();
  if (!KEY_RE.test(t)) return false;
  const c = t.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const fmt = `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}-${c.slice(12)}`;
  const { data } = await ctx.supabase.from("license_orders").select("*").eq("license_key", fmt).eq("status", "approved").maybeSingle();
  if (!usable(data)) {
    await ctx.sendHtml(chatId, "❌ Invalid or expired license key. Please check it and try again.", { inline_keyboard: [menuKb()] });
    return true;
  }
  // A key that already belongs to another Telegram chat is not handed out again
  if (data.telegram_chat_id && String(data.telegram_chat_id) !== String(chatId)) {
    await ctx.sendHtml(chatId, "⚠️ This key is already linked to another Telegram account.", { inline_keyboard: [menuKb()] });
    return true;
  }
  if (!data.telegram_chat_id) {
    await ctx.supabase
      .from("license_orders")
      .update({ telegram_chat_id: chatId, telegram_username: from.username || data.telegram_username || null })
      .eq("id", data.id);
  }
  await sendAccess(ctx, chatId, data);
  return true;
}
