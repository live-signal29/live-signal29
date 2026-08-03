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
  const prev = useRef<number | null>(null);

  const gold = prices["XAUUSD"] ? parseFloat(prices["XAUUSD"]) : null;

  useEffect(() => {
    if (gold == null) return;
    if (baseline.current == null) baseline.current = gold;
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

  return (
    <Card className="px-3.5 py-2.5 rounded-2xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold tracking-tight">XAUUSD</span>
            <span className="text-[10px] text-muted-foreground">Gold / USD</span>
          </div>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-destructive/12 px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            <span className="text-[8px] font-bold uppercase tracking-wider text-destructive">
              Live
            </span>
          </span>
        </div>

        <div className="text-right shrink-0">
          <div
            className={cn(
              "text-xl font-extrabold tabular-nums transition-colors",
              flash === "up" && "text-success",
              flash === "down" && "text-destructive"
            )}
          >
            {gold != null ? gold.toFixed(2) : "…"}
          </div>
          <span
            className={cn(
              "mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold",
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
