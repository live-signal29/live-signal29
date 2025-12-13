import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Lock, Crown, Share2, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClosedTradeCardProps {
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
    created_at: string;
    is_premium?: boolean;
    pips_result?: string;
    profit_note?: string;
  };
  isPremiumUser?: boolean;
}

const ClosedTradeCard = ({ signal, isPremiumUser = false }: ClosedTradeCardProps) => {
  const navigate = useNavigate();
  const isLocked = signal.is_premium && !isPremiumUser;
  const isWin = !signal.sl_hit;

  // Calculate which TPs were hit
  const tpHits = [
    signal.tp1_hit,
    signal.tp2 ? signal.tp2_hit : null,
    signal.tp3 ? signal.tp3_hit : null,
    signal.tp4 ? signal.tp4_hit : null,
  ].filter(v => v !== null);
  
  const lastTpHit = tpHits.lastIndexOf(true) + 1;
  const tpCount = tpHits.filter(Boolean).length;

  const getResultText = () => {
    if (signal.sl_hit) return "SL HIT";
    if (lastTpHit > 0) return `TP${lastTpHit} DONE`;
    return "CLOSED";
  };

  const handleShare = (platform: 'whatsapp' | 'telegram' | 'copy') => {
    const shareUrl = `https://live-signal29.vercel.app/signal/${signal.id}`;
    const result = isWin ? `✅ ${getResultText()}` : `❌ SL HIT`;
    const shareText = `📊 Trade Result: ${signal.pair}\n\n${result}\n💰 Entry: ${signal.entry}\n${signal.pips_result ? `📈 ${signal.pips_result}\n` : ''}\n👉 ${shareUrl}`;

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Result copied!");
    }
  };

  const cardBorderColor = isWin ? "border-emerald-500/30" : "border-red-500/30";
  const cardBgGradient = isWin ? "from-emerald-500/5" : "from-red-500/5";
  const headerBg = isWin ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20";
  const headerText = isWin ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
  const Icon = isWin ? CheckCircle2 : XCircle;

  return (
    <Card className={`overflow-hidden border-2 ${cardBorderColor} bg-gradient-to-br ${cardBgGradient} to-transparent transition-all shadow-sm`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className={`flex items-center justify-between p-3 ${headerBg} border-b`}>
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${isWin ? "text-emerald-500" : "text-red-500"}`} />
            <span className={`text-xs font-bold uppercase ${headerText}`}>
              {getResultText()}
            </span>
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
              {/* Entry */}
              <div className="bg-muted/50 rounded-lg p-2 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Entry</span>
                <span className="font-bold">{signal.entry}</span>
              </div>

              {/* Result Badge */}
              <div className="flex items-center justify-center">
                <Badge className={`${
                  isWin 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-red-500 text-white'
                } text-sm font-bold px-4 py-1`}>
                  {isWin ? `✓ ${tpCount} TP${tpCount > 1 ? 's' : ''} HIT` : '✗ SL HIT'}
                </Badge>
              </div>

              {/* Pips Result */}
              {signal.pips_result && (
                <div className={`text-center p-2 rounded-lg ${
                  isWin ? 'bg-emerald-500/10' : 'bg-red-500/10'
                }`}>
                  <span className={`font-bold ${
                    isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {signal.pips_result}
                  </span>
                </div>
              )}

              {/* Profit Note */}
              {signal.profit_note && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center">
                  {signal.profit_note}
                </p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClosedTradeCard;
