// AI auto-reply for the Telegram bot. NEW file: lives next to telegram-webhook/index.ts.
// Called only for free text that no menu / form / license / command handled, in private chats.
// Returns true when it answered; false means "do nothing" (index.ts then sends the old fallback message).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

export async function supportAutoReply(
  chatId: number | string,
  chatType: string | undefined,
  from: { username: string | null; name: string | null },
  text: string
): Promise<boolean> {
  if (!BOT_TOKEN || chatType !== "private") return false;

  const tg = (method: string, payload: Record<string, unknown>) =>
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    tg("sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});

    const res = await fetch(`${SUPABASE_URL}/functions/v1/support-brain`, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        channel: "telegram",
        session_id: `tg:${chatId}`,
        message: text,
        name: from.name,
        username: from.username,
      }),
    });
    if (!res.ok) return false;

    const data = await res.json();
    const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
    if (!reply) return false;

    const sent = await tg("sendMessage", {
      chat_id: chatId,
      text: reply,
      reply_markup: { inline_keyboard: [[{ text: "⬅️ Main Menu", callback_data: "show_menu" }]] },
    });
    return sent.ok;
  } catch (e) {
    console.error("supportAutoReply failed:", e);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
