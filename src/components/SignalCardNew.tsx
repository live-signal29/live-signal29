import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lock,
  Crown,
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
      p.includes("VOL") ||
      p.includes("BOOM") ||
      p.includes("CRASH") ||
      p.includes("STEP") ||
      p.includes("JUMP")
    );
  })();

  /*
   * ============================================================
   * CURRENT PRICE
   * ============================================================
   */

  const currentPriceNum =
    typeof livePrice === "number" && livePrice > 0
      ? livePrice
      : signal.current_price
        ? parseFloat(signal.current_price)
        : 0;

  /*
   * ============================================================
   * LIVE PRICE MOVEMENT
   * ============================================================
   */
  const previousLivePriceRef = useRef<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | "neutral">("neutral");

  useEffect(() => {
    if (typeof livePrice !== "number" || livePrice <= 0) return;

    const previous = previousLivePriceRef.current;

    if (previous !== null) {
      if (livePrice > previous) {
        setPriceDirection("up");
      } else if (livePrice < previous) {
        setPriceDirection("down");
      }
    }

    previousLivePriceRef.current = livePrice;
  }, [livePrice]);

  const currentPriceColor =
    priceDirection === "down"
      ? "text-rose-500 dark:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]"
      : "text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]";

  /*
   * ============================================================
   * PREMIUM
   * ============================================================
   */

  const isPremiumUser =
    subscriptionStatus === "premium";

  const isLocked =
    !!signal.is_premium &&
    !isPremiumUser &&
    !isClosed;

  /*
   * ============================================================
   * TIME LOGIC
   * ============================================================
   */

  const signalTime =
    isOpen && signal.activated_at
      ? signal.activated_at
      : signal.created_at;

  /*
   * ============================================================
   * NEW SIGNAL
   * ============================================================
   */

  const signalAgeHours = differenceInHours(
    new Date(),
    new Date(signal.created_at)
  );

  const isNewSignal =
    signalAgeHours < 24 &&
    !isClosed;

  /*
   * ============================================================
   * RUNNING P/L
   * ============================================================
   */

  const signalAgeMs =
    Date.now() -
    new Date(signal.created_at).getTime();

  const isVeryNewSignal =
    signalAgeMs < 60000;

  const entryTouched =
    isOpen &&
    !isVeryNewSignal;

  const runningPL =
    entryTouched &&
    currentPriceNum > 0 &&
    parsedEntryPrice > 0
      ? calculateRunningPL(
          currentPriceNum,
          parsedEntryPrice,
          signal.type
        )
      : null;

  /*
   * ============================================================
   * CONFETTI
   * ============================================================
   */

  const triggerConfetti = useCallback(() => {
    if (
      !cardRef.current ||
      confettiFiredRef.current
    ) {
      return;
    }

    confettiFiredRef.current = true;

    const rect =
      cardRef.current.getBoundingClientRect();

    const x =
      (rect.left + rect.width / 2) /
      window.innerWidth;

    const y =
      (rect.top + rect.height / 2) /
      window.innerHeight;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: {
        x,
        y,
      },
      colors: [
        "#10b981",
        "#22c55e",
        "#4ade80",
        "#fbbf24",
        "#f59e0b",
      ],
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
  }, [
    signal.tp3_hit,
    triggerConfetti,
  ]);

  /*
   * ============================================================
   * TP / SL PRICE LOGIC
   * ============================================================
   */

  const hasTPReached = (
    current: number,
    target: number
  ) => {
    if (
      current <= 0 ||
      target <= 0
    ) {
      return false;
    }

    return isBuy
      ? current >= target
      : current <= target;
  };

  const hasSLReached = (
    current: number,
    sl: number
  ) => {
    if (
      current <= 0 ||
      sl <= 0
    ) {
      return false;
    }

    return isBuy
      ? current <= sl
      : current >= sl;
  };

  /*
   * ============================================================
   * AUTO TP / SL UPDATE
   * ============================================================
   */

  const primedForChecksRef = useRef(false);
  const slBreachStreakRef = useRef(0);

  useEffect(() => {
    if (
      !isOpen ||
      !currentPriceNum ||
      parsedEntryPrice <= 0
    ) {
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
      const updates: Record<
        string,
        boolean | string | null
      > = {};

      const entryPrice =
        parsedEntryPrice;

      const tp1Price =
        signal.tp1
          ? parseEntryPrice(signal.tp1)
          : 0;

      const tp2Price =
        signal.tp2
          ? parseEntryPrice(signal.tp2)
          : 0;

      const tp3Price =
        signal.tp3
          ? parseEntryPrice(signal.tp3)
          : 0;

      const tp4Price =
        signal.tp4
          ? parseEntryPrice(signal.tp4)
          : 0;

      const slPrice =
        signal.sl
          ? parseEntryPrice(signal.sl)
          : 0;

      if (
        !signal.tp1_hit &&
        tp1Price > 0 &&
        hasTPReached(
          currentPriceNum,
          tp1Price
        )
      ) {
        updates.tp1_hit = true;

        updates.sl =
          String(entryPrice);

        updates.profit_note =
          "TP 1 Hit ✅ SL moved to B.E";
      }

      if (
        !signal.tp2_hit &&
        tp2Price > 0 &&
        hasTPReached(
          currentPriceNum,
          tp2Price
        )
      ) {
        updates.tp2_hit = true;

        updates.profit_note =
          "TP 2 Hit ✅ More Profit Secured 💰";
      }

      if (
        !signal.tp3_hit &&
        tp3Price > 0 &&
        hasTPReached(
          currentPriceNum,
          tp3Price
        )
      ) {
        updates.tp3_hit = true;

        updates.profit_note =
          "TP 3 Hit 🎊 Maximum Profit Secured ✅";

        if (!signal.tp4) {
          updates.signal_status =
            "close";

          updates.status =
            "CLOSED";
        }
      }

      if (
        !signal.tp4_hit &&
        tp4Price > 0 &&
        hasTPReached(
          currentPriceNum,
          tp4Price
        )
      ) {
        updates.tp4_hit = true;

        updates.signal_status =
          "close";

        updates.status =
          "CLOSED";

        updates.profit_note =
          "TP 4 Final Target Hit 🎊 Maximum Profit Secured ✅";
      }

      const effectiveTP1 =
        !!signal.tp1_hit ||
        !!updates.tp1_hit;

      const effectiveSL =
        updates.sl
          ? parseEntryPrice(
              String(updates.sl)
            )
          : slPrice;

      const slBreachThisTick =
        !signal.sl_hit &&
        effectiveSL > 0 &&
        hasSLReached(
          currentPriceNum,
          effectiveSL
        );

      slBreachStreakRef.current = slBreachThisTick
        ? slBreachStreakRef.current + 1
        : 0;

      if (
        slBreachThisTick &&
        slBreachStreakRef.current >= 2
      ) {
        updates.signal_status =
          "close";

        updates.status =
          "CLOSED";

        if (effectiveTP1) {
          updates.sl_hit = false;

          updates.profit_note =
            "Signal Closed at Breakeven after TP1 ✅";
        } else {
          updates.sl_hit = true;

          updates.profit_note =
            "SL Hit ❌ - Staying patient for a better entry.";
        }
      }

      if (
        !cancelled &&
        Object.keys(updates).length > 0
      ) {
        await supabase
          .from("signals")
          .update(updates)
          .eq("id", signal.id);
      }
    };

    checkAndUpdate();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    currentPriceNum,
    parsedEntryPrice,
    signal.id,
    signal.type,
    signal.tp1,
    signal.tp2,
    signal.tp3,
    signal.tp4,
    signal.sl,
    signal.tp1_hit,
    signal.tp2_hit,
    signal.tp3_hit,
    signal.tp4_hit,
    signal.sl_hit,
  ]);

  /*
   * ============================================================
   * TIME FORMATTING
   * ============================================================
   */

  const formatRealTime = (
    dateString: string
  ) => {
    try {
      if (!dateString) return "Just now";

      const rawDate = new Date(dateString);
      const utcDate =
        dateString.endsWith("Z") || dateString.includes("+")
          ? rawDate
          : new Date(dateString + "Z");

      const formattedTime = format(utcDate, "hh:mm a");

      if (
        isClosed ||
        signal.sl_hit ||
        signal.tp4_hit ||
        (!signal.tp4 && signal.tp3_hit)
      ) {
        return `Closed at ${formattedTime}`;
      }

      return formattedTime;
    } catch {
      return "Just now";
    }
  };

  /*
   * ============================================================
   * STATUS STYLING
   * ============================================================
   */

  const note =
    signal.profit_note || "";

  const noteUpper =
    note.toUpperCase();

  const getSignalStatus = () => {
    if (isClosed || signal.sl_hit || signal.tp4_hit || (!signal.tp4 && signal.tp3_hit)) {
      return "CLOSED";
    }
    if (isPending) {
      return "PENDING";
    }
    return "OPEN";
  };

  const statusText =
    getSignalStatus();

  const getStatusStyle = () => {
    switch (statusText) {
      case "CLOSED":
        return "bg-rose-500/15 border-rose-500/40 text-rose-500 dark:text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]";

      case "OPEN":
        return "bg-emerald-500/15 border-emerald-500/40 text-emerald-500 dark:text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]";

      case "PENDING":
        return "bg-amber-500/15 border-amber-500/40 text-amber-500 dark:text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]";

      default:
        return "bg-cyan-500/15 border-cyan-500/40 text-cyan-500 dark:text-cyan-400";
    }
  };

  /*
   * ============================================================
   * TP / SL COLORS & STEPPER PROGRESS
   * ============================================================
   */

  const getTargetColor = (
    targetType:
      | "sl"
      | "tp1"
      | "tp2"
      | "tp3"
      | "tp4"
  ) => {
    if (targetType === "sl") {
      const slMovedToBE =
        !!signal.tp1_hit ||
        noteUpper.includes("BREAKEVEN") ||
        noteUpper.includes("B.E");

      if (slMovedToBE) {
        return "text-amber-500 dark:text-amber-400 font-bold";
      }

      return "text-rose-500 dark:text-rose-400";
    }

    const hitMap = {
      tp1: !!signal.tp1_hit,
      tp2: !!signal.tp2_hit,
      tp3: !!signal.tp3_hit,
      tp4: !!signal.tp4_hit,
    };

    return hitMap[targetType]
      ? "text-emerald-500 dark:text-emerald-400 font-bold drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]"
      : "text-slate-700 dark:text-cyan-300/80";
  };

  /*
   * ============================================================
   * PROFIT NOTE STYLES
   * ============================================================
   */

  // FIX: check breakeven text FIRST. `signal.sl_hit` is TRUE even on a
  // breakeven exit (the SL was technically hit — just at entry price),
  // so checking sl_hit before the breakeven text was making every
  // breakeven close show up as a red "SL Hit" loss.
  const isBreakEven =
    /BREAKEVEN/i.test(note) || /B\.E/i.test(note);

  const isSLHit =
    !isBreakEven &&
    (!!signal.sl_hit || /\bSL\s+HIT\b/i.test(note));

  const isFullTPWin =
    !isBreakEven &&
    (/MAXIMUM PROFIT/i.test(note) ||
      /TP\s*[34]\s*(HIT|FINAL)/i.test(note));

  const isPartialSecured =
    !isBreakEven &&
    !isSLHit &&
    !isFullTPWin &&
    /SECURED/i.test(note);

  const isTPHit =
    !isSLHit &&
    !isBreakEven &&
    (isFullTPWin ||
      isPartialSecured ||
      /TP\s*[1-4]\s*(HIT|CLEARED|FINAL|TARGET)/i.test(note));

  const getNoteStyle = () => {
    // Real loss — SL hit with no prior TP (red)
    if (isSLHit) {
      return {
        container:
          "border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/20 shadow-[0_0_10px_rgba(244,63,94,0.15)]",
        icon:
          "text-rose-500 dark:text-rose-400",
        text:
          "text-rose-600 dark:text-rose-300",
      };
    }

    // Closed at breakeven after a TP — navy blue (not sky blue)
    if (isBreakEven) {
      return {
        container:
          "border-blue-700/40 bg-blue-900/15 dark:bg-blue-950/40 shadow-[0_0_10px_rgba(30,64,175,0.3)]",
        icon:
          "text-blue-500 dark:text-blue-300",
        text:
          "text-blue-700 dark:text-blue-200",
      };
    }

    // Full target (TP3/TP4) win — green
    if (isFullTPWin) {
      return {
        container:
          "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
        icon:
          "text-emerald-500 dark:text-emerald-400",
        text:
          "text-emerald-700 dark:text-emerald-300",
      };
    }

    // Partial TP secured then closed early (e.g. expiry) — yellow
    if (isPartialSecured || isTPHit) {
      return {
        container:
          "border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]",
        icon:
          "text-amber-500 dark:text-amber-400",
        text:
          "text-amber-600 dark:text-amber-300",
      };
    }

    // Anything else (e.g. "Signal Expired - No Targets Hit") — neutral
    // blue-gray, never plain white/black.
    return {
      container:
        "border-slate-500/30 bg-slate-500/10 dark:bg-slate-800/30",
      icon:
        "text-slate-400 dark:text-slate-400",
      text:
        "text-slate-500 dark:text-slate-300",
    };
  };

  const noteStyle = getNoteStyle();
  const pairUpper = signal.pair?.toUpperCase() || "";

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative mb-3 w-full rounded-[16px] p-3 transition-all duration-300 overflow-hidden border backdrop-blur-md shadow-lg",
        /* LIGHT MODE: Halka Soft Green Gradient */
      "bg-gradient-to-br from-[#f8fcfa] via-[#f3f9f6] to-[#ffffff] border-emerald-500/20 shadow-emerald-900/5",
        /* DARK MODE: 3D Glowing Deep Navy Blue Gradient */
        "dark:bg-gradient-to-br dark:from-[#0c182b] dark:via-[#09111e] dark:to-[#04080f] dark:border-cyan-500/20 dark:shadow-[0_8px_25px_rgba(0,0,0,0.6)]",
        /* HOVER EFFECTS */
        "hover:scale-[1.01] hover:border-emerald-500/40 dark:hover:border-cyan-400/50 dark:hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
      )}
    >
      {/* 3D Top Glow Accent Line */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 h-[2px]",
          isBuy 
            ? "bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80" 
            : "bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-80"
        )} 
      />

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="flex items-center justify-between mb-2">

        {/* LEFT */}
        <div className="flex items-center gap-2 min-w-0">

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-yellow-600/10 text-xs shadow-[0_0_10px_rgba(245,158,11,0.2)]">
            {pairUpper.includes("XAU")
              ? "🪙"
              : pairUpper.includes("BTC")
                ? "₿"
                : "💶"}
          </div>

          <div className="flex flex-col min-w-0">

            <div className="flex items-center gap-1.5">

              <h3 className="text-xs font-black tracking-wide text-slate-800 dark:text-cyan-50 leading-tight">
                {signal.pair.replace("/", "")}
              </h3>

              {isNewSignal && !isLocked && (
                <span className="animate-pulse bg-gradient-to-r from-emerald-500 to-teal-400 px-1.5 py-[1px] rounded-full text-[6.5px] font-black text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                  NEW
                </span>
              )}

              {signal.is_premium && (
                <Crown className="h-3.5 w-3.5 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)] shrink-0" />
              )}

            </div>

            <p className="text-[8px] font-semibold text-slate-500 dark:text-cyan-300/60 leading-tight">
              {pairUpper.includes("XAU")
                ? "Gold"
                : pairUpper.includes("BTC")
                  ? "Bitcoin"
                  : "Forex"}
            </p>

          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 shrink-0">

          {/* STATUS */}
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-[2.5px] text-[7px] font-black uppercase tracking-wider leading-none backdrop-blur-md",
              getStatusStyle()
            )}
          >
            <span
              className={cn(
                "mr-1 h-1.5 w-1.5 rounded-full animate-pulse",
                statusText === "CLOSED"
                  ? "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]"
                  : statusText === "OPEN"
                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                    : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
              )}
            />
            {statusText}
          </span>

          {/* TIME */}
          <div className="flex items-center gap-1 text-[8px] font-medium text-slate-500 dark:text-cyan-200/50 bg-black/5 dark:bg-cyan-950/40 px-2 py-1 rounded-lg border border-black/5 dark:border-cyan-500/10">
            <Clock className="h-2.5 w-2.5 text-emerald-600 dark:text-cyan-400" />
            <span>{formatRealTime(signalTime)}</span>
          </div>

        </div>
      </div>

      {/* ======================================================
          PREMIUM LOCKED VIEW
          ====================================================== */}

      {isLocked ? (
        <div 
          onClick={() => navigate("/premium")}
          className="flex flex-col items-center justify-center gap-2 py-5 bg-emerald-500/5 dark:bg-cyan-950/30 hover:bg-emerald-500/10 dark:hover:bg-cyan-900/40 active:scale-[0.98] rounded-[12px] border border-dashed border-emerald-500/30 dark:border-cyan-500/30 cursor-pointer transition-all duration-200 select-none shadow-inner"
        >
          <div className="p-2 rounded-full bg-amber-500/10 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
            <Lock className="h-4 w-4 text-amber-400 pointer-events-none" />
          </div>

          <span className="text-[10px] font-bold tracking-wide text-slate-700 dark:text-cyan-200 pointer-events-none">
            🔒 Premium Signal - Tap to Unlock
          </span>
        </div>
      ) : (
        <>
          {/* ==================================================
              PRICES BLOCK WITH MINI CANDLESTICK / SPARKLINE CHART
              ================================================== */}

          <div className="flex items-center justify-between rounded-[12px] bg-white/70 dark:bg-[#07101d]/80 border border-emerald-500/15 dark:border-cyan-500/15 px-2.5 py-2 mb-2 shadow-inner">

            {/* ENTRY */}
            <div className="flex flex-col">
              <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400 dark:text-cyan-300/50">
                Entry
              </span>
              <span className="font-mono text-[11px] font-black text-slate-800 dark:text-cyan-100">
                {signal.entry}
              </span>
            </div>

            {/* CURRENT */}
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400 dark:text-cyan-300/50">
                Current
              </span>
              <span
                className={cn(
                  "font-mono text-[11.5px] font-black transition-colors duration-200",
                  currentPriceColor
                )}
              >
                {currentPriceNum > 0
                  ? currentPriceNum.toFixed(2)
                  : signal.entry}
              </span>
            </div>

            {/* MINI CHART VISUAL (AS IN IMAGE) */}
            <div className="hidden sm:flex items-center h-6 w-12 px-1">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 50 20">
                <path
                  d={isBuy ? "M 0 15 Q 12 18, 25 8 T 50 3" : "M 0 3 Q 12 2, 25 12 T 50 17"}
                  fill="none"
                  stroke={isBuy ? "#10b981" : "#f43f5e"}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* TYPE / P&L */}
            <div className="flex flex-col items-end gap-0.5">
              <span
                className={cn(
                  "rounded-md px-2 py-[1.5px] text-[7px] font-black uppercase tracking-wider shadow-sm",
                  isBuy
                    ? "bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    : "bg-rose-500 text-white dark:bg-rose-500/20 dark:text-rose-300 dark:border dark:border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                )}
              >
                {signal.type.toUpperCase()}
              </span>

              {runningPL !== null ? (
                <span
                  className={cn(
                    "font-mono text-[8.5px] font-extrabold drop-shadow-sm",
                    runningPL > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : runningPL < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-400 dark:text-cyan-300/60"
                  )}
                >
                  {runningPL > 0
                    ? `+${runningPL.toFixed(1)} pips`
                    : runningPL < 0
                      ? `${runningPL.toFixed(1)} pips`
                      : "0.0 pips"}
                </span>
              ) : (
                signal.risk_level && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-[7px] font-bold",
                      signal.risk_level === "High"
                        ? "text-rose-500 dark:text-rose-400"
                        : signal.risk_level === "Medium"
                          ? "text-amber-500 dark:text-amber-400"
                          : "text-emerald-500 dark:text-emerald-400"
                    )}
                  >
                    <AlertCircle className="h-2.5 w-2.5" />
                    {signal.risk_level}
                  </span>
                )
              )}

            </div>
          </div>

          {/* ==================================================
              TARGETS BLOCK + GLOWING STEPPER PROGRESS BAR
              ================================================== */}

          <div className="flex flex-col gap-1 px-1 mb-2">
            <div className="flex items-center justify-between text-[7px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-cyan-300/40">
              <span>Stop Loss</span>
              <span>Target 1</span>
              {signal.tp2 && <span>Target 2</span>}
              {signal.tp3 && <span>Target 3</span>}
              {signal.tp4 && <span>Target 4</span>}
            </div>

            <div className="flex items-center justify-between font-mono text-[10.5px]">
              <span className={getTargetColor("sl")}>{signal.sl}</span>
              <span className={getTargetColor("tp1")}>{signal.tp1}</span>
              {signal.tp2 && <span className={getTargetColor("tp2")}>{signal.tp2}</span>}
              {signal.tp3 && <span className={getTargetColor("tp3")}>{signal.tp3}</span>}
              {signal.tp4 && <span className={getTargetColor("tp4")}>{signal.tp4}</span>}
            </div>

            {/* Glowing Stepper Progress Line (Exact Frame Replica) */}
            <div className="relative mt-1 flex items-center justify-between">
              <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-slate-300 dark:bg-cyan-950" />
              <div 
                className={cn(
                  "absolute left-0 top-1/2 h-[2px] -translate-y-1/2 transition-all duration-500",
                  signal.tp3_hit ? "w-full" : signal.tp2_hit ? "w-3/4" : signal.tp1_hit ? "w-1/2" : "w-1/4",
                  // FIX: dots are always laid out SL (red) -> TP1 -> TP2 -> TP3
                  // (green) for BOTH buy and sell signals. The line color must
                  // match that fixed layout and never flip by direction — a sell
                  // signal was showing green on the SL side and red on the TP
                  // side, which is backwards (red = SL, green = TP, always).
                  "bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400"
                )} 
              />
              
              {/* SL Node Dot */}
              <div className={cn("relative z-10 h-2.5 w-2.5 rounded-full border-2 border-slate-900", signal.sl_hit ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" : "bg-rose-500/50")} />
              
              {/* TP1 Node Dot */}
              <div className={cn("relative z-10 h-2.5 w-2.5 rounded-full border-2 border-slate-900", signal.tp1_hit ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-emerald-500/30")} />
              
              {/* TP2 Node Dot */}
              {signal.tp2 && <div className={cn("relative z-10 h-2.5 w-2.5 rounded-full border-2 border-slate-900", signal.tp2_hit ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-emerald-500/30")} />}
              
              {/* TP3 Node Dot */}
              {signal.tp3 && <div className={cn("relative z-10 h-2.5 w-2.5 rounded-full border-2 border-slate-900", signal.tp3_hit ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "bg-cyan-500/30")} />}
              
              {/* TP4 Node Dot */}
              {signal.tp4 && <div className={cn("relative z-10 h-2.5 w-2.5 rounded-full border-2 border-slate-900", signal.tp4_hit ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "bg-cyan-500/30")} />}
            </div>
          </div>

          {/* ==================================================
              PROFIT / STATUS NOTE
              ================================================== */}

          {signal.profit_note && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-all duration-300 backdrop-blur-md",
                noteStyle.container
              )}
            >
              {isSLHit ? (
                <XCircle
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]",
                    noteStyle.icon
                  )}
                />
              ) : (
                <CheckCircle2
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]",
                    noteStyle.icon
                  )}
                />
              )}

              <span
                className={cn(
                  "text-[9.5px] font-bold leading-tight tracking-wide",
                  noteStyle.text
                )}
              >
                {signal.profit_note}
              </span>
            </div>
          )}

        </>
      )}
    </div>
  );
};

export default SignalCardNew;
