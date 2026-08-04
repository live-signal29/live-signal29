import { memo, useEffect, useMemo, useState } from "react";
import { Info, Share2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Props {
  signalId: string;
  pair: string;
  type: string;
  entryPrice: number;
  sl: number;
  tps: number[];
  tpHits?: boolean[];
  slHit?: boolean;
  currentPrice: number;
  createdAt: string;
  isOpen: boolean;
  isPending?: boolean;
  isClosed?: boolean;
  analysis?: string;
  riskLevel?: string;
  signalType?: string;
  profitNote?: string;
  runningPL?: { formatted: string; isProfit: boolean } | null;
  onShare?: (platform: "whatsapp" | "telegram" | "copy") => void;
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

/** Full signal body — matches the reference dashboard design 1:1. */
const SignalCardExtras = memo((props: Props) => {
  const {
    signalId,
    pair,
    type,
    entryPrice,
    sl,
    tps,
    tpHits = [],
    slHit,
    currentPrice,
    createdAt,
    isOpen,
    isPending,
    isClosed,
    analysis,
    riskLevel,
    signalType,
    profitNote,
    runningPL,
    onShare,
  } = props;

  const isBuy = type?.toLowerCase() === "buy";
  const elapsed = useElapsed(createdAt, isOpen);
  const [lots, setLots] = useState("0.10");

  const { buyPct, sellPct } = useMemo(() => {
    const seed = seedFromId(signalId);
    const bias = 62 + Math.round(seed * 26);
    const buy = isBuy ? bias : 100 - bias;
    return { buyPct: buy, sellPct: 100 - buy };
  }, [signalId, isBuy]);

  const validTps = tps.filter((t) => t > 0);
  const lastTp = validTps.length ? validTps[validTps.length - 1] : 0;

  const low = Math.min(sl, entryPrice, lastTp || entryPrice);
  const high = Math.max(sl, entryPrice, lastTp || entryPrice);
  const span = high - low;
  const pos = (v: number) => (span > 0 ? Math.min(100, Math.max(0, ((v - low) / span) * 100)) : 50);
  // Ruler always reads loss -> profit from left to right
  const p = (v: number) => (isBuy ? pos(v) : 100 - pos(v));

  const ps = pipSize(pair);
  const lotNum = parseFloat(lots) || 0;
  const rows = [
    ...validTps.map((t, i) => ({ label: `TP${i + 1}`, price: t, good: true })),
    { label: "SL", price: sl, good: false },
  ].filter((r) => r.price > 0);
  const pipsFor = (target: number) => (isBuy ? target - entryPrice : entryPrice - target) / ps;
  const pipValuePerLot = 10;

  const riskTone =
    riskLevel === "High"
      ? "bg-destructive/15 text-destructive"
      : riskLevel === "Medium"
      ? "bg-warning/20 text-warning"
      : "bg-success/15 text-success";

  return (
    <div className="space-y-2.5 px-3.5 pb-3 pt-3.5">
      {/* Row 1 — direction, risk, pair · style */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white",
            isBuy ? "bg-success" : "bg-destructive"
          )}
        >
          {isBuy ? "Buy" : "Sell"}
        </span>
        {riskLevel && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap",
              riskTone
            )}
          >
            🛡 {riskLevel} Risk
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5 min-w-0">
          <span className="truncate text-[11px] text-muted-foreground">
            {pair}
            {signalType ? <span className="font-bold text-foreground"> · {signalType}</span> : null}
          </span>
          {onShare && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                  <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onShare("whatsapp")}>Share on WhatsApp</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onShare("telegram")}>Share on Telegram</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onShare("copy")}>Copy Link</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Row 2 — entry / current / state */}
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">

        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Entry</div>
          <div className="text-sm font-extrabold tabular-nums leading-tight">{fmt(entryPrice)}</div>
        </div>
        <span className="text-muted-foreground">⟶</span>
        <div className="min-w-0 flex-1 text-center">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Current</div>
          <div
            className={cn(
              "text-sm font-extrabold tabular-nums leading-tight",
              currentPrice > 0 ? (isBuy ? "text-success" : "text-success") : "text-muted-foreground"
            )}
          >
            {currentPrice > 0 ? fmt(currentPrice) : "—"}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
            {isClosed ? "Closed" : isPending ? "Pending" : "Active"}
          </div>
          <div
            className={cn(
              "flex items-center justify-end gap-1 text-xs font-extrabold leading-tight",
              isClosed ? "text-destructive" : isPending ? "text-warning" : "text-success"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {isClosed ? "End" : isPending ? "Wait" : "Run"}
          </div>
        </div>
      </div>

      {/* Row 3 — SL → TP ruler */}
      {span > 0 && (
        <div className="pt-1">
          <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-destructive via-warning to-success" />
          <div className="relative mt-1 h-8">
            {currentPrice > 0 && (
              <div
                className="absolute -top-6 -translate-x-1/2 rounded-md border border-border bg-card px-1.5 py-0.5 text-[9px] font-bold tabular-nums shadow"
                style={{ left: `${Math.min(88, Math.max(12, p(currentPrice)))}%` }}
              >
                ▼ {fmt(currentPrice)}
              </div>
            )}
            {sl > 0 && (
              <div className="absolute -translate-x-1/2 text-center" style={{ left: `${Math.max(6, p(sl))}%` }}>
                <div className="mx-auto h-3.5 w-[3px] rounded bg-destructive" />
                <div className={cn("mt-0.5 text-[9px] font-bold text-destructive", slHit && "line-through")}>
                  SL {fmt(sl)}
                </div>
              </div>
            )}
            {validTps.map((t, i) => (
              <div
                key={i}
                className="absolute -translate-x-1/2 text-center"
                style={{ left: `${Math.min(94, Math.max(6, p(t)))}%` }}
              >
                <div className="mx-auto h-3.5 w-[3px] rounded bg-success" />
                <div
                  className="mt-0.5 whitespace-nowrap text-[9px] font-bold text-success"
                  style={{ transform: i % 2 ? "translateY(10px)" : undefined }}
                >
                  TP{i + 1} {fmt(t)} {tpHits[i] ? "✓" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 4 — timer / avg win / running P/L */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">
            ⏱ Time in Trade:{" "}
            <span className="font-extrabold tabular-nums text-warning">{isOpen ? elapsed : "--:--:--"}</span>
          </span>
          <span className="text-[10px] text-muted-foreground">⌛ Avg win: 2.5hrs</span>
        </div>
        {profitNote ? (
          <div className="text-[10px] text-muted-foreground">
            📊{" "}
            <span
              className={cn(
                "font-extrabold",
                profitNote.includes("SL Hit")
                  ? "text-destructive"
                  : profitNote.includes("B.E")
                  ? "text-primary"
                  : "text-success"
              )}
            >
              {profitNote}
            </span>
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground">
            📊 Running P/L:{" "}
            <span
              className={cn(
                "font-extrabold",
                runningPL ? (runningPL.isProfit ? "text-success" : "text-destructive") : "text-muted-foreground"
              )}
            >
              {runningPL ? runningPL.formatted : "—"}
            </span>
          </div>
        )}
      </div>

      {/* Row 5 — sentiment */}
      <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-2.5 py-1.5">
        <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">📊 Market Sentiment</span>
        <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="bg-success transition-all duration-500" style={{ width: `${buyPct}%` }} />
          <div className="bg-destructive transition-all duration-500" style={{ width: `${sellPct}%` }} />
        </div>
        <span className="shrink-0 text-[10px] font-extrabold">
          <span className="text-success">{buyPct}%</span>
          <span className="text-muted-foreground"> / </span>
          <span className="text-destructive">{sellPct}%</span>
        </span>
      </div>

      {/* Row 6 — analysis */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border-l-[3px] bg-muted/40 px-2.5 py-1.5",
          isBuy ? "border-l-success" : "border-l-destructive"
        )}
      >
        <p className="flex-1 text-[10px] leading-snug">
          <span className={cn("font-extrabold", isBuy ? "text-success" : "text-destructive")}>
            {isBuy ? "▲" : "▼"}
          </span>{" "}
          <span className="font-bold">
            {analysis?.trim() ? analysis : `${isBuy ? "Bullish" : "Bearish"} structure on ${pair}`}
          </span>
        </p>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" aria-label="Signal analysis">
              <Info className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 text-xs leading-relaxed">
            <p className="mb-1 font-semibold">Why this trade?</p>
            <p className="text-muted-foreground">
              {analysis?.trim()
                ? analysis
                : `${isBuy ? "Bullish" : "Bearish"} structure on ${pair}. Entry near ${fmt(
                    entryPrice
                  )} with risk defined at ${fmt(sl)}. Move SL to breakeven after TP1.`}
            </p>
          </PopoverContent>
        </Popover>
      </div>

      {/* Row 7 — pips calculator */}
      <div className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 rounded-full px-2.5 text-[9px] font-bold">
              💰 Pips Calculator
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">
                {pair} · {type?.toUpperCase()} pips & profit
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
              <div className="divide-y divide-border/60 rounded-xl border border-border">
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
      </div>
    </div>
  );
});
SignalCardExtras.displayName = "SignalCardExtras";

export default SignalCardExtras;
