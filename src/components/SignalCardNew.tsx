import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isToday, isYesterday, differenceInHours } from "date-fns";
import { Lock, Crown, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
  };
  hasAccess?: boolean;
  subscriptionStatus?: string | null;
}

const SignalCardNew = ({ signal, hasAccess = true, subscriptionStatus }: SignalCardProps) => {
  const navigate = useNavigate();
  const isNewSignal = differenceInHours(new Date(), new Date(signal.created_at)) < 24 && signal.signal_status !== 'CLOSE';
  
  // For premium signals: ONLY premium subscribers can see them (not free trial users)
  // For regular signals: both premium and free trial users can see them
  const isPremiumUser = subscriptionStatus === 'premium';
  const isLocked = signal.is_premium && !isPremiumUser;
  
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
    if (signal.risk_level === "High") return "bg-destructive/10 text-destructive border-destructive";
    if (signal.risk_level === "Medium") return "bg-warning/10 text-warning border-warning";
    return "bg-success/10 text-success border-success";
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
        ? 'border-2 border-yellow-500/40 animate-premium-glow shadow-lg shadow-yellow-500/10' 
        : 'border-border'
    } ${!isLocked && 'hover:border-primary/50 hover:shadow-md'}`}>
      {/* Premium shimmer overlay */}
      {signal.is_premium && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg z-0">
          <div 
            className="absolute inset-0 animate-premium-shimmer opacity-30"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(45 100% 50% / 0.15), transparent)',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      )}
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
                  isLocked ? 'text-yellow-500' : 'text-blue-500'
                }`}>{signal.entry}</span>
              </span>
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
              {/* LIVE SIGNAL - only show when signal is OPEN (not CLOSE) */}
              {getStatusText() !== 'CLOSE' && (
                <Badge className="bg-success/10 text-success border-success border text-sm font-semibold mt-2 px-3 py-1">
                  🔴 LIVE SIGNAL
                </Badge>
              )}
            </div>
            {/* Footer showing status on the side */}
            <div className="px-3 py-2 border-t border-border flex justify-end">
              <span className={`text-[10px] font-medium ${
                getStatusText() === 'CLOSE' ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {getStatusText() === 'CLOSE' ? 'Close' : 'Open'}
              </span>
            </div>
          </>
        ) : (
          /* Unlocked State - Show all details */
          <>
            {/* Badges Row - Side aligned */}
            <div className="flex flex-wrap gap-1.5 p-2 sm:p-3 bg-background border-b border-border">
              {signal.risk_level && (
                <Badge className={`${getRiskLevelColor()} border text-[10px] sm:text-xs`}>
                  {signal.risk_level} Risk
                </Badge>
              )}
              {signal.signal_type && (
                <Badge variant="outline" className="text-[10px] sm:text-xs">
                  {signal.signal_type}
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
                  <span className="text-muted-foreground text-xs sm:text-sm">TAKE PROFIT 1</span>
                  <span className={`font-semibold text-xs sm:text-sm ${signal.tp1_hit ? 'text-success' : 'text-foreground'}`}>
                    {signal.tp1} {signal.tp1_hit && '✓'}
                  </span>
                </div>
                
                {signal.tp2 && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground text-xs sm:text-sm">TAKE PROFIT 2</span>
                    <span className={`font-semibold text-xs sm:text-sm ${signal.tp2_hit ? 'text-success' : 'text-foreground'}`}>
                      {signal.tp2} {signal.tp2_hit && '✓'}
                    </span>
                  </div>
                )}
                
                {signal.tp3 && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground text-xs sm:text-sm">TAKE PROFIT 3</span>
                    <span className={`font-semibold text-xs sm:text-sm ${signal.tp3_hit ? 'text-success' : 'text-foreground'}`}>
                      {signal.tp3} {signal.tp3_hit && '✓'}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground text-xs sm:text-sm">SL-BELOW</span>
                  <span className={`font-semibold text-xs sm:text-sm ${signal.sl_hit ? 'text-destructive' : 'text-foreground'}`}>
                    {signal.sl} {signal.sl_hit && '✗'}
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

              {/* Profit Note + Status together */}
              {signal.profit_note ? (
                <div className="mt-2 pt-2 border-t border-success/20 flex items-center">
                  {/* Small Open/Close text on analysis side (left) */}
                  <span className={`text-[10px] font-medium mr-2 ${
                    getStatusText() === 'CLOSE' ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {getStatusText() === 'CLOSE' ? 'Close' : 'Open'}
                  </span>
                  {/* Profit note centered */}
                  <p className="flex-1 text-center text-xs sm:text-sm font-semibold text-success">
                    {signal.profit_note}
                  </p>
                </div>
              ) : (
                // If no profit note, just show small status on the analysis side
                <div className="mt-2 pt-2 border-t border-border flex justify-start">
                  <span className={`text-[10px] font-medium ${
                    getStatusText() === 'CLOSE' ? 'text-destructive' : 'text-muted-foreground'
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
