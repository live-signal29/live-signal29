import { Clock, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SignalCardProps {
  signal: {
    id: string;
    pair: string;
    type: "Buy" | "Sell" | "BUY" | "SELL";
    entry: string;
    tp1: string;
    tp2?: string;
    sl: string;
    risk_level?: string;
    created_at: string;
    category?: string;
    current_price?: string;
    profit_note?: string;
  };
  livePrice?: number;
}

const SignalCardNew = ({ signal, livePrice }: SignalCardProps) => {
  const navigate = useNavigate();
  const isBuy = signal.type?.toLowerCase() === "buy";
  const currentPriceNum = livePrice || (signal.current_price ? parseFloat(signal.current_price) : 0);

  const getTimeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
        .replace("about ", "")
        .replace("minutes", "m")
        .replace("minute", "m")
        .replace("hours", "h")
        .replace("hour", "h");
    } catch {
      return "just now";
    }
  };

  const pairUpper = signal.pair?.toUpperCase() || "";

  // SMALLER ICONS & RINGS
  const renderIcon = () => {
    if (pairUpper.includes("XAU") || pairUpper.includes("GOLD")) {
      return (
        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-yellow-500/40 bg-gradient-to-br from-yellow-400/20 via-yellow-600/20 to-yellow-900/30 text-[20px] shadow-[0_0_12px_rgba(234,179,8,0.15)]">
          🪙
        </div>
      );
    }
    if (pairUpper.includes("BTC") || pairUpper.includes("BITCOIN")) {
      return (
        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#f7931a] text-[16px] font-bold text-white shadow-[0_0_12px_rgba(247,147,26,0.25)]">
          ₿
        </div>
      );
    }
    return (
      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-blue-500/40 bg-blue-900/40 text-[16px] shadow-[0_0_12px_rgba(59,130,246,0.15)]">
        🇪🇺
      </div>
    );
  };

  return (
    <div className="relative mb-3 w-full rounded-[16px] border border-white/[0.06] bg-[#0b0d18] p-3.5 text-white shadow-lg transition-all duration-300 hover:border-white/20">
      
      {/* --- TOP ROW --- */}
      <div className="flex items-start justify-between">
        
        {/* LEFT: ICON & PAIR */}
        <div className="flex items-center gap-2.5">
          {renderIcon()}
          <div className="flex flex-col">
            <h3 className="text-[13px] font-bold text-white tracking-tight leading-tight">
              {signal.pair.replace("/", "")}
            </h3>
            <p className="text-[9px] font-medium text-slate-400 mt-[1px]">
              {pairUpper.includes("XAU") ? "Gold / US Dollar" : pairUpper.includes("BTC") ? "Bitcoin / US Dollar" : "Euro / US Dollar"}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              {/* Buy/Sell Badge - Small Pill */}
              <span
                className={cn(
                  "rounded-full px-2 py-[1px] text-[8px] font-bold uppercase leading-none tracking-wider",
                  isBuy ? "bg-[#10b981] text-black" : "bg-[#ef4444] text-white"
                )}
              >
                {signal.type.toUpperCase()}
              </span>
              
              {/* Risk Badge */}
              {signal.risk_level && (
                <span className="flex items-center gap-0.5 rounded-full bg-black/40 border border-amber-500/20 px-1.5 py-[1px] text-[8px] font-medium text-amber-400 leading-none">
                  <span className="h-2 w-2 rounded-full bg-amber-400/30 flex items-center justify-center text-[5px]">✦</span>
                  {signal.risk_level} Risk
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: ENTRY, CURRENT, TIME - Compact */}
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-medium text-slate-400">Entry Price</span>
            <span className="mt-0.5 font-mono text-[13px] font-semibold text-white">
              {signal.entry}
            </span>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-medium text-slate-400">Current Price</span>
            <span
              className={cn(
                "mt-0.5 font-mono text-[13px] font-semibold",
                isBuy ? "text-[#10b981]" : "text-[#ef4444]"
              )}
            >
              {currentPriceNum > 0 ? currentPriceNum.toFixed(2) : signal.entry}
            </span>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-medium text-slate-400">Time</span>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-slate-300">
              <Clock className="h-3 w-3 text-slate-500" />
              <span>{getTimeAgo(signal.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- DIVIDER --- */}
      <div className="my-3 h-[1px] w-full bg-white/[0.06]" />

      {/* --- BOTTOM ROW (FIT & COMPACT) --- */}
      <div className="flex items-center justify-between">
        
        <div className="flex items-center gap-5 text-[12px] font-semibold">
          {/* SL */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-slate-500">SL</span>
            <span className="font-mono text-slate-200">{signal.sl}</span>
          </div>

          <div className="h-[14px] w-[1px] bg-white/[0.08]" />

          {/* TP1 */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-slate-500">TP1</span>
            <span className="font-mono text-[#10b981]">{signal.tp1}</span>
          </div>

          {/* TP2 */}
          {signal.tp2 && (
            <>
              <div className="h-[14px] w-[1px] bg-white/[0.08]" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-slate-500">TP2</span>
                <span className="font-mono text-[#10b981]">{signal.tp2}</span>
              </div>
            </>
          )}
        </div>

        {/* COMPACT BUTTON */}
        <button
          onClick={() => navigate(`/signal/${signal.id}`)}
          className="flex items-center gap-1 rounded-full border-[1.5px] border-[#4c1d95]/70 bg-[#4c1d95]/20 px-3 py-1 text-[11px] font-semibold text-[#a78bfa] transition-all hover:bg-[#4c1d95]/40 hover:text-white"
        >
          View Details
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Profit Note if exists */}
      {signal.profit_note && (
        <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-2 text-center text-[10px] font-semibold text-emerald-400">
          {signal.profit_note}
        </div>
      )}

    </div>
  );
};

export default SignalCardNew;
