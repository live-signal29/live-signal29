import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { Crown, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { playUnlockSound } from "@/lib/sound";
import { SUBSCRIPTION_UPDATED_EVENT } from "@/lib/subscriptionEvents";

/* =========================================================
   PREMIUM CELEBRATION
   Shows a 🎉 confetti "Premium activated" screen and then sends
   the user to the signals dashboard — for BOTH ways of buying:

   1) Google Play purchase  -> Premium page calls celebratePremium()
      right after the purchase is verified.
   2) Manual crypto payment -> when the admin taps Approve, this
      component notices the user's payment_submissions row turned
      "approved" (checked on open, on coming back to the app, and
      every 20s while a payment is still pending) and celebrates.
========================================================= */

export const PREMIUM_CELEBRATE_EVENT = "live-signals:premium-celebrate";

export function celebratePremium(detail: { planName?: string } = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PREMIUM_CELEBRATE_EVENT, { detail }));
}

const db = supabase as any;
const REDIRECT_SECONDS = 8;
const RECENT_MS = 24 * 60 * 60 * 1000;

type Info = { planName: string; until: string | null; lifetime: boolean };

const readSet = (key: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};
const writeSet = (key: string, ids: string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(ids.slice(-100)));
  } catch {
    /* storage blocked */
  }
};

const fireConfetti = () => {
  const end = Date.now() + 2500;
  const colors = ["#f5a623", "#10b981", "#06b6d4", "#ef4444", "#8b5cf6"];
  confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors, zIndex: 3000 });
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors, zIndex: 3000 });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors, zIndex: 3000 });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
};

const PremiumCelebration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [info, setInfo] = useState<Info | null>(null);
  const [secs, setSecs] = useState(REDIRECT_SECONDS);
  const showingRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdminRoute = location.pathname.startsWith("/admin");

  const show = useCallback(async (planName?: string) => {
    if (showingRef.current) return;
    showingRef.current = true;

    let until: string | null = null;
    let lifetime = false;
    let name = planName || "Premium";
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const { data: p } = await db
          .from("profiles")
          .select("subscription_plan, subscription_end_date")
          .eq("id", auth.user.id)
          .maybeSingle();
        if (p) {
          lifetime = p.subscription_plan === "premium-lifetime";
          until = p.subscription_end_date || null;
        }
      }
    } catch {
      /* show the screen anyway */
    }

    // Make every screen re-read the subscription so locked cards open up.
    window.dispatchEvent(new Event(SUBSCRIPTION_UPDATED_EVENT));

    setSecs(REDIRECT_SECONDS);
    setInfo({ planName: name, until, lifetime });
    playUnlockSound();
    fireConfetti();
  }, []);

  const close = useCallback(
    (to?: string) => {
      showingRef.current = false;
      setInfo(null);
      if (to) navigate(to);
    },
    [navigate]
  );

  // Countdown, then go to the signals dashboard.
  useEffect(() => {
    if (!info) return;
    if (secs <= 0) {
      close("/");
      return;
    }
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [info, secs, close]);

  // Google Play purchase -> instant celebration.
  useEffect(() => {
    const onEvt = (e: Event) => show((e as CustomEvent).detail?.planName);
    window.addEventListener(PREMIUM_CELEBRATE_EVENT, onEvt);
    return () => window.removeEventListener(PREMIUM_CELEBRATE_EVENT, onEvt);
  }, [show]);

  // Manual payment approved by the admin.
  useEffect(() => {
    if (isAdminRoute) return;
    let cancelled = false;

    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const check = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user || cancelled) {
          stopPolling();
          return;
        }
        userIdRef.current = user.id;

        const { data } = await db
          .from("payment_submissions")
          .select("id, status, plan_name, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(20);
        const rows: any[] = data || [];

        // Keep polling only while something is still waiting for the admin.
        const hasPending = rows.some((r) => r.status === "pending");
        if (hasPending && !pollRef.current) {
          pollRef.current = setInterval(check, 20000);
        } else if (!hasPending) {
          stopPolling();
        }

        const key = `ls_celebrated_payments_${user.id}`;
        const hadBaseline = localStorage.getItem(key) !== null;
        const done = readSet(key);
        const approved = rows.filter((r) => r.status === "approved");

        const fresh = approved.filter((r) => {
          if (done.includes(r.id)) return false;
          // First run on this device: only celebrate very recent approvals,
          // silently remember the old ones.
          if (!hadBaseline) return Date.now() - new Date(r.updated_at).getTime() < RECENT_MS;
          return true;
        });

        writeSet(key, Array.from(new Set([...done, ...approved.map((r) => r.id)])));

        if (fresh.length > 0 && !cancelled) {
          show(fresh[0].plan_name ? `${fresh[0].plan_name} Premium` : undefined);
        }
      } catch {
        /* ignore — try again next time */
      }
    };

    check();
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(SUBSCRIPTION_UPDATED_EVENT, check);
    const { data: authSub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === "SIGNED_IN") check();
    });

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(SUBSCRIPTION_UPDATED_EVENT, check);
      authSub?.subscription?.unsubscribe();
    };
  }, [isAdminRoute, show]);

  if (!info) return null;

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm animate-in zoom-in-95 fade-in rounded-3xl bg-gradient-to-b from-amber-50 to-white p-6 text-center shadow-2xl dark:from-slate-900 dark:to-slate-950">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
          <Crown className="h-10 w-10 text-white" />
        </div>

        <h2 className="flex items-center justify-center gap-2 text-2xl font-extrabold">
          <PartyPopper className="h-6 w-6 text-amber-500" />
          Congratulations! 🎉
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your <span className="font-semibold text-foreground">{info.planName}</span> is now active.
          All premium signals are unlocked.
        </p>

        <div className="mt-4 rounded-2xl border bg-muted/40 p-3 text-sm">
          {info.lifetime ? (
            <span className="font-semibold text-emerald-600">Lifetime access ♾️</span>
          ) : info.until ? (
            <span>
              Valid until{" "}
              <span className="font-semibold">
                {new Date(info.until).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </span>
          ) : (
            <span className="font-semibold text-emerald-600">Premium activated</span>
          )}
        </div>

        <div className="mt-5 space-y-2">
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg" onClick={() => close("/")}>
            View Signals
          </Button>
          <Button variant="outline" className="w-full" onClick={() => close("/profile")}>
            Go to Profile
          </Button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">Opening signals in {secs}s…</p>
      </div>
    </div>
  );
};

export default PremiumCelebration;
