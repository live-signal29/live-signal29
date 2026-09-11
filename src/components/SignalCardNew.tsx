import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lock,
  Crown,
  ChevronDown,
  TrendingUp,
  Target,
  Shield,
} from "lucide-react";
import {
  format,
  differenceInHours,
} from "date-fns";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import {
  parseEntryPrice,
  calculateRunningPL,
} from "@/hooks/useLivePrices";

interface SignalCardProps {
  signal: {
    id: string;
    pair: string;
    type: "Buy" | "Sell" | "BUY" | "SELL";

    entry: string;
    entry_mode?: string;
    limit_entry_price?: number | null;

    is_activated?: boolean;
    activated_at?: string | null;

    tp1: string;
    tp2?: string;
    tp3?: string;
    tp4?: string;

    sl: string;

    tp1_hit?: boolean;
    tp2_hit?: boolean;
    tp3_hit?: boolean;
    tp4_hit?: boolean;
    sl_hit?: boolean;

    status?: string;
    signal_status?: string;

    note?: string;
    profit_note?: string;
    pips_result?: string;
    risk_level?: string;
    signal_type?: string;
    analysis_reason?: string;

    created_at: string;

    category?: string;
    main_category?: string;
    is_premium?: boolean;

    current_price?: string;
    tag?: string;
  };

  hasAccess?: boolean;
  subscriptionStatus?: string | null;
  livePrice?: number;
}

const SignalCardNew = ({
  signal,
  hasAccess = true,
  subscriptionStatus,
  livePrice,
}: SignalCardProps) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const confettiFiredRef = useRef(false);
  const initialTP3StateRef = useRef(!!signal.tp3_hit);

  // Refresh component state if needed
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      forceUpdate((value) => value + 1);
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  /*
   * ============================================================
   * SIGNAL STATUS
   * ============================================================
   */

  const lifecycle = (
    signal.signal_status ||
    signal.status ||
    "open"
  ).toLowerCase();

  const isPending = lifecycle === "pending";

  const isClosed =
    lifecycle === "close" ||
    lifecycle === "closed" ||
    lifecycle === "completed";

  const isOpen =
    !isClosed &&
    !isPending &&
    ["open", "running", "active"].includes(lifecycle);

  /*
   * ============================================================
   * ENTRY LOGIC
   * ============================================================
   */

  const isLimitOrder =
    signal.entry_mode?.toLowerCase() === "limit";

  const limitPrice =
    Number(signal.limit_entry_price) > 0
      ? Number(signal.limit_entry_price)
      : 0;

  const parsedEntryPrice =
    isLimitOrder && limitPrice > 0
      ? limitPrice
      : parseEntryPrice(signal.entry);

  const isBuy =
    signal.type?.toLowerCase() === "buy";

  /*
   * ============================================================
   * DERIV / SYNTHETIC INDEX CHECK
   * ============================================================
   */

  const isDerivPair = (() => {
    const cat = String(
      signal.main_category ||
        signal.category ||
        ""
    ).toUpperCase();

    if (cat.includes("DERIV")) return true;

    const p = String(
      signal.pair || ""
    ).toUpperCase();

    return (
    <div
      ref={cardRef}
      className={cn(
        "relative mb-4 w-full overflow-hidden rounded-[22px] border backdrop-blur-xl transition-all duration-300",
        "bg-gradient-to-br from-[#071a2b] via-[#06111e] to-[#02070d]",
        "border-cyan-400/25 shadow-[0_10px_35px_rgba(0,0,0,0.55)]",
        isBuy
          ? "hover:border-emerald-400/50 hover:shadow-[0_0_28px_rgba(16,185,129,0.14)]"
          : "hover:border-rose-400/50 hover:shadow-[0_0_28px_rgba(244,63,94,0.14)]"
      )}
    >
      {/* Premium neon edge */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent",
          isBuy ? "via-emerald-400" : "via-rose-500",
          "to-transparent opacity-90"
        )}
      />

      {/* ===================== COMPACT HEADER ===================== */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="relative flex w-full items-center gap-3 px-4 py-4 text-left active:scale-[0.995]"
        aria-expanded={expanded}
      >
        {/* Asset icon */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/60 bg-gradient-to-br from-amber-400/20 via-yellow-500/10 to-transparent text-2xl shadow-[0_0_18px_rgba(245,158,11,0.20)]">
          {pairUpper.includes("XAU") ? "ðŸª™" : pairUpper.includes("BTC") ? "â‚¿" : "ðŸ’¶"}
        </div>

        {/* Symbol / direction */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[21px] font-black leading-none tracking-wide text-white">
              {signal.pair.replace("/", "")}
            </h3>
            <span
              className={cn(
                "rounded-xl border px-2.5 py-1 text-[11px] font-black uppercase",
                isBuy
                  ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300"
                  : "border-rose-400/60 bg-rose-500/15 text-rose-300"
              )}
            >
              {isBuy ? "â†— BUY" : "â†˜ SELL"}
            </span>
            {signal.is_premium && (
              <Crown className="h-4 w-4 text-amber-400 drop-shadow-[0_0_7px_rgba(245,158,11,0.6)]" />
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] font-semibold text-cyan-200/65">
            <span>{pairUpper.includes("XAU") ? "Gold Spot" : pairUpper.includes("BTC") ? "Bitcoin" : "Forex"}</span>
            <span>â€¢</span>
            <span>{signal.signal_type || "M5"}</span>
            {isNewSignal && !isLocked && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black text-emerald-300">NEW</span>
            )}
          </div>
        </div>

        {/* Entry */}
        <div className="hidden shrink-0 border-l border-cyan-400/20 pl-5 sm:block">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300/60">Entry</div>
          <div className="mt-0.5 font-mono text-[23px] font-black text-white">{signal.entry}</div>
        </div>

        {/* Status + expand */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase",
              getStatusStyle()
            )}
          >
            <span className={cn(
              "h-2 w-2 rounded-full",
              statusText === "CLOSED" ? "bg-rose-400" : statusText === "OPEN" ? "animate-pulse bg-emerald-300" : "bg-amber-300"
            )} />
            {statusText}
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-950/50 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.12)]">
            <ChevronDown className={cn("h-5 w-5 transition-transform duration-300", expanded && "rotate-180")} />
          </span>
        </div>
      </button>

      {/* Mobile entry */}
      <div className="flex items-center justify-between border-t border-cyan-400/10 px-4 py-2 sm:hidden">
        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300/50">ENTRY</span>
        <span className="font-mono text-[18px] font-black text-white">{signal.entry}</span>
        <span className="text-[10px] text-cyan-200/40">{formatRealTime(signalTime)}</span>
      </div>

      {/* ===================== FULL DETAILS ===================== */}
      {expanded && (
        <div className="border-t border-cyan-400/15 px-3 pb-4 pt-3 sm:px-4">
          {isLocked ? (
            <div
              onClick={() => navigate("/premium")}
              className="cursor-pointer rounded-2xl border border-dashed border-amber-400/40 bg-amber-500/5 px-5 py-10 text-center transition hover:bg-amber-500/10"
            >
              <Lock className="mx-auto mb-3 h-7 w-7 text-amber-400" />
              <div className="text-sm font-black text-white">Premium Signal</div>
              <div className="mt-1 text-xs text-cyan-100/60">Tap to unlock full trade details</div>
            </div>
          ) : (
            <>
              {/* Top detail row */}
              <div className="grid gap-3 lg:grid-cols-[1fr_1.55fr]">
                {/* Chart / analysis panel */}
                <div className="rounded-2xl border border-cyan-400/20 bg-[#03121d]/90 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200/50">Market Trend</span>
                    <TrendingUp className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div className="mt-2 text-[20px] font-black text-emerald-300">STRONG BULLISH</div>
                  <div className="mt-4 h-32 overflow-hidden rounded-xl border border-cyan-400/10 bg-[#04151e] p-2">
                    <svg viewBox="0 0 420 140" className="h-full w-full" preserveAspectRatio="none">
                      <path
                        d={isBuy
                          ? "M0 120 L35 108 L58 112 L82 88 L108 98 L135 70 L164 78 L190 57 L215 64 L245 39 L272 49 L300 28 L327 39 L355 20 L385 27 L420 5"
                          : "M0 20 L35 30 L58 24 L82 48 L108 40 L135 70 L164 62 L190 82 L215 74 L245 101 L272 92 L300 112 L327 102 L355 120 L385 113 L420 135"}
                        fill="none"
                        stroke={isBuy ? "#19f5a5" : "#fb5268"}
                        strokeWidth="5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-cyan-400/15 bg-cyan-950/20 p-3">
                      <div className="text-[9px] font-bold uppercase text-cyan-200/45">Strategy</div>
                      <div className="mt-1 text-sm font-black text-white">{signal.entry_mode || "Market Entry"}</div>
                    </div>
                    <div className="rounded-xl border border-cyan-400/15 bg-cyan-950/20 p-3">
                      <div className="text-[9px] font-bold uppercase text-cyan-200/45">Current</div>
                      <div className={cn("mt-1 font-mono text-sm font-black", currentPriceColor)}>
                        {currentPriceNum > 0 ? currentPriceNum.toFixed(2) : signal.entry}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Entry + targets ladder */}
                <div className="rounded-2xl border border-cyan-400/20 bg-[#03121d]/90 p-3 sm:p-4">
                  <div className="grid gap-3 md:grid-cols-[0.85fr_1.6fr]">
                    <div className="flex flex-col justify-center rounded-2xl border border-cyan-400/70 bg-cyan-500/5 p-5 text-center shadow-[0_0_24px_rgba(34,211,238,0.12)]">
                      <Target className="mx-auto h-7 w-7 text-cyan-300" />
                      <div className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/60">ENTRY</div>
                      <div className="mt-1 font-mono text-[30px] font-black text-white">{signal.entry}</div>
                    </div>

                    <div className="space-y-2">
                      {[1, 2, 3].map((level) => {
                        const key = `tp${level}` as "tp1" | "tp2" | "tp3";
                        const price = signal[key];
                        if (!price) return null;
                        const state = renderTargetState(level as 1 | 2 | 3);
                        return (
                          <div
                            key={key}
                            className={cn(
                              "grid grid-cols-[70px_1fr_auto] items-center gap-2 rounded-2xl border px-3 py-3.5",
                              state.label === "HIT"
                                ? "border-emerald-400/60 bg-emerald-500/10"
                                : state.label === "RUNNING"
                                  ? "border-cyan-400/60 bg-cyan-500/8 shadow-[0_0_18px_rgba(34,211,238,0.08)]"
                                  : "border-slate-700/80 bg-slate-900/30"
                            )}
                          >
                            <div className={cn(
                              "text-sm font-black",
                              state.label === "HIT" ? "text-emerald-300" : state.label === "RUNNING" ? "text-cyan-300" : "text-slate-500"
                            )}>âš‘ TP {level}</div>
                            <div className={cn("font-mono text-[22px] font-black", state.label === "HIT" ? "text-emerald-100" : "text-white")}>{price}</div>
                            <span className={cn("rounded-full border px-2.5 py-1 text-[9px] font-black", state.className)}>
                              {state.label}
                            </span>
                          </div>
                        );
                      })}

                      <div className={cn(
                        "grid grid-cols-[70px_1fr_auto] items-center gap-2 rounded-2xl border px-3 py-3.5",
                        signal.tp1_hit ? "border-amber-400/50 bg-amber-500/5" : "border-rose-500/60 bg-rose-500/8"
                      )}>
                        <div className="text-sm font-black text-rose-300"><Shield className="mr-1 inline h-4 w-4" />SL</div>
                        <div className="font-mono text-[22px] font-black text-white">{signal.sl}</div>
                        <span className={cn(
                          "rounded-full border px-2.5 py-1 text-[9px] font-black",
                          signal.tp1_hit
                            ? "border-amber-400/50 bg-amber-500/10 text-amber-300"
                            : signal.sl_hit
                              ? "border-rose-400/60 bg-rose-500/10 text-rose-300"
                              : "border-rose-500/30 bg-rose-500/5 text-rose-300"
                        )}>
                          {signal.tp1_hit ? "B.E." : signal.sl_hit ? "HIT" : "RISK"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-cyan-400/15 bg-[#03121d]/90 p-4">
                  <div className="text-[10px] font-black uppercase tracking-wider text-cyan-200/45">Risk</div>
                  <div className="mt-1 text-[22px] font-black text-white">
                    {runningPL !== null ? `${runningPL > 0 ? "+" : ""}${runningPL.toFixed(1)} pips` : signal.risk_level || "Managed"}
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-200/55">Target Progress</div>
                  <div className="mt-1 text-[22px] font-black text-emerald-300">
                    {signal.tp3_hit ? "TP3 HIT" : signal.tp2_hit ? "TP3 RUNNING" : signal.tp1_hit ? "TP2 RUNNING" : "TP1 RUNNING"}
                  </div>
                </div>
                <div className="rounded-2xl border border-cyan-400/15 bg-[#03121d]/90 p-4">
                  <div className="text-[10px] font-black uppercase tracking-wider text-cyan-200/45">Signal Time</div>
                  <div className="mt-1 text-[18px] font-black text-white">{formatRealTime(signalTime)}</div>
                </div>
              </div>

              {/* Note */}
              {signal.profit_note && (
                <div className={cn("mt-3 flex items-center gap-2 rounded-2xl border px-4 py-3", noteStyle.container)}>
                  {isSLHit ? <XCircle className={cn("h-5 w-5 shrink-0", noteStyle.icon)} /> : <CheckCircle2 className={cn("h-5 w-5 shrink-0", noteStyle.icon)} />}
                  <span className={cn("text-sm font-bold", noteStyle.text)}>{signal.profit_note}</span>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between rounded-2xl border border-cyan-400/15 bg-cyan-950/20 px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-bold text-cyan-100/65">
                  <span>âš¡ Trade with Plan</span>
                  <span>ðŸ›¡ Manage Risk</span>
                  <span>ðŸ“ˆ Grow Your Account</span>
                </div>
                <span className="hidden rounded-full border border-cyan-400/50 px-3 py-1 text-[10px] font-black text-cyan-300 sm:block">âŒƒ HIDE DETAILS</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SignalCardNew;
