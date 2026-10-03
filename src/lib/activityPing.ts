import { supabase } from "@/integrations/supabase/client";

const KEY = "ls_last_ping";
const EVERY_MS = 10 * 60 * 1000;

/** Tells the server this logged-in user is active now (max once / 10 min). */
export const pingActive = () => {
  try {
    const last = Number(localStorage.getItem(KEY) || 0);
    if (Date.now() - last < EVERY_MS) return;
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage unavailable - still try */
  }
  (supabase as any).rpc("touch_last_active").then(
    () => undefined,
    () => undefined
  );
};
