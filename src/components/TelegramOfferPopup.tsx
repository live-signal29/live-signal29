import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TelegramLoginButton from "@/components/TelegramLoginButton";

/* =========================================================
   TELEGRAM OFFER POPUP

   Shown to logged-in users who have NOT connected Telegram yet
   (works for expired users too - it is mounted globally).
   Connecting uses the existing "link" mode, so Telegram gets
   attached to the SAME account they are logged into.

   Tweak the offer below.
========================================================= */

const BONUS_DAYS = 5;
const SHOW_BONUS_TEXT = true; // set false to hide the "+5 days" promise
const SHOW_DELAY_MS = 3500; // wait so it does not clash with other popups

// Lives only in memory: it resets every time the app is closed and opened
// again, so the popup comes back on every fresh app start until Telegram
// is connected. Within one app session it shows once ("Maybe later" hides
// it until the next app start).
let handledThisLaunch = false;

const HIDE_ON = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
];

const TelegramOfferPopup = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const path = location.pathname.toLowerCase();
  const hidden =
    HIDE_ON.includes(path) || path.startsWith("/admin");

  useEffect(() => {
    if (hidden) {
      setOpen(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      if (handledThisLaunch) return;

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user || cancelled) return;

      const { data } = await supabase
        .from("user_telegram" as any)
        .select("user_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (cancelled || data) return; // already connected

      timer = setTimeout(() => {
        if (!cancelled && !handledThisLaunch) {
          handledThisLaunch = true;
          setOpen(true);
        }
      }, SHOW_DELAY_MS);
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [hidden, path]);

  const snooze = () => {
    handledThisLaunch = true;
    setOpen(false);
  };

  if (hidden) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : snooze())}>
      <DialogContent className="w-[calc(100%-24px)] max-w-sm rounded-3xl p-5">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-500/15">
            <Send className="h-6 w-6" />
          </div>

          <DialogTitle className="text-xl font-extrabold">
            Connect your Telegram
          </DialogTitle>

          <DialogDescription className="text-sm">
            Easy login, safe account &amp; instant support.
          </DialogDescription>

          {SHOW_BONUS_TEXT && (
            <div className="mx-auto w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              🎁 +{BONUS_DAYS} FREE days
            </div>
          )}

          <TelegramLoginButton
            mode="link"
            label="Connect Telegram"
            onLinked={() => {
              toast.success(
                SHOW_BONUS_TEXT
                  ? "Telegram connected! Your bonus days will be added soon."
                  : "Telegram connected!"
              );
              setOpen(false);
            }}
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-xs text-slate-500"
            onClick={snooze}
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TelegramOfferPopup;
