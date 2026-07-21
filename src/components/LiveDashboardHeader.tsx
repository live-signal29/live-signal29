import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useLivePricesFetch } from "@/hooks/useLivePrices";
import { useAccuracyStats } from "@/hooks/useAccuracyStats";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Target, Clock, Flame, TrendingUp, Coins } from "lucide-react";

const COUNTDOWN_SECONDS = 180;

const useActiveSignalsCount = () => {
  return useQuery({
    queryKey: ["active-signals-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("signals")
        .select("id", { count: "exact", head: true })
        .eq("signal_status", "open");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
};

const useTodayPips = () => {
  return useQuery({
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
};

export const LiveDashboardHeader = () => {
  const { prices } = useLivePricesFetch(["XAUUSD"], true);
  const { data: acc } = useAccuracyStats();
  const { data: activeCount = 0 } = useActiveSignalsCount();
  const { data: todayPips = 0 } = useTodayPips();
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  const gold = prices["XAUUSD"] ? parseFloat(prices["XAUUSD"]) : null;

  useEffect(() => {
    if (gold == null) return;
    if (prevPrice != null && gold !== prevPrice) {
      setDir(gold > prevPrice ? "up" : "down");
      const t = setTimeout(() => setDir(null), 500);
      setPrevPrice(gold);
      return () => clearTimeout(t);
    }
    if (prevPrice == null) setPrevPrice(gold);
  }, [gold, prevPrice]);

  useEffect(() => {
    const i = setInterval(() => {
      setCountdown((s) => (s > 0 ? s - 1 : COUNTDOWN_SECONDS));
    }, 1000);
    return () => clearInterval(i);
  }, []);

  const mm = Math.floor(countdown / 60).toString().padStart(2, "0");
  const ss = (countdown % 60).toString().padStart(2, "0");

  const winRate =
    acc && (acc.free_total + acc.premium_total) > 0
      ? (((acc.free_wins + acc.premium_wins) / (acc.free_total + acc.premium_total)) * 100).toFixed(1)
      : "—";

  return (
    <div className="space-y-2">
      {/* Compact Live Gold Banner */}
      <Card className="p-2.5 bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-transparent border-yellow-500/30">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
            <Coins className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold">XAUUSD</span>
              <span className="text-[10px] text-muted-foreground truncate">Gold / USD</span>
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live · updates every 3s
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-base font-bold tabular-nums transition-colors ${
                dir === "up" ? "text-success" : dir === "down" ? "text-destructive" : "text-foreground"
              }`}
            >
              {gold != null ? gold.toFixed(2) : "…"}
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-0.5">
              <TrendingUp className="h-2.5 w-2.5" /> LIVE
            </div>
          </div>
        </div>
      </Card>

      {/* Compact 4-stat row - real data */}
      <div className="grid grid-cols-4 gap-1.5">
        <Card className="p-2 flex flex-col items-center justify-center text-center">
          <Target className="h-3.5 w-3.5 text-primary mb-0.5" />
          <div className="text-sm font-bold leading-none">{winRate}{acc ? "%" : ""}</div>
          <div className="text-[9px] text-muted-foreground mt-0.5 leading-none">Win Rate</div>
        </Card>
        <Card className="p-2 flex flex-col items-center justify-center text-center">
          <Clock className="h-3.5 w-3.5 text-blue-500 mb-0.5" />
          <div className="text-sm font-bold leading-none tabular-nums">{mm}:{ss}</div>
          <div className="text-[9px] text-muted-foreground mt-0.5 leading-none">Next Signal</div>
        </Card>
        <Card className="p-2 flex flex-col items-center justify-center text-center">
          <Flame className="h-3.5 w-3.5 text-orange-500 mb-0.5" />
          <div className="text-sm font-bold leading-none">{activeCount}</div>
          <div className="text-[9px] text-muted-foreground mt-0.5 leading-none">Active</div>
        </Card>
        <Card className="p-2 flex flex-col items-center justify-center text-center">
          <TrendingUp className="h-3.5 w-3.5 text-success mb-0.5" />
          <div className={`text-sm font-bold leading-none ${todayPips >= 0 ? "text-success" : "text-destructive"}`}>
            {todayPips >= 0 ? "+" : ""}{Number(todayPips).toFixed(1)}
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5 leading-none">Today Pips</div>
        </Card>
      </div>
    </div>
  );
};

export default LiveDashboardHeader;
