import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { openExternal } from "@/lib/openExternal";
import { checkTelegramAuth, startTelegramAuth, type TelegramPurpose } from "@/lib/telegramAuth";

type Props = {
  /** "login": sign in / sign up with Telegram. "link": connect Telegram to the account that is already logged in. */
  mode?: TelegramPurpose;
  returnUrl?: string;
  label?: string;
  onLinked?: () => void;
  className?: string;
};

type Pending = { nonce: string; secret: string; url: string; startedAt: number; returnUrl: string };

const POLL_MS = 2000;
const MAX_WAIT_MS = 10 * 60 * 1000;
const STORE_KEY = "tg-login-pending";

// The login request is remembered on this device, so if the app is reloaded or killed while the user is
// inside Telegram, the login still finishes when they come back.
const loadPending = (): Pending | null => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Pending;
    if (!p?.nonce || !p?.secret || Date.now() - p.startedAt > MAX_WAIT_MS) {
      localStorage.removeItem(STORE_KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
};
const savePending = (p: Pending) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: login still works while this page stays open */
  }
};
const clearPending = () => {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
};

// Exchanges the one-time token for a session. Tries both token types and accepts an existing session.
async function signInWithToken(tokenHash: string): Promise<boolean> {
  let { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error) {
    const retry = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    error = retry.error;
  }
  if (error) {
    const { data } = await supabase.auth.getSession();
    if (data?.session) return true; // already signed in by an earlier attempt
  }
  return !error;
}

export default function TelegramLoginButton({
  mode = "login",
  returnUrl = "/",
  label,
  onLinked,
  className = "",
}: Props) {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [waiting, setWaiting] = useState<{ url: string } | null>(null);
  const ctl = useRef<{ stop: boolean; inFlight: boolean; timer: ReturnType<typeof setTimeout> | null } | null>(null);

  const stop = useCallback(() => {
    if (ctl.current) {
      ctl.current.stop = true;
      if (ctl.current.timer) clearTimeout(ctl.current.timer);
    }
    ctl.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const finish = useCallback(
    async (r: Awaited<ReturnType<typeof checkTelegramAuth>>, ret: string) => {
      stop();
      if (r.status === "ok" && r.token_hash) {
        const okSignIn = await signInWithToken(r.token_hash);
        clearPending();
        setWaiting(null);
        if (!okSignIn) {
          toast.error("Could not sign you in. Please try again.");
          return;
        }
        toast.success("Logged in with Telegram!");
        try {
          const { data: u } = await supabase.auth.getUser();
          if (u?.user) {
            const ua = navigator.userAgent;
            await supabase.from("user_login_history").insert({
              user_id: u.user.id,
              device_type: /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop",
              browser: ua,
            });
          }
        } catch {
          /* login history is best-effort */
        }
        navigate(ret);
      } else if (r.status === "linked") {
        clearPending();
        setWaiting(null);
        toast.success("Telegram connected!");
        onLinked?.();
      } else if (r.status === "conflict") {
        clearPending();
        setWaiting(null);
        toast.error("This Telegram account is already connected to another account.");
      } else {
        clearPending();
        setWaiting(null);
        toast.error("Telegram login expired. Please try again.");
      }
    },
    [navigate, onLinked, stop]
  );

  // One poll at a time (never two requests in flight), plus an instant check when the user returns to the app.
  const startPolling = useCallback(
    (p: Pending) => {
      stop();
      const c = { stop: false, inFlight: false, timer: null as ReturnType<typeof setTimeout> | null };
      ctl.current = c;

      const tick = async () => {
        if (c.stop || c.inFlight) return;
        if (Date.now() - p.startedAt > MAX_WAIT_MS) {
          c.stop = true;
          clearPending();
          setWaiting(null);
          toast.error("Telegram login expired. Please try again.");
          return;
        }
        c.inFlight = true;
        try {
          const r = await checkTelegramAuth(p.nonce, p.secret);
          if (c.stop) return;
          if (r.status === "pending") {
            c.timer = setTimeout(tick, POLL_MS);
            return;
          }
          c.stop = true;
          await finish(r, p.returnUrl);
        } catch (e: any) {
          if (c.stop) return;
          c.stop = true;
          clearPending();
          setWaiting(null);
          toast.error(e?.message || "Telegram login failed.");
        } finally {
          c.inFlight = false;
        }
      };

      const onVisible = () => {
        if (document.visibilityState === "visible" && !c.stop && !c.inFlight) {
          if (c.timer) clearTimeout(c.timer);
          tick();
        }
      };
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("focus", onVisible);
      const origStop = stop;
      void origStop;

      setWaiting({ url: p.url });
      tick();

      // remove listeners when this polling session ends
      const cleanup = setInterval(() => {
        if (c.stop) {
          document.removeEventListener("visibilitychange", onVisible);
          window.removeEventListener("focus", onVisible);
          clearInterval(cleanup);
        }
      }, 1000);
    },
    [finish, stop]
  );

  // Resume a login that was started before the page was reloaded / the app came back from Telegram.
  useEffect(() => {
    if (mode !== "login") return;
    const p = loadPending();
    if (p) startPolling(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancel = () => {
    stop();
    clearPending();
    setWaiting(null);
  };

  const begin = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const s = await startTelegramAuth(mode);

      if (s.already_linked) {
        toast.success("Telegram is already connected.");
        onLinked?.();
        return;
      }

      const p: Pending = { nonce: s.nonce, secret: s.secret, url: s.url, startedAt: Date.now(), returnUrl };
      if (mode === "login") savePending(p);
      startPolling(p);
      openExternal(s.url);
    } catch (e: any) {
      toast.error(e?.message || "Could not start Telegram login.");
    } finally {
      setStarting(false);
    }
  };

  if (waiting) {
    return (
      <div
        className={`rounded-xl border border-sky-300/60 bg-sky-50 p-4 text-center text-sm dark:border-sky-500/30 dark:bg-sky-500/10 ${className}`}
      >
        <p className="font-semibold text-slate-900 dark:text-white">Open Telegram and press START</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          Then come back here. You will be signed in automatically.
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => openExternal(waiting.url)}
            className="rounded-lg bg-[#229ED9] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            Open Telegram again
          </button>
          <button
            type="button"
            onClick={cancel}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={begin}
        disabled={starting}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#229ED9] text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {starting ? "Please wait…" : label || (mode === "link" ? "Connect Telegram" : "Continue with Telegram")}
      </button>
      {mode === "login" && (
        <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
          By continuing you agree to our Terms and Privacy Policy.
        </p>
      )}
    </div>
  );
}
