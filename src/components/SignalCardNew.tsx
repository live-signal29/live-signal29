import { Card, CardContent } from "@/components/ui/card";
import { Shield, Clock, ArrowRight, Share2, CheckCircle2 } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
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
    profit_note?: string;
    risk_level?: string;
    created_at: string;
    category: string;
    is_premium?: boolean;
    current_price?: string;
  };
  subscriptionStatus?: string | null;
  livePrice?: number;
}

const SignalCardNew = ({ signal, subscriptionStatus, livePrice }: SignalCardProps) => {
  const navigate = useNavigate();
  const isBuy = signal.type?.toLowerCase() === "buy";
  const currentPrice = livePrice || (signal.current_price ? parseFloat(signal.current_price) : 0);

  const handleShare = (platform: 'whatsapp' | 'telegram' | 'copy') => {
    const shareUrl = `https://live-signals29.vercel.app/signal/${signal.id}`;
    const shareText = `🔔 ${signal.type.toUpperCase()} Signal Alert!\n📊 Pair: ${signal.pair}\n💰 Entry: ${signal.entry}\n🎯 TP1: ${signal.tp1}\n⛔ SL: ${signal.sl}\n${shareUrl}`;

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(shareText);
      toast.success("Copied to clipboard!");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return `Yesterday, ${format(date, "HH:mm")}`;
    return format(date, "dd MMM, HH:mm");
  };

  return (
    <div className="relative mb-4 overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-b from-[#141625] to-[#0c0d18] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition-all duration-300">
      
      {/* 1. Header Row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          {/* 3D Gold Coin Icon Container */}
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/30 bg-gradient-to-b from-amber-400/20 via-amber-600/10 to-amber-950/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <span className="text-2xl drop-shadow-[0_2px_8px_rgba(251,191,36,0.6)]">🪙</span>
          </div>

          <div>
            <h3 className="text-xl font-black tracking-tight text-white drop-shadow-sm">
              {signal.pair} <span className="text-sm font-semibold text-slate-400">(Gold)</span>
            </h3>
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              {signal.category || "COMMODITIES"}
            </p>

            {/* Badges */}
            <div className="mt-2 flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-3.5 py-1 text-[11px] font-black tracking-wider uppercase shadow-md",
                  isBuy 
                    ? "bg-emerald-500 text-slate-950 shadow-emerald-500/20" 
                    : "bg-red-500 text-white shadow-red-500/20"
                )}
              >
                {signal.type}
              </span>

              {signal.risk_level && (
                <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-400 shadow-inner">
                  <Shield className="h-3 w-3" />
                  {signal.risk_level} Risk
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Share & Time */}
        <div className="flex items-center gap-2 text-slate-400">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full p-1.5 transition-colors hover:bg-white/5 hover:text-white">
                <Share2 className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#121422] border-white/10 text-white">
              <DropdownMenuItem onClick={() => handleShare('whatsapp')}>WhatsApp</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('telegram')}>Telegram</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('copy')}>Copy Link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1 text-xs font-semibold">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(signal.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="my-4 h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* 2. Prices Section */}
      <div className="grid grid-cols-2 gap-4 px-1">
        <div>
          <span className="text-xs font-medium text-slate-400">Entry Price</span>
          <p className="mt-1 text-xl font-extrabold tracking-tight text-white font-mono">
            {signal.entry}
          </p>
        </div>

        <div>
          <span className="text-xs font-medium text-slate-400">Current Price</span>
          <p
            className={cn(
              "mt-1 text-xl font-extrabold tracking-tight font-mono drop-shadow-sm",
              isBuy ? "text-emerald-400" : "text-red-400"
            )}
          >
            {currentPrice > 0 ? currentPrice.toFixed(2) : signal.entry}
          </p>
        </div>
      </div>

      {/* 3. Targets Row & View Details Button */}
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/10 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-red-400">
            <span className="text-xs">SL</span>
            <span className="font-mono text-sm text-white">{signal.sl}</span>
          </div>

          <div className="flex items-center gap-1 font-bold text-emerald-400">
            <span className="text-xs">TP1</span>
            <span className="font-mono text-sm">{signal.tp1}</span>
            {signal.tp1_hit && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
          </div>

          {signal.tp2 && (
            <div className="flex items-center gap-1 font-bold text-emerald-400">
              <span className="text-xs">TP2</span>
              <span className="font-mono text-sm">{signal.tp2}</span>
              {signal.tp2_hit && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
            </div>
          )}
        </div>

        {/* 3D Purple Glowing Action Button */}
        <button
          onClick={() => navigate(`/signal/${signal.id}`)}
          className="flex items-center gap-2 rounded-full border border-purple-400/40 bg-gradient-to-r from-purple-900/60 via-purple-700/50 to-indigo-900/60 px-5 py-2.5 text-xs font-extrabold text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(168,85,247,0.5)]"
        >
          View Details
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 4. Profit Note Banner */}
      {signal.profit_note && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-center text-xs font-bold text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          {signal.profit_note}
        </div>
      )}
    </div>
  );
};

export default SignalCardNew;
