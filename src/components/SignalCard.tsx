import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Target,
  Shield,
  Clock3,
  Timer,
  Info,
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

  const targets = [
    { label: "TP1", value: signal.tp1, hit: signal.tp1_hit },
    { label: "TP2", value: signal.tp2, hit: signal.tp2_hit },
    { label: "TP3", value: signal.tp3, hit: signal.tp3_hit },
    { label: "TP4", value: signal.tp4, hit: signal.tp4_hit },
  ].filter((item) => item.value);

  const tpCount = targets.length;
  const hitCount = targets.filter((item) => item.hit).length;

  const progress =
    tpCount > 0 ? (hitCount / tpCount) * 100 : 0;

  const statusText = isProfit
    ? "ALL TP HIT"
    : isLoss
    ? "CLOSED"
    : "ACTIVE";

  const statusColor = isProfit
    ? "text-emerald-400"
    : isLoss
    ? "text-red-400"
    : "text-cyan-400";

  const riskColor =
    signal.risk_level?.toLowerCase() === "low"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
      : signal.risk_level?.toLowerCase() === "high"
      ? "border-red-500/20 bg-red-500/10 text-red-400"
      : "border-amber-500/20 bg-amber-500/10 text-amber-400";

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "border border-white/[0.08]",
        "bg-[#111522]",
        "shadow-[0_10px_35px_rgba(0,0,0,0.30)]",
        "transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-white/15"
      )}
    >
      {/* BUY / SELL top accent */}
      <div
        className={cn(
          "h-1 w-full",
          signal.type === "Buy"
            ? "bg-gradient-to-r from-emerald-400 via-green-400 to-transparent"
            : "bg-gradient-to-r from-red-500 via-orange-400 to-transparent"
        )}
      />

      <div className="p-4">

        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between gap-3">

          <div className="flex min-w-0 items-center gap-2.5">

            <div
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5",
                "text-[11px] font-black",
                signal.type === "Buy"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-red-500/15 text-red-400"
              )}
            >
              {signal.type === "Buy" ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}

              {signal.type.toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-[17px] font-black tracking-tight text-white">
                  {signal.pair}
                </h3>

                {isActive && (
                  <span className="flex shrink-0 items-center gap-1 text-[8px] font-black tracking-wider text-red-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                    LIVE
                  </span>
                )}
              </div>

              <p className="truncate text-[9px] text-slate-500">
                {signal.category || "Trading"}
                {signal.tag ? ` • ${signal.tag}` : ""}
              </p>
            </div>
          </div>

          {/* Status */}
          <div
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full",
              "border border-white/5 bg-white/[0.03]",
              "px-2.5 py-1.5 text-[8px] font-black tracking-wider",
              statusColor
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isLoss ? "bg-red-500" : "bg-emerald-400",
                isActive && "animate-pulse"
              )}
            />
            {statusText}
          </div>
        </div>

        {/* ================= ENTRY PANEL ================= */}
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#171b2a] p-3">

          <div className="grid grid-cols-3 items-center">

            <div>
              <p className="text-[8px] font-semibold uppercase tracking-widest text-slate-500">
                Entry
              </p>

              <p className="mt-1 font-mono text-sm font-bold text-white">
                {signal.entry}
              </p>
            </div>

            <div className="text-center">
              <p className="text-[8px] font-semibold uppercase tracking-widest text-slate-500">
                First Target
              </p>

              <p className="mt-1 font-mono text-sm font-bold text-emerald-400">
                {signal.tp1}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[8px] font-semibold uppercase tracking-widest text-slate-500">
                Stop Loss
              </p>

              <p className="mt-1 font-mono text-sm font-bold text-red-400">
                {signal.sl}
              </p>
            </div>

          </div>
        </div>

        {/* ================= TRADE PATH ================= */}
        <div className="relative my-5 px-1">

          <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-gradient-to-r from-red-500/70 via-amber-400/70 to-emerald-400/80" />

          <div className="relative flex items-center justify-between">

            <div className="flex flex-col items-start">
              <span className="mb-1 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[7px] font-bold text-red-400">
                SL
              </span>
              <span className="h-2.5 w-2.5 rounded-full border-2 border-red-400 bg-[#111522]" />
            </div>

            <div className="flex flex-col items-center">
              <span className="mb-1 rounded-md bg-white/10 px-1.5 py-0.5 text-[7px] font-bold text-slate-300">
                ENTRY
              </span>
              <span className="h-3.5 w-3.5 rounded-full border-[3px] border-cyan-400 bg-[#111522] shadow-[0_0_10px_rgba(34,211,238,0.35)]" />
            </div>

            <div className="flex flex-col items-end">
              <span className="mb-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[7px] font-bold text-emerald-400">
                TP
              </span>
              <span className="h-2.5 w-2.5 rounded-full border-2 border-emerald-400 bg-[#111522]" />
            </div>

          </div>
        </div>

        {/* ================= TP / SL ================= */}
        <div className="grid grid-cols-2 gap-2">

          <div className="rounded-xl border border-red-500/10 bg-red-500/[0.04] p-2.5">

            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 text-red-400" />

              <span className="text-[8px] font-bold uppercase tracking-wider text-red-400">
                Stop Loss
              </span>
            </div>

            <p className="mt-1 font-mono text-xs font-bold text-red-300">
              {signal.sl}
            </p>

            {signal.sl_hit && (
              <span className="mt-1 block text-[8px] font-black text-red-400">
                STOP HIT
              </span>
            )}
          </div>

          <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-2.5">

            <div className="flex items-center gap-1.5">
              <Target className="h-3 w-3 text-emerald-400" />

              <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400">
                Take Profit
              </span>
            </div>

            <p className="mt-1 font-mono text-xs font-bold text-emerald-300">
              {signal.tp1}
            </p>

            {signal.tp1_hit && (
              <span className="mt-1 flex items-center gap-1 text-[8px] font-black text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                HIT
              </span>
            )}
          </div>

        </div>

        {/* ================= ALL TARGETS ================= */}
        {targets.length > 1 && (
          <div className="mt-3">

            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[8px] font-semibold uppercase tracking-wider text-slate-500">
                Target Progress
              </span>

              <span className="text-[8px] font-bold text-emerald-400">
                {hitCount}/{tpCount} Hit
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {targets.map((target) => (
                <div
                  key={target.label}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-2 py-1.5",
                    target.hit
                      ? "border-emerald-500/15 bg-emerald-500/[0.05]"
                      : "border-white/[0.05] bg-white/[0.015]"
                  )}
                >
                  <span className="text-[8px] font-bold text-slate-500">
                    {target.label}
                  </span>

                  <span className="font-mono text-[9px] font-bold text-slate-300">
                    {target.value}
                  </span>

                  {target.hit && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= RISK ================= */}
        <div className="mt-3 flex items-center justify-between">

          {signal.risk_level ? (
            <Badge
              className={cn(
                "border px-2 py-1 text-[8px] font-bold",
                riskColor
              )}
            >
              <Shield className="mr-1 h-3 w-3" />
              {signal.risk_level} Risk
            </Badge>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1 text-[8px] text-slate-500">
            <Clock3 className="h-3 w-3" />

            {format(
              new Date(signal.created_at),
              "dd MMM, HH:mm"
            )}
          </div>
        </div>

        {/* ================= PROFIT NOTE ================= */}
        {signal.profit_note && (
          <div className="mt-3 flex gap-2 rounded-xl border border-amber-500/10 bg-amber-500/[0.04] p-2.5">

            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />

            <p className="text-[9px] leading-relaxed text-amber-300">
              {signal.profit_note}
            </p>

          </div>
        )}

        {/* ================= NOTE ================= */}
        {signal.note && (
          <div className="mt-3 flex gap-2 border-t border-white/[0.05] pt-3">

            <Info className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />

            <p className="text-[9px] leading-relaxed text-slate-400">
              {signal.note}
            </p>

          </div>
        )}

        {/* ================= FOOTER ================= */}
        <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3">

          <div
            className={cn(
              "flex items-center gap-1.5 text-[9px] font-bold",
              isProfit
                ? "text-emerald-400"
                : isLoss
                ? "text-red-400"
                : "text-cyan-400"
            )}
          >
            {isProfit ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                ALL TARGETS REACHED
              </>
            ) : isLoss ? (
              <>
                <AlertCircle className="h-3.5 w-3.5" />
                SIGNAL CLOSED
              </>
            ) : (
              <>
                <Timer className="h-3.5 w-3.5" />
                {hitCount > 0
                  ? `${hitCount} TARGET${hitCount > 1 ? "S" : ""} HIT`
                  : "SIGNAL RUNNING"}
              </>
            )}
          </div>

          <span className="text-[8px] font-semibold tracking-wider text-slate-600">
            TREND IS FRIEND
          </span>

        </div>

      </div>
    </article>
  );
};

export default SignalCard;
