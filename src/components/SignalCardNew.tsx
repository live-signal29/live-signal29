import { Clock, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
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

  const renderIcon = () => {
    if (pairUpper.includes("XAU") || pairUpper.includes("GOLD")) {
      return <span className="text-xl">🪙</span>;
    }
    if (pairUpper.includes("BTC") || pairUpper.includes("BITCOIN")) {
      return <span className="text-xl font-bold text-[#f7931a]">₿</span>;
    }
    return <span className="text-xl">💶</span>;
  };

  return (
    <div className="relative mb-4 w-full rounded-[20px] bg-[#0e101c] border border-white/5 p-4 text-white shadow-xl transition-all duration-300 hover:border-white/10">
      
      {/* ===== 1. HEADER (Pair + Time) ===== */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Icon container with yellow ring for Gold */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#fbbf24]/40 bg-[#0e101c] shadow-[0_0_10px_rgba(251,191,36,0.1)]">
            {renderIcon()}
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-white leading-tight">
              {signal.pair.replace("/", "")}
            </h3>
            <p className="text-[11px] text-slate-400 leading-tight">
              {pairUpper.includes("XAU") ? "Gold" : pairUpper.includes("BTC") ? "Bitcoin" : "Forex"}
            </p>
          </div>
        </div>
        
        {/* Time - Right aligned */}
        <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          <span>{getTimeAgo(signal.created_at)}</span>
        </div>
      </div>

      {/* ===== 2. PRICES & BADGES ROW (Border box) ===== */}
      <div className="flex items-center justify-between rounded-[12px] bg-white/[0.03] border border-white/5 px-4 py-3 mb-3">
        
        <div className="flex items-center gap-4">
          {/* Entry */}
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Entry</span>
            <span className="font-mono text-[15px] font-bold text-white mt-0.5">
              {signal.entry}
            </span>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center text-slate-600 text-[12px] mt-3">→</div>

          {/* Current */}
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Current</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={cn(
                  "font-mono text-[15px] font-bold",
                  isBuy ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {currentPriceNum > 0 ? currentPriceNum.toFixed(2) : signal.entry}
              </span>
              {/* Simple up/down arrow */}
              <span className={isBuy ? "text-emerald-400 text-[10px]" : "text-rose-400 text-[10px]"}>
                {isBuy ? "↗" : "↘"}
              </span>
            </div>
          </div>
        </div>

        {/* Badges (Right Side) */}
        <div className="flex flex-col items-end gap-1">
          <span
            className={cn(
              "rounded-full px-3 py-[2px] text-[10px] font-bold uppercase tracking-wider",
              isBuy ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20" : "bg-rose-500/20 text-rose-300 border border-rose-500/20"
            )}
          >
            {signal.type.toUpperCase()}
          </span>
          {signal.risk_level && (
            <span className={cn(
              "flex items-center gap-1 text-[10px] font-medium",
              signal.risk_level === "High" ? "text-rose-400" : 
              signal.risk_level === "Medium" ? "text-amber-400" : "text-emerald-400"
            )}>
              <span className="h-2.5 w-2.5 rounded-full border border-current flex items-center justify-center text-[6px]">!</span>
              {signal.risk_level}
            </span>
          )}
        </div>
      </div>

      {/* ===== 3. TARGETS & DETAILS BUTTON ROW ===== */}
      <div className="flex items-center justify-between px-1 mb-3.5">
        <div className="flex items-center gap-5">
          
          {/* SL (RED) */}
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Stop Loss</span>
            <span className="font-mono text-[13px] font-bold text-rose-500 mt-0.5">{signal.sl}</span>
          </div>

          <div className="h-[18px] w-[1px] bg-white/10" />

          {/* TP1 (BLUE) */}
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Target 1</span>
            <span className="font-mono text-[13px] font-bold text-blue-400 mt-0.5">{signal.tp1}</span>
          </div>

          {/* TP2 (GREEN) */}
          {signal.tp2 && (
            <>
              <div className="h-[18px] w-[1px] bg-white/10" />
              <div className="flex flex-col items-start">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Target 2</span>
                <span className="font-mono text-[13px] font-bold text-emerald-400 mt-0.5">{signal.tp2}</span>
              </div>
            </>
          )}
        </div>

        {/* ===== "Details" Button (Small & Grey border - like screenshot) ===== */}
        <button
          onClick={() => navigate(`/signal/${signal.id}`)}
          className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white"
        >
          Details
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* ===== 4. STATUS BANNER (SL Hit / TP Hit) - EXACT SCREENSHOT STYLE ===== */}
      {signal.profit_note && (
        <div className="flex items-center gap-3 rounded-[12px] border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          {/* Green Check Icon with circle */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-500/10">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          
          <span className="text-[12px] font-medium text-emerald-300">
            {signal.profit_note}
          </span>
        </div>
      )}

    </div>
  );
};

export default SignalCardNew;
