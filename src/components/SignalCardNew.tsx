import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  Lock,
  Crown,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { parseEntryPrice, calculateRunningPL } from "@/hooks/useLivePrices";

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
    timeframe?: string;
    trend?: string;
    strategy?: string;
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
  const [isExpanded, setIsExpanded] = useState(true);

  const confettiFiredRef = useRef(false);
  const initialTP3StateRef = useRef(!!signal.tp3_hit);

  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      forceUpdate((value) => value + 1);
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  /* STATUS LOGIC */
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

  /* ENTRY LOGIC */
  const isLimitOrder = signal.entry_mode?.toLowerCase() === "limit";
  const limitPrice =
    Number(signal.limit_entry_price) > 0 ? Number(signal.limit_entry_price) : 0;
  const parsedEntryPrice =
    isLimitOrder && limitPrice > 0 ? limitPrice : parseEntryPrice(signal.entry);
  const isBuy = signal.type?.toLowerCase() === "buy";

  /* CURRENT PRICE */
  const currentPriceNum =
    typeof livePrice === "number" && livePrice > 0
      ? livePrice
      : signal.current_price
      ? parseFloat(signal.current_price)
      : 0;

  /* PREMIUM ACCESS */
  const isPremiumUser = subscriptionStatus === "premium";
  const isLocked = !!signal.is_premium && !isPremiumUser && !isClosed;

  /* TIME LOGIC */
  const signalTime =
    isOpen && signal.activated_at ? signal.activated_at : signal.created_at;

  /* PROFIT NOTE STYLING */
  const note = signal.profit_note || "";
  const isBreakEven = /BREAKEVEN/i.test(note) || /B\.E/i.test(note);
  const isSLHit = !isBreakEven && (!!signal.sl_hit || /\bSL\s+HIT\b/i.test(note));

  const getNoteStyle = () => {
    if (isSLHit) {
      return {
        container: "border-rose-500/40 bg-rose-500/10 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.2)]",
        icon: "text-rose-400",
      };
    }
    if (isBreakEven) {
      return {
        container: "border-blue-500/40 bg-blue-500/10 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.2)]",
        icon: "text-blue-400",
      };
    }
    return {
      container: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
      icon: "text-emerald-400",
    };
  };

  /* CONFETTI TRIGGER */
  const triggerConfetti = useCallback(() => {
    if (!cardRef.current || confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x, y },
      colors: ["#10b981", "#22c55e", "#4ade80", "#06b6d4", "#3b82f6"],
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (
      signal.tp3_hit &&
      !initialTP3StateRef.current &&
      !confettiFiredRef.current &&
      document.visibilityState === "visible"
    ) {
      triggerConfetti();
    }
  }, [signal.tp3_hit, triggerConfetti]);

  const formatRealTime = (dateString: string) => {
    try {
      if (!dateString) return "14:32";
      const rawDate = new Date(dateString);
      const utcDate =
        dateString.endsWith("Z") || dateString.includes("+")
          ? rawDate
          : new Date(dateString + "Z");
      return format(utcDate, "dd MMM yyyy | HH:mm");
    } catch {
      return "10 Aug 2025 | 14:32";
    }
  };

  const pairUpper = signal.pair?.toUpperCase() || "XAUUSD";
  const noteStyle = getNoteStyle();

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative w-full max-w-xl mx-auto rounded-3xl p-[1.5px] transition-all duration-300 font-sans shadow-2xl mb-4",
        "bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600"
      )}
    >
      {/* Inner Frame Box */}
      <div className="w-full h-full rounded-[23px] bg-[#030914] p-3.5 sm:p-5 text-white backdrop-blur-xl border border-cyan-500/20 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
        
        {/* ================= HEADER SECTION ================= */}
        <div className="flex items-center justify-between gap-2 border-b border-cyan-900/40 pb-3">
          
          {/* Left: Asset Icon & Details */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 shadow-[0_0_12px_rgba(245,158,11,0.4)] text-lg">
              {pairUpper.includes("XAU")
                ? "🪙"
                : pairUpper.includes("BTC")
                ? "₿"
                : "💶"}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wider text-white">
                  {pairUpper.replace("/", "")}
                </h2>

                <span
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide border",
                    isBuy
                      ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "bg-rose-500/10 border-rose-500/50 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                  )}
                >
                  {isBuy ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {signal.type.toUpperCase()}
                </span>

                {signal.is_premium && (
                  <Crown className="h-4 w-4 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                )}
              </div>

              <div className="flex items-center gap-2 text-[10px] font-semibold text-cyan-300/70">
                <span className="text-emerald-400">
                  {signal.trend || (isBuy ? "Strong Bullish" : "Strong Bearish")}
                </span>
                <span>|</span>
                <span>{signal.timeframe || "M5"}</span>
              </div>
            </div>
          </div>

          {/* Right: Entry Price & Status Badge */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-300/60">
                ENTRY
              </span>
              <span className="font-mono text-base sm:text-lg font-black tracking-tight text-white">
                {signal.entry}
              </span>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider border",
                  isClosed
                    ? "bg-rose-500/20 border-rose-500/50 text-rose-400"
                    : isPending
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                    : "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full animate-pulse",
                    isClosed ? "bg-rose-400" : isPending ? "bg-amber-400" : "bg-emerald-400"
                  )}
                />
                {isClosed ? "CLOSED" : isPending ? "PENDING" : "ACTIVE"}
              </span>

              <span className="text-[8px] font-medium text-cyan-200/50">
                {formatRealTime(signalTime)}
              </span>
            </div>

            {/* Accordion Toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 transition"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* ================= PREVIEW / EXPANDED BODY ================= */}
        {isLocked ? (
          <div
            onClick={() => navigate("/premium")}
            className="flex flex-col items-center justify-center gap-2 py-8 my-3 bg-cyan-950/20 hover:bg-cyan-900/30 rounded-2xl border border-dashed border-cyan-500/40 cursor-pointer transition select-none"
          >
            <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Lock className="h-5 w-5 text-amber-400" />
            </div>
            <span className="text-xs font-extrabold tracking-wide text-cyan-100">
              🔒 Premium Signal - Tap to Unlock Details
            </span>
          </div>
        ) : (
          isExpanded && (
            <div className="mt-4 flex flex-col gap-4">
              
              {/* ================= MAIN CONTENT AREA ================= */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                
                {/* LEFT BLOCK: CANDLESTICK CHART VISUAL */}
                <div className="flex flex-col justify-between rounded-2xl bg-[#061224] p-3 border border-cyan-500/20 shadow-inner">
                  <div className="relative h-28 w-full flex items-center justify-center overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 200 80">
                      <line x1="20" y1="50" x2="20" y2="70" stroke="#10b981" strokeWidth="1.5" />
                      <rect x="16" y="55" width="8" height="10" fill="#10b981" rx="1" />

                      <line x1="40" y1="40" x2="40" y2="65" stroke="#10b981" strokeWidth="1.5" />
                      <rect x="36" y="45" width="8" height="15" fill="#10b981" rx="1" />

                      <line x1="60" y1="42" x2="60" y2="60" stroke="#f43f5e" strokeWidth="1.5" />
                      <rect x="56" y="48" width="8" height="8" fill="#f43f5e" rx="1" />

                      <line x1="80" y1="30" x2="80" y2="52" stroke="#10b981" strokeWidth="1.5" />
                      <rect x="76" y="34" width="8" height="14" fill="#10b981" rx="1" />

                      <line x1="100" y1="20" x2="100" y2="45" stroke="#10b981" strokeWidth="1.5" />
                      <rect x="96" y="24" width="8" height="18" fill="#10b981" rx="1" />

                      <line x1="120" y1="15" x2="120" y2="38" stroke="#10b981" strokeWidth="1.5" />
                      <rect x="116" y="18" width="8" height="16" fill="#10b981" rx="1" />

                      <path
                        d="M 15 65 Q 60 55, 120 22 T 180 10"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                        filter="drop-shadow(0px 0px 6px #10b981)"
                      />
                      <polygon points="180,5 185,15 173,13" fill="#10b981" />
                    </svg>
                  </div>

                  <div className="flex items-center justify-between border-t border-cyan-900/40 pt-2 text-[10px]">
                    <div className="flex flex-col">
                      <span className="text-cyan-300/50 text-[8px] uppercase font-bold">Trend</span>
                      <span className="font-extrabold text-emerald-400">
                        {signal.trend || "UPTREND"}
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-cyan-300/50 text-[8px] uppercase font-bold">Strategy</span>
                      <span className="font-extrabold text-cyan-200">
                        {signal.strategy || "Pullback Entry"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT BLOCK: CLEAR FULL STEPPER TIMELINE (NO CENTER ENTRY BOX) */}
                <div className="flex flex-col justify-center gap-2 rounded-2xl bg-[#061224] p-3.5 border border-cyan-500/20">
                  
                  {/* TP 1 */}
                  <div className="flex items-center justify-between text-xs font-mono py-1">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("h-3 w-3 rounded-full border border-black shrink-0", signal.tp1_hit ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-emerald-500/30")} />
                      <span className="text-cyan-200 font-bold">🚩 TP 1</span>
                      <span className="font-black text-white text-sm">{signal.tp1}</span>
                    </div>
                    {signal.tp1_hit && (
                      <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        HIT ✅
                      </span>
                    )}
                  </div>

                  {/* TP 2 */}
                  {signal.tp2 && (
                    <div className="flex items-center justify-between text-xs font-mono py-1 border-t border-cyan-900/30">
                      <div className="flex items-center gap-2.5">
                        <span className={cn("h-3 w-3 rounded-full border border-black shrink-0", signal.tp2_hit ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-cyan-500/30")} />
                        <span className="text-cyan-300/70 font-semibold">🚩 TP 2</span>
                        <span className="font-extrabold text-cyan-100 text-sm">{signal.tp2}</span>
                      </div>
                      {signal.tp2_hit && (
                        <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          HIT ✅
                        </span>
                      )}
                    </div>
                  )}

                  {/* TP 3 */}
                  {signal.tp3 && (
                    <div className="flex items-center justify-between text-xs font-mono py-1 border-t border-cyan-900/30">
                      <div className="flex items-center gap-2.5">
                        <span className={cn("h-3 w-3 rounded-full border border-black shrink-0", signal.tp3_hit ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee]" : "bg-cyan-500/30")} />
                        <span className="text-cyan-300/70 font-semibold">🚩 TP 3</span>
                        <span className="font-extrabold text-cyan-100 text-sm">{signal.tp3}</span>
                      </div>
                      {signal.tp3_hit && (
                        <span className="text-[9px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                          HIT 🎊
                        </span>
                      )}
                    </div>
                  )}

                  {/* STOP LOSS (SL) */}
                  <div className="flex items-center justify-between text-xs font-mono py-1 border-t border-rose-900/40 mt-1">
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-full border border-black bg-rose-500 shadow-[0_0_8px_#f43f5e] shrink-0" />
                      <span className="text-rose-400 font-bold">🛡️ SL</span>
                      <span className="font-black text-rose-300 text-sm">{signal.sl}</span>
                    </div>
                    {signal.sl_hit && (
                      <span className="text-[9px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
                        HIT ❌
                      </span>
                    )}
                  </div>

                </div>
              </div>

              {/* ================= BOTTOM PROFIT NOTE SECTION ================= */}
              {signal.profit_note ? (
                <div
                  className={cn(
                    "flex items-center gap-2.5 rounded-2xl border p-3 font-semibold transition-all duration-300 backdrop-blur-md",
                    noteStyle.container
                  )}
                >
                  {isSLHit ? (
                    <XCircle className={cn("h-4 w-4 shrink-0", noteStyle.icon)} />
                  ) : (
                    <CheckCircle2 className={cn("h-4 w-4 shrink-0", noteStyle.icon)} />
                  )}
                  <span className="text-xs sm:text-sm font-black tracking-wide leading-tight">
                    {signal.profit_note}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-2xl border border-cyan-500/20 bg-[#061224] p-3 text-cyan-300/60 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                  <span>Trade in progress. Target status update automated live.</span>
                </div>
              )}

              {/* ================= FOOTER LINKS ================= */}
              <div className="flex items-center justify-between border-t border-cyan-900/40 pt-2 text-[10px] font-bold text-cyan-300/70">
                <div className="flex items-center gap-3">
                  <span>⚡ Trade with Plan</span>
                  <span>🛡️ Manage Risk</span>
                </div>

                <button
                  onClick={() => setIsExpanded(false)}
                  className="flex items-center gap-1 text-cyan-400 hover:text-white transition"
                >
                  <ChevronUp className="h-3 w-3" /> Hide Details
                </button>
              </div>

            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SignalCardNew;
