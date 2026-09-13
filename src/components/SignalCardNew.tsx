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
}

const isMarketClosed = (pairSymbol: string) => {
  const upper = (pairSymbol || "").toUpperCase();
  
  if (upper.includes("BTC") || upper.includes("ETH") || upper.includes("SOL") || upper.includes("XRP") || upper.includes("LTC") || upper.includes("ADA")) {
    return false;
  }

  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();

  if (day === 6) return true; 
  if (day === 5 && hour >= 22) return true; 
  if (day === 0 && hour < 22) return true; 

  return false;
};

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

  useEffect(() => {
    const interval = window.setInterval(() => {
      forceUpdate((value) => value + 1);
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const marketClosed = isMarketClosed(signal.pair);

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

  const isBuy = signal.type?.toLowerCase() === "buy";

  const currentPriceNum =
    typeof livePrice === "number" && livePrice > 0
      ? livePrice
      : signal.current_price
        ? parseFloat(signal.current_price)
        : 0;

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
      ? "text-rose-500 dark:text-rose-400"
      : "text-emerald-500 dark:text-emerald-400";

  // IMPORTANT:
  // Only the subscription hook can grant Premium access.
  // FREE TRIAL users intentionally remain locked; their trial only controls
  // the trial banner/expiry state, not Premium signal access.
  const userHasValidAccess = hasAccess === true;

  // Premium OPEN/PENDING signals are locked for Free + Free Trial users.
  // CLOSED signals remain visible with their result/details.
  const isLocked = !!signal.is_premium && !userHasValidAccess && !isClosed;

  const signalTime =
    isOpen && signal.activated_at
      ? signal.activated_at
      : signal.created_at;

  const signalAgeMs =
    Date.now() - new Date(signal.created_at).getTime();

  const isVeryNewSignal = signalAgeMs < 60000;

  const entryTouched = isOpen && !isVeryNewSignal;

  const runningPL =
    entryTouched && currentPriceNum > 0 && parsedEntryPrice > 0
      ? calculateRunningPL(currentPriceNum, parsedEntryPrice, signal.type).value
      : null;

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
    if (
      signal.tp3_hit &&
      !initialTP3StateRef.current &&
      !confettiFiredRef.current &&
      document.visibilityState === "visible"
    ) {
      triggerConfetti();
    }
  }, [signal.tp3_hit, triggerConfetti]);

  const hasTPReached = (current: number, target: number) => {
    if (current <= 0 || target <= 0) return false;
    return isBuy ? current >= target : current <= target;
  };

  const hasSLReached = (current: number, sl: number) => {
    if (current <= 0 || sl <= 0) return false;
    return isBuy ? current <= sl : current >= sl;
  };

  const primedForChecksRef = useRef(false);
  const slBreachStreakRef = useRef(0);

  useEffect(() => {
    if (!isOpen || !currentPriceNum || parsedEntryPrice <= 0 || marketClosed) {
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
        updates.profit_note = "BOOM ðŸ’¥ ! TP 1 Hit! ðŸš€ First Profit Secured âœ…";
      }

      if (!signal.tp2_hit && tp2Price > 0 && hasTPReached(currentPriceNum, tp2Price)) {
        updates.tp2_hit = true;
        updates.profit_note = "BOOM! TP 2 Hit Secured! ðŸ’° Enjoy Profit ðŸ’µ âœ…âœ…";
      }

      if (!signal.tp3_hit && tp3Price > 0 && hasTPReached(currentPriceNum, tp3Price)) {
        updates.tp3_hit = true;
        updates.profit_note = "AMAZING! TP 3 Hit Final target Hit ðŸŽ‰ Maximum Profit Secured ðŸ’µâœ…";
        if (!signal.tp4) {
          updates.signal_status = "close";
          updates.status = "CLOSED";
        }
      }

      if (!signal.tp4_hit && tp4Price > 0 && hasTPReached(currentPriceNum, tp4Price)) {
        updates.tp4_hit = true;
        updates.signal_status = "close";
        updates.status = "CLOSED";
        updates.profit_note = "AMAZING! TP 4 Hit Final target Hit ðŸŽ‰ Maximum Profit Secured ðŸ’µâœ…";
      }

      const effectiveTP1 = !!signal.tp1_hit || !!updates.tp1_hit;
      const effectiveTP2 = !!signal.tp2_hit || !!updates.tp2_hit;
      const effectiveSL = updates.sl ? parseEntryPrice(String(updates.sl)) : slPrice;

      const slBreachThisTick = !signal.sl_hit && effectiveSL > 0 && hasSLReached(currentPriceNum, effectiveSL);
      slBreachStreakRef.current = slBreachThisTick ? slBreachStreakRef.current + 1 : 0;

      if (slBreachThisTick && slBreachStreakRef.current >= 2) {
        updates.signal_status = "close";
        updates.status = "CLOSED";

        if (effectiveTP2) {
          updates.sl_hit = false;
          updates.profit_note = "Signal Closed at Breakeven after TP2 Hit âœ…âœ…";
        } else if (effectiveTP1) {
          updates.sl_hit = false;
          updates.profit_note = "Signal Closed at Breakeven after TP1 Hit âœ…";
        } else {
          updates.sl_hit = true;
          updates.profit_note = "SL Hit âŒ - Staying patient for a better entry.";
        }
      }

      if (!cancelled && Object.keys(updates).length > 0) {
        await supabase.from("signals").update(updates).eq("id", signal.id);
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
  ]);

  const formatRealTime = (dateString: string) => {
    try {
      if (!dateString) return "Just now";
      const rawDate = new Date(dateString);
      const utcDate =
        dateString.endsWith("Z") || dateString.includes("+")
          ? rawDate
          : new Date(dateString + "Z");
      return format(utcDate, "hh:mm a");
    } catch {
      return "Just now";
    }
  };

  const getDynamicProfitNote = () => {
    if (signal.sl_hit || (signal.profit_note && /SL\s*Hit/i.test(signal.profit_note))) {
      return "SL Hit âŒ - Staying patient for a better entry.";
    }
    if (signal.tp3_hit || signal.tp4_hit || (signal.profit_note && /TP\s*[34]/i.test(signal.profit_note))) {
      return "AMAZING! TP 3 Hit Final target Hit ðŸŽ‰ Maximum Profit Secured ðŸ’µâœ…";
    }
    if (signal.tp2_hit || (signal.profit_note && /TP\s*2/i.test(signal.profit_note))) {
      return "BOOM! TP 2 Hit Secured! ðŸ’° Enjoy Profit ðŸ’µ âœ…âœ…";
    }
    if (signal.tp1_hit || (signal.profit_note && /TP\s*1/i.test(signal.profit_note))) {
      return "BOOM ðŸ’¥ ! TP 1 Hit! ðŸš€ First Profit Secured âœ…";
    }
    return signal.profit_note || "";
  };

  const note = getDynamicProfitNote();

  const getSignalStatus = () => {
    if (isClosed || signal.sl_hit || signal.tp4_hit || (!signal.tp4 && signal.tp3_hit)) {
      return "CLOSED";
    }
    if (isPending) {
      return "PENDING";
    }
    return "OPEN";
  };

  const statusText = getSignalStatus();

  const getStatusStyle = () => {
    switch (statusText) {
      case "CLOSED":
        return "bg-rose-500/15 border-rose-500/40 text-rose-500 dark:text-rose-400";
      case "OPEN":
        return "bg-emerald-500/15 border-emerald-500/40 text-emerald-500 dark:text-emerald-400";
      case "PENDING":
        return "bg-amber-500/15 border-amber-500/40 text-amber-500 dark:text-amber-400";
      default:
        return "bg-cyan-500/15 border-cyan-500/40 text-cyan-500 dark:text-cyan-400";
    }
  };

  const noteStyle = getNoteStyle();
  const pairUpper = signal.pair?.toUpperCase() || "";

  const runningOrClosedText = marketClosed 
    ? "MARKET CLOSED" 
    : "RUNNING";

  const runningOrClosedColor = marketClosed 
    ? "text-rose-400 dark:text-rose-400 font-medium" 
    : "text-amber-500 dark:text-amber-400 animate-pulse font-medium";

  const getTP1Status = () => {
    if (signal.tp1_hit) return { text: "TP 1 HIT", color: "text-emerald-500 dark:text-emerald-400 font-bold" };
    if (!isClosed) return { text: runningOrClosedText, color: runningOrClosedColor };
    return { text: "", color: "" };
  };

  const getTP2Status = () => {
    if (signal.tp2_hit) return { text: "TP 2 HIT", color: "text-emerald-500 dark:text-emerald-400 font-bold" };
    if (!isClosed && signal.tp1_hit) return { text: runningOrClosedText, color: runningOrClosedColor };
    return { text: "", color: "" };
  };

  const getTP3Status = () => {
    if (signal.tp3_hit) return { text: "TP 3 HIT", color: "text-emerald-500 dark:text-emerald-400 font-bold" };
    if (!isClosed && signal.tp2_hit) return { text: runningOrClosedText, color: runningOrClosedColor };
    return { text: "", color: "" };
  };

  const isSLHit = signal.sl_hit || /SL\s*Hit/i.test(note);

  const getSLStatus = () => {
    if (isSLHit) return { text: "SL HIT âŒ", color: "text-rose-500 font-bold" };
    if (!isClosed && signal.tp1_hit) return { text: "MOVE SL TO ENTRY POINT", color: "text-amber-500 dark:text-amber-400 font-bold" };
    return { text: "", color: "" };
  };

  const tp1Status = getTP1Status();
  const tp2Status = getTP2Status();
  const tp3Status = getTP3Status();
  const slStatus = getSLStatus();

  function getNoteStyle() {
    const isSL = signal.sl_hit || /SL\s*Hit/i.test(note);
    const isTP1 = !isSL && (signal.tp1_hit || /TP\s*1/i.test(note)) && !signal.tp2_hit && !signal.tp3_hit;
    const isTP2 = !isSL && (signal.tp2_hit || /TP\s*2/i.test(note)) && !signal.tp3_hit;
    const isTP3or4 = !isSL && (signal.tp3_hit || signal.tp4_hit || /TP\s*[34]/i.test(note));

    if (isSL) {
      return {
        container: "border-rose-500/35 bg-rose-500/10 dark:bg-rose-950/25",
        icon: "text-rose-500 dark:text-rose-400",
        isSLText: true,
      };
    }

    if (isTP1) {
      return {
        container: "border-purple-500/35 bg-purple-500/10 dark:bg-purple-950/30",
        icon: "text-purple-500 dark:text-purple-400",
        text: "text-purple-700 dark:text-purple-300 font-bold",
      };
    }

    if (isTP2) {
      return {
        container: "border-blue-500/35 bg-blue-500/10 dark:bg-blue-950/30",
        icon: "text-blue-500 dark:text-blue-400",
        text: "text-blue-700 dark:text-blue-300 font-bold",
      };
    }

    if (isTP3or4) {
      return {
        container: "border-emerald-500/35 bg-emerald-500/10 dark:bg-emerald-950/25",
        icon: "text-emerald-500 dark:text-emerald-400",
        text: "text-emerald-700 dark:text-emerald-300 font-bold",
      };
    }

    return {
      container: "border-slate-500/30 bg-slate-500/10 dark:bg-slate-800/30",
      icon: "text-slate-400 dark:text-slate-400",
      text: "text-slate-600 dark:text-slate-300 font-bold",
    };
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative mb-3 w-full rounded-[16px] p-3.5 transition-all duration-300 overflow-hidden border backdrop-blur-md shadow-lg",
        "bg-[#091424] border-cyan-500/20 shadow-[0_8px_25px_rgba(0,0,0,0.6)]",
        "hover:scale-[1.01]"
      )}
    >
      {/* 1. HEADER */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-yellow-600/10 text-[16px] font-black shadow-sm"
            title={signal.pair}
          >
            {(() => {
              const p = pairUpper.replace(/[^A-Z0-9]/g, "");

              // Metals / commodities
              if (p.includes("XAU") || p.includes("GOLD")) return "ðŸª™";
              if (p.includes("XAG") || p.includes("SILVER")) return "ðŸ¥ˆ";
              if (p.includes("OIL") || p.includes("CRUDE") || p.includes("BRENT")) return "ðŸ›¢ï¸";
              if (p.includes("NATURALGAS") || p.includes("GAS")) return "ðŸ”¥";

              // Major indices
              if (p.includes("NASDAQ")) return "ðŸ“Š";
              if (p.includes("US30") || p.includes("DOW")) return "ðŸ›ï¸";
              if (p.includes("SP500") || p.includes("SPX")) return "ðŸ“ˆ";
              if (p.includes("DAX")) return "ðŸ‡©ðŸ‡ª";
              if (p.includes("FTSE")) return "ðŸ‡¬ðŸ‡§";
              if (p.includes("NIKKEI") || p.includes("JP225")) return "ðŸ‡¯ðŸ‡µ";

              // Crypto
              if (p.includes("BTC") || p.includes("BITCOIN")) return "â‚¿";
              if (p.includes("ETH") || p.includes("ETHEREUM")) return "Îž";
              if (p.includes("XRP")) return "âœ•";
              if (p.includes("LTC") || p.includes("LITECOIN")) return "Å";
              if (p.includes("ADA") || p.includes("CARDANO")) return "â‚³";
              if (p.includes("SOL") || p.includes("SOLANA")) return "â—Ž";

              // Deriv
              if (p.includes("BOOM")) return "ðŸš€";
              if (p.includes("CRASH")) return "ðŸ’¥";
              if (p.includes("VOL")) return "âš¡";

              // Forex
              if (p.includes("EUR")) return "â‚¬";
              if (p.includes("GBP")) return "Â£";
              if (p.includes("JPY")) return "Â¥";
              if (p.includes("CHF")) return "â‚£";
              if (p.includes("CAD")) return "C$";
              if (p.includes("AUD")) return "A$";
              if (p.includes("NZD")) return "NZ$";
              if (p.includes("USD")) return "$";

              return "ðŸ“ˆ";
            })()}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black tracking-wide text-cyan-50 leading-tight">
                {signal.pair.replace("/", "")}
              </h3>

              {signal.is_premium && (
                <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("inline-flex items-center rounded-full border px-2 py-[2.5px] text-[7px] font-black uppercase tracking-wider leading-none backdrop-blur-md", getStatusStyle())}>
            <span className={cn("mr-1 h-1.5 w-1.5 rounded-full animate-pulse", statusText === "CLOSED" ? "bg-rose-500" : statusText === "OPEN" ? "bg-emerald-400" : "bg-amber-400")} />
            {statusText}
          </span>

          <div className="flex items-center gap-1 text-[8px] font-medium text-cyan-200/50 bg-cyan-950/40 px-2 py-1 rounded-lg border border-cyan-500/10">
            <Clock className="h-2.5 w-2.5 text-cyan-400" />
            <span>{formatRealTime(signalTime)}</span>
          </div>

          <button
            onClick={() => setShowBody(!showBody)}
            className="p-1 rounded-lg bg-cyan-950/40 border border-cyan-500/10 text-cyan-300 hover:bg-black/10 transition-colors"
          >
            {showBody ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 2. BODY SECTION */}
      {isLocked ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Premium Signal - Tap to Unlock"
          onClick={() => navigate("/premium")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/premium");
            }
          }}
          className="flex flex-col items-center justify-center gap-2.5 py-7 px-4 rounded-[12px] border border-dashed border-amber-500/30 bg-[#06101e]/60 cursor-pointer hover:bg-amber-500/5 active:scale-[0.99] transition-all duration-200 shadow-inner"
        >
          <div className="p-2.5 rounded-full bg-amber-500/10 border border-amber-500/30">
            <Lock className="h-5 w-5 text-amber-400" />
          </div>
          <span className="text-[11px] font-extrabold tracking-wide text-amber-300/90 flex items-center gap-1.5">
            ðŸ”’ Premium Signal - Tap to Unlock
          </span>
        </div>
      ) : (
        <>
          {/* ENTRY & CURRENT PRICE BAR */}
          <div className="flex items-center justify-between rounded-[12px] bg-[#07101d]/80 border border-cyan-500/15 px-3 py-2 mb-3 shadow-inner">
            <div className="flex flex-col">
              <span className="text-[7.5px] font-bold uppercase tracking-wider text-cyan-300/50">
                Entry
              </span>
              <span className="font-mono text-[11px] font-black text-cyan-100">
                {signal.entry}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[7.5px] font-bold uppercase tracking-wider text-cyan-300/50">
                Current
              </span>
              <span className={cn("font-mono text-[11.5px] font-black transition-colors duration-200", currentPriceColor)}>
                {currentPriceNum > 0 ? currentPriceNum.toFixed(2) : signal.entry}
              </span>
            </div>

            <div className="flex flex-col items-end gap-0.5">
              <span className={cn("rounded-md px-2.5 py-[2px] text-[8px] font-black uppercase tracking-wider shadow-sm", isBuy ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-rose-500/20 text-rose-300 border border-rose-500/40")}>
                {signal.type.toUpperCase()} NOW
              </span>

              {runningPL !== null && !isClosed ? (
                <span className={cn("font-mono text-[8.5px] font-extrabold", runningPL > 0 ? "text-emerald-400" : runningPL < 0 ? "text-rose-400" : "text-cyan-300/60")}>
                  {runningPL > 0 ? `+${runningPL.toFixed(1)} pips` : runningPL < 0 ? `${runningPL.toFixed(1)} pips` : "0.0 pips"}
                </span>
              ) : (
                signal.risk_level && (
                  <span className={cn("flex items-center gap-0.5 text-[7px] font-bold", signal.risk_level === "High" ? "text-rose-500" : signal.risk_level === "Medium" ? "text-amber-500" : "text-emerald-500")}>
                    <AlertCircle className="h-2.5 w-2.5" />
                    {signal.risk_level}
                  </span>
                )
              )}
            </div>
          </div>

          {/* TARGETS & STOP LOSS LIST */}
          {showBody && (
            <div className="flex flex-col gap-2 rounded-[12px] bg-[#07101d]/40 border border-cyan-500/10 p-2.5 mb-3 transition-all duration-300">
              {/* TP 1 */}
              <div className="grid grid-cols-3 items-center font-mono border-b border-white/5 pb-2">
                <span className={cn("font-extrabold uppercase text-[11px] text-left flex items-center gap-1", signal.tp1_hit ? "text-emerald-400" : "text-cyan-300/70")}>
                  TP 1
                  {signal.tp1_hit && <span className="text-[11px] font-bold">âœ“</span>}
                </span>
                <span className={cn("text-[11px] font-extrabold text-center", signal.tp1_hit ? "text-emerald-400" : "text-cyan-100")}>
                  {signal.tp1}
                </span>
                <span className={cn("text-[10px] uppercase tracking-wider text-right", tp1Status.color)}>
                  {tp1Status.text}
                </span>
              </div>

              {/* TP 2 */}
              {signal.tp2 && (
                <div className="grid grid-cols-3 items-center font-mono border-b border-white/5 pb-2">
                  <span className={cn("font-extrabold uppercase text-[11px] text-left flex items-center gap-1", signal.tp2_hit ? "text-emerald-400" : "text-cyan-300/70")}>
                    TP 2
                    {signal.tp2_hit && <span className="text-[11px] font-bold">âœ“</span>}
                  </span>
                  <span className={cn("text-[11px] font-extrabold text-center", signal.tp2_hit ? "text-emerald-400" : "text-cyan-100")}>
                    {signal.tp2}
                  </span>
                  <span className={cn("text-[10px] uppercase tracking-wider text-right", tp2Status.color)}>
                    {tp2Status.text}
                  </span>
                </div>
              )}

              {/* TP 3 */}
              {signal.tp3 && (
                <div className="grid grid-cols-3 items-center font-mono border-b border-white/5 pb-2">
                  <span className={cn("font-extrabold uppercase text-[11px] text-left flex items-center gap-1", signal.tp3_hit ? "text-emerald-400" : "text-cyan-300/70")}>
                    TP 3
                    {signal.tp3_hit && <span className="text-[11px] font-bold">âœ“</span>}
                  </span>
                  <span className={cn("text-[11px] font-extrabold text-center", signal.tp3_hit ? "text-emerald-400" : "text-cyan-100")}>
                    {signal.tp3}
                  </span>
                  <span className={cn("text-[10px] uppercase tracking-wider text-right", tp3Status.color)}>
                    {tp3Status.text}
                  </span>
                </div>
              )}

              {/* SL */}
              <div className="grid grid-cols-3 items-center font-mono pt-1">
                <span className="font-extrabold text-rose-500 uppercase text-[11px] text-left">SL</span>
                <span className={cn("text-[11px] font-extrabold text-center flex items-center justify-center gap-1", isSLHit ? "text-rose-400" : "text-cyan-100")}>
                  {signal.sl}
                  {isSLHit && <span className="text-[10px]">âŒ</span>}
                </span>
                <span className={cn("text-[10px] uppercase tracking-wider text-right", slStatus.color)}>
                  {slStatus.text}
                </span>
              </div>
            </div>
          )}

          {/* PROFIT NOTE */}
          {note && (
            <div className={cn("flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-all duration-300 backdrop-blur-md", noteStyle.container)}>
              {isSLHit ? (
                <XCircle className={cn("h-3.5 w-3.5 shrink-0", noteStyle.icon)} />
              ) : (
                <CheckCircle2 className={cn("h-3.5 w-3.5 shrink-0", noteStyle.icon)} />
              )}

              {noteStyle.isSLText ? (
                <span className="text-[9.5px] leading-tight tracking-wide">
                  <span className="text-rose-400 font-extrabold">SL Hit âŒ </span>
                  <span className="text-slate-400 font-medium">- Staying patient for a better entry.</span>
                </span>
              ) : (
                <span className={cn("text-[9.5px] leading-tight tracking-wide", noteStyle.text)}>
                  {note}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SignalCardNew;
