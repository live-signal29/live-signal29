iimport { useEffect, useState, useRef, useCallback } from "react";
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
  const [isExpanded, setIsExpanded] = useState(false);

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

  // BUG FIX: calculateRunningPL() returns an object
  // ({ value, isProfit, formatted }), but runningPL was being used
  // everywhere below as if it were a plain number (`runningPL > 0`,
  // `runningPL.toFixed(1)`). Comparing an object to a number is
  // never true, so the live pip counter under Buy/Sell always fell
  // through to a hardcoded "0.0 pips" instead of the real live
  // pip count. Pulling out `.value` here fixes it everywhere below
  // with no other changes needed.
  const runningPL =
    entryTouched &&
    currentPriceNum > 0 &&
    parsedEntryPrice > 0
      ? calculateRunningPL(
          currentPriceNum,
          parsedEntryPrice,
          signal.type
        ).value
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
   * REDESIGNED COLLAPSIBLE SIGNAL CARD
   * ============================================================
   */

  const tp1Price = signal.tp1 ? parseEntryPrice(signal.tp1) : 0;
  const tp2Price = signal.tp2 ? parseEntryPrice(signal.tp2) : 0;
  const tp3Price = signal.tp3 ? parseEntryPrice(signal.tp3) : 0;
  const slPrice = signal.sl ? parseEntryPrice(signal.sl) : 0;

  const getTargetState = (target: "tp1" | "tp2" | "tp3") => {
    const hit = target === "tp1" ? signal.tp1_hit
      : target === "tp2" ? signal.tp2_hit
      : signal.tp3_hit;

    if (hit) return "hit";

    if (target === "tp1") return "running";
    if (target === "tp2") return signal.tp1_hit ? "running" : "pending";
    if (target === "tp3") return signal.tp2_hit ? "running" : "pending";

    return "pending";
  };

  const targetStateClass = (state: string) => {
    if (state === "hit") {
      return "border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_18px_rgba(16,185,129,0.16)]";
    }
    if (state === "running") {
      return "border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_22px_rgba(16,185,129,0.14)]";
    }
    return "border-slate-700/80 bg-slate-900/60";
  };

  const targetStatus = (state: string) => {
    if (state === "hit") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" /> HIT
        </span>
      );
    }

    if (state === "running") {
      return (
        <span className="inline-flex animate-pulse items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
          RUNNING
        </span>
      );
    }

    return <span className="text-base font-black text-slate-500">—</span>;
  };

  const riskDistance = Math.abs(parsedEntryPrice - slPrice);
  const tp3Reward = tp3Price > 0 ? Math.abs(tp3Price - parsedEntryPrice) : 0;
  const maxRR = riskDistance > 0 && tp3Reward > 0 ? tp3Reward / riskDistance : 0;

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative mb-4 w-full overflow-hidden rounded-[24px] border backdrop-blur-xl transition-all duration-300",
        "bg-gradient-to-br from-[#061a22] via-[#07121d] to-[#02080f]",
        "border-cyan-500/35 shadow-[0_10px_40px_rgba(0,0,0,0.55),inset_0_0_35px_rgba(0,180,220,0.035)]",
        isExpanded
          ? "shadow-[0_0_32px_rgba(0,200,255,0.14)]"
          : "hover:border-emerald-400/55 hover:shadow-[0_0_25px_rgba(0,255,180,0.12)]"
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-[3px]",
          isBuy
            ? "bg-gradient-to-r from-transparent via-cyan-400 to-emerald-400"
            : "bg-gradient-to-r from-transparent via-cyan-400 to-rose-500"
        )}
      />

      {/* ================= COLLAPSED / HEADER ================= */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        className="group flex w-full items-center gap-3 px-4 py-4 text-left sm:px-5 sm:py-5"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-400/60 bg-gradient-to-br from-amber-400/20 via-yellow-500/10 to-black/20 text-3xl shadow-[0_0_18px_rgba(245,158,11,0.22)]">
          {pairUpper.includes("XAU") ? "🥇" : pairUpper.includes("BTC") ? "₿" : "💶"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black tracking-wide text-white sm:text-2xl">
              {signal.pair.replace("/", "")}
            </h3>

            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider",
                isBuy
                  ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.18)]"
                  : "border-rose-400/60 bg-rose-500/15 text-rose-300"
              )}
            >
              ↗ {signal.type.toUpperCase()}
            </span>

            {signal.is_premium && (
              <Crown className="h-4 w-4 text-amber-400 drop-shadow-[0_0_7px_rgba(245,158,11,0.7)]" />
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-cyan-200/65">
            <span>{pairUpper.includes("XAU") ? "Gold Spot" : pairUpper.includes("BTC") ? "Bitcoin" : "Forex"}</span>
            <span className="text-cyan-500/40">•</span>
            <span className="text-emerald-300">↗ Strong Bullish</span>
            <span className="text-cyan-500/40">•</span>
            <span>M5</span>
          </div>
        </div>

        <div className="hidden min-w-[145px] border-l border-emerald-400/25 pl-5 sm:block">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300/60">
            ENTRY
          </div>
          <div className="mt-0.5 font-mono text-2xl font-black tracking-tight text-white sm:text-[28px]">
            {signal.entry}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wider",
              getStatusStyle()
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                statusText === "CLOSED"
                  ? "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.9)]"
                  : statusText === "PENDING"
                    ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                    : "animate-pulse bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
              )}
            />
            {statusText}
          </span>

          <span
            className={cn(
              "grid h-11 w-11 place-items-center rounded-full border text-2xl transition-all duration-300",
              "border-cyan-400/40 bg-cyan-950/50 text-cyan-200",
              "group-hover:border-emerald-400/70 group-hover:text-emerald-300",
              isExpanded && "rotate-180 border-emerald-400/70 text-emerald-300"
            )}
          >
            ⌄
          </span>
        </div>
      </button>

      {/* Mobile entry */}
      <div className="flex items-center justify-between border-t border-cyan-500/10 px-4 py-2.5 sm:hidden">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300/55">ENTRY</span>
        <span className="font-mono text-xl font-black text-white">{signal.entry}</span>
      </div>

      {/* ================= FULL DETAILS ================= */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-500 ease-out",
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {isLocked ? (
            <div className="border-t border-cyan-500/15 p-6">
              <div
                onClick={() => navigate("/premium")}
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-amber-400/30 bg-amber-400/5 py-8 transition hover:bg-amber-400/10"
              >
                <Lock className="h-7 w-7 text-amber-400" />
                <span className="text-sm font-bold text-cyan-100">Premium Signal — Tap to Unlock</span>
              </div>
            </div>
          ) : (
            <div className="border-t border-cyan-500/20 p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.55fr]">

                {/* MARKET / ENTRY PANEL */}
                <div className="rounded-2xl border border-cyan-500/35 bg-[#03131b]/90 p-4 shadow-inner sm:p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-300/65">MARKET TREND</span>
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[9px] font-black text-emerald-300">UPTREND</span>
                  </div>

                  <div className="relative h-36 overflow-hidden rounded-xl border border-cyan-500/15 bg-[#020b12] p-2">
                    <svg viewBox="0 0 500 160" className="h-full w-full">
                      <defs>
                        <linearGradient id={`area-${signal.id}`} x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity=".30" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 140 L35 126 L70 130 L105 106 L140 112 L175 88 L210 96 L245 68 L280 76 L315 53 L350 61 L385 40 L420 47 L455 22 L500 7 L500 160 L0 160Z"
                        fill={`url(#area-${signal.id})`}
                      />
                      <polyline
                        points="0,140 35,126 70,130 105,106 140,112 175,88 210,96 245,68 280,76 315,53 350,61 385,40 420,47 455,22 500,7"
                        fill="none"
                        stroke="#19f5a5"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-cyan-200/55">Trend</div>
                      <div className="mt-1 text-lg font-black text-emerald-300">↗ UPTREND</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-cyan-200/55">Strategy</div>
                      <div className="mt-1 text-sm font-black text-white">{signal.signal_type || "Pullback Entry"}</div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-blue-400/30 bg-blue-500/5 p-4 text-center">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-300/65">ENTRY</div>
                    <div className="mt-1 font-mono text-3xl font-black text-white sm:text-4xl">{signal.entry}</div>
                    {maxRR > 0 && (
                      <div className="mx-auto mt-3 w-fit rounded-full border border-cyan-400/40 bg-cyan-400/5 px-4 py-1 text-xs font-black text-cyan-200">
                        R:R 1:{maxRR.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* TARGET LADDER */}
                <div className="relative flex flex-col gap-2.5">
                  {[
                    { key: "tp1" as const, label: "TP 1", value: signal.tp1, state: getTargetState("tp1") },
                    ...(signal.tp2 ? [{ key: "tp2" as const, label: "TP 2", value: signal.tp2, state: getTargetState("tp2") }] : []),
                    ...(signal.tp3 ? [{ key: "tp3" as const, label: "TP 3", value: signal.tp3, state: getTargetState("tp3") }] : []),
                  ].map((tp) => (
                    <div
                      key={tp.key}
                      className={cn(
                        "relative flex min-h-[72px] items-center justify-between rounded-2xl border px-4 py-3 transition-all sm:min-h-[80px] sm:px-5",
                        targetStateClass(tp.state)
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "grid h-9 w-9 place-items-center rounded-full border text-base font-black",
                            tp.state === "hit" || tp.state === "running"
                              ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300"
                              : "border-slate-600 bg-slate-800/60 text-slate-500"
                          )}
                        >
                          {tp.state === "hit" ? "✓" : "⚑"}
                        </div>
                        <div>
                          <div className={cn(
                            "text-sm font-black uppercase tracking-wider",
                            tp.state === "pending" ? "text-slate-400" : "text-emerald-300"
                          )}>
                            {tp.label}
                          </div>
                          <div className={cn(
                            "mt-1 font-mono text-2xl font-black sm:text-[27px]",
                            tp.state === "pending" ? "text-slate-300" : "text-white"
                          )}>
                            {tp.value}
                          </div>
                        </div>
                      </div>

                      <div>{targetStatus(tp.state)}</div>
                    </div>
                  ))}

                  {/* STOP LOSS */}
                  <div className="flex min-h-[72px] items-center justify-between rounded-2xl border border-rose-500/60 bg-rose-500/10 px-4 py-3 shadow-[0_0_18px_rgba(244,63,94,0.08)] sm:min-h-[80px] sm:px-5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full border border-rose-400/60 bg-rose-500/10 text-rose-300">
                        <XCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black uppercase tracking-wider text-rose-300">STOP LOSS</div>
                        <div className="mt-1 font-mono text-2xl font-black text-white sm:text-[27px]">{signal.sl}</div>
                      </div>
                    </div>
                    <div className="font-mono text-sm font-black text-rose-300">-1.00R</div>
                  </div>
                </div>
              </div>

              {/* SUMMARY */}
              <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                <div className="rounded-2xl border border-cyan-500/25 bg-[#03131b]/90 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300/55">RISK</div>
                  <div className="mt-1 font-mono text-2xl font-black text-white">
                    {riskDistance > 0 ? `$${riskDistance.toFixed(2)}` : "—"}
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/65">TP3 POTENTIAL</div>
                  <div className="mt-1 font-mono text-2xl font-black text-emerald-300">
                    {tp3Reward > 0 ? `$${tp3Reward.toFixed(2)}` : "—"}
                  </div>
                </div>
                <div className="rounded-2xl border border-cyan-500/25 bg-[#03131b]/90 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300/55">REWARD : RISK</div>
                  <div className="mt-1 font-mono text-2xl font-black text-cyan-200">
                    {maxRR > 0 ? `${maxRR.toFixed(2)} : 1` : "—"}
                  </div>
                </div>
              </div>

              {/* EXISTING NOTE */}
              {signal.profit_note && (
                <div className={cn("mt-3 flex items-center gap-2 rounded-xl border px-4 py-3", noteStyle.container)}>
                  {isSLHit ? (
                    <XCircle className={cn("h-5 w-5 shrink-0", noteStyle.icon)} />
                  ) : (
                    <CheckCircle2 className={cn("h-5 w-5 shrink-0", noteStyle.icon)} />
                  )}
                  <span className={cn("text-sm font-bold", noteStyle.text)}>{signal.profit_note}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/5 py-3 text-xs font-black uppercase tracking-wider text-cyan-200 transition hover:border-emerald-400/50 hover:text-emerald-300"
              >
                Hide Details <span className="text-lg">⌃</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignalCardNew;
