import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isToday, isYesterday, differenceInHours } from "date-fns";
import { Lock, Crown, Star, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import AdBanner from "@/components/AdBanner";
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
  showFavoriteButton?: boolean;
}

const SignalCardNew = ({ signal, hasAccess = true, subscriptionStatus, showFavoriteButton = true }: SignalCardProps) => {
  const navigate = useNavigate();
  const { isFavoritePair, toggleFavoritePair } = useFavorites();
  const isNewSignal = differenceInHours(new Date(), new Date(signal.created_at)) < 24 && signal.signal_status !== 'CLOSE';
  
  // For premium signals: ONLY premium subscribers can see them (not free trial users)
  // For regular signals: both premium and free trial users can see them
  const isPremiumUser = subscriptionStatus === 'premium';
  const isLocked = signal.is_premium && !isPremiumUser;
  
  const handleShare = (platform: 'whatsapp' | 'telegram' | 'copy') => {
    const shareUrl = `https://live-signal29.vercel.app/signal/${signal.id}`;
    const shareText = `🔔 New ${signal.type.toUpperCase()} Signal Alert!\n\n` +
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
    <Card className={`overflow-hidden border-border transition-all duration-300 shadow-sm relative bg-card ${
      !isLocked && 'hover:border-primary/50 hover:shadow-md'
    }`}>
      <CardContent className="p-0">
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
              <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-1" />
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-sm sm:text-base font-bold text-primary">
                {signal.pair}
              </span>
              <span className="text-xs sm:text-sm font-medium">
                <span className="text-muted-foreground">Entry:</span>
                <span className={`font-semibold ml-1 ${
                  isLocked 
                    ? 'text-yellow-500' 
                    : signal.type.toLowerCase().includes('buy') 
                      ? 'text-blue-500' 
                      : 'text-orange-500'
                }`}>{signal.entry}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showFavoriteButton && !isLocked && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavoritePair(signal.pair);
                }}
              >
                <Star 
                  className={`h-4 w-4 transition-all ${
                    isFavoritePair(signal.pair) 
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'text-muted-foreground hover:text-yellow-400'
                  }`}
                />
              </Button>
            )}
            {!isLocked && (
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
            )}
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {formatDate(signal.created_at)}
            </span>
          </div>
        </div>

        {isLocked ? (
          /* Locked State - Clean minimal design */
          <>
            <div 
              className="flex items-center justify-center gap-2 py-6 px-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/premium")}
            >
              <div className="bg-muted p-2 rounded-full">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
                BUY premium to see signal
              </span>
            </div>
            {/* Footer showing status */}
            <div className="px-3 py-2 border-t border-border text-center">
              <span className="text-xs text-muted-foreground">
                {getStatusText()}
              </span>
            </div>
          </>
        ) : (
          /* Unlocked State - Show all details */
          <>
            {/* Badges Row */}
            <div className="flex flex-wrap gap-1.5 p-2 sm:p-3 bg-background border-b border-border">
              <Badge className={`${getStatusColor()} border text-[10px] sm:text-xs font-semibold`}>
                {getStatusText()}
              </Badge>
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

              {/* Profit Note */}
              {signal.profit_note && (
                <div className="mt-2 pt-2 border-t border-success/20">
                  <p className="text-xs sm:text-sm font-semibold text-success">{signal.profit_note}</p>
                </div>
              )}
            </div>

            {/* Ad Banner inside Signal Card */}
            <div className="px-3 sm:px-4 py-3 border-t border-border">
              <AdBanner className="scale-90" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalCardNew;
