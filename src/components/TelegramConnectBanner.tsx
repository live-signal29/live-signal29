import { useEffect, useState } from "react";
import { Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TelegramLoginButton from "@/components/TelegramLoginButton";

const DISMISS_KEY = "tg-connect-dismissed-at";
const DISMISS_DAYS = 3;

/**
 * Asks logged-in users who have no Telegram connected yet to connect it, so the team can reach
 * them (offers, signal alerts, trial reminders). Hidden once connected; "X" hides it for a few days.
 */
export default function TelegramConnectBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const last = Number(localStorage.getItem(DISMISS_KEY) || 0);
        if (last && Date.now() - last < DISMISS_DAYS * 86400000) return;
      } catch {
        /* storage unavailable: just show it */
      }
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data } = await supabase
        .from("user_telegram" as any)
        .select("user_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (active && !data) setShow(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div className="relative border-b border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-500/20 dark:bg-sky-500/10">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide"
        className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="mx-auto flex max-w-md flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Send className="h-4 w-4 text-[#229ED9]" />
          Connect Telegram
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Get instant signal alerts, offers and account updates on Telegram.
        </p>
        <TelegramLoginButton mode="link" label="Connect Telegram" onLinked={() => setShow(false)} />
      </div>
    </div>
  );
}
