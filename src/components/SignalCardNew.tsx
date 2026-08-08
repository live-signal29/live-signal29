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

  // EXACT ICON LOGIC AS PER SCREENSHOT 3
  const renderIcon = () => {
    if (pairUpper.includes("XAU") || pairUpper.includes("GOLD")) {
      return (
        <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full border-[2px] border-yellow-500/50 bg-gradient-to-br from-yellow-400/20 via-yellow-600/20 to-yellow-900/30 text-3xl shadow-[0_0_20px_rgba(234,179,8,0.15)]">
          🪙
        </div>
      );
    }
    if (pairUpper.includes("BTC") || pairUpper.includes("BITCOIN")) {
      return (
        <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full bg-[#f7931a] text-2xl font-bold text-white shadow-[0_0_20px_rgba(247,147,26,0.25)]">
          ₿
        </div>
      );
    }
    return (
      <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full border-[2px] border-blue-500/40 bg-blue-900/40 text-2xl shadow-[0_0_15px_rgba(59,130,246,0.15)]">
        🇪🇺
      </div>
    );
  };

  return (
    <div className="relative mb-4 w-full rounded-[24px] border border-white/[0.06] bg-[#0b0d18] p-[18px] text-white shadow-xl transition-all duration-300 hover:border-white/20">
      
      {/* --- SECTION 1: HEADER (PAIR, PRICES, TIME) --- */}
      <div className="flex items-start justify-between gap-2">
        
        {/* LEFT: ICON & PAIR */}
        <div className="flex items-center gap-4">
          {renderIcon()}
          <div className="flex flex-col">
            <h3 className="text-[17px] font-bold text-white tracking-tight leading-tight">
              {signal.pair.replace("/", "")}
            </h3>
            <p className="text-[12px] font-medium text-slate-400 mt-[2px]">
              {pairUpper.includes("XAU") ? "Gold / US Dollar" : pairUpper.includes("BTC") ? "Bitcoin / US Dollar" : "Euro / US Dollar"}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {/* Buy/Sell Badge */}
              <span
                className={cn(
                  "rounded-full px-2.5 py-[2px] text-[10px] font-bold uppercase leading-none",
                  isBuy ? "bg-[#10b981] text-black" : "bg-[#ef4444] text-white"
                )}
              >
                {signal.type.toUpperCase()}
              </span>
              
              {/* Risk Badge */}
              {signal.risk_level && (
                <span className="flex items-center gap-1 rounded-full bg-black/40 border border-amber-500/30 px-2.5 py-[2px] text-[10px] font-medium text-amber-400 leading-none">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/30 flex items-center justify-center text-[6px]">✦</span>
                  {signal.risk_level} Risk
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: ENTRY, CURRENT, TIME */}
        <div className="flex items-start gap-6">
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-medium text-slate-400">Entry Price</span>
            <span className="mt-0.5 font-mono text-[16px] font-semibold text-white">
              {signal.entry}
            </span>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-medium text-slate-400">Current Price</span>
            <span
              className={cn(
                "mt-0.5 font-mono text-[16px] font-semibold",
                isBuy ? "text-[#10b981]" : "text-[#ef4444]"
              )}
            >
              {currentPriceNum > 0 ? currentPriceNum.toFixed(2) : signal.entry}
            </span>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-medium text-slate-400">Time</span>
            <div className="mt-0.5 flex items-center gap-1.5 text-[13px] font-medium text-slate-300">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>{getTimeAgo(signal.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- DIVIDER --- */}
      <div className="my-[18px] h-[1px] w-full bg-white/[0.06]" />

      {/* --- SECTION 2: SL, TP1, TP2, VIEW DETAILS (WITH VERTICAL LINES) --- */}
      <div className="flex items-center justify-between">
        
        <div className="flex items-center gap-6 text-[14px] font-semibold">
          {/* SL */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-slate-500">SL</span>
            <span className="font-mono text-slate-200">{signal.sl}</span>
          </div>

          <div className="h-[18px] w-[1px] bg-white/[0.08]" />

          {/* TP1 */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-slate-500">TP1</span>
            <span className="font-mono text-[#10b981]">{signal.tp1}</span>
          </div>

          {/* TP2 */}
          {signal.tp2 && (
            <>
              <div className="h-[18px] w-[1px] bg-white/[0.08]" />
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-slate-500">TP2</span>
                <span className="font-mono text-[#10b981]">{signal.tp2}</span>
              </div>
            </>
          )}
        </div>

        {/* BUTTON - EXACT POSITION & STYLE */}
        <button
          onClick={() => navigate(`/signal/${signal.id}`)}
          className="flex items-center gap-1.5 rounded-full border-[1.5px] border-[#4c1d95]/70 bg-[#4c1d95]/20 px-4 py-1.5 text-[13px] font-semibold text-[#a78bfa] transition-all hover:bg-[#4c1d95]/40 hover:text-white"
        >
          View Details
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Profit Note if exists */}
      {signal.profit_note && (
        <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-3 text-center text-[12px] font-semibold text-emerald-400">
          {signal.profit_note}
        </div>
      )}

    </div>
  );
};

export default SignalCardNew;
