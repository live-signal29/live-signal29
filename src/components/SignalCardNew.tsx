import { Clock, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";
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

  return (
    <div 
      onClick={() => navigate(`/signal/${signal.id}`)}
      className="relative mb-2.5 w-full rounded-[14px] bg-[#0e101c] border border-white/5 p-3.5 text-white shadow-md hover:border-white/10 transition-all duration-300 cursor-pointer"
    >
      
      {/* ===== 1. HEADER (Small Icon & Small Text) ===== */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* SMALLER ICON */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1px] border-yellow-500/30 bg-[#0e101c] text-[14px]">
            {pairUpper.includes("XAU") ? "🪙" : pairUpper.includes("BTC") ? "₿" : "💶"}
          </div>
          <div>
            {/* SMALLER PAIR NAME & SUBTITLE */}
            <h3 className="text-[12px] font-bold text-white leading-tight">
              {signal.pair.replace("/", "")}
            </h3>
            <p className="text-[9px] text-slate-400 leading-tight">
              {pairUpper.includes("XAU") ? "Gold" : pairUpper.includes("BTC") ? "Bitcoin" : "Forex"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <Clock className="h-2.5 w-2.5" />
          <span>{getTimeAgo(signal.created_at)}</span>
        </div>
      </div>

      {/* ===== 2. PRICES (Smaller) ===== */}
      <div className="flex items-center justify-between rounded-[10px] bg-white/[0.02] border border-white/5 px-2.5 py-2 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col">
            <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500">Entry</span>
            <span className="font-mono text-[12px] font-bold text-white">{signal.entry}</span>
          </div>
          <span className="text-slate-600 text-[8px] mt-1.5">→</span>
          <div className="flex flex-col">
            <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500">Current</span>
            <div className="flex items-center gap-1">
              <span className={cn("font-mono text-[12px] font-bold", isBuy ? "text-emerald-400" : "text-rose-400")}>
                {currentPriceNum > 0 ? currentPriceNum.toFixed(2) : signal.entry}
              </span>
              <span className={isBuy ? "text-emerald-400 text-[8px]" : "text-rose-400 text-[8px]"}>
                {isBuy ? "↗" : "↘"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className={cn("rounded-full px-2 py-[0.5px] text-[7px] font-bold uppercase", isBuy ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300")}>
            {signal.type.toUpperCase()}
          </span>
          {signal.risk_level && (
            <span className={cn("flex items-center gap-0.5 text-[7px] font-medium", signal.risk_level === "High" ? "text-rose-400" : signal.risk_level === "Medium" ? "text-amber-400" : "text-emerald-400")}>
              <AlertCircle className="h-2 w-2" /> {signal.risk_level}
            </span>
          )}
        </div>
      </div>

      {/* ===== 3. TARGETS (Smaller) ===== */}
      <div className="flex items-center justify-between px-0.5 mb-2">
        <div className="flex items-center gap-3">
          
          <div className="flex flex-col items-start">
            <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500">Stop Loss</span>
            <span className="font-mono text-[11px] font-bold text-rose-500 mt-0.5">{signal.sl}</span>
          </div>

          <div className="h-3 w-[1px] bg-white/10" />

          <div className="flex flex-col items-start">
            <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500">Target 1</span>
            <span className="font-mono text-[11px] font-bold text-blue-400 mt-0.5">{signal.tp1}</span>
          </div>

          {signal.tp2 && (
            <>
              <div className="h-3 w-[1px] bg-white/10" />
              <div className="flex flex-col items-start">
                <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500">Target 2</span>
                <span className="font-mono text-[11px] font-bold text-emerald-400 mt-0.5">{signal.tp2}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== 4. STATUS BANNER ===== */}
      {signal.profit_note && (
        <div className="flex items-center gap-2 rounded-[10px] border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="text-[10px] font-medium text-emerald-300 leading-tight">
            {signal.profit_note}
          </span>
        </div>
      )}

    </div>
  );
};

export default SignalCardNew;
