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
  ChevronUp,
  Flag,
  Shield,
  TrendingUp,
  Target,
  Crosshair,
  Zap,
  Activity,
  BarChart3,
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

  // State for collapsible view
  const [isExpanded, setIsExpanded] = useState(true);

  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      forceUpdate((value) => value + 1);
    }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  /* ============================================================
   * SIGNAL STATUS
   * ============================================================ */
  const lifecycle = (signal.signal_status || signal.status || "open").toLowerCase();
  const isPending = lifecycle === "pending";
  const isClosed = lifecycle === "close" || lifecycle === "closed" || lifecycle === "completed";
  const isOpen = !isClosed && !isPending && ["open", "running", "active"].includes(lifecycle);

  /* ============================================================
   * ENTRY LOGIC
   * ============================================================ */
  const isLimitOrder = signal.entry_mode?.toLowerCase() === "limit";
  const limitPrice = Number(signal.limit_entry_price) > 0 ? Number(signal.limit_entry_price) : 0;
  const parsedEntryPrice = isLimitOrder && limitPrice > 0 ? limitPrice : parseEntryPrice(signal.entry);
  const isBuy = signal.type?.toLowerCase() === "buy";

  /* ============================================================
   * CURRENT PRICE
   * ============================================================ */
  const currentPriceNum =
    typeof livePrice === "number" && livePrice > 0
      ? livePrice
      : signal.current_price
        ? parseFloat(signal.current_price)
        : 0;

  /* ============================================================
   * LIVE PRICE MOVEMENT
   * ============================================================ */
  const previousLivePriceRef = useRef<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | "neutral">("neutral");

  useEffect(() => {
    if (typeof livePrice !== "number" || livePrice <= 0) return;
    const previous = previousLivePriceRef.current;
    if (previous !== null) {
      if (livePrice > previous) setPriceDirection("up");
      else if (livePrice < previous) setPriceDirection("down");
    }
    previousLivePriceRef.current = livePrice;
  }, [livePrice]);

  const currentPriceColor =
    priceDirection === "down"
      ? "text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]"
      : "text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]";

  /* ============================================================
   * PREMIUM
   * ============================================================ */
  const isPremiumUser = subscriptionStatus === "premium";
  const isLocked = !!signal.is_premium && !isPremiumUser && !isClosed;

  /* ============================================================
   * TIME LOGIC
   * ============================================================ */
  const signalTime = isOpen && signal.activated_at ? signal.activated_at : signal.created_at;

  /* ============================================================
   * NEW SIGNAL
   * ============================================================ */
  const signalAgeHours = differenceInHours(new Date(), new Date(signal.created_at));
  const isNewSignal = signalAgeHours < 24 && !isClosed;

  /* ============================================================
   * RUNNING P/L
   * ============================================================ */
  const signalAgeMs = Date.now() - new Date(signal.created_at).getTime();
  const isVeryNewSignal = signalAgeMs < 60000;
  const entryTouched = isOpen && !isVeryNewSignal;

  const runningPL =
    entryTouched && currentPriceNum > 0 && parsedEntryPrice > 0
      ? calculateRunningPL(currentPriceNum, parsedEntryPrice, signal.type).value
      : null;

  /* ============================================================
   * CONFETTI
   * ============================================================ */
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
      colors: ["#10b981", "#22c55e", "#4ade80", "#fbbf24", "#f59e0b"],
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (signal.tp3_hit && !initialTP3StateRef.current && !confettiFiredRef.current && document.visibilityState === "visible") {
      triggerConfetti();
    }
  }, [signal.tp3_hit, triggerConfetti]);

  /* ============================================================
   * TP / SL PRICE LOGIC
   * ============================================================ */
  const hasTPReached = (current: number, target: number) => {
    if (current <= 0 || target <= 0) return false;
    return isBuy ? current >= target : current <= target;
  };

  const hasSLReached = (current: number, sl: number) => {
    if (current <= 0 || sl <= 0) return false;
    return isBuy ? current <= sl : current >= sl;
  };

  /* ============================================================
   * AUTO TP / SL UPDATE
   * ============================================================ */
  const primedForChecksRef = useRef(false);
  const slBreachStreakRef = useRef(0);

  useEffect(() => {
    if (!isOpen || !currentPriceNum || parsedEntryPrice <= 0) {
      primedForChecksRef.current = false;
      slBreachStreakRef.current = 0;
      return;
    }
    if (!primedForChecksRef.current) {
      primedForChecksRef.current = true;
      return;
    }

    let cancelled = false;
    const checkAndUpdate = async () => {
      const updates: Record<string, boolean | string | null> = {};
      const entryPrice = parsedEntryPrice;
      const tp1Price = signal.tp1 ? parseEntryPrice(signal.tp1) : 0;
      const tp2Price = signal.tp2 ? parseEntryPrice(signal.tp2) : 0;
      const tp3Price = signal.tp3 ? parseEntryPrice(signal.tp3) : 0;
      const tp4Price = signal.tp4 ? parseEntryPrice(signal.tp4) : 0;
      const slPrice = signal.sl ? parseEntryPrice(signal.sl) : 0;

      if (!signal.tp1_hit && tp1Price > 0 && hasTPReached(currentPriceNum, tp1Price)) {
        updates.tp1_hit = true;
        updates.sl = String(entryPrice);
        updates.profit_note = "TP 1 Hit ✅ SL moved to B.E";
      }
      if (!signal.tp2_hit && tp2Price > 0 && hasTPReached(currentPriceNum, tp2Price)) {
        updates.tp2_hit = true;
        updates.profit_note = "TP 2 Hit ✅ More Profit Secured 💰";
      }
      if (!signal.tp3_hit && tp3Price > 0 && hasTPReached(currentPriceNum, tp3Price)) {
        updates.tp3_hit = true;
        updates.profit_note = "TP 3 Hit 🎊 Maximum Profit Secured ✅";
        if (!signal.tp4) {
          updates.signal_status = "close";
          updates.status = "CLOSED";
        }
      }
      if (!signal.tp4_hit && tp4Price > 0 && hasTPReached(currentPriceNum, tp4Price)) {
        updates.tp4_hit = true;
        updates.signal_status = "close";
        updates.status = "CLOSED";
        updates.profit_note = "TP 4 Final Target Hit 🎊 Maximum Profit Secured ✅";
      }

      const effectiveTP1 = !!signal.tp1_hit || !!updates.tp1_hit;
      const effectiveSL = updates.sl ? parseEntryPrice(String(updates.sl)) : slPrice;
      const slBreachThisTick = !signal.sl_hit && effectiveSL > 0 && hasSLReached(currentPriceNum, effectiveSL);

      slBreachStreakRef.current = slBreachThisTick ? slBreachStreakRef.current + 1 : 0;

      if (slBreachThisTick && slBreachStreakRef.current >= 2) {
        updates.signal_status = "close";
        updates.status = "CLOSED";
        if (effectiveTP1) {
          updates.sl_hit = false;
          updates.profit_note = "Signal Closed at Breakeven after TP1 ✅";
        } else {
          updates.sl_hit = true;
          updates.profit_note = "SL Hit ❌ - Staying patient for a better entry.";
        }
      }

      if (!cancelled && Object.keys(updates).length > 0) {
        await supabase.from("signals").update(updates).eq("id", signal.id);
      }
    };

    checkAndUpdate();
    return () => { cancelled = true; };
  }, [
    isOpen, currentPriceNum, parsedEntryPrice, signal.id, signal.type,
    signal.tp1, signal.tp2, signal.tp3, signal.tp4, signal.sl,
    signal.tp1_hit, signal.tp2_hit, signal.tp3_hit, signal.tp4_hit, signal.sl_hit,
  ]);

  /* ============================================================
   * TIME FORMATTING
   * ============================================================ */
  const formatRealTime = (dateString: string) => {
    try {
      if (!dateString) return "Just now";
      const rawDate = new Date(dateString);
      const utcDate = dateString.endsWith("Z") || dateString.includes("+") ? rawDate : new Date(dateString + "Z");
      const formattedTime = format(utcDate, "hh:mm a");
      if (isClosed || signal.sl_hit || signal.tp4_hit || (!signal.tp4 && signal.tp3_hit)) {
        return `Closed at ${formattedTime}`;
      }
      return formattedTime;
    } catch {
      return "Just now";
    }
  };

  /* ============================================================
   * STATUS STYLING
   * ============================================================ */
  const note = signal.profit_note || "";
  const noteUpper = note.toUpperCase();

  const getSignalStatus = () => {
    if (isClosed || signal.sl_hit || signal.tp4_hit || (!signal.tp4 && signal.tp3_hit)) return "CLOSED";
    if (isPending) return "PENDING";
    return "ACTIVE";
  };

  const statusText = getSignalStatus();

  const getStatusStyle = () => {
    switch (statusText) {
      case "CLOSED":
        return "bg-rose-500/15 border-rose-500/40 text-rose-500 dark:text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]";
      case "ACTIVE":
        return "bg-emerald-500/15 border-emerald-500/40 text-emerald-500 dark:text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]";
      case "PENDING":
        return "bg-amber-500/15 border-amber-500/40 text-amber-500 dark:text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]";
      default:
        return "bg-cyan-500/15 border-cyan-500/40 text-cyan-500 dark:text-cyan-400";
    }
  };

  /* ============================================================
   * TP / SL COLORS
   * ============================================================ */
  const getTargetColor = (targetType: "sl" | "tp1" | "tp2" | "tp3" | "tp4") => {
    if (targetType === "sl") {
      const slMovedToBE = !!signal.tp1_hit || noteUpper.includes("BREAKEVEN") || noteUpper.includes("B.E");
      if (slMovedToBE) return "text-amber-500 dark:text-amber-400 font-bold";
      return "text-rose-500 dark:text-rose-400";
    }
    const hitMap = { tp1: !!signal.tp1_hit, tp2: !!signal.tp2_hit, tp3: !!signal.tp3_hit, tp4: !!signal.tp4_hit };
    return hitMap[targetType]
      ? "text-emerald-500 dark:text-emerald-400 font-bold drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]"
      : "text-slate-700 dark:text-cyan-300/80";
  };

  /* ============================================================
   * PROFIT NOTE STYLES
   * ============================================================ */
  const isBreakEven = /BREAKEVEN/i.test(note) || /B\.E/i.test(note);
  const isSLHit = !isBreakEven && (!!signal.sl_hit || /\bSL\s+HIT\b/i.test(note));
  const isFullTPWin = !isBreakEven && (/MAXIMUM PROFIT/i.test(note) || /TP\s*[34]\s*(HIT|FINAL)/i.test(note));
  const isPartialSecured = !isBreakEven && !isSLHit && !isFullTPWin && /SECURED/i.test(note);
  const isTPHit = !isSLHit && !isBreakEven && (isFullTPWin || isPartialSecured || /TP\s*[1-4]\s*(HIT|CLEARED|FINAL|TARGET)/i.test(note));

  const getNoteStyle = () => {
    if (isSLHit) return { container: "border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/20", icon: "text-rose-500 dark:text-rose-400", text: "text-rose-600 dark:text-rose-300" };
    if (isBreakEven) return { container: "border-blue-700/40 bg-blue-900/15 dark:bg-blue-950/40", icon: "text-blue-500 dark:text-blue-300", text: "text-blue-700 dark:text-blue-200" };
    if (isFullTPWin) return { container: "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20", icon: "text-emerald-500 dark:text-emerald-400", text: "text-emerald-700 dark:text-emerald-300" };
    if (isPartialSecured || isTPHit) return { container: "border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20", icon: "text-amber-500 dark:text-amber-400", text: "text-amber-600 dark:text-amber-300" };
    return { container: "border-slate-500/30 bg-slate-500/10 dark:bg-slate-800/30", icon: "text-slate-400", text: "text-slate-500 dark:text-slate-300" };
  };

  const noteStyle = getNoteStyle();
  const pairUpper = signal.pair?.toUpperCase() || "";

  // Helper to determine if TP1 is running
  const isTP1Running = isOpen && !signal.tp1_hit && !signal.sl_hit;

  /* ============================================================
   * RENDER
   * ============================================================ */
  return (
    <div
      ref={cardRef}
      className={cn(
        "relative mb-4 w-full rounded-[20px] p-4 transition-all duration-300 overflow-hidden border shadow-xl",
        // Dark Theme Base (Matching Image 1)
        "bg-gradient-to-br from-[#0c182b] via-[#09111e] to-[#04080f] border-cyan-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.8)]",
        // Light Theme Fallback (if user switches)
        "dark:from-[#0c182b] dark:via-[#09111e] dark:to-[#04080f] dark:border-cyan-500/20"
      )}
    >
      {/* Top Glow Accent Line */}
      <div className={cn("absolute top-0 left-0 right-0 h-[2px]", isBuy ? "bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80" : "bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-80")} />

      {/* ======================================================
          HEADER
          ====================================================== */}
      <div className="flex items-center justify-between mb-3 border-b border-cyan-500/20 pb-3">
        {/* LEFT: ICON & PAIR */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-yellow-600/10 text-xl shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            {pairUpper.includes("XAU") ? "🪙" : pairUpper.includes("BTC") ? "₿" : "💶"}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-wide text-cyan-50 leading-tight">
                {signal.pair.replace("/", "")}
              </h3>
              <span className={cn("rounded-md px-2 py-[2px] text-[9px] font-black uppercase tracking-wider", isBuy ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
                {isBuy ? "BUY" : "SELL"}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-cyan-300/60 leading-tight">
              {pairUpper.includes("XAU") ? "Gold Spot" : pairUpper.includes("BTC") ? "Bitcoin" : "Forex"}
            </p>
          </div>
        </div>

        {/* CENTER: ENTRY (Only visible in header as per image) */}
        <div className="hidden md:flex flex-col items-center">
            <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-300/50">Entry</span>
            <span className="font-mono text-base font-black text-cyan-100">{signal.entry}</span>
        </div>

        {/* RIGHT: STATUS & TOGGLE */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("inline-flex items-center rounded-full border px-2.5 py-[4px] text-[9px] font-black uppercase tracking-wider leading-none", getStatusStyle())}>
            <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", statusText === "CLOSED" ? "bg-rose-500" : statusText === "ACTIVE" ? "bg-emerald-400" : "bg-amber-400")} />
            {statusText}
          </span>
          {/* Single Hide/Show Button in Header */}
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 rounded-full bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-500/20 transition-colors">
            {isExpanded ? <ChevronUp className="h-4 w-4 text-cyan-300" /> : <ChevronDown className="h-4 w-4 text-cyan-300" />}
          </button>
        </div>
      </div>

      {/* ======================================================
          COLLAPSIBLE CONTENT
          ====================================================== */}
      {isExpanded && (
        <>
          {isLocked ? (
            <div onClick={() => navigate("/premium")} className="flex flex-col items-center justify-center gap-3 py-8 bg-cyan-950/30 hover:bg-cyan-900/40 active:scale-[0.98] rounded-[16px] border border-dashed border-cyan-500/30 cursor-pointer transition-all duration-200 select-none">
              <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/30">
                <Lock className="h-6 w-6 text-amber-400" />
              </div>
              <span className="text-sm font-bold tracking-wide text-cyan-200">🔒 Premium Signal - Tap to Unlock</span>
            </div>
          ) : (
            <>
              {/* ==================================================
                  MAIN CONTENT GRID (Entry/Chart & TPs)
                  ================================================== */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                
                {/* LEFT SIDE: ENTRY, CHART, TREND, STRATEGY */}
                <div className="flex flex-col justify-between rounded-[16px] bg-[#07101d]/80 border border-cyan-500/15 px-4 py-4 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Crosshair className="h-4 w-4 text-cyan-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/50">Entry</span>
                    </div>
                    <span className="font-mono text-lg font-black text-cyan-100">{signal.entry}</span>
                  </div>
                  
                  {/* Mini Chart Area */}
                  <div className="h-16 w-full mb-3 relative overflow-hidden rounded-xl bg-[#04080f] border border-cyan-500/10 flex items-center px-2">
                    <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                      {/* Candlestick simulation */}
                      {isBuy ? (
                          <path d="M 0 25 Q 25 28, 50 15 T 100 5" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                      ) : (
                          <path d="M 0 5 Q 25 2, 50 15 T 100 25" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
                      )}
                    </svg>
                  </div>

                  {/* Trend & Strategy */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-cyan-300/50">Trend</span>
                            <span className="text-[11px] font-black text-emerald-400">{isBuy ? "UPTREND" : "DOWNTREND"}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-cyan-400" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-cyan-300/50">Strategy</span>
                            <span className="text-[11px] font-black text-cyan-100">Pullback Entry</span>
                        </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE: TP & SL VERTICAL LIST WITH STEPPER */}
                <div className="relative flex flex-col gap-3 rounded-[16px] bg-[#07101d]/80 border border-cyan-500/15 px-4 py-4 shadow-inner">
                  
                  {/* Vertical Stepper Line Background */}
                  <div className="absolute left-[21px] top-[30px] bottom-[30px] w-[2px] bg-cyan-950/50" />

                  {/* TP 1 */}
                  <div className="relative flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                      {/* Stepper Dot */}
                      <div className={cn("h-3 w-3 rounded-full border-2 border-[#04080f]", signal.tp1_hit ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-emerald-500/30")} />
                      <div className="flex items-center gap-1.5">
                        <Flag className={cn("h-3.5 w-3.5", signal.tp1_hit ? "text-emerald-400" : "text-cyan-400/50")} />
                        <span className="text-[10px] font-bold text-cyan-300/60">TP 1</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("font-mono text-sm font-bold", getTargetColor("tp1"))}>{signal.tp1}</span>
                      {isTP1Running && (
                          <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-[2px] text-[8px] font-black text-emerald-400">
                              <Activity className="h-3 w-3 animate-pulse" /> RUNNING
                          </span>
                      )}
                      {signal.tp1_hit && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    </div>
                  </div>

                  {/* TP 2 */}
                  {signal.tp2 && (
                    <div className="relative flex items-center justify-between z-10">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-3 w-3 rounded-full border-2 border-[#04080f]", signal.tp2_hit ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-emerald-500/30")} />
                        <div className="flex items-center gap-1.5">
                            <Flag className={cn("h-3.5 w-3.5", signal.tp2_hit ? "text-emerald-400" : "text-cyan-400/50")} />
                            <span className="text-[10px] font-bold text-cyan-300/60">TP 2</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-mono text-sm font-bold", getTargetColor("tp2"))}>{signal.tp2}</span>
                        {signal.tp2_hit && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      </div>
                    </div>
                  )}

                  {/* TP 3 */}
                  {signal.tp3 && (
                    <div className="relative flex items-center justify-between z-10">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-3 w-3 rounded-full border-2 border-[#04080f]", signal.tp3_hit ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "bg-cyan-500/30")} />
                        <div className="flex items-center gap-1.5">
                            <Flag className={cn("h-3.5 w-3.5", signal.tp3_hit ? "text-cyan-400" : "text-cyan-400/50")} />
                            <span className="text-[10px] font-bold text-cyan-300/60">TP 3</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-mono text-sm font-bold", getTargetColor("tp3"))}>{signal.tp3}</span>
                        {signal.tp3_hit && <CheckCircle2 className="h-4 w-4 text-cyan-500" />}
                      </div>
                    </div>
                  )}

                  {/* SL (Separated by a small gap but on the same line conceptually) */}
                  <div className="relative flex items-center justify-between z-10 mt-1 border-t border-cyan-500/10 pt-2">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-3 w-3 rounded-full border-2 border-[#04080f]", signal.sl_hit ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" : "bg-rose-500/50")} />
                      <div className="flex items-center gap-1.5">
                        <Shield className={cn("h-3.5 w-3.5", signal.sl_hit ? "text-rose-500" : "text-rose-400/70")} />
                        <span className="text-[10px] font-bold text-rose-400">SL</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("font-mono text-sm font-bold", getTargetColor("sl"))}>{signal.sl}</span>
                      {signal.sl_hit && <XCircle className="h-4 w-4 text-rose-500" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* ==================================================
                  BOTTOM STATS (RISK, PROFIT, R:R)
                  ================================================== */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="flex flex-col items-center justify-center rounded-xl bg-[#07101d]/80 border border-cyan-500/15 py-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-300/50">Risk</span>
                  <span className="font-mono text-sm font-black text-cyan-100">$3.50</span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl bg-[#07101d]/80 border border-cyan-500/15 py-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-300/50">Potential Profit</span>
                  <span className="font-mono text-sm font-black text-emerald-400">$7.49 <span className="text-[8px] text-cyan-300/50">(TP3)</span></span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl bg-[#07101d]/80 border border-cyan-500/15 py-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-300/50">Reward : Risk</span>
                  <span className="font-mono text-sm font-black text-cyan-400">3.2 : 1</span>
                </div>
              </div>

              {/* ==================================================
                  PROFIT / STATUS NOTE
                  ================================================== */}
              {signal.profit_note && (
                <div className={cn("flex items-center gap-3 rounded-xl border px-4 py-2 mb-4", noteStyle.container)}>
                  {isSLHit ? (
                    <XCircle className={cn("h-4 w-4 shrink-0", noteStyle.icon)} />
                  ) : (
                    <CheckCircle2 className={cn("h-4 w-4 shrink-0", noteStyle.icon)} />
                  )}
                  <span className={cn("text-[11px] font-bold leading-tight tracking-wide", noteStyle.text)}>{signal.profit_note}</span>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ======================================================
          FOOTER (Always Visible)
          ====================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-cyan-500/20 gap-3">
        {/* Left: Tags */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-bold text-cyan-300/60">
            <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-cyan-400" /> Trade with Plan</span>
            <span className="hidden sm:block text-cyan-500/30">|</span>
            <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-cyan-400" /> Manage Risk</span>
            <span className="hidden sm:block text-cyan-500/30">|</span>
            <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5 text-cyan-400" /> Grow Your Account</span>
        </div>

        {/* Right: Hide Details & Timestamp */}
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-cyan-200/50">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                <span>{formatRealTime(signalTime)}</span>
            </div>
            {/* Single Hide Button */}
            <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
                {isExpanded ? "Hide Details" : "Show Details"} 
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default SignalCardNew;
