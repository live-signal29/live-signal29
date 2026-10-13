import { useEffect, useRef, useState } from "react";
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

const POLL_MS = 2000;
const MAX_WAIT_MS = 10 * 60 * 1000;

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
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const finished = useRef(false);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => stop, []);

  const cancel = () => {
    finished.current = true;
    stop();
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

      finished.current = false;
      setWaiting({ url: s.url });
      openExternal(s.url);

      const startedAt = Date.now();
      stop();
      timer.current = setInterval(async () => {
        if (finished.current) return;
        if (Date.now() - startedAt > MAX_WAIT_MS) {
          cancel();
          toast.error("Telegram login expired. Please try again.");
          return;
        }
        try {
          const r = await checkTelegramAuth(s.nonce, s.secret);
          if (finished.current || r.status === "pending") return;

          finished.current = true;
          stop();

          if (r.status === "ok" && r.token_hash) {
            const { error } = await supabase.auth.verifyOtp({ token_hash: r.token_hash, type: "magiclink" });
            if (error) {
              toast.error("Could not sign you in. Please try again.");
              setWaiting(null);
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
            setWaiting(null);
            navigate(returnUrl);
          } else if (r.status === "linked") {
            toast.success("Telegram connected!");
            setWaiting(null);
            onLinked?.();
          } else if (r.status === "conflict") {
            toast.error("This Telegram account is already connected to another account.");
            setWaiting(null);
          } else {
            toast.error("Telegram login expired. Please try again.");
            setWaiting(null);
          }
        } catch (e: any) {
          finished.current = true;
          stop();
          setWaiting(null);
          toast.error(e?.message || "Telegram login failed.");
        }
      }, POLL_MS);
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
          Waiting for confirmation… this page continues automatically.
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
