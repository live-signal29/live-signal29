import { useEffect, useState } from "react";
import { StreakBadge } from "@/components/StreakBadge";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Rocket, Clock } from "lucide-react";

const STREAK_VISIBLE_MS = 20_000; // 20s
const COUNTDOWN_SECONDS = 180; // 3 min

type Phase = "streak" | "upcoming" | "hidden";

export const HomeRotatingBanner = () => {
  const [phase, setPhase] = useState<Phase>("streak");
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [animKey, setAnimKey] = useState(0);

  // Auto-hide streak after STREAK_VISIBLE_MS then switch to upcoming
  useEffect(() => {
    if (phase !== "streak") return;
    const t = setTimeout(() => {
      setPhase("upcoming");
      setSecondsLeft(COUNTDOWN_SECONDS);
      setAnimKey((k) => k + 1);
    }, STREAK_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // Countdown tick
  useEffect(() => {
    if (phase !== "upcoming") return;
    const i = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(i);
  }, [phase]);

  // Realtime: when a new published signal appears, hide the banner
  useEffect(() => {
    const channel = supabase
      .channel("home-banner-signals")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "signals" },
        (payload: any) => {
          const row = payload.new;
          if (row?.published) {
            // A new signal was just published — hide the countdown
            setPhase("hidden");
            setAnimKey((k) => k + 1);
            // After a short break, restart upcoming banner for the next signal
            setTimeout(() => {
              setPhase("upcoming");
              setSecondsLeft(COUNTDOWN_SECONDS);
              setAnimKey((k) => k + 1);
            }, 8000);
          } else {
            // Unpublished/scheduled insert — restart the 3-min countdown
            setPhase("upcoming");
            setSecondsLeft(COUNTDOWN_SECONDS);
            setAnimKey((k) => k + 1);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (phase === "hidden") return null;

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
      <Card className="p-4 bg-gradient-to-br from-primary/10 via-purple-500/10 to-primary/10 border-primary/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Rocket className="h-9 w-9 text-primary animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold flex items-center gap-2">
              🚀 New Signal Coming Soon
            </p>
            <p className="text-xs text-muted-foreground">
              A new trading signal will be published in less than 3 minutes. Stay ready!
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-background/80 rounded-lg px-3 py-2 font-mono font-bold text-primary">
            <Clock className="h-4 w-4 animate-pulse" />
            <span className="tabular-nums">{mm}:{ss}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
