import { supabase } from "@/integrations/supabase/client";

// Telegram "login_url" button support.
//
// The bot's "Get Premium" button opens  https://<site>/premium?tgd=1  through Telegram's login_url feature.
// Telegram appends the tapping user's signed identity (id, first_name, username, auth_date, hash) to that link.
// Here we send it to the telegram-auth function (it verifies the signature with the bot token) and exchange the
// returned one-time token for a session, so the user lands on the page already logged in.
// Runs once, before the app renders. If anything fails the user simply sees the normal login page.

const FIELDS = ["id", "first_name", "last_name", "username", "photo_url", "auth_date", "hash"] as const;

async function signInWithToken(tokenHash: string): Promise<boolean> {
  let { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error) {
    const retry = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    error = retry.error;
  }
  return !error;
}

export async function tryTelegramDeepLogin(): Promise<void> {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const p = url.searchParams;
  if (p.get("tgd") !== "1" || !p.get("hash") || !p.get("id") || !p.get("auth_date")) return;

  const auth: Record<string, string> = {};
  for (const k of FIELDS) {
    const v = p.get(k);
    if (v !== null) auth[k] = v;
  }

  // remove the login data from the address bar right away (it must not stay in history / shares)
  for (const k of [...FIELDS, "tgd"]) p.delete(k);
  // the Premium page scrolls to its plan cards when the address ends with #plans-section
  const hash = url.hash || (url.pathname.replace(/\/+$/, "") === "/premium" ? "#plans-section" : "");
  const clean = url.pathname + (p.toString() ? `?${p.toString()}` : "") + hash;
  window.history.replaceState(null, "", clean);

  try {
    const call = supabase.functions.invoke("telegram-auth", { body: { action: "web_login", auth } });
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000));
    const res: any = await Promise.race([call, timeout]);
    const token = res?.data?.status === "ok" ? res.data.token_hash : null;
    if (token) await signInWithToken(token);
  } catch {
    /* fall back to the normal login page */
  }
}
