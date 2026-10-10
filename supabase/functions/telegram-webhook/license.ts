// Chinese Bot license purchase flow for the Telegram bot.
// Plans: 6 months = $30, lifetime = $70. Payment methods are read live from the admin's Payment Settings.

type Ctx = {
  supabase: any;
  adminChatId?: string;
  esc: (v: unknown) => string;
  sendHtml: (chatId: number | string, text: string, markup?: Record<string, unknown>) => Promise<any>;
  render: (chatId: number | string, text: string, kb: unknown[], messageId?: number) => Promise<any>;
  tg: (method: string, payload: Record<string, unknown>) => Promise<any>;
};

type From = { username?: string | null; name?: string | null };

export const LICENSE_PLANS: Record<string, { label: string; amount: number; short: string }> = {
  "6m": { label: "6 Months", amount: 30, short: "6 Months" },
  lifetime: { label: "Lifetime", amount: 70, short: "Lifetime" },
};

type Method = { id: string; label: string; address: string };

// Payment methods come from the admin's Payment Settings (payment_settings.payment_addresses),
// so changing them in the admin panel changes the bot instantly.
async function getMethods(ctx: Ctx): Promise<Method[]> {
  const { data } = await ctx.supabase.from("payment_settings").select("payment_addresses").eq("id", "default").maybeSingle();
  const list = Array.isArray(data?.payment_addresses) ? data.payment_addresses : [];
  return list.filter((m: any) => m?.label && m?.address).map((m: any) => ({ id: String(m.id || ""), label: String(m.label), address: String(m.address) }));
}

const shortLabel = (label: string) => {
  const t = label.split("(")[0].trim();
  return (t.length > 22 ? t.slice(0, 21) + "…" : t) || label;
};

const AWAIT_WINDOW_MS = 24 * 3600 * 1000;

const menuKb = () => [{ text: "⬅️ Main Menu", callback_data: "show_menu" }];

async function notifyAdmin(ctx: Ctx, text: string, photoFileId?: string | null) {
  if (!ctx.adminChatId) return;
  if (photoFileId) {
    const r = await ctx.tg("sendPhoto", {
      chat_id: ctx.adminChatId,
      photo: photoFileId,
      caption: text,
      parse_mode: "HTML",
    });
    if (r?.ok) return;
  }
  await ctx.sendHtml(ctx.adminChatId, text);
}

async function notifyAdminPanel(ctx: Ctx, title: string, message: string, metadata: Record<string, unknown>) {
  try {
    const { data: admins } = await ctx.supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      await ctx.supabase.from("notifications").insert(
        admins.map((a: any) => ({ user_id: a.user_id, title, message, type: "license_order", metadata }))
      );
    }
  } catch (e) {
    console.error("license admin-panel notification failed:", e);
  }
}

const who = (ctx: Ctx, from: From) =>
  `🙋 Name: <b>${ctx.esc(from.name || "-")}</b>\n✈️ Telegram: ${from.username ? "@" + ctx.esc(from.username) : "-"}`;

// ---- Plans screen (also what a user sees after opening the bot for a key) ----
export async function sendLicenseMenu(ctx: Ctx, chatId: number, messageId?: number) {
  const text =
    `🤖 <b>Live Signals Chinese Bot</b>\n` +
    `<i>Premium Trading Signals • License Key</i>\n\n` +
    `To get your license key you need to complete a payment. Choose a plan:\n\n` +
    `▫️ <b>6 Months</b> — <b>$30</b>\n` +
    `▫️ <b>Lifetime</b> — <b>$70</b>  ⭐ Best value\n\n` +
    `After you pay, your key is sent to you right here in this chat.`;
  return ctx.render(
    chatId,
    text,
    [
      [{ text: "6 Months — $30", callback_data: "lic_plan:6m" }],
      [{ text: "Lifetime — $70  ⭐", callback_data: "lic_plan:lifetime" }],
      menuKb(),
    ],
    messageId
  );
}

// Admin gets pinged when someone opens the bot for a license key.
export async function notifyLicenseLead(ctx: Ctx, from: From, chatId: number, via: string) {
  await notifyAdmin(
    ctx,
    `🔑 <b>LICENSE KEY INQUIRY (Bot)</b>\n\n${who(ctx, from)}\n🆔 Chat: <code>${chatId}</code>\n📍 Via: ${ctx.esc(via)}\n\n` +
      `<i>User was shown: 6 Months $30 / Lifetime $70 and the payment steps.</i>`
  );
}

// ---- Payment screen ----
export async function sendLicensePayment(ctx: Ctx, chatId: number, plan: string, method: string, messageId?: number) {
  const p = LICENSE_PLANS[plan];
  if (!p) return sendLicenseMenu(ctx, chatId, messageId);

  const methods = await getMethods(ctx);
  if (methods.length === 0) {
    return ctx.render(
      chatId,
      `⚠️ <b>Payment details are not available right now.</b>\n\nPlease contact support and we will help you complete your purchase.`,
      [[{ text: "💬 Support", callback_data: "support" }], [{ text: "⬅️ Change Plan", callback_data: "lic_plans" }]],
      messageId
    );
  }
  const idx = Math.min(Math.max(parseInt(method, 10) || 0, 0), methods.length - 1);
  const m = methods[idx];

  const text =
    `💳 <b>Payment — ${ctx.esc(p.label)}</b>\n\n` +
    `Amount: <b>$${p.amount}</b>\n` +
    `Method: <b>${ctx.esc(m.label)}</b>\n\n` +
    `Send payment to:\n<code>${ctx.esc(m.address)}</code>\n<i>(tap to copy)</i>\n\n` +
    `⚠️ Double-check the details before sending. Payments are irreversible.\n\n` +
    `<b>After paying:</b> tap <b>“I Have Paid”</b> and send your TXID / order ID (or a payment screenshot).`;

  const rows: any[] = [];
  if (methods.length > 1) {
    methods.forEach((x, i) => rows.push([{ text: `${i === idx ? "✅ " : ""}${shortLabel(x.label)}`, callback_data: `lic_pay:${plan}:${i}` }]));
  }
  rows.push([{ text: "✅ I Have Paid", callback_data: `lic_paid:${plan}:${idx}` }]);
  rows.push([{ text: "⬅️ Change Plan", callback_data: "lic_plans" }]);

  return ctx.render(chatId, text, rows, messageId);
}

// ---- "I Have Paid": create an order waiting for the TXID ----
export async function licensePaid(ctx: Ctx, chatId: number, from: From, plan: string, method: string) {
  const p = LICENSE_PLANS[plan];
  const methods = await getMethods(ctx);
  const m = methods[parseInt(method, 10)];
  if (!p || !m) return sendLicenseMenu(ctx, chatId);

  // One open "awaiting" order per chat: reuse it.
  await ctx.supabase.from("license_orders").delete().eq("telegram_chat_id", chatId).eq("status", "awaiting_txid");

  const { error } = await ctx.supabase.from("license_orders").insert({
    plan,
    plan_label: p.label,
    amount: p.amount,
    source: "bot",
    customer_name: from.name || null,
    telegram_username: from.username || null,
    telegram_chat_id: chatId,
    cryptocurrency: m.label,
    wallet_address: m.address,
    status: "awaiting_txid",
  });
  if (error) {
    console.error("license order insert failed:", error);
    return ctx.sendHtml(chatId, "⚠️ Could not start your order. Please try again.", {
      inline_keyboard: [menuKb()],
    });
  }

  return ctx.sendHtml(
    chatId,
    `🧾 <b>Almost done!</b>\n\nPlease send your <b>transaction ID / order ID</b> as a message — or upload a <b>screenshot</b> of the payment.\n\n` +
      `Plan: <b>${ctx.esc(p.label)}</b> • $${p.amount} • ${ctx.esc(m.label)}\n\n<i>Type /cancel to stop.</i>`,
    { inline_keyboard: [[{ text: "✗ Cancel", callback_data: "lic_cancel" }]] }
  );
}

export async function licenseCancel(ctx: Ctx, chatId: number) {
  await ctx.supabase.from("license_orders").delete().eq("telegram_chat_id", chatId).eq("status", "awaiting_txid");
}

async function findAwaiting(ctx: Ctx, chatId: number) {
  const { data } = await ctx.supabase
    .from("license_orders")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .eq("status", "awaiting_txid")
    .order("created_at", { ascending: false })
    .limit(1);
  const row = data?.[0];
  if (!row) return null;
  if (Date.now() - new Date(row.created_at).getTime() > AWAIT_WINDOW_MS) {
    await ctx.supabase.from("license_orders").delete().eq("id", row.id);
    return null;
  }
  return row;
}

async function finishOrder(ctx: Ctx, order: any, chatId: number, from: From, txid: string | null, fileId: string | null) {
  const { error } = await ctx.supabase
    .from("license_orders")
    .update({
      status: "pending",
      transaction_id: txid,
      proof_file_id: fileId,
      customer_name: order.customer_name || from.name || null,
      telegram_username: from.username || order.telegram_username || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (error) {
    console.error("license order finish failed:", error);
    await ctx.sendHtml(chatId, "⚠️ Could not save your payment. Please send the TXID again.");
    return;
  }

  await notifyAdmin(
    ctx,
    `🤖 <b>NEW CHINESE BOT LICENSE ORDER (Bot)</b>\n━━━━━━━━━━━━━━━\n\n` +
      `📦 Plan: <b>${ctx.esc(order.plan_label)}</b>\n` +
      `💵 Amount: <b>$${Number(order.amount).toFixed(2)}</b>\n` +
      `🪙 Method: ${ctx.esc(order.cryptocurrency)}\n` +
      (txid ? `🧾 TXID: <code>${ctx.esc(txid)}</code>\n` : `📸 Payment screenshot attached\n`) +
      `\n${who(ctx, from)}\n🆔 Chat: <code>${chatId}</code>\n\n` +
      `👉 Verify, then open Admin Panel → <b>Licenses</b> → Approve &amp; Send Key.`,
    fileId
  );

  await notifyAdminPanel(
    ctx,
    "🤖 New Chinese Bot license order",
    `${from.name || from.username || "User"} • ${order.plan_label} • $${Number(order.amount).toFixed(0)} (Bot)`,
    { order_id: order.id, source: "bot" }
  );

  await ctx.sendHtml(
    chatId,
    `✅ <b>Payment submitted!</b>\n\nWe received your payment details for <b>${ctx.esc(order.plan_label)}</b>.\n` +
      `Our team will verify it and your <b>license key will be sent here in this chat</b> shortly.`,
    { inline_keyboard: [menuKb()] }
  );
}

// Returns true when the message was consumed as a TXID.
export async function licenseText(ctx: Ctx, chatId: number, from: From, text: string): Promise<boolean> {
  const order = await findAwaiting(ctx, chatId);
  if (!order) return false;
  const txid = text.trim();
  if (txid.length < 6) {
    await ctx.sendHtml(chatId, "Please send a valid TXID (at least 6 characters) or a payment screenshot.");
    return true;
  }
  await finishOrder(ctx, order, chatId, from, txid.slice(0, 300), null);
  return true;
}

export async function licensePhoto(ctx: Ctx, chatId: number, from: From, photos: any[]): Promise<boolean> {
  const order = await findAwaiting(ctx, chatId);
  if (!order) return false;
  const fileId = photos?.[photos.length - 1]?.file_id || null;
  if (!fileId) return false;
  await finishOrder(ctx, order, chatId, from, null, fileId);
  return true;
}

// Deep link t.me/<bot>?start=lo_<orderId>: ties an in-app order to this chat so the key can be delivered here.
export async function licenseLinkOrder(ctx: Ctx, chatId: number, orderId: string, from: From) {
  const { data: order } = await ctx.supabase.from("license_orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) {
    await ctx.sendHtml(chatId, "Order not found.");
    return;
  }
  if (order.telegram_chat_id && String(order.telegram_chat_id) !== String(chatId)) {
    await ctx.sendHtml(chatId, "This order is already linked to another Telegram account.");
    return;
  }
  await ctx.supabase
    .from("license_orders")
    .update({
      telegram_chat_id: chatId,
      telegram_username: from.username || order.telegram_username || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (order.status === "approved" && order.license_key) {
    await ctx.sendHtml(
      chatId,
      `🔑 <b>Your license key</b>\n<code>${ctx.esc(order.license_key)}</code>\n\nPlan: <b>${ctx.esc(order.plan_label)}</b>`,
      { inline_keyboard: [menuKb()] }
    );
    return;
  }
  await ctx.sendHtml(
    chatId,
    `✅ <b>Linked!</b>\n\nYour <b>${ctx.esc(order.plan_label)}</b> order (status: <b>${ctx.esc(order.status)}</b>) is connected to this chat.\n` +
      `Once the payment is verified, your license key will be sent here automatically.`,
    { inline_keyboard: [menuKb()] }
  );
  await notifyAdmin(
    ctx,
    `🔗 <b>Telegram linked to license order</b>\n\n${who(ctx, from)}\n📦 ${ctx.esc(order.plan_label)} • $${Number(order.amount).toFixed(0)} • ${ctx.esc(order.status)}`
  );
}
