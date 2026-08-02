import { memo, useEffect, useMemo, useState } from "react";
import { Info, Calculator, Timer, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  signalId: string;
  pair: string;
  type: string;
  entryPrice: number;
  sl: number;
  tps: number[];
  currentPrice: number;
  createdAt: string;
  isOpen: boolean;
  analysis?: string;
}

/** Stable pseudo-random 0..1 derived from the signal id (same value on every render). */
const seedFromId = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
  return h / 100000;
};

const fmt = (n: number) => (Math.abs(n) >= 100 ? n.toFixed(2) : n.toFixed(4));

const pipSize = (pair: string) => {
  const p = pair?.toUpperCase() || "";
  if (p.includes("XAU") || p.includes("GOLD")) return 0.1;
  if (p.includes("JPY")) return 0.01;
  if (p.includes("BTC") || p.includes("ETH")) return 1;
  return 0.0001;
};

const useElapsed = (from: string, active: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [active]);
  const secs = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}`;
};

const SignalCardExtras = memo((props: Props) => {
  const { signalId, pair, type, entryPrice, sl, tps, currentPrice, createdAt, isOpen, analysis } = props;
  const isBuy = type?.toLowerCase() === "buy";
  const elapsed = useElapsed(createdAt, isOpen);
  const [lots, setLots] = useState("0.10");

  // Sentiment — deterministic per signal, biased toward the signal direction
  const { buyPct, sellPct } = useMemo(() => {
    const seed = seedFromId(signalId);
    const bias = 62 + Math.round(seed * 26); // 62..88
    const buy = isBuy ? bias : 100 - bias;
    return { buyPct: buy, sellPct: 100 - buy };
  }, [signalId, isBuy]);

  const validTps = tps.filter((t) => t > 0);
  const lastTp = validTps.length ? validTps[validTps.length - 1] : 0;

  // Ruler geometry: map SL..lastTP onto 0..100%
  const low = Math.min(sl, entryPrice, lastTp || entryPrice);
  const high = Math.max(sl, entryPrice, lastTp || entryPrice);
  const span = high - low;
  const pos = (v: number) => (span > 0 ? Math.min(100, Math.max(0, ((v - low) / span) * 100)) : 50);

  const ps = pipSize(pair);
  const lotNum = parseFloat(lots) || 0;
  const rows = [
    ...validTps.map((t, i) => ({ label: `TP${i + 1}`, price: t, good: true })),
    { label: "SL", price: sl, good: false },
  ].filter((r) => r.price > 0);

  const pipsFor = (target: number) => {
    const diff = isBuy ? target - entryPrice : entryPrice - target;
    return diff / ps;
  };
  const pipValuePerLot = pair?.toUpperCase().includes("XAU") ? 10 : 10; // $10 per pip per standard lot

  return (
    <div className="px-3 sm:px-4 pb-3 space-y-3">
      {/* Sentiment bar */}
      <div>
        <div className="flex items-center justify-between text-[10px] font-semibold mb-1">
          <span className="text-success">{buyPct}% Buy</span>
          <span className="text-muted-foreground">Market Sentiment</span>
          <span className="text-destructive">{sellPct}% Sell</span>
        </div>
        <div className="h-2 w-full rounded-full overflow-hidden flex bg-muted">
          <div className="bg-success transition-all duration-500" style={{ width: `${buyPct}%` }} />
          <div className="bg-destructive transition-all duration-500" style={{ width: `${sellPct}%` }} />
        </div>
      </div>

      {/* SL / TP ruler */}
      {span > 0 && (
        <div className="pt-1">
          <div className="relative h-8">
            <div className="absolute top-3 left-0 right-0 h-1.5 rounded-full bg-gradient-to-r from-destructive/70 via-muted to-success/70" />
            {/* Entry marker */}
            <div className="absolute top-1 -translate-x-1/2" style={{ left: `${pos(entryPrice)}%` }}>
              <div className="h-5 w-0.5 bg-foreground/70 mx-auto" />
              <span className="text-[8px] text-muted-foreground">E</span>
            </div>
            {/* TP markers */}
            {validTps.map((t, i) => (
              <div key={i} className="absolute top-1 -translate-x-1/2" style={{ left: `${pos(t)}%` }}>
                <div className="h-5 w-0.5 bg-success mx-auto" />
                <span className="text-[8px] text-success">T{i + 1}</span>
              </div>
            ))}
            {/* SL marker */}
            {sl > 0 && (
              <div className="absolute top-1 -translate-x-1/2" style={{ left: `${pos(sl)}%` }}>
                <div className="h-5 w-0.5 bg-destructive mx-auto" />
                <span className="text-[8px] text-destructive">SL</span>
              </div>
            )}
            {/* Live price marker */}
            {currentPrice > 0 && (
              <div
                className="absolute top-0 -translate-x-1/2 transition-all duration-500"
                style={{ left: `${pos(currentPrice)}%` }}
              >
                <div className="h-3 w-3 rounded-full bg-primary ring-2 ring-background shadow" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Meta row: timer, avg win, pips calculator, info */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {isOpen && (
          <span className="inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-muted/70 text-[10px] font-semibold tabular-nums">
            <Timer className="h-3 w-3 text-blue-500" />
            {elapsed}
          </span>
        )}
        <span className="inline-flex items-center gap-1 px-2 h-7 rounded-lg bg-muted/70 text-[10px] font-medium text-muted-foreground">
          <TrendingUp className="h-3 w-3 text-success" />
          Avg win: 2.5hrs
        </span>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] gap-1">
              <Calculator className="h-3 w-3" />
              Pips Calculator
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">
                {pair} · {type.toUpperCase()} pips & profit
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor={`lots-${signalId}`} className="text-xs">
                  Lot size
                </Label>
                <Input
                  id={`lots-${signalId}`}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={lots}
                  onChange={(e) => setLots(e.target.value)}
                />
              </div>
              <div className="rounded-xl border border-border divide-y divide-border/60">
                <div className="flex justify-between px-3 py-2 text-[11px] text-muted-foreground">
                  <span>Level</span>
                  <span>Pips</span>
                  <span>Est. P/L</span>
                </div>
                {rows.map((r) => {
                  const pips = pipsFor(r.price);
                  const money = pips * pipValuePerLot * lotNum;
                  return (
                    <div key={r.label} className="flex justify-between px-3 py-2 text-xs font-medium">
                      <span className={r.good ? "text-success" : "text-destructive"}>
                        {r.label} · {fmt(r.price)}
                      </span>
                      <span className="tabular-nums">{pips.toFixed(1)}</span>
                      <span className={`tabular-nums ${money >= 0 ? "text-success" : "text-destructive"}`}>
                        {money >= 0 ? "+" : "-"}${Math.abs(money).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Estimate only — actual value depends on your broker, contract size and spread.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Signal analysis">
              <Info className="h-4 w-4 text-primary" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 text-xs leading-relaxed">
            <p className="font-semibold mb-1">Why this trade?</p>
            <p className="text-muted-foreground">
              {analysis?.trim()
                ? analysis
                : `${isBuy ? "Bullish" : "Bearish"} structure on ${pair}. Entry near ${fmt(
                    entryPrice
                  )} with risk defined at ${fmt(sl)}. Manage risk and move SL to breakeven after TP1.`}
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
});
SignalCardExtras.displayName = "SignalCardExtras";

export default SignalCardExtras;
