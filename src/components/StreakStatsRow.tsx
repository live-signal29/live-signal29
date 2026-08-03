import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLoginStreak } from "@/hooks/useLoginStreak";
import { cn } from "@/lib/utils";

const COUNTDOWN_SECONDS = 180;

const useTodayPips = () =>
  useQuery({
    queryKey: ["today-pips"],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("trade_history")
        .select("pips_gained")
        .gte("closed_at", start.toISOString());
      if (error) throw error;
      return (data || []).reduce((s, r: any) => s + (Number(r.pips_gained) || 0), 0);
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

/** Streak ring + next-signal timer + today's pips (real data). */
export const StreakStatsRow = () => {
  const streak = useLoginStreak();
  const { data: todayPips = 0 } = useTodayPips();
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    const i = setInterval(
      () => setSecondsLeft((s) => (s > 0 ? s - 1 : COUNTDOWN_SECONDS)),
      1000
    );
    return () => clearInterval(i);
  }, []);

  const days = streak?.current_streak ?? 0;
  const daysToReward = 7 - (days % 7 || 7);
  const ringPct = Math.round(((days % 7 || 7) / 7) * 100);
  const nextMin = Math.max(1, Math.ceil(secondsLeft / 60));

  return (
    <Card className="rounded-2xl px-3.5 py-3">
      <div className="flex items-center gap-3">
        {/* Streak ring */}
        <div
          className="relative h-9 w-9 shrink-0 rounded-full"
          style={{
            background: `conic-gradient(hsl(var(--warning)) ${ringPct}%, hsl(var(--muted)) ${ringPct}%)`,
          }}
        >
          <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-card text-[11px] font-extrabold text-warning">
            {days}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold">🔥 {days}-Day Streak!</p>
          <p className="truncate text-[10px] text-muted-foreground">
            Next bonus in{" "}
            <span className="font-bold text-warning">
              {daysToReward} {daysToReward === 1 ? "day" : "days"}
            </span>
          </p>
        </div>

        {/* Next signal timer */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Next</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-warning/60 text-[10px] font-bold tabular-nums">
            {nextMin}
          </span>
          <span className="text-[10px] text-muted-foreground">min</span>
        </div>

        {/* Today pips */}
        <div className="shrink-0 text-right">
          <div
            className={cn(
              "text-sm font-extrabold leading-none tabular-nums",
              todayPips > 0
                ? "text-success"
                : todayPips < 0
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {todayPips >= 0 ? "+" : ""}
            {Number(todayPips).toFixed(1)}
          </div>
          <div className="mt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
            Today Pips
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StreakStatsRow;
