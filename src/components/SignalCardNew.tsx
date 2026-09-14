import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lock,
  Crown,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
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
};

/* =========================================================
   MARKET STATUS
   ========================================================= */

const isMarketClosed = (pairSymbol: string) => {
  const upper = (pairSymbol || "").toUpperCase();

  const synthetic =
    /BOOM|CRASH|VOL|VIX|STEP|JUMP|DRIFT|RANGE/.test(upper);

  if (synthetic) return false;

  const crypto =
    /BTC|ETH|SOL|XRP|LTC|ADA|DOGE|BNB/.test(upper);

  if (crypto) return false;

  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();

  if (day === 6) return true;
  if (day === 5 && hour >= 22) return true;
  if (day === 0 && hour < 22) return true;

  return false;
};

/* =========================================================
   COMPONENT
   ========================================================= */

const SignalCardNew = ({
  signal,
  hasAccess,
  subscriptionStatus,
  livePrice,
}: SignalCardProps) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const confettiFiredRef = useRef(false);
  const initialTP3StateRef = useRef(!!signal.tp3_hit);

  const [, forceUpdate] = useState(0);

  /* =======================================================
     REFRESH
     ======================================================= */

  useEffect(() => {
    const interval = window.setInterval(() => {
      forceUpdate((v) => v + 1);
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const marketClosed = isMarketClosed(signal.pair);

  /* =======================================================
     LIFECYCLE
     ======================================================= */

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

  const [showBody, setShowBody] = useState(!isClosed);

  useEffect(() => {
    setShowBody(!isClosed);
  }, [isClosed]);

  /* =======================================================
     ENTRY
     ======================================================= */

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

  const pairUpper =
    signal.pair?.toUpperCase() || "";

  const cleanPair =
    pairUpper.replace(/[^A-Z0-9]/g, "");

  const isBTC =
    cleanPair.includes("BTC");

  /* =======================================================
     CURRENT PRICE
     ======================================================= */

  const currentPriceNum =
    typeof livePrice === "number" && livePrice > 0
      ? livePrice
      : signal.current_price
        ? parseFloat(signal.current_price)
        : 0;

  const previousLivePriceRef =
    useRef<number | null>(null);

  const [
    priceDirection,
    setPriceDirection,
  ] = useState<"up" | "down" | "neutral">(
    "neutral"
  );

  useEffect(() => {
    if (
      typeof livePrice !== "number" ||
      livePrice <= 0
    ) {
      return;
    }

    const previous =
      previousLivePriceRef.current;

    if (previous !== null) {
      if (livePrice > previous) {
        setPriceDirection("up");
      } else if (livePrice < previous) {
        setPriceDirection("down");
      }
    }

    previousLivePriceRef.current =
      livePrice;
  }, [livePrice]);

  const currentPriceColor =
    priceDirection === "down"
      ? "text-rose-500 dark:text-rose-400"
      : priceDirection === "up"
        ? "text-emerald-500 dark:text-emerald-400"
        : "text-emerald-500 dark:text-emerald-400";

  /* =======================================================
     ACCESS
     ======================================================= */

  const userHasValidAccess =
    hasAccess === true;

  const isLocked =
    !!signal.is_premium &&
    !userHasValidAccess &&
    !isClosed;

  /* =======================================================
     TIME
     ======================================================= */

  const signalTime =
    isOpen && signal.activated_at
      ? signal.activated_at
      : signal.created_at;

  const signalAgeMs =
    Date.now() -
    new Date(signal.created_at).getTime();

  const isVeryNewSignal =
    signalAgeMs < 60000;

  const entryTouched =
    isOpen && !isVeryNewSignal;

  /* =======================================================
     RUNNING P/L
     ======================================================= */

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

  /* =======================================================
     CONFETTI
     ======================================================= */

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

    confetti({
      particleCount: 100,
      spread: 70,
      origin: {
        x:
          (rect.left + rect.width / 2) /
          window.innerWidth,
        y:
          (rect.top + rect.height / 2) /
          window.innerHeight,
      },
      colors: [
        "#10b981",
        "#22c55e",
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

  /* =======================================================
     TP / SL HELPERS
     ======================================================= */

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

  const primedForChecksRef =
    useRef(false);

  const slBreachStreakRef =
    useRef(0);

  /* =======================================================
     TP / SL DATABASE LOGIC
     ======================================================= */

  useEffect(() => {
    if (
      !isOpen ||
      !currentPriceNum ||
      parsedEntryPrice <= 0 ||
      marketClosed
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

      const tp1Price = signal.tp1
        ? parseEntryPrice(signal.tp1)
        : 0;

      const tp2Price = signal.tp2
        ? parseEntryPrice(signal.tp2)
        : 0;

      const tp3Price = signal.tp3
        ? parseEntryPrice(signal.tp3)
        : 0;

      const tp4Price = signal.tp4
        ? parseEntryPrice(signal.tp4)
        : 0;

      const originalSLPrice =
        signal.sl
          ? parseEntryPrice(signal.sl)
          : 0;

      /* TP1 */

      if (
        !signal.tp1_hit &&
        tp1Price > 0 &&
        hasTPReached(
          currentPriceNum,
          tp1Price
        )
      ) {
        updates.tp1_hit = true;
        updates.sl = String(entryPrice);
        updates.sl_hit = false;
        updates.profit_note =
          "BOOM 💥 ! TP 1 Hit! 🚀 First Profit Secured ✅";
      }

      /* TP2 */

      if (
        !signal.tp2_hit &&
        tp2Price > 0 &&
        hasTPReached(
          currentPriceNum,
          tp2Price
        )
      ) {
        updates.tp2_hit = true;
        updates.sl = String(entryPrice);
        updates.sl_hit = false;
        updates.profit_note =
          "BOOM! TP 2 Hit Secured! 💰 Enjoy Profit 💵 ✅✅";
      }

      /* TP3 */

      if (
        !signal.tp3_hit &&
        tp3Price > 0 &&
        hasTPReached(
          currentPriceNum,
          tp3Price
        )
      ) {
        updates.tp3_hit = true;
        updates.sl = String(entryPrice);
        updates.sl_hit = false;
        updates.profit_note =
          "AMAZING! TP 3 Hit Final target Hit 🎉 Maximum Profit Secured 💵✅";

        if (!signal.tp4) {
          updates.signal_status = "close";
          updates.status = "CLOSED";
        }
      }

      /* TP4 */

      if (
        !signal.tp4_hit &&
        tp4Price > 0 &&
        hasTPReached(
          currentPriceNum,
          tp4Price
        )
      ) {
        updates.tp4_hit = true;
        updates.signal_status = "close";
        updates.status = "CLOSED";
        updates.sl_hit = false;
        updates.profit_note =
          "AMAZING! TP 4 Hit Final target Hit 🎉 Maximum Profit Secured 💵✅";
      }

      const effectiveTP1 =
        !!signal.tp1_hit ||
        !!updates.tp1_hit;

      const effectiveTP2 =
        !!signal.tp2_hit ||
        !!updates.tp2_hit;

      const effectiveTP3 =
        !!signal.tp3_hit ||
        !!updates.tp3_hit;

      const effectiveTP4 =
        !!signal.tp4_hit ||
        !!updates.tp4_hit;

      const anyTPHit =
        effectiveTP1 ||
        effectiveTP2 ||
        effectiveTP3 ||
        effectiveTP4;

      const effectiveSL =
        updates.sl
          ? parseEntryPrice(
              String(updates.sl)
            )
          : effectiveTP1
            ? entryPrice
            : originalSLPrice;

      const btcAfterTP =
        isBTC && anyTPHit;

      const slBreachThisTick =
        !signal.sl_hit &&
        effectiveSL > 0 &&
        hasSLReached(
          currentPriceNum,
          effectiveSL
        );

      slBreachStreakRef.current =
        slBreachThisTick
          ? slBreachStreakRef.current + 1
          : 0;

      if (
        slBreachThisTick &&
        slBreachStreakRef.current >= 2
      ) {
        updates.signal_status = "close";
        updates.status = "CLOSED";

        if (
          anyTPHit ||
          btcAfterTP
        ) {
          updates.sl_hit = false;
          updates.sl = String(entryPrice);

          if (effectiveTP2) {
            updates.profit_note =
              "Signal Closed at Breakeven after TP2 Hit ✅✅";
          } else if (effectiveTP1) {
            updates.profit_note =
              "Signal Closed at Breakeven after TP1 Hit ✅";
          } else {
            updates.profit_note =
              "Signal Closed at Breakeven after TP Hit ✅";
          }
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
    marketClosed,
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
    isBTC,
  ]);

  /* =======================================================
     TIME
     ======================================================= */

  const formatRealTime = (
    dateString: string
  ) => {
    try {
      if (!dateString) return "Just now";

      const rawDate =
        new Date(dateString);

      const utcDate =
        dateString.endsWith("Z") ||
        dateString.includes("+")
          ? rawDate
          : new Date(
              dateString + "Z"
            );

      return format(
        utcDate,
        "hh:mm a"
      );
    } catch {
      return "Just now";
    }
  };

  /* =======================================================
     HIT STATE
     ======================================================= */

  const anyTPHit =
    !!signal.tp1_hit ||
    !!signal.tp2_hit ||
    !!signal.tp3_hit ||
    !!signal.tp4_hit;

  const isSLHit =
    !!signal.sl_hit &&
    !anyTPHit;

  /* =======================================================
     PROFIT NOTE
     ======================================================= */

  const getDynamicProfitNote = () => {
    if (anyTPHit) {
      if (
        signal.tp3_hit ||
        signal.tp4_hit
      ) {
        return "AMAZING! TP 3 Hit Final target Hit 🎉 Maximum Profit Secured 💵✅";
      }

      if (signal.tp2_hit) {
        return "BOOM! TP 2 Hit Secured! 💰 Enjoy Profit 💵 ✅✅";
      }

      return "BOOM 💥 ! TP 1 Hit! 🚀 First Profit Secured ✅";
    }

    if (
      signal.sl_hit ||
      (
        signal.profit_note &&
        /SL\s*Hit/i.test(
          signal.profit_note
        )
      )
    ) {
      return "SL Hit ❌ - Staying patient for a better entry.";
    }

    return signal.profit_note || "";
  };

  const note =
    getDynamicProfitNote();

  /* =======================================================
     STATUS
     ======================================================= */

  const getSignalStatus = () => {
    if (
      isClosed ||
      signal.tp4_hit ||
      (!signal.tp4 &&
        signal.tp3_hit)
    ) {
      return "CLOSED";
    }

    if (isPending) return "PENDING";

    return "OPEN";
  };

  const statusText =
    getSignalStatus();

  const statusStyle =
    statusText === "CLOSED"
      ? "bg-rose-500/10 border-rose-500/30 text-rose-500 dark:bg-rose-400/10 dark:border-rose-400/25 dark:text-rose-400"
      : statusText === "PENDING"
        ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:bg-amber-400/10 dark:border-amber-400/25 dark:text-amber-400"
        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:bg-emerald-400/10 dark:border-emerald-400/25 dark:text-emerald-400";

  /* =======================================================
     RUNNING STATUS
     ======================================================= */

  const runningText =
    marketClosed
      ? "MARKET CLOSED"
      : "RUNNING";

  const runningColor =
    marketClosed
      ? "text-rose-500 dark:text-rose-400"
      : "text-amber-500 dark:text-amber-400";

  /* =======================================================
     TARGET STATUS
     ======================================================= */

  const targetStatus = (
    hit: boolean | undefined,
    previousHit?: boolean
  ) => {
    if (hit) {
      return {
        text: "HIT ✓",
        color:
          "text-emerald-500 dark:text-emerald-400 font-black",
      };
    }

    if (!isClosed && previousHit) {
      return {
        text: runningText,
        color:
          `${runningColor} font-bold`,
      };
    }

    if (!isClosed) {
      return {
        text: runningText,
        color:
          `${runningColor} font-medium`,
      };
    }

    return {
      text: "",
      color: "",
    };
  };

  const tp1Status =
    targetStatus(
      signal.tp1_hit
    );

  const tp2Status =
    targetStatus(
      signal.tp2_hit,
      signal.tp1_hit
    );

  const tp3Status =
    targetStatus(
      signal.tp3_hit,
      signal.tp2_hit
    );

  const slStatus =
    anyTPHit && !isClosed
      ? {
          text: "MOVE SL TO ENTRY",
          color:
            "text-amber-500 dark:text-amber-400 font-black",
        }
      : isSLHit
        ? {
            text: "SL HIT ❌",
            color:
              "text-rose-500 dark:text-rose-400 font-black",
          }
        : {
            text: "",
            color: "",
          };

  /* =======================================================
     NOTE STYLE
     ======================================================= */

  const noteStyle = isSLHit
    ? {
        container:
          "border-rose-500/25 bg-rose-500/5 dark:border-rose-400/20 dark:bg-rose-400/5",
        icon:
          "text-rose-500 dark:text-rose-400",
        text:
          "text-rose-600 dark:text-rose-300 font-bold",
      }
    : signal.tp3_hit || signal.tp4_hit
      ? {
          container:
            "border-emerald-500/25 bg-emerald-500/5 dark:border-emerald-400/20 dark:bg-emerald-400/5",
          icon:
            "text-emerald-500 dark:text-emerald-400",
          text:
            "text-emerald-700 dark:text-emerald-300 font-bold",
        }
      : signal.tp2_hit
        ? {
            container:
              "border-cyan-500/25 bg-cyan-500/5 dark:border-cyan-400/20 dark:bg-cyan-400/5",
            icon:
              "text-cyan-500 dark:text-cyan-400",
            text:
              "text-cyan-700 dark:text-cyan-300 font-bold",
          }
        : signal.tp1_hit
          ? {
              container:
                "border-violet-500/25 bg-violet-500/5 dark:border-violet-400/20 dark:bg-violet-400/5",
              icon:
                "text-violet-500 dark:text-violet-400",
              text:
                "text-violet-700 dark:text-violet-300 font-bold",
            }
          : {
              container:
                "border-slate-200 bg-slate-50 dark:border-slate-700/70 dark:bg-slate-800/40",
              icon:
                "text-slate-400 dark:text-slate-500",
              text:
                "text-slate-600 dark:text-slate-300 font-medium",
            };

  /* =======================================================
     ICON
     ======================================================= */

  const getPairIcon = () => {
    const p = cleanPair;

    if (/XAU|GOLD/.test(p)) return "🪙";
    if (/XAG|SILVER/.test(p)) return "🥈";
    if (/OIL|CRUDE|BRENT/.test(p)) return "🛢️";
    if (/NATURALGAS|GAS/.test(p)) return "🔥";

    if (/NASDAQ/.test(p)) return "📊";
    if (/US30|DOW/.test(p)) return "🏛️";
    if (/SP500|SPX/.test(p)) return "📈";
    if (/DAX/.test(p)) return "🇩🇪";
    if (/FTSE/.test(p)) return "🇬🇧";
    if (/NIKKEI|JP225/.test(p)) return "🇯🇵";

    if (/BTC|BITCOIN/.test(p)) return "₿";
    if (/ETH|ETHEREUM/.test(p)) return "Ξ";
    if (/XRP/.test(p)) return "✕";
    if (/LTC|LITECOIN/.test(p)) return "Ł";
    if (/ADA|CARDANO/.test(p)) return "₳";
    if (/SOL|SOLANA/.test(p)) return "◎";

    if (/BOOM/.test(p)) return "🚀";
    if (/CRASH/.test(p)) return "💥";
    if (/VOL/.test(p)) return "⚡";

    if (/EUR/.test(p)) return "€";
    if (/GBP/.test(p)) return "£";
    if (/JPY/.test(p)) return "¥";
    if (/CHF/.test(p)) return "₣";
    if (/CAD/.test(p)) return "C$";
    if (/AUD/.test(p)) return "A$";
    if (/NZD/.test(p)) return "NZ$";
    if (/USD/.test(p)) return "$";

    return "📈";
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative mb-3 w-full overflow-hidden rounded-[20px]",
        "border transition-all duration-300",
        "shadow-[0_8px_30px_rgba(15,23,42,0.08)]",
        "dark:shadow-[0_10px_35px_rgba(0,0,0,0.22)]",
        "bg-white/95 border-emerald-100",
        "dark:bg-[#151d2d]/95 dark:border-emerald-400/10",
        "backdrop-blur-xl",
        "hover:-translate-y-[1px]"
      )}
    >
      {/* ===================================================
          AURORA TOP LINE
          =================================================== */}

      <div
        className={cn(
          "absolute left-0 right-0 top-0 h-[3px]",
          "bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400",
          "dark:from-emerald-400 dark:via-teal-400 dark:to-amber-400"
        )}
      />

      {/* ===================================================
          HEADER
          =================================================== */}

      <div className="flex items-center justify-between px-3.5 pt-4 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              "border border-amber-300/70",
              "bg-gradient-to-br from-amber-100 via-yellow-50 to-emerald-50",
              "dark:border-amber-400/25",
              "dark:from-amber-400/15 dark:via-emerald-400/10 dark:to-slate-800",
              "text-base shadow-sm"
            )}
          >
            {getPairIcon()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-black tracking-wide text-slate-900 dark:text-slate-100">
                {signal.pair.replace("/", "")}
              </h3>

              {signal.is_premium && (
                <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
              )}
            </div>

            <div className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Live Trading Signal
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              "inline-flex items-center rounded-full border",
              "px-2 py-1 text-[7px] font-black uppercase tracking-wider",
              statusStyle
            )}
          >
            <span
              className={cn(
                "mr-1 h-1.5 w-1.5 rounded-full",
                statusText === "CLOSED"
                  ? "bg-rose-500"
                  : statusText === "PENDING"
                    ? "bg-amber-400"
                    : "bg-emerald-400 animate-pulse"
              )}
            />
            {statusText}
          </span>

          <div
            className={cn(
              "flex items-center gap-1 rounded-lg border",
              "border-slate-200 bg-slate-50 px-2 py-1",
              "dark:border-slate-700 dark:bg-slate-800/70"
            )}
          >
            <Clock className="h-2.5 w-2.5 text-teal-500" />
            <span className="text-[8px] font-semibold text-slate-500 dark:text-slate-400">
              {formatRealTime(signalTime)}
            </span>
          </div>

          <button
            onClick={() =>
              setShowBody((v) => !v)
            }
            className={cn(
              "rounded-lg border p-1.5 transition-colors",
              "border-slate-200 bg-slate-50",
              "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600",
              "dark:border-slate-700 dark:bg-slate-800/70",
              "dark:text-slate-400 dark:hover:bg-emerald-400/10",
              "dark:hover:text-emerald-400"
            )}
          >
            {showBody ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* ===================================================
          PREMIUM LOCK
          =================================================== */}

      {isLocked ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate("/premium")}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" ||
              e.key === " "
            ) {
              e.preventDefault();
              navigate("/premium");
            }
          }}
          className={cn(
            "mx-3.5 mb-3 flex cursor-pointer flex-col",
            "items-center justify-center gap-2.5 rounded-2xl",
            "border border-dashed border-amber-300",
            "bg-gradient-to-br from-amber-50 to-emerald-50",
            "px-4 py-8 transition-all",
            "hover:border-amber-400 hover:shadow-md",
            "dark:border-amber-400/25",
            "dark:from-amber-400/5 dark:to-emerald-400/5"
          )}
        >
          <div className="rounded-full border border-amber-300 bg-amber-100 p-3 dark:border-amber-400/25 dark:bg-amber-400/10">
            <Lock className="h-5 w-5 text-amber-500 dark:text-amber-400" />
          </div>

          <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-300">
            🔒 Premium Signal — Tap to Unlock
          </span>
        </div>
      ) : (
        <>
          {/* =================================================
              ENTRY / CURRENT
              ================================================= */}

          <div
            className={cn(
              "mx-3.5 mb-3 grid grid-cols-3 items-center",
              "rounded-2xl border px-3 py-3",
              "border-slate-200 bg-gradient-to-r",
              "from-slate-50 via-white to-emerald-50/50",
              "dark:border-slate-700/80",
              "dark:from-slate-800/80 dark:via-[#182235] dark:to-emerald-950/20"
            )}
          >
            <div>
              <span className="block text-[7px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Entry
              </span>

              <span className="mt-1 block font-mono text-[12px] font-black text-slate-900 dark:text-slate-100">
                {signal.entry}
              </span>
            </div>

            <div className="text-center">
              <span className="block text-[7px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Current
              </span>

              <span
                className={cn(
                  "mt-1 block font-mono text-[12px] font-black",
                  currentPriceColor
                )}
              >
                {currentPriceNum > 0
                  ? currentPriceNum.toFixed(2)
                  : signal.entry}
              </span>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span
                className={cn(
                  "rounded-lg border px-2.5 py-1",
                  "text-[8px] font-black uppercase tracking-wider",
                  isBuy
                    ? "border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300"
                    : "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300"
                )}
              >
                {signal.type.toUpperCase()} NOW
              </span>

              {runningPL !== null &&
              !isClosed ? (
                <span
                  className={cn(
                    "font-mono text-[8.5px] font-black",
                    runningPL > 0
                      ? "text-emerald-500"
                      : runningPL < 0
                        ? "text-rose-500"
                        : "text-slate-400"
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
                        ? "text-rose-500"
                        : signal.risk_level === "Medium"
                          ? "text-amber-500"
                          : "text-emerald-500"
                    )}
                  >
                    <AlertCircle className="h-2.5 w-2.5" />
                    {signal.risk_level}
                  </span>
                )
              )}
            </div>
          </div>

          {/* =================================================
              TARGETS
              ================================================= */}

          {showBody && (
            <div
              className={cn(
                "mx-3.5 mb-3 rounded-2xl border p-2.5",
                "border-slate-200 bg-slate-50/80",
                "dark:border-slate-700/80 dark:bg-slate-800/50"
              )}
            >
              {/* TP1 */}

              <div className="grid grid-cols-3 items-center border-b border-slate-200 py-2 dark:border-slate-700/70">
                <span
                  className={cn(
                    "flex items-center gap-1 text-left font-mono text-[11px] font-black",
                    signal.tp1_hit
                      ? "text-emerald-500"
                      : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  TP 1
                  {signal.tp1_hit && "✓"}
                </span>

                <span
                  className={cn(
                    "text-center font-mono text-[11px] font-black",
                    signal.tp1_hit
                      ? "text-emerald-500"
                      : "text-slate-900 dark:text-slate-100"
                  )}
                >
                  {signal.tp1}
                </span>

                <span
                  className={cn(
                    "text-right text-[9px] uppercase tracking-wider",
                    tp1Status.color
                  )}
                >
                  {tp1Status.text}
                </span>
              </div>

              {/* TP2 */}

              {signal.tp2 && (
                <div className="grid grid-cols-3 items-center border-b border-slate-200 py-2 dark:border-slate-700/70">
                  <span
                    className={cn(
                      "flex items-center gap-1 text-left font-mono text-[11px] font-black",
                      signal.tp2_hit
                        ? "text-emerald-500"
                        : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    TP 2
                    {signal.tp2_hit && "✓"}
                  </span>

                  <span
                    className={cn(
                      "text-center font-mono text-[11px] font-black",
                      signal.tp2_hit
                        ? "text-emerald-500"
                        : "text-slate-900 dark:text-slate-100"
                    )}
                  >
                    {signal.tp2}
                  </span>

                  <span
                    className={cn(
                      "text-right text-[9px] uppercase tracking-wider",
                      tp2Status.color
                    )}
                  >
                    {tp2Status.text}
                  </span>
                </div>
              )}

              {/* TP3 */}

              {signal.tp3 && (
                <div className="grid grid-cols-3 items-center border-b border-slate-200 py-2 dark:border-slate-700/70">
                  <span
                    className={cn(
                      "flex items-center gap-1 text-left font-mono text-[11px] font-black",
                      signal.tp3_hit
                        ? "text-emerald-500"
                        : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    TP 3
                    {signal.tp3_hit && "✓"}
                  </span>

                  <span
                    className={cn(
                      "text-center font-mono text-[11px] font-black",
                      signal.tp3_hit
                        ? "text-emerald-500"
                        : "text-slate-900 dark:text-slate-100"
                    )}
                  >
                    {signal.tp3}
                  </span>

                  <span
                    className={cn(
                      "text-right text-[9px] uppercase tracking-wider",
                      tp3Status.color
                    )}
                  >
                    {tp3Status.text}
                  </span>
                </div>
              )}

              {/* SL */}

              <div className="grid grid-cols-3 items-center pt-2">
                <span className="text-left font-mono text-[11px] font-black text-rose-500">
                  SL
                </span>

                <span
                  className={cn(
                    "text-center font-mono text-[11px] font-black",
                    isSLHit
                      ? "text-rose-500"
                      : "text-slate-900 dark:text-slate-100"
                  )}
                >
                  {anyTPHit
                    ? parsedEntryPrice.toString()
                    : signal.sl}
                  {isSLHit && " ❌"}
                </span>

                <span
                  className={cn(
                    "text-right text-[9px] uppercase tracking-wider",
                    slStatus.color
                  )}
                >
                  {slStatus.text}
                </span>
              </div>
            </div>
          )}

          {/* =================================================
              PROFIT NOTE
              ================================================= */}

          {note && (
            <div
              className={cn(
                "mx-3.5 mb-3 flex items-center gap-2",
                "rounded-xl border px-3 py-2",
                noteStyle.container
              )}
            >
              {isSLHit ? (
                <XCircle
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    noteStyle.icon
                  )}
                />
              ) : (
                <CheckCircle2
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    noteStyle.icon
                  )}
                />
              )}

              <span
                className={cn(
                  "text-[9.5px] leading-tight tracking-wide",
                  noteStyle.text
                )}
              >
                {note}
              </span>
            </div>
          )}
        </>
      )}

      {/* ===================================================
          BOTTOM AURORA GLOW
          =================================================== */}

      <div className="pointer-events-none absolute -bottom-12 left-1/2 h-20 w-40 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-400/5" />
    </div>
  );
};

export default SignalCardNew;
