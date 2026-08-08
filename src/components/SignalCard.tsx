import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Target,
  Shield,
  Share2,
  Info,
  Clock3,
  Timer,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SignalCardProps {
  signal: {
    id: string;
    pair: string;
    type: "Buy" | "Sell";
    entry: string;
    tp1: string;
    tp2?: string;
    tp3?: string;
    tp4?: string;
    sl: string;
    tp1_hit: boolean;
    tp2_hit: boolean;
    tp3_hit: boolean;
    tp4_hit: boolean;
    sl_hit?: boolean;
    status: string;
    note?: string;
    created_at: string;
    category: string;
    risk_level?: string;
    profit_note?: string;
    tag?: string;
  };
}

const SignalCard = ({ signal }: SignalCardProps) => {
  const allTpHit =
    signal.tp1_hit &&
    (!signal.tp2 || signal.tp2_hit) &&
    (!signal.tp3 || signal.tp3_hit) &&
    (!signal.tp4 || signal.tp4_hit);

  const isActive =
    signal.status === "Active" && !signal.sl_hit && !allTpHit;

  const isProfit =
    allTpHit || signal.status === "All TP Hit";

  const isLoss =
    signal.sl_hit ||
    signal.status === "SL Hit" ||
    signal.status === "Closed";

  const tpList = [
    { label: "TP1", value: signal.tp1, hit: signal.tp1_hit },
    { label: "TP2", value: signal.tp2, hit: signal.tp2_hit },
    { label: "TP3", value: signal.tp3, hit: signal.tp3_hit },
    { label: "TP4", value: signal.tp4, hit: signal.tp4_hit },
  ].filter((tp) => tp.value);

  const tpCount = tpList.length;
  const hitCount = tpList.filter((tp) => tp.hit).length;

  const progress =
    tpCount > 0 ? (hitCount / tpCount) * 100 : 0;

  const riskClass =
    signal.risk_level?.toLowerCase() === "low"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : signal.risk_level?.toLowerCase() === "high"
      ? "bg-red-500/10 text-red-400 border-red-500/20"
      : "bg-amber-500/10 text-amber-400 border-amber-500/20";

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[22px]",
        "border border-white/10",
        "bg-[#101322]",
        "shadow-[0_12px_35px_rgba(0,0,0,0.28)]",
        "transition-all duration-300",
        "hover:-translate-y-1 hover:border-primary/30"
      )}
    >
      {/* Top glow */}
      <div
        className={cn(
          "absolute left-0 top-0 h-1 w-full",
          signal.type === "Buy"
            ? "bg-gradient-to-r from-emerald-400 via-green-400 to-transparent"
            : "bg-gradient-to-r from-red-500 via-orange-400 to-transparent"
        )}
      />

      <div className="p-4 sm:p-5">

        {/* HEADER */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">

            {/* BUY / SELL */}
            <div
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2",
                "text-xs font-extrabold tracking-wide",
                signal.type === "Buy"
                  ? "bg-emerald-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.25)]"
                  : "bg-red-500 text-white shadow-[0_0_18px_rgba(239,68,68,0.25)]"
              )}
            >
              {signal.type === "Buy" ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}

              {signal.type.toUpperCase()}
            </div>

            {/* PAIR */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-bold text-white sm:text-lg">
                  {signal.pair}
                </h3>

                {isActive && (
                  <span className="flex items-center gap-1 text-[9px] font-bold uppercase text-red-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                    LIVE
                  </span>
                )}
              </div>

              <p className="mt-0.5 text-[10px] text-slate-400">
                {signal.category || "Trading"} •{" "}
                {signal.tag || "Swing"}
              </p>
            </div>
          </div>

          {/* SHARE */}
          <button
            type="button"
            className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Share signal"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {/* ENTRY / CURRENT / STATUS */}
        <div className="mt-4 rounded-2xl border border-white/5 bg-[#171a2b] p-3">
          <div className="grid grid-cols-3 gap-2">

            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500">
                Entry
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-white">
                {signal.entry}
              </p>
            </div>

            <div className="text-center">
              <p className="text-[9px] uppercase tracking-wider text-slate-500">
                Target
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-emerald-400">
                {signal.tp1}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wider text-slate-500">
                Status
              </p>

              <p
                className={cn(
                  "mt-1 flex items-center justify-end gap-1 text-xs font-bold",
                  isProfit
                    ? "text-emerald-400"
                    : isLoss
                    ? "text-red-400"
                    : "text-emerald-400"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isLoss ? "bg-red-500" : "bg-emerald-400"
                  )}
                />
                {isProfit ? "TP HIT" : isLoss ? "CLOSED" : "ACTIVE"}
              </p>
            </div>
          </div>
        </div>

        {/* PRICE LINE */}
        <div className="relative my-4 h-8">
          <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400" />

          <div className="absolute left-[10%] top-1/2 -translate-y-1/2">
            <div className="h-3 w-0.5 bg-red-400" />
          </div>

          <div className="absolute left-[55%] top-1/2 -translate-y-1/2">
            <div className="h-3 w-0.5 bg-emerald-400" />
          </div>

          <div className="absolute right-[8%] top-1/2 -translate-y-1/2">
            <div className="h-3 w-0.5 bg-emerald-400" />
          </div>

          <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full border border-white/10 bg-[#171a2b] px-2.5 py-1 text-[9px] font-bold text-white">
            {signal.entry}
          </div>
        </div>

        {/* SL / TP */}
        <div className="grid grid-cols-2 gap-2">

          <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-2.5">
            <div className="flex items-center gap-1 text-[9px] font-semibold text-red-400">
              <AlertCircle className="h-3 w-3" />
              STOP LOSS
            </div>

            <p className="mt-1 font-mono text-xs font-bold text-red-300">
              {signal.sl}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-2.5">
            <div className="flex items-center gap-1 text-[9px] font-semibold text-emerald-400">
              <Target className="h-3 w-3" />
              TAKE PROFIT
            </div>

            <p className="mt-1 font-mono text-xs font-bold text-emerald-300">
              {signal.tp1}
            </p>
          </div>
        </div>

        {/* TP PROGRESS */}
        {tpCount > 1 && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[9px] text-slate-500">
                TP Progress
              </span>

              <span className="text-[9px] font-bold text-emerald-400">
                {hitCount}/{tpCount} Completed
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* TP LIST */}
        {tpList.length > 1 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {tpList.map((tp) => (
              <div
                key={tp.label}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-2.5 py-2",
                  tp.hit
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-white/5 bg-white/[0.02]"
                )}
              >
                <span className="text-[9px] font-semibold text-slate-500">
                  {tp.label}
                </span>

                <span className="font-mono text-[10px] font-bold text-slate-200">
                  {tp.value}
                </span>

                {tp.hit && (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* RISK + TIME */}
        <div className="mt-4 flex items-center justify-between gap-2">

          {signal.risk_level && (
            <Badge
              className={cn(
                "border px-2.5 py-1 text-[9px] font-bold",
                riskClass
              )}
            >
              <Shield className="mr-1 h-3 w-3" />
              {signal.risk_level} Risk
            </Badge>
          )}

          <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
            <Clock3 className="h-3 w-3" />

            {format(
              new Date(signal.created_at),
              "dd MMM, HH:mm"
            )}
          </div>
        </div>

        {/* PROFIT NOTE */}
        {signal.profit_note && (
          <div className="mt-3 flex gap-2 rounded-xl border border-amber-500/10 bg-amber-500/5 p-2.5">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />

            <p className="text-[10px] leading-relaxed text-amber-300">
              {signal.profit_note}
            </p>
          </div>
        )}

        {/* NOTE */}
        {signal.note && (
          <div className="mt-3 flex gap-2 border-t border-white/5 pt-3">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />

            <p className="text-[10px] leading-relaxed text-slate-400">
              {signal.note}
            </p>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">

          <div
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-bold",
              isProfit
                ? "text-emerald-400"
                : isLoss
                ? "text-red-400"
                : "text-primary"
            )}
          >
            {isProfit ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                All TP Hit
              </>
            ) : isLoss ? (
              <>
                <AlertCircle className="h-3.5 w-3.5" />
                Signal Closed
              </>
            ) : (
              <>
                <Timer className="h-3.5 w-3.5" />
                {hitCount > 0
                  ? `${hitCount} TP Done`
                  : "Signal Running"}
              </>
            )}
          </div>

          <span className="text-[9px] text-slate-600">
            Trend Is Friend
          </span>
        </div>
      </div>
    </article>
  );
};

export default SignalCard;
