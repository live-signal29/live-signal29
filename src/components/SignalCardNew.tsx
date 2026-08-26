import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lock,
  Crown,
  Share2,
  Copy,
  Send,
} from "lucide-react";
import {
  format,
  differenceInHours,
} from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import {
  parseEntryPrice,
  calculateRunningPL,
} from "@/hooks/useLivePrices";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
   * Current price color must follow the actual MT5 movement,
   * NOT the signal type.
   *
   * UP   -> blue
   * DOWN -> red
   * SAME -> keep the last movement color
   *
   * This is intentionally based on the livePrice prop because
   * SignalsDashboard refreshes it from MetaApi every few seconds.
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
      ? "text-red-600 dark:text-red-400"
      : "text-blue-600 dark:text-blue-400";

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

  useEffect(() => {
    if (
      !isOpen ||
      !currentPriceNum ||
      parsedEntryPrice <= 0
    ) {
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

        updates.profit_note =
          "TP 4 Final Target Hit 🎊 Maximum Profit Secured ✅";
      }

      const effectiveTP1Hit =
        !!signal.tp1_hit ||
        !!updates.tp1_hit;

      const effectiveSL =
        updates.sl
          ? parseEntryPrice(
              String(updates.sl)
            )
          : slPrice;

      const breakEvenTolerance =
        Math.max(
          entryPrice * 0.0001,
          0.01
        );

      const atBreakEven =
        Math.abs(
          currentPriceNum -
            entryPrice
        ) <= breakEvenTolerance;

      if (
        effectiveTP1Hit &&
        effectiveSL > 0 &&
        Math.abs(
          effectiveSL -
            entryPrice
        ) <= breakEvenTolerance &&
        atBreakEven &&
        !signal.sl_hit
      ) {
        updates.signal_status =
          "close";

        updates.sl_hit = false;

        updates.profit_note =
          "Signal Closed at Breakeven after TP1 ✅";
      }

      const effectiveTP1 =
        !!signal.tp1_hit ||
        !!updates.tp1_hit;

      if (
        !signal.sl_hit &&
        !effectiveTP1 &&
        slPrice > 0 &&
        hasSLReached(
          currentPriceNum,
          slPrice
        )
      ) {
        updates.sl_hit = true;

        updates.signal_status =
          "close";

        updates.profit_note =
          "SL Hit ❌ - Staying patient for a better entry.";
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
   * SHARE
   * ============================================================
   */

  const handleShare = (
    e: React.MouseEvent<HTMLDivElement>,
    platform:
      | "whatsapp"
      | "telegram"
      | "copy"
  ) => {
    e.stopPropagation();

    const shareUrl =
      `https://live-signal29.vercel.app/signal/${signal.id}`;

    const shareText =
      isLocked || signal.is_premium
        ? `🔔 Premium ${signal.type.toUpperCase()} Signal Alert!\n\n` +
          `📊 Pair: ${signal.pair}\n` +
          `💰 Entry: ${signal.entry}\n` +
          `🔒 TP/SL: Buy Premium to unlock\n\n` +
          `👉 Get premium access: ${shareUrl}`
        : `🔔 New ${signal.type.toUpperCase()} Signal Alert!\n\n` +
          `📊 Pair: ${signal.pair}\n` +
          `💰 Entry: ${signal.entry}\n` +
          `🎯 TP1: ${signal.tp1}\n` +
          `⛔ SL: ${signal.sl}\n\n` +
          `View full signal details: ${shareUrl}`;

    if (
      platform === "whatsapp"
    ) {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(
          shareText
        )}`,
        "_blank"
      );
    }

    if (
      platform === "telegram"
    ) {
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(
          shareUrl
        )}&text=${encodeURIComponent(
          shareText
        )}`,
        "_blank"
      );
    }

    if (
      platform === "copy"
    ) {
      navigator.clipboard.writeText(
        shareText
      );

      toast.success(
        "Signal link copied to clipboard!"
      );
    }
  };

  /*
   * ============================================================
   * TIME (FIXED FOR UTC CONVERSION & LOCAL TIME DISPLAY)
   * ============================================================
   */

  const formatRealTime = (
    dateString: string
  ) => {
    try {
      if (!dateString) return "Just now";

      // ISO String parse with UTC check
      const rawDate = new Date(dateString);
      const utcDate =
        dateString.endsWith("Z") || dateString.includes("+")
          ? rawDate
          : new Date(dateString + "Z");

      const formattedTime = format(utcDate, "hh:mm a");

      // Closed Signals
      if (
        isClosed ||
        signal.sl_hit ||
        signal.tp4_hit ||
        (!signal.tp4 && signal.tp3_hit)
      ) {
        return `Closed at ${formattedTime}`;
      }

      // Open / Live Signals
      return formattedTime;
    } catch {
      return "Just now";
    }
  };

  /*
   * ============================================================
   * STATUS
   * ============================================================
   */

  const note =
    signal.profit_note || "";

  const noteUpper =
    note.toUpperCase();

  const getSignalStatus = () => {
    if (isClosed) {
      return "CLOSED";
    }

    if (signal.sl_hit) {
      return "CLOSED";
    }

    if (
      signal.tp4_hit ||
      (!signal.tp4 &&
        signal.tp3_hit)
    ) {
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
        return "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400";

      case "OPEN":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400";

      case "PENDING":
        return "bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400";

      default:
        return "bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-400";
    }
  };

  /*
   * ============================================================
   * TP / SL COLORS
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
        noteUpper.includes(
          "BREAKEVEN"
        ) ||
        noteUpper.includes(
          "B.E"
        );

      if (slMovedToBE) {
        return "text-amber-500 dark:text-amber-400";
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
      ? "text-emerald-500 dark:text-emerald-400"
      : "text-blue-600 dark:text-blue-400";
  };

  /*
   * ============================================================
   * PROFIT NOTE COLOR
   * ============================================================
   */

  const isSLHit =
    !!signal.sl_hit ||
    /\bSL\s+HIT\b/i.test(
      note
    );

  const isBreakEven =
    !isSLHit &&
    (
      /BREAKEVEN/i.test(
        note
      ) ||
      /B\.E/i.test(
        note
      )
    );

  const isTPHit =
    !isSLHit &&
    !isBreakEven &&
    /TP\s*[1-4]\s*(HIT|CLEARED|FINAL|TARGET)/i.test(
      note
    );

  const getNoteStyle = () => {
    if (isSLHit) {
      return {
        container:
          "border-rose-500/30 bg-rose-500/10",
        icon:
          "text-rose-500 dark:text-rose-400",
        text:
          "text-rose-600 dark:text-rose-400",
      };
    }

    if (isBreakEven) {
      return {
        container:
          "border-amber-500/30 bg-amber-500/10",
        icon:
          "text-amber-500 dark:text-amber-400",
        text:
          "text-amber-600 dark:text-amber-400",
      };
    }

    if (isTPHit) {
      return {
        container:
          "border-emerald-500/30 bg-emerald-500/10",
        icon:
          "text-emerald-500 dark:text-emerald-400",
        text:
          "text-emerald-600 dark:text-emerald-300",
      };
    }

    return {
      container:
        "border-border/50 bg-muted/20",
      icon:
        "text-muted-foreground",
      text:
        "text-muted-foreground",
    };
  };

  const noteStyle =
    getNoteStyle();

  const pairUpper =
    signal.pair?.toUpperCase() || "";

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div
      ref={cardRef}
      className="relative mb-2 w-full rounded-[12px] bg-card border border-border/50 p-2.5 text-foreground shadow-sm hover:border-border hover:shadow-md transition-all duration-300 overflow-hidden"
    >
      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="flex items-center justify-between mb-1.5">

        {/* LEFT */}

        <div className="flex items-center gap-1.5 min-w-0">

          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-yellow-500/40 bg-background/60 text-[10px] shadow-sm">
            {pairUpper.includes("XAU")
              ? "🪙"
              : pairUpper.includes("BTC")
                ? "₿"
                : "💶"}
          </div>

          <div className="flex flex-col min-w-0">

            <div className="flex items-center gap-1">

              <h3 className="text-[10.5px] font-bold text-foreground leading-tight">
                {signal.pair.replace(
                  "/",
                  ""
                )}
              </h3>

              {isNewSignal &&
                !isLocked && (
                  <span className="animate-pulse bg-primary px-1 py-[0.5px] rounded text-[6px] font-extrabold text-primary-foreground">
                    NEW
                  </span>
                )}

              {signal.is_premium && (
                <Crown className="h-3 w-3 text-amber-500 shrink-0" />
              )}

            </div>

            <p className="text-[7.5px] text-muted-foreground leading-tight">
              {pairUpper.includes("XAU")
                ? "Gold"
                : pairUpper.includes("BTC")
                  ? "Bitcoin"
                  : "Forex"}
            </p>

          </div>
        </div>

        {/* RIGHT */}

        <div className="flex items-center gap-1.5 shrink-0">

          {/* STATUS */}

          <span
            className={cn(
              "inline-flex items-center rounded-full border px-1.5 py-[2px] text-[6px] font-bold uppercase tracking-wide leading-none",
              getStatusStyle()
            )}
          >
            <span
              className={cn(
                "mr-1 h-1 w-1 rounded-full",
                statusText === "CLOSED"
                  ? "bg-rose-500"
                  : statusText === "OPEN"
                    ? "bg-emerald-500"
                    : "bg-amber-500"
              )}
            />

            {statusText}
          </span>

          {/* TIME */}

          <div className="flex items-center gap-0.5 text-[7.5px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />

            <span>
              {formatRealTime(
                signalTime
              )}
            </span>
          </div>

          {/* SHARE */}

          <DropdownMenu>

            <DropdownMenuTrigger
              asChild
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <button
                type="button"
                className="p-1 rounded-full hover:bg-muted/60 text-muted-foreground transition-colors"
              >
                <Share2 className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-36"
            >

              <DropdownMenuItem
                onClick={(e) =>
                  handleShare(
                    e,
                    "whatsapp"
                  )
                }
              >
                <Send className="mr-2 h-3.5 w-3.5 text-green-500" />
                WhatsApp
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) =>
                  handleShare(
                    e,
                    "telegram"
                  )
                }
              >
                <Send className="mr-2 h-3.5 w-3.5 text-blue-500" />
                Telegram
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) =>
                  handleShare(
                    e,
                    "copy"
                  )
                }
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copy Link
              </DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>

      {/* ======================================================
          PREMIUM LOCKED VIEW (FIXED WITH CLICK HANDLER)
          ====================================================== */}

      {isLocked ? (
        <div 
          onClick={() => navigate("/premium")}
          className="flex flex-col items-center justify-center gap-1.5 py-4 bg-muted/20 hover:bg-muted/30 active:scale-[0.98] rounded-[9px] border border-dashed border-border/60 cursor-pointer transition-all select-none"
        >
          <Lock className="h-4 w-4 text-amber-500 pointer-events-none" />

          <span className="text-[10px] font-bold text-muted-foreground pointer-events-none">
            🔒 Premium Signal - Tap to Unlock
          </span>
        </div>
      ) : (
        <>
          {/* ==================================================
              PRICES
              ================================================== */}

          <div className="flex items-center justify-between rounded-[9px] bg-muted/30 border border-border/50 px-2 py-1.5 mb-1.5">

            {/* ENTRY */}

            <div className="flex flex-col">

              <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Entry
              </span>

              <span className="font-mono text-[10.5px] font-bold text-foreground">
                {signal.entry}
              </span>

            </div>

            {/* CURRENT */}

            <div className="flex flex-col items-center">

              <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Current
              </span>

              <span
                className={cn(
                  "font-mono text-[11px] font-bold transition-colors duration-200",
                  currentPriceColor
                )}
              >
                {currentPriceNum > 0
                  ? currentPriceNum.toFixed(2)
                  : signal.entry}
              </span>

            </div>

            {/* TYPE / P&L */}

            <div className="flex flex-col items-end gap-0.5">

              <span
                className={cn(
                  "rounded-full px-1.5 py-[0.5px] text-[6.5px] font-bold uppercase",
                  isBuy
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                    : "bg-rose-500/20 text-rose-600 dark:text-rose-300"
                )}
              >
                {signal.type.toUpperCase()}
              </span>

              {runningPL !== null ? (
                <span
                  className={cn(
                    "font-mono text-[8px] font-bold",
                    runningPL > 0
                      ? "text-emerald-500"
                      : runningPL < 0
                        ? "text-rose-500"
                        : "text-muted-foreground"
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
                      "flex items-center gap-0.5 text-[6.5px] font-medium",
                      signal.risk_level === "High"
                        ? "text-rose-500 dark:text-rose-400"
                        : signal.risk_level === "Medium"
                          ? "text-amber-500 dark:text-amber-400"
                          : "text-emerald-500 dark:text-emerald-400"
                    )}
                  >
                    <AlertCircle className="h-2 w-2" />
                    {signal.risk_level}
                  </span>
                )
              )}

            </div>
          </div>

          {/* ==================================================
              TARGETS
              ================================================== */}

          <div className="flex items-center justify-between px-0.5 mb-1.5 overflow-x-auto">

            <div className="flex items-center gap-2.5">

              {/* SL */}

              <div className="flex flex-col items-start shrink-0">

                <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Stop Loss
                </span>

                <span
                  className={cn(
                    "font-mono text-[10px] font-bold mt-0.5",
                    getTargetColor(
                      "sl"
                    )
                  )}
                >
                  {signal.sl}
                </span>

              </div>

              <div className="h-3 w-[1px] bg-border/50" />

              {/* TP1 */}

              <div className="flex flex-col items-start shrink-0">

                <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Target 1
                </span>

                <span
                  className={cn(
                    "font-mono text-[10px] font-bold mt-0.5",
                    getTargetColor(
                      "tp1"
                    )
                  )}
                >
                  {signal.tp1}
                </span>

              </div>

              {/* TP2 */}

              {signal.tp2 && (
                <>
                  <div className="h-3 w-[1px] bg-border/50" />

                  <div className="flex flex-col items-start shrink-0">

                    <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Target 2
                    </span>

                    <span
                      className={cn(
                        "font-mono text-[10px] font-bold mt-0.5",
                        getTargetColor(
                          "tp2"
                        )
                      )}
                    >
                      {signal.tp2}
                    </span>

                  </div>
                </>
              )}

              {/* TP3 */}

              {signal.tp3 && (
                <>
                  <div className="h-3 w-[1px] bg-border/50" />

                  <div className="flex flex-col items-start shrink-0">

                    <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Target 3
                    </span>

                    <span
                      className={cn(
                        "font-mono text-[10px] font-bold mt-0.5",
                        getTargetColor(
                          "tp3"
                        )
                      )}
                    >
                      {signal.tp3}
                    </span>

                  </div>
                </>
              )}

              {/* TP4 */}

              {signal.tp4 && (
                <>
                  <div className="h-3 w-[1px] bg-border/50" />

                  <div className="flex flex-col items-start shrink-0">

                    <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Target 4
                    </span>

                    <span
                      className={cn(
                        "font-mono text-[10px] font-bold mt-0.5",
                        getTargetColor(
                          "tp4"
                        )
                      )}
                    >
                      {signal.tp4}
                    </span>

                  </div>
                </>
              )}

            </div>
          </div>

          {/* ==================================================
              PROFIT / STATUS NOTE
              ================================================== */}

          {signal.profit_note && (
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1",
                noteStyle.container
              )}
            >

              {isSLHit ? (
                <XCircle
                  className={cn(
                    "h-3 w-3 shrink-0",
                    noteStyle.icon
                  )}
                />
              ) : (
                <CheckCircle2
                  className={cn(
                    "h-3 w-3 shrink-0",
                    noteStyle.icon
                  )}
                />
              )}

              <span
                className={cn(
                  "text-[9px] font-medium leading-tight",
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
