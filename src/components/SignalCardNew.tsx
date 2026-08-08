import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isYesterday } from "date-fns";
import { Lock, Crown, Shield, Clock, ArrowRight, Share2, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { parseEntryPrice } from "@/hooks/useLivePrices";
import { cn } from "@/lib/utils";

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
    risk_level?: string;
    signal_type?: string;
    created_at: string;
    category: string;
    is_premium?: boolean;
    current_price?: string;
    tag?: string;
  };
  hasAccess?: boolean;
  subscriptionStatus?: string | null;
  livePrice?: number;
}

const SignalCardNew = ({ signal, subscriptionStatus, livePrice }: SignalCardProps) => {
  const navigate = useNavigate();
  const lifecycle = (signal.signal_status || signal.status || 'open').toLowerCase();
  const isOpen = lifecycle === 'open';

  const isBuy = signal.type?.toLowerCase() === "buy";
  const limitPrice = signal.limit_entry_price ?? 0;
  const currentPrice = livePrice || (signal.current_price ? parseFloat(signal.current_price) : 0);

  const parsedEntryPrice = signal.entry_mode === "limit" && limitPrice > 0 
    ? limitPrice 
    : parseEntryPrice(signal.entry);

  const isPremiumUser = subscriptionStatus === "premium";
  const isLocked = signal.is_premium && !isPremiumUser && isOpen;

  const handleShare = (platform: 'whatsapp' | 'telegram' | 'copy') => {
    const shareUrl = `https://live-signals29.vercel.app/signal/${signal.id}`;
    const shareText = isLocked || signal.is_premium
      ? `🔔 Premium ${signal.type.toUpperCase()} Signal Alert!\n\n📊 Pair: ${signal.pair}\n💰 Entry: ${signal.entry}\n🔒 Unlock: ${shareUrl}`
      : `🔔 New ${signal.type.toUpperCase()} Signal Alert!\n\n📊 Pair: ${signal.pair}\n💰 Entry: ${signal.entry}\n🎯 TP1: ${signal.tp1}\n⛔ SL: ${signal.sl}\n\nLink: ${shareUrl}`;

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(shareText);
      toast.success("Signal link copied!");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return `Yesterday, ${format(date, "HH:mm")}`;
    return format(date, "dd MMM, HH:mm");
  };

  const getSymbolIcon = (pair: string) => {
    if (pair.includes("XAU") || pair.includes("GOLD")) return "🪙";
    if (pair.includes("BTC") || pair.includes("ETH")) return "₿";
    return "💱";
  };

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0f18]/90 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 hover:border-white/20">
      <CardContent className="p-0">
        {isLocked ? (
          /* Locked State for Free Users */
          <div className="py-4 text-center">
            <div className="flex items-center justify-between mb-3">
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
                {signal.type}
              </span>
              <Crown className="h-4 w-4 text-amber-400" />
            </div>
            <div
              className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 transition-colors hover:bg-amber-500/10"
              onClick={() => navigate("/premium")}
            >
              <Lock className="h-5 w-5 text-amber-400" />
              <span className="text-xs font-extrabold text-amber-300">
                Unlock Premium Signal
              </span>
            </div>
          </div>
        ) : (
          /* Clean 3D Card Layout */
          <div>
            {/* Header: Icon, Pair, Type, Time */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/20 to-yellow-600/5 text-xl shadow-inner">
                  {getSymbolIcon(signal.pair)}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-extrabold tracking-wide text-white">
                      {signal.pair}
                    </h3>
                    {isOpen && (
                      <span className="flex items-center gap-1 text-[8px] font-black text-red-400">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                        LIVE
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] font-medium text-slate-400">
                    {signal.category || "Forex / Market"}
                  </p>

                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                        isBuy ? "bg-emerald-500 text-slate-950" : "bg-red-500 text-white"
                      )}
                    >
                      {signal.type}
                    </span>

                    {signal.risk_level && (
                      <span className="flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">
                        <Shield className="h-2.5 w-2.5" />
                        {signal.risk_level} Risk
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-slate-400 hover:text-white">
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#111522] border-white/10 text-white">
                    <DropdownMenuItem onClick={() => handleShare('whatsapp')}>WhatsApp</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('telegram')}>Telegram</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShare('copy')}>Copy Link</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(signal.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Entry & Live Price */}
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-3">
              <div>
                <span className="text-[10px] font-medium text-slate-400">Entry Price</span>
                <p className="mt-0.5 font-mono text-sm font-bold tracking-tight text-white">
                  {signal.entry}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-medium text-slate-400">Current Price</span>
                <p
                  className={cn(
                    "mt-0.5 font-mono text-sm font-bold tracking-tight",
                    isBuy ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {currentPrice > 0 ? currentPrice.toFixed(2) : signal.entry}
                </p>
              </div>
            </div>

            {/* Target Levels & Action */}
            <div className="mt-3 border-t border-white/[0.06] pt-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-xs font-semibold text-red-400">
                  <span>SL</span>
                  <span className="font-mono text-white">{signal.sl}</span>
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                  <span>TP1</span>
                  <span className="font-mono text-emerald-400">{signal.tp1}</span>
                  {signal.tp1_hit && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                </div>

                {signal.tp2 && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                    <span>TP2</span>
                    <span className="font-mono text-emerald-400">{signal.tp2}</span>
                    {signal.tp2_hit && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                  </div>
                )}

                <button
                  onClick={() => navigate(`/signal/${signal.id}`)}
                  className="flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-600/15 px-3 py-1 text-[11px] font-bold text-purple-300 transition-all hover:bg-purple-600 hover:text-white"
                >
                  View Details
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Profit Note Banner */}
            {signal.profit_note && (
              <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-[10px] text-emerald-300">
                {signal.profit_note}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalCardNew;
