import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInHours } from "date-fns";
import { Lock, Crown, Share2, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LiveSignalCardProps {
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
    created_at: string;
    is_premium?: boolean;
    risk_level?: string;
    signal_type?: string;
    analysis_reason?: string;
  };
  isPremiumUser?: boolean;
}

const LiveSignalCard = ({ signal, isPremiumUser = false }: LiveSignalCardProps) => {
  const navigate = useNavigate();
  const isNewSignal = differenceInHours(new Date(), new Date(signal.created_at)) < 24;
  const isLocked = signal.is_premium && !isPremiumUser;

  const handleShare = (platform: 'whatsapp' | 'telegram' | 'copy') => {
    const shareUrl = `https://live-signal29.vercel.app/signal/${signal.id}`;
    const shareText = `🔔 New ${signal.type.toUpperCase()} Signal!\n\n📊 ${signal.pair}\n💰 Entry: ${signal.entry}\n🎯 TP1: ${signal.tp1}\n⛔ SL: ${signal.sl}\n\n👉 ${shareUrl}`;

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Signal copied!");
    }
  };

  return (
    <Card className="overflow-hidden border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-transparent hover:border-yellow-500/50 transition-all shadow-sm hover:shadow-yellow-500/10">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-yellow-500/10 border-b border-yellow-500/20">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-yellow-500 animate-pulse" />
            <span className="text-xs font-bold uppercase text-yellow-600 dark:text-yellow-400">Live Signal</span>
            {isNewSignal && (
              <Badge className="bg-yellow-500 text-yellow-950 text-[10px] px-1.5 py-0 animate-pulse">NEW</Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(signal.created_at), "HH:mm")}
          </span>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Pair & Type */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={`${signal.type === "Buy" ? "bg-emerald-500" : "bg-red-500"} text-white font-bold`}>
                {signal.type.toUpperCase()}
              </Badge>
              <span className="font-bold text-lg">{signal.pair}</span>
              {signal.is_premium && (
                <Crown className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Share2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleShare('whatsapp')}>WhatsApp</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('telegram')}>Telegram</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare('copy')}>Copy</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isLocked ? (
            <div 
              className="flex items-center justify-center gap-2 py-4 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
              onClick={() => navigate("/premium")}
            >
              <Lock className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Buy Premium to unlock</span>
            </div>
          ) : (
            <>
              {/* Entry Price */}
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <span className="text-xs text-muted-foreground block">Entry Price</span>
                <span className="font-bold text-lg text-primary">{signal.entry}</span>
              </div>

              {/* TP/SL Grid */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-emerald-500/10 rounded p-2 text-center">
                  <span className="text-[10px] text-muted-foreground block">TP1</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{signal.tp1}</span>
                </div>
                {signal.tp2 && (
                  <div className="bg-emerald-500/10 rounded p-2 text-center">
                    <span className="text-[10px] text-muted-foreground block">TP2</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{signal.tp2}</span>
                  </div>
                )}
                {signal.tp3 && (
                  <div className="bg-emerald-500/10 rounded p-2 text-center">
                    <span className="text-[10px] text-muted-foreground block">TP3</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{signal.tp3}</span>
                  </div>
                )}
                <div className="bg-red-500/10 rounded p-2 text-center">
                  <span className="text-[10px] text-muted-foreground block">SL</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{signal.sl}</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                {signal.risk_level && (
                  <Badge variant="outline" className="text-[10px]">{signal.risk_level} Risk</Badge>
                )}
                {signal.signal_type && (
                  <Badge variant="outline" className="text-[10px]">{signal.signal_type}</Badge>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveSignalCard;
