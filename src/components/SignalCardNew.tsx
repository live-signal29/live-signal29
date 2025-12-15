import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isToday, isYesterday, differenceInHours } from "date-fns";
import { Lock, Crown, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { parseEntryPrice, calculateRunningPL, checkTPSLHit } from "@/hooks/useLivePrices";
import { supabase } from "@/integrations/supabase/client";
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
  const isNewSignal = differenceInHours(new Date(), new Date(signal.created_at)) < 24 && signal.signal_status !== 'CLOSE';
  const isOpen = signal.signal_status !== 'CLOSE';
  
  // Entry mode logic
  const isLimitOrder = signal.entry_mode === 'limit';
  const isPending = isLimitOrder && !signal.is_activated && isOpen;
  const limitPrice = signal.limit_entry_price || 0;
  
  // For premium signals: ONLY premium subscribers can see OPEN premium signals
  // CLOSED premium signals are visible to everyone (including free trial users)
  const isPremiumUser = subscriptionStatus === 'premium';
  const isLocked = signal.is_premium && !isPremiumUser && isOpen;
  
  // Parse entry price for calculations (use limit_entry_price for limit orders after activation)
  const entryPrice = isLimitOrder && signal.is_activated && limitPrice > 0 
    ? limitPrice 
    : parseEntryPrice(signal.entry);
  
  // Current price from live feed or stored value
  const currentPrice = livePrice || (signal.current_price ? parseFloat(signal.current_price) : 0);
  
  // Auto-activate limit orders when price hits
  useEffect(() => {
    if (!isPending || !currentPrice || !limitPrice || signal.sl_hit) return;
    
    const isBuy = signal.type?.toLowerCase() === 'buy';
    let shouldActivate = false;
    
    // BUY Limit: Activate when CurrentPrice <= Entry Price
    // SELL Limit: Activate when CurrentPrice >= Entry Price
    if (isBuy && currentPrice <= limitPrice) {
      shouldActivate = true;
    } else if (!isBuy && currentPrice >= limitPrice) {
      shouldActivate = true;
    }
    
    if (shouldActivate) {
      supabase
        .from('signals')
        .update({ 
          is_activated: true, 
          activated_at: new Date().toISOString() 
        })
        .eq('id', signal.id)
        .then(({ error }) => {
          if (error) console.error('Error activating limit order:', error);
        });
    }
  }, [currentPrice, isPending, limitPrice, signal.id, signal.type, signal.sl_hit]);
  
  // Calculate running P/L only for ACTIVATED OPEN signals
  const runningPL = isOpen && !isPending && currentPrice > 0 && entryPrice > 0
    ? calculateRunningPL(currentPrice, entryPrice, signal.type)
    : null;

  // Auto-update TP/SL hits
  useEffect(() => {
    if (!isOpen || !currentPrice || signal.sl_hit) return;
    
    const checkAndUpdate = async () => {
      const updates: Record<string, boolean | string> = {};
      
      // Check TP1
      if (!signal.tp1_hit && signal.tp1) {
        const tp1Price = parseEntryPrice(signal.tp1);
        if (checkTPSLHit(currentPrice, tp1Price, signal.type)) {
          updates.tp1_hit = true;
        }
      }
      
      // Check TP2
      if (!signal.tp2_hit && signal.tp2) {
        const tp2Price = parseEntryPrice(signal.tp2);
        if (checkTPSLHit(currentPrice, tp2Price, signal.type)) {
          updates.tp2_hit = true;
        }
      }
      
      // Check TP3
      if (!signal.tp3_hit && signal.tp3) {
        const tp3Price = parseEntryPrice(signal.tp3);
        if (checkTPSLHit(currentPrice, tp3Price, signal.type)) {
          updates.tp3_hit = true;
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
          updates.signal_status = 'CLOSE';
        }
      }
      
      if (Object.keys(updates).length > 0) {
        await supabase.from('signals').update(updates).eq('id', signal.id);
      }
    };
    
    checkAndUpdate();
  }, [currentPrice, signal.id, signal.type, signal.tp1, signal.tp2, signal.tp3, signal.tp4, signal.sl, 
      signal.tp1_hit, signal.tp2_hit, signal.tp3_hit, signal.tp4_hit, signal.sl_hit, isOpen]);
  
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
    const status = signal.signal_status || "OPEN";
    if (status === "CLOSE") return "bg-destructive/10 text-destructive border-destructive";
    if (status === "LIVE") return "bg-success/10 text-success border-success";
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
    <Card className={`overflow-hidden transition-all duration-300 shadow-sm relative bg-card ${
      signal.is_premium 
        ? 'border-2 border-primary/40' 
        : 'border-border'
    } ${!isLocked && 'hover:border-primary/50 hover:shadow-md'}`}>
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
        <div className="flex justify-between items-start p-3 sm:p-4 border-b border-border">
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
              <span className="text-sm sm:text-base font-bold text-primary">
                {signal.pair}
              </span>
              <span className="text-xs sm:text-sm font-medium">
                <span className="text-muted-foreground">Entry:</span>
                <span className={`font-semibold ml-1 ${
                  isLocked ? 'text-yellow-500' : isPending ? 'text-orange-500' : (signal.is_activated && isLimitOrder) ? 'text-success' : 'text-blue-500'
                }`}>
                  {isLimitOrder 
                    ? (isPending 
                        ? `Limit ${signal.type} ${limitPrice}` 
                        : `Active ${signal.type} @ ${limitPrice}`)
                    : signal.entry
                  }
                </span>
              </span>
              {/* Show current price for OPEN signals */}
              {isOpen && currentPrice > 0 && !isLocked && (
                <span className="text-[10px] text-muted-foreground">
                  Current: <span className="font-semibold text-foreground">{currentPrice.toFixed(2)}</span>
                  {isPending && (
                    <span className="ml-2 text-orange-500 font-medium animate-pulse">⏳ Pending</span>
                  )}
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
              {isPending && (
                <Badge className="bg-orange-500/20 text-orange-500 border-orange-500 border text-[10px] sm:text-xs animate-pulse">
                  ⏳ Pending
                </Badge>
              )}
              {signal.is_activated && isLimitOrder && !isPending && (
                <Badge className="bg-success/20 text-success border-success border text-[10px] sm:text-xs">
                  ✓ Activated
                </Badge>
              )}
              {signal.pips_result && (
                <Badge className="bg-success/10 text-success border-success border text-[10px] sm:text-xs font-semibold">
                  {signal.pips_result}
                </Badge>
              )}
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
                    SL-BELOW {signal.sl_hit && <span className="text-destructive">✗</span>}
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

              {/* Note */}
              {signal.note && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{signal.note}</p>
                </div>
              )}

              {/* Profit Note / Running P/L + Status together */}
              {signal.profit_note ? (
                // Show static profit note for CLOSED signals
                <div className="mt-2 pt-2 border-t border-success/20 flex items-center">
                  <span className={`text-[10px] font-medium ${
                    getStatusText() === 'CLOSE' ? 'text-destructive' : 'text-blue-500'
                  }`}>
                    {getStatusText() === 'CLOSE' ? 'Close' : 'Open'}
                  </span>
                  <p className="flex-1 text-center text-xs sm:text-sm font-semibold text-success">
                    {signal.profit_note}
                  </p>
                </div>
              ) : isOpen && !isPending && runningPL ? (
                // Show running P/L for ACTIVATED OPEN signals
                <div className="mt-2 pt-2 border-t border-border/30 flex items-center">
                  <span className="text-[10px] font-medium text-blue-500">Open</span>
                  <p className="flex-1 text-center text-xs sm:text-sm font-bold">
                    <span className="text-foreground">Running P/L:</span>{' '}
                    <span className={runningPL.isProfit ? 'text-success' : 'text-destructive'}>
                      {runningPL.formatted}
                    </span>
                  </p>
                </div>
              ) : isPending ? (
                // Show pending status for limit orders
                <div className="mt-2 pt-2 border-t border-border/30 flex items-center">
                  <span className="text-[10px] font-medium text-orange-500">Pending</span>
                  <p className="flex-1 text-center text-xs sm:text-sm font-semibold text-orange-500 animate-pulse">
                    ⏳ Waiting for price to hit {limitPrice}
                  </p>
                </div>
              ) : (
                // Default: just show status
                <div className="mt-2 pt-2 border-t border-border/30 flex justify-start">
                  <span className={`text-[10px] font-medium ${
                    getStatusText() === 'CLOSE' ? 'text-destructive' : 'text-blue-500'
                  }`}>
                    {getStatusText() === 'CLOSE' ? 'Close' : 'Open'}
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
