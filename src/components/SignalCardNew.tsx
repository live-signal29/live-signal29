import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isToday, isYesterday, differenceInHours } from "date-fns";
import { Lock, Crown, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState, useRef, useCallback } from "react";
import { parseEntryPrice, calculateRunningPL, checkTPSLHit } from "@/hooks/useLivePrices";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import SignalCardExtras from "./SignalCardExtras";

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
    type: "Buy" | "Sell";
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
    tp1_hit: boolean;
    tp2_hit: boolean;
    tp3_hit: boolean;
    tp4_hit: boolean;
    sl_hit?: boolean;
    status: string;
    signal_status?: string;
    note?: string;
    profit_note?: string;
    pips_result?: string;
    risk_level?: string;
    signal_type?: string;
    analysis_reason?: string;
    created_at: string;
    category: string;
    is_premium?: boolean;
    current_price?: string;
    tag?: string;
    signal_raw_text?: string;
  };
  hasAccess?: boolean;
  subscriptionStatus?: string | null;
  livePrice?: number;
}

const SignalCardNew = ({ signal, hasAccess = true, subscriptionStatus, livePrice }: SignalCardProps) => {
  const navigate = useNavigate();
  const lifecycle = (signal.signal_status || signal.status || 'open').toLowerCase();
  const isNewSignal = differenceInHours(new Date(), new Date(signal.created_at)) < 24 && lifecycle !== 'close';
  const isPending = lifecycle === 'pending';
  const isOpen = lifecycle === 'open';
  const isClosed = lifecycle === 'close';
  
  // Entry mode logic
  const isLimitOrder = signal.entry_mode === "limit";
  const isBuy = signal.type?.toLowerCase() === "buy";

  const limitPrice = signal.limit_entry_price ?? 0;

  // Current price from live feed or stored value
  const currentPrice = livePrice || (signal.current_price ? parseFloat(signal.current_price) : 0);

  // Parse entry price for calculations
  const parsedEntryPrice = isLimitOrder && limitPrice > 0 
    ? limitPrice 
    : parseEntryPrice(signal.entry);

  // For premium signals: ONLY premium subscribers can see OPEN premium signals
  // CLOSED premium signals are visible to everyone (including free trial users)
  const isPremiumUser = subscriptionStatus === "premium";
  const isLocked = signal.is_premium && !isPremiumUser && isOpen;

  // Track price direction for MT5-style color animation
  const prevPriceRef = useRef<number>(currentPrice);
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const confettiFiredRef = useRef<boolean>(false);
  const initialTP3StateRef = useRef<boolean>(signal.tp3_hit); // Track initial TP3 state on mount

  // Check if signal is too new to show P/L (< 60 seconds since creation)
  const signalAgeMs = Date.now() - new Date(signal.created_at).getTime();
  const isVeryNewSignal = signalAgeMs < 60000; // 60 seconds

  // Check if entry has been "touched" - for MARKET orders, we assume entry touched immediately
  // For P/L to start, signal must be OPEN and not brand new
  const entryTouched = isOpen && !isVeryNewSignal;

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

  // Trigger confetti ONLY when TP3 changes from false to true during session
  // Not when opening dashboard with already closed signals
  useEffect(() => {
    if (
      signal.tp3_hit && 
      !initialTP3StateRef.current && // Was false on mount
      !confettiFiredRef.current && 
      document.visibilityState === 'visible'
    ) {
      triggerConfetti();
    }
  }, [signal.tp3_hit, triggerConfetti]);

  useEffect(() => {
    if (currentPrice > 0 && prevPriceRef.current > 0 && currentPrice !== prevPriceRef.current) {
      if (currentPrice > prevPriceRef.current) {
        setPriceDirection('up');
      } else if (currentPrice < prevPriceRef.current) {
        setPriceDirection('down');
      }
      prevPriceRef.current = currentPrice;

      // Reset animation after it plays
      const timer = setTimeout(() => setPriceDirection(null), 400);
      return () => clearTimeout(timer);
    }
  }, [currentPrice]);

  // IMPORTANT: UI must NOT auto-activate limit orders.
  // Activation happens in backend price listener only.

  // Running P/L MUST be calculated ONLY when:
  // 1. Signal status == OPEN
  // 2. Entry has been touched (signal is not brand new)
  // 3. We have valid current price and entry price
  const runningPL = isOpen && entryTouched && currentPrice > 0 && parsedEntryPrice > 0
    ? calculateRunningPL(currentPrice, parsedEntryPrice, signal.type)
    : null;

  // Auto-update TP/SL hits with smart signal management
  useEffect(() => {
    // STRICT: do not evaluate TP/SL until signal is OPEN (not pending, not closed)
    if (!isOpen || isPending || isClosed || !currentPrice || signal.sl_hit) return;

    const checkAndUpdate = async () => {
      const updates: Record<string, boolean | string> = {};
      const entryPrice = parsedEntryPrice;

      // Check TP1 - Auto move SL to Entry (Break Even)
      if (!signal.tp1_hit && signal.tp1) {
        const tp1Price = parseEntryPrice(signal.tp1);
        if (checkTPSLHit(currentPrice, tp1Price, signal.type)) {
          updates.tp1_hit = true;
          updates.profit_note = 'TP 1 Hit ✅ SL moved to B.E';
          updates.sl = signal.entry; // Auto move SL to entry (break even)
        }
      }

      // Check TP2 - Growth profit
      if (!signal.tp2_hit && signal.tp2) {
        const tp2Price = parseEntryPrice(signal.tp2);
        if (checkTPSLHit(currentPrice, tp2Price, signal.type)) {
          updates.tp2_hit = true;
          updates.profit_note = 'TP 2 Cleared! Secure More Profits 💰';
        }
      }

      // Check TP3 - Max Profit - AUTO CLOSE
      if (!signal.tp3_hit && signal.tp3) {
        const tp3Price = parseEntryPrice(signal.tp3);
        if (checkTPSLHit(currentPrice, tp3Price, signal.type)) {
          updates.tp3_hit = true;
          updates.signal_status = 'close';
          updates.profit_note = 'TP 3 Final Target Hit! 🎊 Maximum Profit Secured ✅';
        }
      }

      // Check TP4
      if (!signal.tp4_hit && signal.tp4) {
        const tp4Price = parseEntryPrice(signal.tp4);
        if (checkTPSLHit(currentPrice, tp4Price, signal.type)) {
          updates.tp4_hit = true;
        }
      }

      // BREAK EVEN CHECK - If TP1 was hit AND price returns to entry
      const isTP1Hit = signal.tp1_hit || updates.tp1_hit;
      if (isTP1Hit && entryPrice > 0) {
        const tolerance = entryPrice * 0.001; // 0.1% tolerance
        const priceAtEntry = Math.abs(currentPrice - entryPrice) <= tolerance;
        
        if (priceAtEntry) {
          // Close at break even - NOT as SL hit
          updates.signal_status = 'close';
          updates.profit_note = 'Signal Closed at Breakeven after TP1 ✅';
          updates.sl_hit = 'false'; // Explicitly NOT SL hit
        }
      }

      // Check SL - ONLY if TP1 is NOT hit
      if (!signal.sl_hit && signal.sl && !isTP1Hit) {
        const slPrice = parseEntryPrice(signal.sl);
        if (checkTPSLHit(currentPrice, slPrice, signal.type, true)) {
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
  }, [isOpen, isPending, isClosed, currentPrice, parsedEntryPrice, signal.id, signal.type, signal.entry, signal.tp1, signal.tp2, signal.tp3, signal.tp4, signal.sl,
      signal.tp1_hit, signal.tp2_hit, signal.tp3_hit, signal.tp4_hit, signal.sl_hit]);
  
  const handleShare = (platform: 'whatsapp' | 'telegram' | 'copy') => {
    const shareUrl = `https://live-signal29.vercel.app/signal/${signal.id}`;
    
    // Different share text for premium vs free signals
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
  
  const getStatusText = () => {
    return signal.signal_status || "OPEN";
  };

  const getStatusColor = () => {
    const status = (signal.signal_status || signal.status || "open").toLowerCase();
    if (status === "close") return "bg-destructive/10 text-destructive border-destructive";
    if (status === "pending") return "bg-warning/10 text-warning border-warning";
    return "bg-primary/10 text-primary border-primary";
  };

  const getRiskLevelColor = () => {
    if (signal.risk_level === "High") return "bg-card text-destructive border-destructive";
    if (signal.risk_level === "Medium") return "bg-card text-warning border-warning";
    return "bg-card text-success border-success";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return `Today, ${format(date, "hh:mm a")}`;
    if (isYesterday(date)) return `Yesterday, ${format(date, "hh:mm a")}`;
    return format(date, "dd MMM yyyy, hh:mm a");
  };

  return (
    <Card
      ref={cardRef}
      className={`relative overflow-hidden rounded-[20px] bg-card shadow-[0_1px_3px_hsl(var(--foreground)/0.05)] transition-all duration-300 ${
        signal.is_premium ? "border border-primary/30" : "border border-border"
      }`}
    >
      <CardContent className="relative z-10 p-0">
        {isNewSignal && !isLocked && (
          <div className="absolute right-2 top-2 z-10">
            <Badge className="animate-pulse bg-primary px-1.5 py-0 text-[9px] text-primary-foreground">
              NEW
            </Badge>
          </div>
        )}

        {isLocked ? (
          /* Locked State - Free user viewing premium signal */
          <>
            <div className="flex items-center gap-2 px-3 pt-3">
              <Badge
                className={`${
                  isBuy
                    ? "bg-success text-white"
                    : "bg-destructive text-white"
                } rounded-full border-0 px-3 py-1 text-[11px] font-extrabold uppercase`}
              >
                {signal.type}
              </Badge>
              <Crown className="h-4 w-4 text-yellow-500" />
              <span className="ml-auto text-[11px] text-muted-foreground">{formatDate(signal.created_at)}</span>
            </div>
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 px-4 py-6 text-center transition-colors hover:bg-muted/50"
              onClick={() => navigate("/premium")}
            >
              <div className="rounded-full bg-muted p-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
                🔒 BUY premium to see signal
              </span>
            </div>
            <div className="flex items-center border-t border-border px-3 py-2">
              <span
                className={`text-[10px] font-medium ${
                  getStatusText() === "CLOSE" ? "text-destructive" : "text-blue-500"
                }`}
              >
                {getStatusText() === "CLOSE" ? "Close" : "Open"}
              </span>
              {getStatusText() !== "CLOSE" && (
                <span className="flex-1 animate-pulse text-center text-base font-bold text-success">
                  LIVE SIGNAL
                </span>
              )}
            </div>
          </>
        ) : (
          <SignalCardExtras
            signalId={signal.id}
            pair={signal.pair}
            type={signal.type}
            entryPrice={parsedEntryPrice}
            sl={parseEntryPrice(signal.sl)}
            tps={[signal.tp1, signal.tp2, signal.tp3, signal.tp4].map((t) => (t ? parseEntryPrice(t) : 0))}
            tpHits={[signal.tp1_hit, signal.tp2_hit, signal.tp3_hit, signal.tp4_hit]}
            slHit={!!signal.sl_hit}
            currentPrice={currentPrice}
            createdAt={signal.created_at}
            isOpen={isOpen}
            isPending={isPending}
            isClosed={isClosed}
            analysis={signal.analysis_reason}
            riskLevel={signal.risk_level}
            signalType={signal.signal_type || signal.tag}
            profitNote={signal.profit_note}
            runningPL={runningPL}
            onShare={handleShare}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default SignalCardNew;
