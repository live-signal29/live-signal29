import { supabase } from "@/integrations/supabase/client";

export type TelegramPurpose = "login" | "link";

export type TelegramStart = {
  nonce: string;
  secret: string;
  url: string;
  already_linked?: boolean;
  username?: string | null;
};

export type TelegramCheck = {
  status: "pending" | "ok" | "linked" | "expired" | "conflict" | "used";
  token_hash?: string;
  username?: string | null;
};

/** Step 1: ask the server for a one-time Telegram link. */
export async function startTelegramAuth(purpose: TelegramPurpose): Promise<TelegramStart> {
  const { data, error } = await supabase.functions.invoke("telegram-auth", {
    body: { action: "start", purpose },
  });
  if (error || !data || (data as any).error) {
    throw new Error((data as any)?.error || "Could not start Telegram login. Please try again.");
  }
  return data as TelegramStart;
}

/** Step 3: ask whether the user pressed START in the bot yet. */
export async function checkTelegramAuth(nonce: string, secret: string): Promise<TelegramCheck> {
  const { data, error } = await supabase.functions.invoke("telegram-auth", {
    body: { action: "check", nonce, secret },
  });
  if (error || !data) return { status: "pending" }; // transient network problem: keep waiting
  if ((data as any).error) throw new Error((data as any).error);
  return data as TelegramCheck;
}
