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
  const [expanded, setExpanded] = useState(false);

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
   * RENDER
   * ============================================================
   */

  const tpStatus = (index: 1 | 2 | 3 | 4) => {
    if (index === 1) return signal.tp1_hit ? "HIT" : "RUNNING";
    if (index === 2) {
      if (!signal.tp2) return null;
      return signal.tp2_hit ? "HIT" : signal.tp1_hit ? "RUNNING" : null;
    }
    if (index === 3) {
      if (!signal.tp3) return null;
      return signal.tp3_hit ? "HIT" : signal.tp2_hit ? "RUNNING" : null;
    }
    if (!signal.tp4) return null;
    return signal.tp4_hit ? "HIT" : signal.tp3_hit ? "RUNNING" : null;
  };

  const levelCard = (
    label: string,
    value: string | undefined,
    status: string | null,
    kind: "entry" | "tp" | "sl"
  ) => {
    if (!value) return null;
    const isHit = status === "HIT";
    const isRunning = status === "RUNNING";
    return (
      <div className={cn(
        "flex items-center justify-between rounded-2xl border px-4 py-3.5 min-h-[76px] transition-all",
        kind === "entry" && "border-cyan-400/55 bg-cyan-950/20 shadow-[0_0_18px_rgba(34,211,238,0.10)]",
        kind === "tp" && isRunning && "border-emerald-400/70 bg-emerald-950/25 shadow-[0_0_20px_rgba(16,185,129,0.16)]",
        kind === "tp" && isHit && "border-emerald-400/45 bg-emerald-950/15",
        kind === "tp" && !isRunning && !isHit && "border-cyan-800/70 bg-slate-950/35",
        kind === "sl" && "border-rose-500/65 bg-rose-950/20 shadow-[0_0_18px_rgba(244,63,94,0.12)]"
      )}>
        <div>
          <div className={cn(
            "text-xs font-black uppercase tracking-wider",
            kind === "entry" ? "text-cyan-300" : kind === "tp" ? "text-emerald-300" : "text-rose-300"
          )}>{label}</div>
          <div className="mt-1 font-mono text-[25px] font-black leading-none text-white">{value}</div>
        </div>
        {kind === "sl" ? (
          <div className="text-right font-mono text-sm font-black text-rose-400">-1.00R</div>
        ) : status ? (
          <div className={cn(
            "rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide",
            isRunning && "border-emerald-400/60 bg-emerald-400/10 text-emerald-300",
            isHit && "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
          )}>
            {isRunning ? "◔ RUNNING" : "✓ HIT"}
          </div>
        ) : (
          <div className="font-mono text-2xl font-bold text-slate-500">—</div>
        )}
      </div>
    );
  };

  const riskDistance = parsedEntryPrice > 0 && signal.sl ? Math.abs(parsedEntryPrice - parseEntryPrice(signal.sl)) : 0;
  const finalTP = signal.tp3 || signal.tp2 || signal.tp1;
  const rewardDistance = parsedEntryPrice > 0 && finalTP ? Math.abs(parseEntryPrice(finalTP) - parsedEntryPrice) : 0;
  const rewardRisk = riskDistance > 0 ? rewardDistance / riskDistance : 0;

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative mb-4 w-full overflow-hidden rounded-[24px] border backdrop-blur-xl transition-all duration-300",
        "bg-gradient-to-br from-[#061b2a] via-[#07111e] to-[#02070d]",
        isBuy
          ? "border-emerald-400/45 shadow-[0_0_32px_rgba(16,185,129,0.10)]"
          : "border-rose-400/45 shadow-[0_0_32px_rgba(244,63,94,0.10)]"
      )}
    >
      <div className={cn(
        "absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent to-transparent",
        isBuy ? "via-emerald-400" : "via-rose-500"
      )} />

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="relative flex w-full items-center gap-3 px-4 py-4 text-left"
        aria-expanded={expanded}
      >
        <div className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-2xl border border-emerald-400/70 bg-gradient-to-br from-amber-400/25 to-yellow-700/5 text-3xl shadow-[0_0_22px_rgba(245,158,11,0.20)]">
          {pairUpper.includes("XAU") ? "🪙" : pairUpper.includes("BTC") ? "₿" : "💱"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[24px] font-black leading-none tracking-wide text-white">
              {signal.pair.replace("/", "")}
            </span>
            <span className={cn(
              "rounded-xl border px-3 py-1 text-xs font-black",
              isBuy ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300" : "border-rose-400/60 bg-rose-500/15 text-rose-300"
            )}>{isBuy ? "↗ BUY" : "↘ SELL"}</span>
          </div>
          <div className="mt-1 text-xs font-semibold text-cyan-200/65">
            {pairUpper.includes("XAU") ? "Gold Spot" : pairUpper.includes("BTC") ? "Bitcoin" : "Forex"}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-xs font-bold">
            <span className="text-emerald-300">↗ Strong Bullish</span>
            <span className="text-cyan-300/50">|</span>
            <span className="text-cyan-200/75">M5</span>
          </div>
        </div>

        <div className="hidden min-[480px]:block border-l border-emerald-400/30 pl-5 pr-2">
          <div className="text-xs font-black uppercase tracking-wider text-cyan-300">ENTRY</div>
          <div className="mt-1 font-mono text-[27px] font-black leading-none text-white">{signal.entry}</div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-black",
            statusText === "CLOSED" ? "border-rose-400/60 bg-rose-500/10 text-rose-300" : "border-emerald-400/60 bg-emerald-500/10 text-emerald-300"
          )}>● {statusText === "CLOSED" ? "CLOSED" : "ACTIVE"}</div>
          <div className={cn(
            "grid h-10 w-10 place-items-center rounded-full border text-2xl transition-transform",
            expanded && "rotate-180",
            "border-cyan-400/40 bg-cyan-950/40 text-cyan-200"
          )}><ChevronDown /></div>
        </div>
      </button>

      <div className="flex items-center justify-between border-t border-cyan-400/10 px-5 py-2 text-[11px] text-cyan-200/50 min-[480px]:hidden">
        <span>ENTRY</span><span className="font-mono text-base font-black text-white">{signal.entry}</span>
      </div>

      {expanded && (
        <div className="border-t border-cyan-400/20 p-4 md:p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
            <div className="rounded-2xl border border-cyan-500/35 bg-[#04131f]/90 p-4">
              <div className="mb-3 text-xs font-black uppercase tracking-widest text-cyan-300/70">MARKET TREND</div>
              <div className="h-[145px] rounded-xl border border-cyan-900/60 bg-[#031019] p-2">
                <svg viewBox="0 0 400 150" className="h-full w-full" preserveAspectRatio="none">
                  <polyline points="5,125 35,112 60,118 85,92 110,101 138,75 165,82 190,57 220,65 245,43 275,51 300,30 330,40 360,18 395,5" fill="none" stroke="currentColor" className="text-emerald-400" strokeWidth="4" />
                </svg>
              </div>
              <div className="mt-4 text-lg font-black text-emerald-300">↗ UPTREND</div>
              <div className="mt-4 border-t border-cyan-900/60 pt-3">
                <div className="text-xs text-cyan-200/55">Strategy</div>
                <div className="mt-1 font-bold text-white">Pullback Entry</div>
              </div>
            </div>

            <div className="space-y-3">
              {levelCard("ENTRY", signal.entry, "BASE", "entry")}
              {levelCard("⚑ TP 1", signal.tp1, tpStatus(1), "tp")}
              {levelCard("⚑ TP 2", signal.tp2, tpStatus(2), "tp")}
              {levelCard("⚑ TP 3", signal.tp3, tpStatus(3), "tp")}
              {levelCard("🛡 SL", signal.sl, null, "sl")}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#03111a] sm:grid-cols-3">
            <div className="p-4 sm:border-r border-cyan-900/60"><div className="text-xs text-cyan-200/60">Risk</div><div className="mt-1 text-2xl font-black text-white">{riskDistance ? `$${riskDistance.toFixed(2)}` : "—"}</div></div>
            <div className="p-4 sm:border-r border-cyan-900/60"><div className="text-xs text-cyan-200/60">Potential Profit</div><div className="mt-1 text-2xl font-black text-emerald-300">{rewardDistance ? `$${rewardDistance.toFixed(2)}` : "—"}</div><div className="text-xs text-cyan-200/50">(TP3)</div></div>
            <div className="p-4"><div className="text-xs text-cyan-200/60">Reward : Risk</div><div className="mt-1 text-2xl font-black text-emerald-300">{rewardRisk ? `${rewardRisk.toFixed(1)} : 1` : "—"}</div></div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl border border-cyan-500/25 bg-[#031019] px-4 py-3 text-xs font-bold text-cyan-100/70">
            <span>⚡ Trade with Plan &nbsp; | &nbsp; 🛡 Manage Risk &nbsp; | &nbsp; 📈 Grow Your Account</span>
            <button type="button" onClick={() => setExpanded(false)} className="rounded-full border border-emerald-400/60 px-4 py-2 text-emerald-300">⌃ Hide Details</button>
          </div>

          {signal.profit_note && (
            <div className={cn("mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold", noteStyle.container, noteStyle.text)}>
              {isSLHit ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {signal.profit_note}
            </div>
          )}
        </div>
      )}
    </div>
  );

export default SignalCardNew;
