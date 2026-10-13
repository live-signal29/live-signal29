// Confirms a website / app "Continue with Telegram" request when the user presses START in the bot
// (deep link  t.me/<bot>?start=tl_<nonce>). The website then finishes the login (telegram-auth function).
//
// After the confirmation the bot tells the user to go back to the app (phone Back button / app switcher);
// the app is already polling and signs the user in by itself. The only buttons are "Back to Main Menu"
// (opens the bot's normal main menu) and "Open on Google Play".

type Ctx = {
  supabase: any;
  esc: (v: unknown) => string;
  sendHtml: (chatId: number | string, text: string, markup?: Record<string, unknown>) => Promise<any>;
};

const PLAY_URL = "https://play.google.com/store/apps/details?id=co.median.android.krkqyaz";

const backRows = () => [
  [{ text: "⬅️ Back to Main Menu", callback_data: "show_menu" }],
  [{ text: "📱 Open on Google Play", url: PLAY_URL }],
];

export async function handleTelegramAuthStart(ctx: Ctx, chatId: number, tgUser: any, nonce: string) {
  const expired = () =>
    ctx.sendHtml(
      chatId,
      `⌛ <b>This link has expired.</b>\n\nPlease go back to the website or app and tap <b>Continue with Telegram</b> again.`,
      { inline_keyboard: backRows() }
    );

  if (!/^[0-9a-f]{16}$/.test(nonce) || !tgUser?.id) return expired();

  const { data: req } = await ctx.supabase
    .from("telegram_auth_requests")
    .select("*")
    .eq("nonce", nonce)
    .maybeSingle();

  if (!req || req.status !== "pending" || new Date(req.expires_at) < new Date()) return expired();

  const tgId = Number(tgUser.id);
  const username: string | null = tgUser.username ?? null;
  const firstName: string | null =
    [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ").trim() || null;

  if (req.purpose === "link") {
    // This Telegram account may belong to only one website account.
    const { data: other } = await ctx.supabase
      .from("user_telegram")
      .select("user_id")
      .eq("telegram_id", tgId)
      .maybeSingle();

    if (other && other.user_id !== req.user_id) {
      await ctx.supabase.from("telegram_auth_requests").update({ status: "conflict" }).eq("id", req.id);
      await ctx.sendHtml(
        chatId,
        `⚠️ <b>This Telegram account is already connected to another account.</b>\n\nTo use it here, sign in with <b>Continue with Telegram</b> instead.`,
        { inline_keyboard: backRows() }
      );
      return;
    }

    const { error } = await ctx.supabase.from("user_telegram").upsert(
      {
        user_id: req.user_id,
        telegram_id: tgId,
        username,
        first_name: firstName,
        chat_id: chatId,
        source: "link",
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("telegram link failed:", error.message);
      await ctx.sendHtml(chatId, "⚠️ Could not connect your Telegram. Please try again.", {
        inline_keyboard: backRows(),
      });
      return;
    }
  }

  await ctx.supabase
    .from("telegram_auth_requests")
    .update({
      status: "confirmed",
      telegram_id: tgId,
      username,
      first_name: firstName,
      chat_id: chatId,
    })
    .eq("id", req.id)
    .eq("status", "pending");

  await ctx.sendHtml(
    chatId,
    req.purpose === "link"
      ? `✅ <b>Telegram connected!</b>\n\nGo back to the app or website. You will also get important updates and offers here.`
      : `✅ <b>Bot started — login confirmed!</b>\n\nNow go back to the app (press your phone's <b>Back</b> button). You will be signed in automatically in a few seconds.`,
    { inline_keyboard: backRows() }
  );
}
