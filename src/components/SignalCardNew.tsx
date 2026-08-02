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
      className={`overflow-hidden transition-all duration-300 shadow-sm relative bg-card ${
        signal.is_premium 
          ? 'border-2 border-primary/40' 
          : 'border-border'
      } ${!isLocked && 'hover:border-primary/50 hover:shadow-md'}`}
    >
      <CardContent className="p-0 relative z-10">
        {/* NEW Badge - only on unlocked */}
        {isNewSignal && !isLocked && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 animate-pulse">
              NEW
            </Badge>
          </div>
        )}

        {/* Header - Always Visible */}
        <div className="flex justify-between items-start p-2.5 sm:p-3 border-b border-border">
          <div className="flex items-start gap-2">
            <Badge className={`${signal.type === "Buy" ? "bg-success/10 text-success border-success" : "bg-destructive/10 text-destructive border-destructive"} border font-bold text-xs mt-0.5`}>
              {signal.type.toUpperCase()}
            </Badge>
            {signal.is_premium && (
              <div className="relative">
                <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-1 animate-crown-bounce drop-shadow-[0_0_6px_hsl(45_100%_50%/0.6)]" />
                <div className="absolute inset-0 animate-ping opacity-30">
                  <Crown className="h-4 w-4 text-yellow-400 mt-1" />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-bold text-primary">
                  {signal.pair}
                </span>
                {signal.tag && signal.tag.trim() && (
                  <Badge className="bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] px-2 py-0.5 font-semibold">
                    {signal.tag.trim()}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-medium">
                  <span className="text-muted-foreground">Entry:</span>
                  <span className={`font-semibold ml-1 ${
                    isLocked ? 'text-yellow-500' : isPending ? 'text-orange-500' : (isLimitOrder ? 'text-success' : 'text-blue-500')
                  }`}>
                    {isLimitOrder
                      ? (isPending
                          ? `${signal.type === 'Buy' ? 'Limit Buy' : 'Limit Sell'} @ ${limitPrice}`
                          : `${signal.type}`)
                      : signal.entry
                    }
                  </span>
                </span>
              </div>
              {/* Show current price for OPEN and PENDING signals with MT5-style animation */}
              {(isOpen || isPending) && currentPrice > 0 && !isLocked && (
                <span className="text-[10px] text-muted-foreground">
                  Current: <span
                    key={currentPrice}
                    className={`font-semibold px-1 py-0.5 rounded transition-colors ${
                      priceDirection === 'up'
                        ? 'text-success animate-price-up'
                        : priceDirection === 'down'
                          ? 'text-destructive animate-price-down'
                          : 'text-foreground'
                    }`}
                  >
                    {currentPrice.toFixed(2)}
                  </span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-accent"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
                  Share on WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('telegram')}>
                  Share on Telegram
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('copy')}>
                  Copy Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {formatDate(signal.created_at)}
            </span>
          </div>
        </div>

        {isLocked ? (
          /* Locked State - Free user viewing premium signal */
          <>
            <div 
              className="flex flex-col items-center justify-center gap-2 py-6 px-4 cursor-pointer hover:bg-muted/50 transition-colors text-center"
              onClick={() => navigate("/premium")}
            >
              <div className="bg-muted p-2 rounded-full">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
                🔒 BUY premium to see signal
              </span>
            </div>
            {/* Footer showing status left, LIVE SIGNAL centered */}
            <div className="px-3 py-2 border-t border-border flex items-center">
              <span className={`text-[10px] font-medium ${
                getStatusText() === 'CLOSE' ? 'text-destructive' : 'text-blue-500'
              }`}>
                {getStatusText() === 'CLOSE' ? 'Close' : 'Open'}
              </span>
              {/* LIVE SIGNAL centered - only when OPEN */}
              {getStatusText() !== 'CLOSE' && (
                <span className="flex-1 text-center text-base font-bold text-success animate-pulse">
                  LIVE SIGNAL
                </span>
              )}
            </div>
          </>
        ) : (
          /* Unlocked State - Show all details */
          <>
            {/* Badges Row - Side aligned */}
            <div className="flex flex-wrap gap-1.5 p-2 sm:p-3 bg-card border-b border-border/50">
              {signal.risk_level && (
                <Badge className={`${getRiskLevelColor()} border text-[10px] sm:text-xs`}>
                  {signal.risk_level} Risk
                </Badge>
              )}
              {signal.signal_type && (
                <Badge variant="outline" className="bg-card text-[10px] sm:text-xs">
                  {signal.signal_type}
                </Badge>
              )}
              {/* Pips result removed from card - only count in Results page */}
            </div>

            {/* TP/SL Table */}
            <div className="p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground text-xs sm:text-sm">
                    TAKE PROFIT 1 {signal.tp1_hit && <span className="text-success inline-block animate-tp-tick">✓</span>}
                  </span>
                  <span className={`font-semibold text-xs sm:text-sm ${signal.tp1_hit ? 'text-success' : 'text-foreground'}`}>
                    {signal.tp1}
                  </span>
                </div>
                
                {signal.tp2 && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      TAKE PROFIT 2 {signal.tp2_hit && <span className="text-success inline-block animate-tp-tick">✓</span>}
                    </span>
                    <span className={`font-semibold text-xs sm:text-sm ${signal.tp2_hit ? 'text-success' : 'text-foreground'}`}>
                      {signal.tp2}
                    </span>
                  </div>
                )}
                
                {signal.tp3 && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      TAKE PROFIT 3 {signal.tp3_hit && <span className="text-success inline-block animate-tp-tick">✓</span>}
                    </span>
                    <span className={`font-semibold text-xs sm:text-sm ${signal.tp3_hit ? 'text-success' : 'text-foreground'}`}>
                      {signal.tp3}
                    </span>
                  </div>
                )}

                {signal.tp4 && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      TAKE PROFIT 4 {signal.tp4_hit && <span className="text-success inline-block animate-tp-tick">✓</span>}
                    </span>
                    <span className={`font-semibold text-xs sm:text-sm ${signal.tp4_hit ? 'text-success' : 'text-foreground'}`}>
                      {signal.tp4}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground text-xs sm:text-sm">
                    {/* BUY = SL Below, SELL = SL Above */}
                    {isBuy ? 'SL-BELOW' : 'SL-ABOVE'} {signal.sl_hit && <span className="text-destructive">✗</span>}
                  </span>
                  <span className={`font-semibold text-xs sm:text-sm ${signal.sl_hit ? 'text-destructive' : 'text-foreground'}`}>
                    {signal.sl}
                  </span>
                </div>

              </div>

              {/* Analysis Reason */}
              {signal.analysis_reason && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    <span className="font-semibold">Analysis:</span> {signal.analysis_reason}
                  </p>
                </div>
              )}

              {/* Raw Signal Text Display */}
              {signal.signal_raw_text && (
                <div className="mt-3 pt-3 border-t border-cyan-500/30 bg-cyan-500/5 rounded-lg p-2">
                  <p className="text-[10px] text-cyan-400 font-semibold mb-1">📋 Signal Details:</p>
                  <pre className="text-[10px] sm:text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                    {signal.signal_raw_text}
                  </pre>
                </div>
              )}

              {/* Note */}
              {signal.note && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{signal.note}</p>
                </div>
              )}

              {/* Profit Note / Running P/L + Status together with smart colors */}
              {signal.profit_note ? (
                // Show static profit note with smart color coding
                <div className={`mt-2 pt-2 border-t flex items-center ${
                  signal.profit_note.includes('SL Hit') ? 'border-red-500/30' :
                  signal.profit_note.includes('B.E') ? 'border-blue-500/30' :
                  'border-success/20'
                }`}>
                  <span className={`text-[10px] font-medium ${
                    isClosed ? 'text-destructive' : isPending ? 'text-orange-500' : 'text-blue-500'
                  }`}>
                    {isClosed ? 'Close' : isPending ? 'Pending' : 'Open'}
                  </span>
                  <p className={`flex-1 text-center text-xs sm:text-sm ${
                    // TP3/Final - Same green as TP hit color with bold
                    signal.profit_note.includes('Final Target') || signal.profit_note.includes('Maximum Profit') ? 'text-success font-bold' :
                    // SL Hit - Pure Red
                    signal.profit_note.includes('SL Hit') ? 'text-[#FF0000] font-semibold' :
                    // Break Even - Blue
                    signal.profit_note.includes('B.E') ? 'text-[#3B82F6] font-semibold' :
                    // TP1 - Same green as TP hit color
                    signal.profit_note.includes('TP 1 Done!') ? 'text-success font-semibold' :
                    // TP2 - Dark green
                    signal.profit_note.includes('TP 2') ? 'text-success-deep font-semibold' :
                    // Default success
                    'text-success font-semibold'
                  }`}>
                    {signal.profit_note}
                  </p>
                </div>
              ) : isOpen && runningPL ? (
                // Show running P/L ONLY for OPEN signals
                <div className="mt-2 pt-2 border-t border-border/30 flex items-center">
                  <span className="text-[10px] font-medium text-blue-500">Active</span>
                  <p className="flex-1 text-center text-xs sm:text-sm font-bold">
                    <span className="text-foreground">Running P/L:</span>{' '}
                    <span className={runningPL.isProfit ? 'text-success' : 'text-destructive'}>
                      {runningPL.formatted}
                    </span>
                  </p>
                </div>
              ) : isPending ? (
                // Pending: show Pending status on left + center helper text
                <div className="mt-2 pt-2 border-t border-border/30 flex items-center">
                  <span className="text-[10px] font-medium text-orange-500">Pending</span>
                  <p className="flex-1 text-center text-xs sm:text-sm font-semibold text-orange-500 animate-pulse">
                    ⏳ Wait for entry level
                  </p>
                </div>
              ) : (
                // Default: just show status
                <div className="mt-2 pt-2 border-t border-border/30 flex justify-start">
                  <span className={`text-[10px] font-medium ${isClosed ? 'text-destructive' : 'text-blue-500'}`}>
                    {isClosed ? 'Close' : 'Open'}
                  </span>
                </div>
              )}
            </div>

            <SignalCardExtras
              signalId={signal.id}
              pair={signal.pair}
              type={signal.type}
              entryPrice={parsedEntryPrice}
              sl={parseEntryPrice(signal.sl)}
              tps={[signal.tp1, signal.tp2, signal.tp3, signal.tp4].map((t) => (t ? parseEntryPrice(t) : 0))}
              currentPrice={currentPrice}
              createdAt={signal.created_at}
              isOpen={isOpen}
              analysis={signal.analysis_reason}
            />
          </>
        )}

      </CardContent>
    </Card>
  );
};

export default SignalCardNew;
