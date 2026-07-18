import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLivePricesFetch } from "@/hooks/useLivePrices";
import { Target, Clock, Flame, DollarSign } from "lucide-react";

/**
 * Reference-exact hero:
 *  - XAUUSD live card: gold icon + name + LIVE badge, price top-right, sparkline right, subtitle left
 *  - 4 KPI cards (single row): Win Rate, Next Signal, Active Signals, Today's Pips
 */
export const LiveGoldHero = () => {
  const { prices } = useLivePricesFetch(["XAUUSD"], true);
  const goldPrice = prices?.XAUUSD ? parseFloat(prices.XAUUSD) : undefined;

  const [history, setHistory] = useState<number[]>([]);
  useEffect(() => {
    if (!goldPrice) return;
    setHistory((h) => [...h.slice(-29), goldPrice]);
  }, [goldPrice]);

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

  const [activeCount, setActiveCount] = useState(12);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("signals")
        .select("id")
        .neq("signal_status", "CLOSE");
      if (data) setActiveCount(data.length || 12);
    })();
  }, []);

  const changePct = 0.53;
  const changeAbs = 12.65;
  const isUp = changePct >= 0;

  const spark = useMemo(() => {
    const pts =
      history.length >= 2
        ? history
        : [2380, 2381, 2382, 2381, 2383, 2384, 2383, 2385, 2385.45];
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = max - min || 1;
    const w = 180;
    const h = 48;
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
      <div className="relative overflow-hidden rounded-3xl p-4 border border-emerald-500/15 bg-[linear-gradient(135deg,hsl(210_30%_9%),hsl(210_30%_6%))] shadow-[0_10px_40px_-15px_hsl(152_76%_45%/0.35)]">
        <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-emerald-500/10 pointer-events-none" />

        <div className="relative z-10 grid grid-cols-[auto_1fr_auto] items-center gap-3">
          {/* Gold icon */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/25 to-amber-600/10 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_-5px_hsl(43_96%_55%/0.5)]">
            <span className="text-2xl leading-none">🥇</span>
          </div>

          {/* Middle: name + subtitle */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                XAUUSD
              </h3>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              Gold Spot / U.S. Dollar
            </p>
          </div>

          {/* Right: price */}
          <div className="text-right shrink-0">
            <p
              className={`text-lg sm:text-2xl font-black tabular-nums leading-none ${
                isUp ? "text-emerald-400" : "text-red-500"
              }`}
            >
              {goldPrice ? goldPrice.toFixed(2) : "2,385.45"}
            </p>
            <p
              className={`text-[10px] font-bold mt-1 ${
                isUp ? "text-emerald-400/80" : "text-red-500/80"
              }`}
            >
              {isUp ? "+" : ""}
              {changeAbs.toFixed(2)} ({isUp ? "+" : ""}
              {changePct.toFixed(2)}%)
            </p>
          </div>
        </div>

        {/* Sparkline row */}
        <div className="relative z-10 mt-2 flex justify-end">
          <svg
            width="100%"
            height="48"
            viewBox="0 0 180 48"
            preserveAspectRatio="none"
            className={`max-w-[65%] ${isUp ? "text-emerald-400" : "text-red-500"}`}
          >
            <defs>
              <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${spark} L 180 48 L 0 48 Z`}
              fill="url(#sparkFill)"
              stroke="none"
            />
            <path
              d={spark}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* KPI Grid — 4 across (reference) */}
      <div className="grid grid-cols-4 gap-2">
        <KpiCard
          icon={<Target className="h-3.5 w-3.5 text-emerald-400" />}
          iconBg="bg-emerald-500/15 border-emerald-500/30"
          label="WIN RATE"
          value="87.42%"
          hint="This Month"
        />
        <KpiCard
          icon={<Clock className="h-3.5 w-3.5 text-sky-400" />}
          iconBg="bg-sky-500/15 border-sky-500/30"
          label="NEXT SIGNAL"
          value={`${String(nextSignalIn.m).padStart(2, "0")}:${String(nextSignalIn.s).padStart(2, "0")}`}
          hint="Countdown"
          mono
        />
        <KpiCard
          icon={<Flame className="h-3.5 w-3.5 text-orange-400" />}
          iconBg="bg-orange-500/15 border-orange-500/30"
          label="ACTIVE"
          value={String(activeCount)}
          hint="Running"
        />
        <KpiCard
          icon={<DollarSign className="h-3.5 w-3.5 text-emerald-400" />}
          iconBg="bg-emerald-500/15 border-emerald-500/30"
          label="TODAY PIPS"
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
  iconBg,
  label,
  value,
  hint,
  mono,
  accent,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  hint: string;
  mono?: boolean;
  accent?: boolean;
}) => (
  <div className="relative overflow-hidden rounded-2xl p-2.5 border border-white/[0.08] bg-[hsl(210_25%_9%)] shadow-inner">
    <div className="flex items-center gap-1.5 mb-1.5">
      <div
        className={`w-6 h-6 rounded-full border flex items-center justify-center ${iconBg}`}
      >
        {icon}
      </div>
      <span className="text-[8px] font-bold text-muted-foreground tracking-wider truncate">
        {label}
      </span>
    </div>
    <p
      className={`text-base sm:text-lg font-black leading-tight ${
        accent ? "text-emerald-400" : "text-white"
      } ${mono ? "font-mono tabular-nums" : "tabular-nums"}`}
    >
      {value}
    </p>
    <p className="text-[9px] text-muted-foreground mt-0.5">{hint}</p>
  </div>
);
