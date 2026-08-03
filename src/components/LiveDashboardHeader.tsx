import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { useLivePricesFetch } from "@/hooks/useLivePrices";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact XAUUSD live ticker (matches app reference design). */
export const LiveDashboardHeader = () => {
  const { prices } = useLivePricesFetch(["XAUUSD"], true);
  const baseline = useRef<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const prev = useRef<number | null>(null);

  const gold = prices["XAUUSD"] ? parseFloat(prices["XAUUSD"]) : null;

  useEffect(() => {
    if (gold == null) return;
    if (baseline.current == null) baseline.current = gold;
    setHistory((h) => (h[h.length - 1] === gold ? h : [...h, gold].slice(-40)));
    if (prev.current != null && gold !== prev.current) {
      setFlash(gold > prev.current ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 600);
      prev.current = gold;
      return () => clearTimeout(t);
    }
    prev.current = gold;
  }, [gold]);

  const changePct =
    gold != null && baseline.current
      ? ((gold - baseline.current) / baseline.current) * 100
      : 0;
  const up = changePct >= 0;

  const spark = (() => {
    if (history.length < 2) return null;
    const min = Math.min(...history);
    const max = Math.max(...history);
    const span = max - min || 1;
    const w = 64;
    const h = 20;
    return history
      .map((v, i) => {
        const x = (i / (history.length - 1)) * w;
        const y = h - ((v - min) / span) * h;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  })();

  return (
    <Card className="rounded-2xl px-3 py-2">
      <div className="flex items-center gap-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-extrabold tracking-tight">XAUUSD</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/12 px-1.5 py-[1px]">
              <span className="h-1 w-1 rounded-full bg-destructive animate-pulse" />
              <span className="text-[7px] font-bold uppercase tracking-wider text-destructive">
                Live
              </span>
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground">Gold / USD</span>
        </div>

        {/* Sparkline */}
        <svg viewBox="0 0 64 20" className="h-5 flex-1 min-w-0" preserveAspectRatio="none">
          {spark && (
            <path
              d={spark}
              fill="none"
              strokeWidth={1.5}
              className={up ? "stroke-success" : "stroke-destructive"}
              strokeLinecap="round"
            />
          )}
        </svg>

        <div className="text-right shrink-0">
          <div
            className={cn(
              "text-lg font-extrabold leading-none tabular-nums transition-colors",
              flash === "up" && "text-success",
              flash === "down" && "text-destructive"
            )}
          >
            {gold != null ? gold.toFixed(2) : "…"}
          </div>
          <span
            className={cn(
              "mt-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-[1px] text-[9px] font-bold",
              up ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive"
            )}
          >
            {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {up ? "+" : ""}
            {changePct.toFixed(2)}%
          </span>
        </div>
      </div>
    </Card>
  );
};


export default LiveDashboardHeader;
