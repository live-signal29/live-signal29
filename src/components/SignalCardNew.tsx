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

  // Auto-update TP/SL hits
  useEffect(() => {
    // STRICT: do not evaluate TP/SL until signal is OPEN (not pending, not closed)
    // isPending or isClosed signals should NEVER trigger TP/SL checks
    if (!isOpen || isPending || isClosed || !currentPrice || signal.sl_hit) return;

    const checkAndUpdate = async () => {
      const updates: Record<string, boolean | string> = {};

      // Check TP1 - Auto move SL to breakeven when TP1 hits
      if (!signal.tp1_hit && signal.tp1) {
        const tp1Price = parseEntryPrice(signal.tp1);
        if (checkTPSLHit(currentPrice, tp1Price, signal.type)) {
          updates.tp1_hit = true;
          updates.profit_note = '1st TP done ✅ SL moved to BE 🔒';
          updates.sl = signal.entry; // Auto move SL to breakeven (entry price)
        }
      }

      // Check TP2
      if (!signal.tp2_hit && signal.tp2) {
        const tp2Price = parseEntryPrice(signal.tp2);
        if (checkTPSLHit(currentPrice, tp2Price, signal.type)) {
          updates.tp2_hit = true;
          updates.profit_note = '2nd TP done ✅ Secure Profit or Hold Half for More 📈';
        }
      }

      // Check TP3 - AUTO CLOSE when TP3 hits
      if (!signal.tp3_hit && signal.tp3) {
        const tp3Price = parseEntryPrice(signal.tp3);
        if (checkTPSLHit(currentPrice, tp3Price, signal.type)) {
          updates.tp3_hit = true;
          updates.signal_status = 'close';
          updates.profit_note = '3rd TP done 🎉 Enjoy Profit 🥳';
        }
      }

      // Check TP4
      if (!signal.tp4_hit && signal.tp4) {
        const tp4Price = parseEntryPrice(signal.tp4);
        if (checkTPSLHit(currentPrice, tp4Price, signal.type)) {
          updates.tp4_hit = true;
        }
      }

      // Check SL
      if (!signal.sl_hit && signal.sl) {
        const slPrice = parseEntryPrice(signal.sl);
        if (checkTPSLHit(currentPrice, slPrice, signal.type, true)) {
          updates.sl_hit = true;
          updates.signal_status = 'close';
        }
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from('signals').update(updates).eq('id', signal.id);
      }
    };

    checkAndUpdate();
  }, [isOpen, isPending, isClosed, currentPrice, signal.id, signal.type, signal.tp1, signal.tp2, signal.tp3, signal.tp4, signal.sl,
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
      className={`overflow-hidden transition-all duration-300 relative bg-card rounded-2xl ${
        signal.is_premium 
          ? 'ring-2 ring-primary/30 shadow-lg shadow-primary/10' 
          : 'shadow-md hover:shadow-lg'
      } ${!isLocked && 'hover:ring-2 hover:ring-primary/20'}`}
    >
      <CardContent className="p-0 relative z-10">
        {/* NEW Badge - Premium floating style */}
        {isNewSignal && !isLocked && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] px-2.5 py-1 rounded-full font-bold shadow-lg animate-pulse">
              NEW
            </Badge>
          </div>
        )}

        {/* Header - Modern Premium Design */}
        <div className="flex justify-between items-start p-4 bg-gradient-to-r from-card via-card to-muted/20">
          <div className="flex items-center gap-3">
            {/* Buy/Sell Badge - Pill Style */}
            <Badge className={`${signal.type === "Buy" 
              ? "bg-success text-success-foreground" 
              : "bg-destructive text-destructive-foreground"} 
              font-bold text-xs px-3 py-1 rounded-full shadow-sm`}>
              {signal.type.toUpperCase()}
            </Badge>
            
            {signal.is_premium && (
              <div className="relative">
                <Crown className="h-5 w-5 text-yellow-500 animate-crown-bounce drop-shadow-[0_0_8px_hsl(45_100%_50%/0.6)]" />
              </div>
            )}
            
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold text-foreground">
                {signal.pair}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Entry:</span>
                <span className={`font-bold text-sm ${
                  isLocked ? 'text-yellow-500' : isPending ? 'text-orange-500' : 'text-primary'
                }`}>
                  {isLimitOrder
                    ? (isPending ? `Limit @ ${limitPrice}` : signal.entry)
                    : signal.entry
                  }
                </span>
              </div>
              {/* Current Price - Compact MT5 Style */}
              {(isOpen || isPending) && currentPrice > 0 && !isLocked && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">Now:</span>
                  <span
                    key={currentPrice}
                    className={`font-bold text-xs px-1.5 py-0.5 rounded ${
                      priceDirection === 'up'
                        ? 'bg-success/20 text-success'
                        : priceDirection === 'down'
                          ? 'bg-destructive/20 text-destructive'
                          : 'bg-muted text-foreground'
                    }`}
                  >
                    {currentPrice.toFixed(2)}
                  </span>
                </div>
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
            {/* Badges Row - Modern Pill Style */}
            <div className="flex flex-wrap gap-2 px-4 py-3 bg-muted/30">
              {signal.risk_level && (
                <Badge className={`${
                  signal.risk_level === "High" 
                    ? "bg-destructive/10 text-destructive border-destructive/30" 
                    : signal.risk_level === "Medium"
                      ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"
                      : "bg-success/10 text-success border-success/30"
                } border rounded-full px-3 py-1 text-[11px] font-semibold`}>
                  {signal.risk_level} Risk
                </Badge>
              )}
              {signal.signal_type && (
                <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] font-medium bg-card">
                  {signal.signal_type}
                </Badge>
              )}
              {signal.pips_result && (
                <Badge className="bg-success/15 text-success border-success/30 border rounded-full px-3 py-1 text-[11px] font-bold">
                  {signal.pips_result}
                </Badge>
              )}
            </div>

            {/* TP/SL Grid - Modern 2-Column Layout */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {/* TP1 */}
                <div className={`flex justify-between items-center p-2.5 rounded-xl ${signal.tp1_hit ? 'bg-success/10' : 'bg-muted/50'}`}>
                  <span className="text-muted-foreground text-xs font-medium">
                    TAKE PROFIT 1 {signal.tp1_hit && <span className="text-success ml-1">✓</span>}
                  </span>
                  <span className={`font-bold text-sm ${signal.tp1_hit ? 'text-success' : 'text-primary'}`}>
                    {signal.tp1}
                  </span>
                </div>
                
                {/* TP2 */}
                {signal.tp2 && (
                  <div className={`flex justify-between items-center p-2.5 rounded-xl ${signal.tp2_hit ? 'bg-success/10' : 'bg-muted/50'}`}>
                    <span className="text-muted-foreground text-xs font-medium">
                      TAKE PROFIT 2 {signal.tp2_hit && <span className="text-success ml-1">✓</span>}
                    </span>
                    <span className={`font-bold text-sm ${signal.tp2_hit ? 'text-success' : 'text-primary'}`}>
                      {signal.tp2}
                    </span>
                  </div>
                )}
                
                {/* TP3 */}
                {signal.tp3 && (
                  <div className={`flex justify-between items-center p-2.5 rounded-xl ${signal.tp3_hit ? 'bg-success/10' : 'bg-muted/50'}`}>
                    <span className="text-muted-foreground text-xs font-medium">
                      TAKE PROFIT 3 {signal.tp3_hit && <span className="text-success ml-1">✓</span>}
                    </span>
                    <span className={`font-bold text-sm ${signal.tp3_hit ? 'text-success' : 'text-primary'}`}>
                      {signal.tp3}
                    </span>
                  </div>
                )}

                {/* TP4 */}
                {signal.tp4 && (
                  <div className={`flex justify-between items-center p-2.5 rounded-xl ${signal.tp4_hit ? 'bg-success/10' : 'bg-muted/50'}`}>
                    <span className="text-muted-foreground text-xs font-medium">
                      TAKE PROFIT 4 {signal.tp4_hit && <span className="text-success ml-1">✓</span>}
                    </span>
                    <span className={`font-bold text-sm ${signal.tp4_hit ? 'text-success' : 'text-primary'}`}>
                      {signal.tp4}
                    </span>
                  </div>
                )}
                
                {/* SL */}
                <div className={`flex justify-between items-center p-2.5 rounded-xl col-span-2 ${signal.sl_hit ? 'bg-destructive/10' : 'bg-muted/50'}`}>
                  <span className="text-muted-foreground text-xs font-medium">
                    SL-BELOW {signal.sl_hit && <span className="text-destructive ml-1">✗</span>}
                  </span>
                  <span className={`font-bold text-sm ${signal.sl_hit ? 'text-destructive' : 'text-foreground'}`}>
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

              {/* Note */}
              {signal.note && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{signal.note}</p>
                </div>
              )}

              {/* Profit Note / Running P/L + Status together */}
              {signal.profit_note ? (
                // Show static profit note (typically for CLOSED signals)
                <div className="mt-2 pt-2 border-t border-success/20 flex items-center">
                  <span className={`text-[10px] font-medium ${
                    isClosed ? 'text-destructive' : isPending ? 'text-orange-500' : 'text-blue-500'
                  }`}>
                    {isClosed ? 'Close' : isPending ? 'Pending' : 'Open'}
                  </span>
                  <p className="flex-1 text-center text-xs sm:text-sm font-semibold text-success">
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
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalCardNew;
