import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isToday, isYesterday, differenceInHours, formatDistanceToNow } from "date-fns";
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

// Currency flag emojis mapping
const getCurrencyFlag = (pair: string): string => {
  const pairUpper = pair.toUpperCase();
  if (pairUpper.includes("EUR")) return "🇪🇺";
  if (pairUpper.includes("GBP")) return "🇬🇧";
  if (pairUpper.includes("USD")) return "🇺🇸";
  if (pairUpper.includes("JPY")) return "🇯🇵";
  if (pairUpper.includes("AUD")) return "🇦🇺";
  if (pairUpper.includes("CAD")) return "🇨🇦";
  if (pairUpper.includes("CHF")) return "🇨🇭";
  if (pairUpper.includes("NZD")) return "🇳🇿";
  if (pairUpper.includes("XAU") || pairUpper.includes("GOLD")) return "🥇";
  if (pairUpper.includes("XAG") || pairUpper.includes("SILVER")) return "🥈";
  if (pairUpper.includes("BTC")) return "₿";
  if (pairUpper.includes("ETH")) return "⟠";
  if (pairUpper.includes("OIL") || pairUpper.includes("CRUDE") || pairUpper.includes("BRENT")) return "🛢️";
  if (pairUpper.includes("US30") || pairUpper.includes("DOW")) return "📈";
  if (pairUpper.includes("NAS") || pairUpper.includes("NASDAQ")) return "💹";
  if (pairUpper.includes("SPX") || pairUpper.includes("S&P")) return "📊";
  return "💱";
};

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
  const initialTP3StateRef = useRef<boolean>(signal.tp3_hit);

  // Check if signal is too new to show P/L (< 60 seconds since creation)
  const signalAgeMs = Date.now() - new Date(signal.created_at).getTime();
  const isVeryNewSignal = signalAgeMs < 60000;

  // Check if entry has been "touched" - for MARKET orders, we assume entry touched immediately
  const entryTouched = isOpen && !isVeryNewSignal;

  // Calculate progress for circular indicator
  const calculateProgress = () => {
    const tpLevels = [signal.tp1_hit, signal.tp2_hit, signal.tp3_hit, signal.tp4_hit].filter(Boolean).length;
    const totalTPs = [signal.tp1, signal.tp2, signal.tp3, signal.tp4].filter(Boolean).length;
    if (signal.sl_hit) return 0;
    if (totalTPs === 0) return 0;
    return (tpLevels / totalTPs) * 100;
  };

  const progress = calculateProgress();
  const isProfit = signal.tp1_hit || signal.tp2_hit || signal.tp3_hit || signal.tp4_hit;
  const isLoss = signal.sl_hit;

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

  useEffect(() => {
    if (currentPrice > 0 && prevPriceRef.current > 0 && currentPrice !== prevPriceRef.current) {
      if (currentPrice > prevPriceRef.current) {
        setPriceDirection('up');
      } else if (currentPrice < prevPriceRef.current) {
        setPriceDirection('down');
      }
      prevPriceRef.current = currentPrice;

      const timer = setTimeout(() => setPriceDirection(null), 400);
      return () => clearTimeout(timer);
    }
  }, [currentPrice]);

  // Running P/L calculation
  const runningPL = isOpen && entryTouched && currentPrice > 0 && parsedEntryPrice > 0
    ? calculateRunningPL(currentPrice, parsedEntryPrice, signal.type)
    : null;

  // Auto-update TP/SL hits
  useEffect(() => {
    if (!isOpen || isPending || isClosed || !currentPrice || signal.sl_hit) return;

    const checkAndUpdate = async () => {
      const updates: Record<string, boolean | string> = {};

      // Check TP1 - Auto move SL to breakeven when TP1 hits
      if (!signal.tp1_hit && signal.tp1) {
        const tp1Price = parseEntryPrice(signal.tp1);
        if (checkTPSLHit(currentPrice, tp1Price, signal.type)) {
          updates.tp1_hit = true;
          updates.profit_note = '1st TP done ✅ SL moved to BE 🔒';
          updates.sl = signal.entry;
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

  const timeAgo = formatDistanceToNow(new Date(signal.created_at), { addSuffix: false });

  return (
    <Card 
      ref={cardRef}
      className={`overflow-hidden transition-all duration-200 bg-card border-border/40 rounded-xl ${
        signal.is_premium ? 'ring-1 ring-primary/20' : ''
      }`}
    >
      <CardContent className="p-0">
        {/* Main Content Row */}
        <div className="p-4 flex items-start gap-3">
          {/* Currency Icon Circle */}
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl flex-shrink-0">
            {getCurrencyFlag(signal.pair)}
          </div>

          {/* Signal Info */}
          <div className="flex-1 min-w-0">
            {/* Pair Name & Badges Row */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-foreground text-base truncate">{signal.pair}</span>
              {signal.is_premium && (
                <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              )}
            </div>

            {/* Buy/Sell + Status Badges */}
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${
                signal.type === "Buy" 
                  ? "bg-success text-success-foreground" 
                  : "bg-destructive text-destructive-foreground"
              } text-[10px] font-bold px-2 py-0.5 rounded`}>
                {signal.type.toUpperCase()}
              </Badge>
              
              {isProfit && !isLoss && (
                <Badge className="bg-success/20 text-success text-[10px] font-semibold px-2 py-0.5 rounded border-0">
                  Profit
                </Badge>
              )}
              
              {isLoss && (
                <Badge className="bg-destructive/20 text-destructive text-[10px] font-semibold px-2 py-0.5 rounded border-0">
                  Loss
                </Badge>
              )}
              
              {!isClosed && !isLoss && !isProfit && (
                <Badge className="bg-primary/20 text-primary text-[10px] font-semibold px-2 py-0.5 rounded border-0">
                  Active
                </Badge>
              )}
            </div>

            {/* Entry Price */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Entry:</span>
              <span className="text-foreground font-semibold">{signal.entry}</span>
            </div>
          </div>

          {/* Right Side - Progress Circle & Actions */}
          <div className="flex flex-col items-end gap-2">
            {/* Circular Progress Indicator */}
            <div className="relative w-11 h-11">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-muted/30"
                />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${(progress / 100) * 113} 113`}
                  className={isLoss ? "text-destructive" : "text-success"}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-[10px] font-bold ${isLoss ? "text-destructive" : isProfit ? "text-success" : "text-muted-foreground"}`}>
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            {/* Share Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
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
          </div>
        </div>

        {isLocked ? (
          /* Locked State - Free user viewing premium signal */
          <div 
            className="px-4 pb-4 pt-0"
            onClick={() => navigate("/premium")}
          >
            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Unlock Premium Signal
              </span>
            </div>
          </div>
        ) : (
          /* Unlocked State - Show TP/SL details */
          <div className="px-4 pb-4 pt-0 space-y-2">
            {/* TP Row */}
            <div className="flex items-center justify-between py-2 border-t border-border/30">
              <span className="text-muted-foreground text-xs">TP</span>
              <div className="flex items-center gap-3 text-xs">
                <span className={`font-semibold ${signal.tp1_hit ? "text-success" : "text-success/70"}`}>
                  {signal.tp1} {signal.tp1_hit && "✓"}
                </span>
                {signal.tp2 && (
                  <span className={`font-semibold ${signal.tp2_hit ? "text-success" : "text-success/70"}`}>
                    {signal.tp2} {signal.tp2_hit && "✓"}
                  </span>
                )}
                {signal.tp3 && (
                  <span className={`font-semibold ${signal.tp3_hit ? "text-success" : "text-success/70"}`}>
                    {signal.tp3} {signal.tp3_hit && "✓"}
                  </span>
                )}
              </div>
            </div>

            {/* SL Row */}
            <div className="flex items-center justify-between py-2 border-t border-border/30">
              <span className="text-muted-foreground text-xs">SL</span>
              <span className={`text-xs font-semibold ${signal.sl_hit ? "text-destructive" : "text-destructive/70"}`}>
                {signal.sl} {signal.sl_hit && "✗"}
              </span>
            </div>

            {/* Live Price Row (only for open signals) */}
            {(isOpen || isPending) && currentPrice > 0 && (
              <div className="flex items-center justify-between py-2 border-t border-border/30">
                <span className="text-muted-foreground text-xs">Now</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    priceDirection === 'up'
                      ? 'bg-success/20 text-success'
                      : priceDirection === 'down'
                        ? 'bg-destructive/20 text-destructive'
                        : 'text-foreground'
                  }`}
                >
                  {currentPrice.toFixed(signal.pair.includes("JPY") ? 3 : 5)}
                </span>
              </div>
            )}

            {/* Profit Note or Running P/L */}
            {signal.profit_note && (
              <div className="py-2 border-t border-border/30">
                <p className="text-xs text-center text-success font-medium">{signal.profit_note}</p>
              </div>
            )}

            {!signal.profit_note && isOpen && runningPL && (
              <div className="flex items-center justify-between py-2 border-t border-border/30">
                <span className="text-muted-foreground text-xs">P/L</span>
                <span className={`text-xs font-bold ${runningPL.isProfit ? 'text-success' : 'text-destructive'}`}>
                  {runningPL.formatted}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer - Time & NEW badge */}
        <div className="px-4 py-2 border-t border-border/30 flex items-center justify-between bg-muted/20">
          <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
          
          <div className="flex items-center gap-2">
            {signal.risk_level && (
              <span className={`text-[10px] font-medium ${
                signal.risk_level === "High" 
                  ? "text-destructive" 
                  : signal.risk_level === "Medium"
                    ? "text-warning"
                    : "text-success"
              }`}>
                {signal.risk_level}
              </span>
            )}
            
            {isNewSignal && !isLocked && (
              <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0 rounded font-bold">
                NEW
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalCardNew;
