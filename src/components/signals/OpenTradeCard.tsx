import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Lock, Crown, Share2, FolderOpen, Check, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OpenTradeCardProps {
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
    created_at: string;
    is_premium?: boolean;
    pips_result?: string;
  };
  isPremiumUser?: boolean;
}

const OpenTradeCard = ({ signal, isPremiumUser = false }: OpenTradeCardProps) => {
  const navigate = useNavigate();
  const isLocked = signal.is_premium && !isPremiumUser;

  // Calculate progress
  const tpLevels = [
    { level: 1, value: signal.tp1, hit: signal.tp1_hit },
    signal.tp2 ? { level: 2, value: signal.tp2, hit: signal.tp2_hit } : null,
    signal.tp3 ? { level: 3, value: signal.tp3, hit: signal.tp3_hit } : null,
    signal.tp4 ? { level: 4, value: signal.tp4, hit: signal.tp4_hit } : null,
  ].filter(Boolean) as { level: number; value: string; hit: boolean }[];

  const hitCount = tpLevels.filter(tp => tp.hit).length;
  const progress = (hitCount / tpLevels.length) * 100;

  const handleShare = (platform: 'whatsapp' | 'telegram' | 'copy') => {
    const shareUrl = `https://live-signal29.vercel.app/signal/${signal.id}`;
    const shareText = `📊 Active Trade: ${signal.pair}\n\n💰 Entry: ${signal.entry}\n✅ Progress: ${hitCount}/${tpLevels.length} TPs hit\n\n👉 ${shareUrl}`;

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Trade copied!");
    }
  };

  return (
    <Card className="overflow-hidden border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent hover:border-blue-500/50 transition-all shadow-sm hover:shadow-blue-500/10">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-blue-500/10 border-b border-blue-500/20">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">Open Trade</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(signal.created_at), "dd MMM HH:mm")}
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
              <div className="bg-muted/50 rounded-lg p-2 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Entry</span>
                <span className="font-bold text-primary">{signal.entry}</span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">TP Progress</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{hitCount}/{tpLevels.length}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* TP Levels */}
              <div className="flex items-center gap-1 flex-wrap">
                {tpLevels.map((tp, index) => (
                  <div key={tp.level} className="flex items-center">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      tp.hit 
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {tp.hit && <Check className="h-3 w-3" />}
                      <span>TP{tp.level}</span>
                      <span className="font-medium">{tp.value}</span>
                    </div>
                    {index < tpLevels.length - 1 && (
                      <ArrowRight className="h-3 w-3 mx-1 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>

              {/* SL Level */}
              <div className="bg-red-500/10 rounded p-2 flex justify-between items-center">
                <span className="text-xs text-red-600 dark:text-red-400">Stop Loss</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{signal.sl}</span>
              </div>

              {/* Pips Result */}
              {signal.pips_result && (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  {signal.pips_result}
                </Badge>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OpenTradeCard;
