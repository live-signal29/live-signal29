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

  // EXACT ICON & RING AS PER SCREENSHOT
  const renderIcon = () => {
    if (pairUpper.includes("XAU") || pairUpper.includes("GOLD")) {
      return (
        <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border-[2px] border-[#fbbf24]/50 bg-[#0b0d18] text-[22px] shadow-[0_0_12px_rgba(251,191,36,0.15)]">
          🪙
        </div>
      );
    }
    if (pairUpper.includes("BTC") || pairUpper.includes("BITCOIN")) {
      return (
        <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-[#f7931a] text-[18px] font-bold text-white shadow-[0_0_12px_rgba(247,147,26,0.25)]">
          ₿
        </div>
      );
    }
    return (
      <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border-[2px] border-blue-500/40 bg-[#0b0d18] text-[18px] shadow-[0_0_12px_rgba(59,130,246,0.15)]">
        🇪🇺
      </div>
    );
  };

  return (
    <div className="relative mb-3 w-full rounded-[18px] border border-white/[0.07] bg-[#0a0c16] p-[14px] text-white shadow-xl transition-all duration-300 hover:border-white/20">
      
      {/* =============== TOP ROW =============== */}
      <div className="flex items-start justify-between">
        
        {/* LEFT: ICON + PAIR INFO */}
        <div className="flex items-center gap-3">
          {renderIcon()}
          <div className="flex flex-col">
            <h3 className="text-[14px] font-bold text-white tracking-tight leading-none">
              {signal.pair.replace("/", "")}
            </h3>
            <p className="text-[10px] font-medium text-slate-400 mt-[3px] leading-none">
              {pairUpper.includes("XAU") ? "Gold / US Dollar" : pairUpper.includes("BTC") ? "Bitcoin / US Dollar" : "Euro / US Dollar"}
            </p>
            
            {/* BADGES */}
            <div className="flex items-center gap-2 mt-[6px]">
              <span
                className={cn(
                  "rounded-full px-2.5 py-[1px] text-[9px] font-bold uppercase leading-[18px] tracking-wide",
                  isBuy ? "bg-[#10b981] text-black" : "bg-[#ef4444] text-white"
                )}
              >
                {signal.type.toUpperCase()}
              </span>
              
              {signal.risk_level && (
                <span className="flex items-center gap-1 rounded-full bg-[#1c1917] border border-[#fbbf24]/30 px-2 py-[1px] text-[9px] font-medium text-[#fbbf24] leading-[18px]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]/30 flex items-center justify-center text-[5px]">✦</span>
                  {signal.risk_level} Risk
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: PRICES & TIME (Flex stretch to match screenshot alignment) */}
        <div className="flex flex-1 justify-end items-start gap-0 max-w-[55%]">
          
          {/* Col 1: Entry */}
          <div className="flex flex-col items-start w-[36%]">
            <span className="text-[9px] font-medium text-slate-400">Entry Price</span>
            <span className="mt-[3px] font-mono text-[14px] font-semibold text-white">
              {signal.entry}
            </span>
          </div>

          {/* Col 2: Current */}
          <div className="flex flex-col items-start w-[36%] pl-2">
            <span className="text-[9px] font-medium text-slate-400">Current Price</span>
            <span
              className={cn(
                "mt-[3px] font-mono text-[14px] font-semibold",
                isBuy ? "text-[#10b981]" : "text-[#ef4444]"
              )}
            >
              {currentPriceNum > 0 ? currentPriceNum.toFixed(2) : signal.entry}
            </span>
          </div>

          {/* Col 3: Time (Right aligned) */}
          <div className="flex flex-col items-end flex-1">
            <span className="text-[9px] font-medium text-slate-400">Time</span>
            <div className="mt-[3px] flex items-center gap-1 text-[11px] font-medium text-slate-300">
              <Clock className="h-3 w-3 text-slate-500" />
              <span>{getTimeAgo(signal.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* =============== DIVIDER =============== */}
      <div className="my-[14px] h-[1px] w-full bg-white/[0.06]" />

      {/* =============== BOTTOM ROW (SL, TP1, TP2, BUTTON) =============== */}
      <div className="flex items-center justify-between">
        
        {/* TARGETS GROUP */}
        <div className="flex items-center gap-4 text-[12px] font-semibold">
          <div className="flex items-center gap-1.5 text-[#ef4444]">
            <span className="text-[10px] font-medium text-slate-500">SL</span>
            <span className="font-mono">{signal.sl}</span>
          </div>

          <div className="h-[14px] w-[1px] bg-white/[0.08]" />

          <div className="flex items-center gap-1.5 text-[#10b981]">
            <span className="text-[10px] font-medium text-slate-500">TP1</span>
            <span className="font-mono">{signal.tp1}</span>
          </div>

          {signal.tp2 && (
            <>
              <div className="h-[14px] w-[1px] bg-white/[0.08]" />
              <div className="flex items-center gap-1.5 text-[#10b981]">
                <span className="text-[10px] font-medium text-slate-500">TP2</span>
                <span className="font-mono">{signal.tp2}</span>
              </div>
            </>
          )}
        </div>

        {/* BUTTON GROUP */}
        <div className="flex items-center gap-3">
          {/* VERTICAL DIVIDER RIGHT BEFORE BUTTON (EXACT MATCH) */}
          <div className="h-[22px] w-[1px] bg-white/[0.08]" />
          
          <button
            onClick={() => navigate(`/signal/${signal.id}`)}
            className="flex items-center gap-1.5 rounded-full border border-[#4c1d95]/50 bg-[#1e102e] px-3 py-1 text-[11px] font-medium text-[#a78bfa] transition-all hover:bg-[#4c1d95]/40 hover:text-white"
          >
            View Details
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* =============== OPTIONAL PROFIT NOTE =============== */}
      {signal.profit_note && (
        <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 py-1.5 text-center text-[10px] font-semibold text-emerald-400">
          {signal.profit_note}
        </div>
      )}

    </div>
  );
};

export default SignalCardNew;
