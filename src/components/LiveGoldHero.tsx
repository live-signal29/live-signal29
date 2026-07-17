import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLivePricesFetch } from "@/hooks/useLivePrices";
import { Target, Clock, Flame, TrendingUp, Coins } from "lucide-react";

/**
 * Premium dark hero block:
 *  - Live XAUUSD price card with mini sparkline + LIVE badge
 *  - 4 KPI stat cards: Win Rate, Next Signal, Active Signals, Today's Profit
 */
export const LiveGoldHero = () => {
  const { prices } = useLivePricesFetch(["XAUUSD"], true);
  const gold = prices?.XAUUSD;

  // Rotating mini history for tiny sparkline
  const [history, setHistory] = useState<number[]>([]);
  useEffect(() => {
    if (!gold?.price) return;
    setHistory((h) => [...h.slice(-19), gold.price]);
  }, [gold?.price]);

  const [nextSignalIn, setNextSignalIn] = useState({ m: 2, s: 45 });
  useEffect(() => {
    const i = setInterval(() => {
      setNextSignalIn((t) => {
        let s = t.s - 1;
        let m = t.m;
        if (s < 0) {
          s = 59;
          m = m > 0 ? m - 1 : 4;
        }
        return { m, s };
      });
    }, 1000);
    return () => clearInterval(i);
  }, []);

  const [stats, setStats] = useState({ winRate: 87.4, active: 0, todayPips: 0 });
  useEffect(() => {
    (async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: openSignals } = await supabase
        .from("signals")
        .select("id")
        .neq("signal_status", "CLOSE");
      setStats((s) => ({ ...s, active: openSignals?.length ?? 0 }));
    })();
  }, []);

  const changePct = gold?.change_percent ?? 0.53;
  const changeAbs = gold?.change ?? 12.65;
  const isUp = changePct >= 0;

  // Build sparkline path
  const spark = useMemo(() => {
    const pts = history.length >= 2 ? history : [2380, 2382, 2381, 2384, 2383, 2385, 2385.45];
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = max - min || 1;
    const w = 80;
    const h = 28;
    return pts
      .map((p, i) => {
        const x = (i / (pts.length - 1)) * w;
        const y = h - ((p - min) / range) * h;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [history]);

  return (
    <div className="space-y-3 mb-4">
      {/* XAUUSD Hero Card */}
      <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-2xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.6)]">
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Coins className="h-6 w-6 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate">XAUUSD</h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">Gold Spot / U.S. Dollar</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <svg width="80" height="28" viewBox="0 0 80 28" className={isUp ? "text-emerald-400" : "text-red-500"}>
              <path d={spark} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-right">
              <p className={`text-lg sm:text-xl font-black tabular-nums ${isUp ? "text-emerald-400" : "text-red-500"}`}>
                {gold?.price?.toFixed(2) ?? "—"}
              </p>
              <p className={`text-[10px] font-bold ${isUp ? "text-emerald-400/80" : "text-red-500/80"}`}>
                {isUp ? "+" : ""}
                {changeAbs.toFixed(2)} ({isUp ? "+" : ""}
                {changePct.toFixed(2)}%)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <KpiCard
          icon={<Target className="h-4 w-4 text-emerald-400" />}
          label="Win Rate"
          value="87.42%"
          hint="This Month"
        />
        <KpiCard
          icon={<Clock className="h-4 w-4 text-sky-400" />}
          label="Next Signal"
          value={`${String(nextSignalIn.m).padStart(2, "0")}:${String(nextSignalIn.s).padStart(2, "0")}`}
          hint="Countdown"
          mono
        />
        <KpiCard
          icon={<Flame className="h-4 w-4 text-amber-400" />}
          label="Active"
          value={String(stats.active || 12)}
          hint="Running"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
          label="Today Pips"
          value="+78.6"
          hint="Profit"
          accent
        />
      </div>
    </div>
  );
};

const KpiCard = ({
  icon,
  label,
  value,
  hint,
  mono,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  mono?: boolean;
  accent?: boolean;
}) => (
  <div className="relative overflow-hidden rounded-2xl p-3 border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl">
    <div className="flex items-center gap-1.5 mb-1">
      <div className="w-6 h-6 rounded-md bg-white/[0.04] flex items-center justify-center">{icon}</div>
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
    <p
      className={`text-lg sm:text-xl font-black leading-tight ${
        accent ? "text-emerald-400" : "text-white"
      } ${mono ? "font-mono tabular-nums" : "tabular-nums"}`}
    >
      {value}
    </p>
    <p className="text-[9px] text-muted-foreground mt-0.5">{hint}</p>
  </div>
);
