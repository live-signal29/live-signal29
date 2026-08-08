import { Clock, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
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
    <div className="relative mb-3.5 w-full rounded-[16px] bg-[#11131f] border border-white/5 p-4 text-white shadow-lg hover:border-white/10 transition-all duration-300">
      
      {/* ===== 1. HEADER ===== */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10">
            {renderIcon()}
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-white leading-tight">
              {signal.pair.replace("/", "")}
            </h3>
            <p className="text-[10px] text-slate-400 leading-tight">
              {pairUpper.includes("XAU") ? "Gold" : pairUpper.includes("BTC") ? "Bitcoin" : "Forex"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Clock className="h-3 w-3" />
          <span>{getTimeAgo(signal.created_at)}</span>
        </div>
      </div>

      {/* ===== 2. PRICES ===== */}
      <div className="flex items-end gap-6 mb-2.5 bg-white/[0.02] rounded-xl px-3 py-2 border border-white/5">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Entry</span>
          <span className="font-mono text-[14px] font-bold text-slate-300">
            {signal.entry}
          </span>
        </div>

        <div className="flex items-center justify-center h-8 pt-2">
          <span className="text-slate-600 text-[10px]">→</span>
        </div>

        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Current</span>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-mono text-[15px] font-bold",
                isBuy ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {currentPriceNum > 0 ? currentPriceNum.toFixed(2) : signal.entry}
            </span>
            {isBuy ? (
              <TrendingUp className="h-3 w-3 text-emerald-400/70" />
            ) : (
              <TrendingDown className="h-3 w-3 text-rose-400/70" />
            )}
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex flex-col items-end gap-1">
          <span
            className={cn(
              "rounded-full px-2.5 py-[1px] text-[9px] font-bold uppercase tracking-wider leading-tight",
              isBuy ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20" : "bg-rose-500/20 text-rose-300 border border-rose-500/20"
            )}
          >
            {signal.type.toUpperCase()}
          </span>
          {signal.risk_level && (
            <span className={cn(
              "flex items-center gap-1 text-[9px] font-medium leading-tight",
              signal.risk_level === "High" ? "text-rose-400" : 
              signal.risk_level === "Medium" ? "text-amber-400" : "text-emerald-400"
            )}>
              <AlertCircle className="h-2.5 w-2.5" />
              {signal.risk_level}
            </span>
          )}
        </div>
      </div>

      {/* ===== 3. TARGETS ===== */}
      <div className="flex items-center gap-3 justify-between mb-4 px-1 flex-wrap">
        <div className="flex items-center gap-4">
          
          {/* SL (RED) */}
          <div className="flex flex-col items-start">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Stop Loss</span>
            <span className="font-mono text-[13px] font-bold text-rose-500">{signal.sl}</span>
          </div>

          <div className="h-5 w-[1px] bg-white/10" />

          {/* TP1 (BLUE) */}
          <div className="flex flex-col items-start">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Target 1</span>
            <span className="font-mono text-[13px] font-bold text-blue-400">{signal.tp1}</span>
          </div>

          {/* TP2 (GREEN) */}
          {signal.tp2 && (
            <>
              <div className="h-5 w-[1px] bg-white/10" />
              <div className="flex flex-col items-start">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Target 2</span>
                <span className="font-mono text-[13px] font-bold text-emerald-400">{signal.tp2}</span>
              </div>
            </>
          )}
        </div>

        {/* ===== 4. BUTTON (Safe approach, no conflict) ===== */}
        <button
          onClick={() => navigate(`/signal/${signal.id}`)}
          className="flex items-center gap-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 text-[11px] font-medium text-slate-300 transition-all hover:text-white"
        >
          Details
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* ===== 5. PROFIT NOTE ===== */}
      {signal.profit_note && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-2 px-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-[10px] font-semibold text-emerald-300">{signal.profit_note}</span>
        </div>
      )}

    </div>
  );
};

export default SignalCardNew;
