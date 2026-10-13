import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { openExternal } from "@/lib/openExternal";

interface TelegramLoginButtonProps {
  /** Where to go after a successful login */
  returnUrl: string;
  label?: string;
}

// "Continue with Telegram"
//  1. ask the backend for a login request (code + secret)
//  2. open the bot (t.me/<bot>?start=login_<code>); the user taps Start
//  3. poll until the bot confirmed it, then sign in with the one-time token
// Works the same on the website and inside the Android app (no widget / domain setup needed).
const MAX_WAIT_MS = 3 * 60 * 1000;

const TelegramLoginButton = ({ returnUrl, label = "Continue with Telegram" }: TelegramLoginButtonProps) => {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const reqRef = useRef<{ code: string; secret: string } | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const busyRef = useRef(false);
  const doneRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopTimer();
    reqRef.current = null;
    busyRef.current = false;
    doneRef.current = false;
    setWaiting(false);
    setLink(null);
  }, [stopTimer]);

  const finish = useCallback(
    async (tokenHash: string) => {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
      if (error) {
        toast.error("Could not sign you in. Please try again.");
        reset();
        return;
      }
      toast.success("Logged in with Telegram!");

      // same login history entry as the email login
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          const ua = navigator.userAgent;
          await supabase.from("user_login_history").insert({
            user_id: data.user.id,
            device_type: /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop",
            browser: ua,
          });
        }
      } catch {
        /* not important */
      }

      reset();
      navigate(returnUrl);
    },
    [navigate, reset, returnUrl]
  );

  const poll = useCallback(async () => {
    const req = reqRef.current;
    if (!req || busyRef.current || doneRef.current) return;
    busyRef.current = true;
    try {
      const { data, error } = await supabase.functions.invoke("telegram-login", {
        body: { action: "poll", code: req.code, secret: req.secret },
      });
      if (error) throw error;
      if (data?.status === "ok" && data.token_hash) {
        doneRef.current = true;
        stopTimer();
        await finish(data.token_hash);
        return;
      }
      if (data?.status === "expired" || data?.status === "invalid" || data?.status === "used") {
        toast.error("Telegram login expired. Please try again.");
        reset();
      }
    } catch {
      /* network hiccup: the next tick tries again */
    } finally {
      busyRef.current = false;
    }
  }, [finish, reset, stopTimer]);

  const schedule = useCallback(() => {
    stopTimer();
    if (!reqRef.current) return;
    const elapsed = Date.now() - startedAtRef.current;
    if (elapsed > MAX_WAIT_MS) {
      toast.error("Telegram login timed out. Please try again.");
      reset();
      return;
    }
    const delay = elapsed < 30000 ? 2000 : 4000; // gentle on the server
    timerRef.current = window.setTimeout(async () => {
      await poll();
      if (reqRef.current && !doneRef.current) schedule();
    }, delay);
  }, [poll, reset, stopTimer]);

  const begin = async () => {
    if (starting || waiting) return;
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-login", {
        body: { action: "start" },
      });
      if (error || !data?.url) throw new Error("start failed");
      reqRef.current = { code: data.code, secret: data.secret };
      doneRef.current = false;
      startedAtRef.current = Date.now();
      setLink(data.url);
      setWaiting(true);
      openExternal(data.url);
      schedule();
    } catch {
      toast.error("Telegram login is not available right now. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  // Coming back from Telegram: check right away instead of waiting for the next tick.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && reqRef.current && !doneRef.current) poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [poll]);

  useEffect(() => () => {
    stopTimer();
    reqRef.current = null;
  }, [stopTimer]);

  if (waiting) {
    return (
      <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-center">
        <div className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold text-sky-700 dark:text-sky-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Waiting for Telegram…
        </div>
        <p className="mb-3 text-xs text-slate-600 dark:text-slate-300">
          Tap <b>Start</b> in the bot, then come back here. You will be signed in automatically.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => link && openExternal(link)}
          >
            Open Telegram
          </Button>
          <Button type="button" variant="ghost" className="flex-1" onClick={reset}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      onClick={begin}
      disabled={starting}
      className="h-11 w-full gap-2 rounded-xl bg-[#229ED9] font-semibold text-white shadow-md shadow-sky-500/20 hover:bg-[#1c8bc0]"
    >
      {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      {label}
    </Button>
  );
};

export default TelegramLoginButton;
