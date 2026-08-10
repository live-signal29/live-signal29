import { useEffect, useState, useRef, useCallback } from "react";
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Crown, 
  Share2, 
  Copy, 
  Send 
} from "lucide-react";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { parseEntryPrice, calculateRunningPL, checkTPSLHit } from "@/hooks/useLivePrices";
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
  livePrice 
}: SignalCardProps) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const confettiFiredRef = useRef<boolean>(false);
  const initialTP3StateRef = useRef<boolean>(!!signal.tp3_hit);
  
  // ✅ REAL TIME STATE - har minute update
  const [, forceUpdate] = useState(0);

  // ✅ Har 60 second me component re-render karo
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(prev => prev + 1);
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Lifecycle calculations
  const lifecycle = (signal.signal_status || signal.status || 'open').toLowerCase();
  const isNewSignal = differenceInMinutes(new Date(), new Date(signal.created_at)) < 60 && lifecycle !== 'close';
  const isPending = lifecycle === 'pending';
  const isOpen = lifecycle === 'open' || lifecycle === 'running' || lifecycle === 'active';
  const isClosed = lifecycle === 'close' || lifecycle === 'closed';

  // Entry Mode Logic
  const isLimitOrder = signal.entry_mode === "limit";
  const limitPrice = signal.limit_entry_price ?? 0;
  const parsedEntryPrice = isLimitOrder && limitPrice > 0 ? limitPrice : parseEntryPrice(signal.entry);

  const isBuy = signal.type?.toLowerCase() === "buy";
  const currentPriceNum = livePrice || (signal.current_price ? parseFloat(signal.current_price) : 0);

  // Premium Lock Logic
  const isPremiumUser = subscriptionStatus === "premium";
  const isLocked = signal.is_premium && !isPremiumUser && isOpen;

  // Signal Age Check for P/L
  const signalAgeMs = Date.now() - new Date(signal.created_at).getTime();
  const isVeryNewSignal = signalAgeMs < 60000;
  const entryTouched = isOpen && !isVeryNewSignal;

  // Running P/L
  const runningPL = isOpen && entryTouched && currentPriceNum > 0 && parsedEntryPrice > 0
    ? calculateRunningPL(currentPriceNum, parsedEntryPrice, signal.type)
    : null;

  // Confetti celebration for TP3 hit
  const triggerConfetti = useCallback(() => {
    if (cardRef.current && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x, y },
        colors: ['#10b981', '#22c55e', '#4ade80', '#fbbf24', '#f59e0b'],
        zIndex: 9999,
      });
    }
  }, []);

  useEffect(() => {
    if (
      signal.tp3_hit && 
      !initialTP3StateRef.current && 
      !confettiFiredRef.current && 
      document.visibilityState === 'visible'
    ) {
      triggerConfetti();
    }
  }, [signal.tp3_hit, triggerConfetti]);

  // AUTO-UPDATE TP/SL Hits in Supabase
  useEffect(() => {
    if (!isOpen || isPending || isClosed || !currentPriceNum || signal.sl_hit) return;

    const checkAndUpdate = async () => {
      const updates: Record<string, boolean | string> = {};
      const entryPrice = parsedEntryPrice;

      // Check TP1 - Auto move SL to Entry (Break Even)
      if (!signal.tp1_hit && signal.tp1) {
        const tp1Price = parseEntryPrice(signal.tp1);
        if (checkTPSLHit(currentPriceNum, tp1Price, signal.type)) {
          updates.tp1_hit = true;
          updates.profit_note = 'TP 1 Hit ✅ SL moved to B.E';
          updates.sl = signal.entry;
        }
      }

      // Check TP2
      if (!signal.tp2_hit && signal.tp2) {
        const tp2Price = parseEntryPrice(signal.tp2);
        if (checkTPSLHit(currentPriceNum, tp2Price, signal.type)) {
          updates.tp2_hit = true;
          updates.profit_note = 'TP 2 Cleared! Secure More Profits 💰';
        }
      }

      // Check TP3 - Max Profit - AUTO CLOSE
      if (!signal.tp3_hit && signal.tp3) {
        const tp3Price = parseEntryPrice(signal.tp3);
        if (checkTPSLHit(currentPriceNum, tp3Price, signal.type)) {
          updates.tp3_hit = true;
          updates.signal_status = 'close';
          updates.profit_note = 'TP 3 Final Target Hit! 🎊 Maximum Profit Secured ✅';
        }
      }

      // Check TP4
      if (!signal.tp4_hit && signal.tp4) {
        const tp4Price = parseEntryPrice(signal.tp4);
        if (checkTPSLHit(currentPriceNum, tp4Price, signal.type)) {
          updates.tp4_hit = true;
        }
      }

      // BREAK EVEN CHECK
      const isTP1Hit = signal.tp1_hit || updates.tp1_hit;
      if (isTP1Hit && entryPrice > 0) {
        const tolerance = entryPrice * 0.001;
        const priceAtEntry = Math.abs(currentPriceNum - entryPrice) <= tolerance;
        
        if (priceAtEntry) {
          updates.signal_status = 'close';
          updates.profit_note = 'Signal Closed at Breakeven after TP1 ✅';
          updates.sl_hit = 'false';
        }
      }

      // Check SL - ONLY if TP1 is NOT hit
      if (!signal.sl_hit && signal.sl && !isTP1Hit) {
        const slPrice = parseEntryPrice(signal.sl);
        if (checkTPSLHit(currentPriceNum, slPrice, signal.type, true)) {
          updates.sl_hit = true;
          updates.signal_status = 'close';
          updates.profit_note = 'SL Hit ❌ - Staying patient for a better entry.';
        }
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from('signals').update(updates).eq('id', signal.id);
      }
    };

    checkAndUpdate();
  }, [isOpen, isPending, isClosed, currentPriceNum, parsedEntryPrice, signal.id, signal.type, signal.entry, signal.tp1, signal.tp2, signal.tp3, signal.tp4, signal.sl, signal.tp1_hit, signal.tp2_hit, signal.tp3_hit, signal.tp4_hit, signal.sl_hit]);

  // Social Share Logic
  const handleShare = (e: React.MouseEvent<HTMLDivElement>, platform: 'whatsapp' | 'telegram' | 'copy') => {
    e.stopPropagation();
    const shareUrl = `https://live-signal29.vercel.app/signal/${signal.id}`;
    
    const shareText = isLocked || signal.is_premium
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

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(shareText);
      toast.success("Signal link copied to clipboard!");
    }
  };

  // ✅ REAL TIME TIME FORMAT - "X mins ago" style
  const formatRealTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMinutes = differenceInMinutes(now, date);
      
      // < 1 minute
      if (diffMinutes < 1) return "Just now";
      
      // < 60 minutes
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      
      // < 24 hours (Today)
      if (isToday(date)) return `Today, ${format(date, "hh:mm a")}`;
      
      // Yesterday
      if (isYesterday(date)) return `Yesterday, ${format(date, "hh:mm a")}`;
      
      // Older
      return format(date, "dd MMM, hh:mm a");
    } catch {
      return "Just now";
    }
  };

  const pairUpper = signal.pair?.toUpperCase() || "";
  const note = signal.profit_note || "";

  const getSignalStatus = () => {
    if (isClosed || note.includes("SL") || note.includes("Breakeven")) return "CLOSED";
    if (isPending) return "PENDING";
    return "OPEN";
  };

  const statusText = getSignalStatus();

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

  const getTargetColor = (targetType: "sl" | "tp1" | "tp2" | "tp3" | "tp4") => {
    if (targetType === "sl") return "text-rose-500 dark:text-rose-500";
    if (signal.tp3_hit || note.includes("TP3")) return "text-emerald-500 dark:text-emerald-400";
    if (signal.tp2_hit || note.includes("TP2")) return "text-emerald-500 dark:text-emerald-400";
    if (signal.tp1_hit || note.includes("TP1")) return "text-emerald-500 dark:text-emerald-400";
    return "text-blue-600 dark:text-blue-400";
  };

  const isSLHit = note.includes("SL") || signal.sl_hit;

  return (
    <div
      ref={cardRef}
      onClick={() => isLocked ? navigate("/premium") : navigate(`/signal/${signal.id}`)}
      className="relative mb-2 w-full rounded-[12px] bg-card border border-border/50 p-2.5 text-foreground shadow-sm hover:border-border hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between mb-1.5">
        
        {/* LEFT: Icon + Pair + NEW Tag */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-yellow-500/40 bg-background/60 text-[10px] shadow-sm">
            {pairUpper.includes("XAU") ? "🪙" : pairUpper.includes("BTC") ? "₿" : "💶"}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="text-[10.5px] font-bold text-foreground leading-tight">
                {signal.pair.replace("/", "")}
              </h3>
              {isNewSignal && !isLocked && (
                <span className="animate-pulse bg-primary px-1 py-[0.5px] rounded text-[6px] font-extrabold text-primary-foreground">
                  NEW
                </span>
              )}
              {signal.is_premium && (
                <Crown className="h-3 w-3 text-amber-500 shrink-0" />
              )}
            </div>

            <p className="text-[7.5px] text-muted-foreground leading-tight">
              {pairUpper.includes("XAU") ? "Gold" : pairUpper.includes("BTC") ? "Bitcoin" : "Forex"}
            </p>
          </div>
        </div>

        {/* RIGHT: Status + Time + Share Dropdown */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-1.5 py-[2px] text-[6px] font-bold uppercase tracking-wide leading-none",
              getStatusStyle()
            )}
          >
            <span
              className={cn(
                "mr-1 h-1 w-1 rounded-full",
                statusText === "CLOSED" ? "bg-rose-500" : statusText === "OPEN" ? "bg-emerald-500" : "bg-amber-500"
              )}
            />
            {statusText}
          </span>

          {/* ✅ REAL TIME TIME DISPLAY - har 1 minute update */}
          <div className="flex items-center gap-0.5 text-[7.5px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            <span>{formatRealTime(signal.created_at)}</span>
          </div>

          {/* Share Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="p-1 rounded-full hover:bg-muted/60 text-muted-foreground transition-colors">
                <Share2 className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={(e) => handleShare(e, 'whatsapp')}>
                <Send className="mr-2 h-3.5 w-3.5 text-green-500" /> WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleShare(e, 'telegram')}>
                <Send className="mr-2 h-3.5 w-3.5 text-blue-500" /> Telegram
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleShare(e, 'copy')}>
                <Copy className="mr-2 h-3.5 w-3.5" /> Copy Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ===== LOCKED VIEW FOR FREE USERS ===== */}
      {isLocked ? (
        <div className="flex flex-col items-center justify-center gap-1.5 py-4 bg-muted/20 rounded-[9px] border border-dashed border-border/60">
          <Lock className="h-4 w-4 text-amber-500" />
          <span className="text-[10px] font-bold text-muted-foreground">
            🔒 Premium Signal - Tap to Unlock
          </span>
        </div>
      ) : (
        <>
          {/* ===== PRICES ===== */}
          <div className="flex items-center justify-between rounded-[9px] bg-muted/30 border border-border/50 px-2 py-1.5 mb-1.5">
            {/* Entry */}
            <div className="flex flex-col">
              <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Entry
              </span>
              <span className="font-mono text-[10.5px] font-bold text-foreground">
                {signal.entry}
              </span>
            </div>

            {/* Current */}
            <div className="flex flex-col items-center">
              <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Current
              </span>
              <span
                className={cn(
                  "font-mono text-[11px] font-bold",
                  isBuy ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                )}
              >
                {currentPriceNum > 0 ? currentPriceNum.toFixed(2) : signal.entry}
              </span>
            </div>

            {/* Type + Risk / Running P/L */}
            <div className="flex flex-col items-end gap-0.5">
              <span
                className={cn(
                  "rounded-full px-1.5 py-[0.5px] text-[6.5px] font-bold uppercase",
                  isBuy ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300" : "bg-rose-500/20 text-rose-600 dark:text-rose-300"
                )}
              >
                {signal.type.toUpperCase()}
              </span>

              {runningPL !== null ? (
                <span className={cn(
                  "font-mono text-[8px] font-bold",
                  runningPL >= 0 ? "text-emerald-500" : "text-rose-500"
                )}>
                  {runningPL >= 0 ? `+${runningPL.toFixed(1)} pips` : `${runningPL.toFixed(1)} pips`}
                </span>
              ) : signal.risk_level && (
                <span className={cn(
                  "flex items-center gap-0.5 text-[6.5px] font-medium",
                  signal.risk_level === "High" ? "text-rose-500 dark:text-rose-400" : signal.risk_level === "Medium" ? "text-amber-500 dark:text-amber-400" : "text-emerald-500 dark:text-emerald-400"
                )}>
                  <AlertCircle className="h-2 w-2" />
                  {signal.risk_level}
                </span>
              )}
            </div>
          </div>

          {/* ===== TARGETS ===== */}
          <div className="flex items-center justify-between px-0.5 mb-1.5">
            <div className="flex items-center gap-2.5">
              {/* SL */}
              <div className="flex flex-col items-start">
                <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Stop Loss
                </span>
                <span className={`font-mono text-[10px] font-bold mt-0.5 ${getTargetColor("sl")}`}>
                  {signal.sl}
                </span>
              </div>

              <div className="h-3 w-[1px] bg-border/50" />

              {/* TP1 */}
              <div className="flex flex-col items-start">
                <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Target 1
                </span>
                <span className={`font-mono text-[10px] font-bold mt-0.5 ${getTargetColor("tp1")}`}>
                  {signal.tp1}
                </span>
              </div>

              {/* TP2 */}
              {signal.tp2 && (
                <>
                  <div className="h-3 w-[1px] bg-border/50" />
                  <div className="flex flex-col items-start">
                    <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Target 2
                    </span>
                    <span className={`font-mono text-[10px] font-bold mt-0.5 ${getTargetColor("tp2")}`}>
                      {signal.tp2}
                    </span>
                  </div>
                </>
              )}

              {/* TP3 */}
              {signal.tp3 && (
                <>
                  <div className="h-3 w-[1px] bg-border/50" />
                  <div className="flex flex-col items-start">
                    <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Target 3
                    </span>
                    <span className={`font-mono text-[10px] font-bold mt-0.5 ${getTargetColor("tp3")}`}>
                      {signal.tp3}
                    </span>
                  </div>
                </>
              )}

              {/* TP4 */}
              {signal.tp4 && (
                <>
                  <div className="h-3 w-[1px] bg-border/50" />
                  <div className="flex flex-col items-start">
                    <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      Target 4
                    </span>
                    <span className={`font-mono text-[10px] font-bold mt-0.5 ${getTargetColor("tp4")}`}>
                      {signal.tp4}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ===== PROFIT / STATUS NOTE ===== */}
          {signal.profit_note && (
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1",
                isSLHit ? "border-rose-500/30 bg-rose-500/10" : "border-emerald-500/30 bg-emerald-500/10"
              )}
            >
              {isSLHit ? (
                <XCircle className="h-3 w-3 text-rose-500 dark:text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
              )}

              <span
                className={cn(
                  "text-[9px] font-medium leading-tight",
                  isSLHit ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-300"
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
