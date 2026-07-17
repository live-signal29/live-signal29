import { useEffect, useState } from "react";
import { StreakBadge } from "@/components/StreakBadge";
import { supabase } from "@/integrations/supabase/client";
import { Bell, X } from "lucide-react";

const STREAK_VISIBLE_MS = 20_000;
const COUNTDOWN_SECONDS = 180;

type Phase = "streak" | "upcoming" | "hidden";

export const HomeRotatingBanner = () => {
  const [phase, setPhase] = useState<Phase>("streak");
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [animKey, setAnimKey] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (phase !== "streak") return;
    const t = setTimeout(() => {
      setPhase("upcoming");
      setSecondsLeft(COUNTDOWN_SECONDS);
      setAnimKey((k) => k + 1);
    }, STREAK_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "upcoming") return;
    const i = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(i);
  }, [phase]);

  useEffect(() => {
    const channel = supabase
      .channel("home-banner-signals")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "signals" },
        (payload: any) => {
          const row = payload.new;
          if (row?.published) {
            setPhase("hidden");
            setAnimKey((k) => k + 1);
            setTimeout(() => {
              setPhase("upcoming");
              setSecondsLeft(COUNTDOWN_SECONDS);
              setDismissed(false);
              setAnimKey((k) => k + 1);
            }, 8000);
          } else {
            setPhase("upcoming");
            setSecondsLeft(COUNTDOWN_SECONDS);
            setDismissed(false);
            setAnimKey((k) => k + 1);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (phase === "hidden" || dismissed) return null;

  if (phase === "streak") {
    return (
      <div
        key={`streak-${animKey}`}
        className="animate-in fade-in slide-in-from-top-2 duration-500"
      >
        <StreakBadge />
      </div>
    );
  }

  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <div
      key={`upcoming-${animKey}`}
      className="animate-in fade-in slide-in-from-top-2 duration-500"
    >
      <div className="relative overflow-hidden rounded-3xl p-5 border border-amber-500/25 bg-[radial-gradient(ellipse_at_left,_hsl(43_96%_15%/0.5),_transparent_60%),linear-gradient(135deg,_hsl(210_30%_8%),_hsl(210_30%_6%))] shadow-[0_10px_40px_-10px_hsl(43_96%_40%/0.35)]">
        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Decorative rising bars */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-end gap-1 h-16 opacity-70 pointer-events-none">
          {[30, 45, 40, 60, 55, 75, 70, 90, 100].map((h, i) => (
            <div
              key={i}
              className="w-1.5 rounded-t-sm bg-gradient-to-t from-amber-500/70 to-amber-300"
              style={{ height: `${h}%`, animation: `pulse 2s ease-in-out ${i * 0.1}s infinite` }}
            />
          ))}
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-xl animate-pulse" />
            <div className="relative w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
              <Bell className="h-6 w-6 text-emerald-400" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-background animate-pulse" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] sm:text-sm font-bold text-amber-400 flex items-center gap-1.5 tracking-wide">
              🚨 New Gold Signal Incoming
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-widest">
              Expected in
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-white tabular-nums leading-none">
                {mm}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase">Min</span>
              <span className="text-amber-400 font-black text-2xl leading-none">:</span>
              <span className="text-2xl sm:text-3xl font-black text-white tabular-nums leading-none">
                {ss}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase">Sec</span>
            </div>
            <p className="text-[11px] text-emerald-400/90 font-medium mt-1.5">
              Stay Ready &amp; Don't Miss It! 📈
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
