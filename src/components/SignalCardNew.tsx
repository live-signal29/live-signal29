import { Shield, Clock, ArrowRight } from "lucide-react";
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
  subscriptionStatus?: string | null;
  livePrice?: number;
}

const SignalCardNew = ({ signal, livePrice }: SignalCardProps) => {
  const navigate = useNavigate();
  const isBuy = signal.type?.toLowerCase() === "buy";
  const currentPriceNum = livePrice || (signal.current_price ? parseFloat(signal.current_price) : 0);

  // "2m ago", "5m ago" etc.
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

  // Exact Pair Icons & Subtitles from Image
  const renderPairIconAndSub = () => {
    const pairUpper = signal.pair?.toUpperCase() || "";
    
    // XAUUSD (Gold Coins Icon)
    if (pairUpper.includes("XAU") || pairUpper.includes("GOLD")) {
      return {
        icon: (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-[0_0_15px_rgba(245,158,11,0.3)] text-3xl border border-amber-400/30">
            🪙
          </div>
        ),
        sub: "Gold / US Dollar",
      };
    }
    // BTCUSD (Bitcoin Orange Icon)
    if (pairUpper.includes("BTC") || pairUpper.includes("BITCOIN")) {
      return {
        icon: (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f7931a] text-xl font-bold text-white shadow-[0_0_15px_rgba(247,147,26,0.4)]">
            ₿
          </div>
        ),
        sub: "Bitcoin / US Dollar",
      };
    }
    // EURUSD (EU Flag Icon)
    return {
      icon: (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-900/60 text-xl border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.2)]">
          🇪🇺
        </div>
      ),
      sub: signal.category || "Euro / US Dollar",
    };
  };

  const pairDetails = renderPairIconAndSub();

  return (
    <div className="relative mb-4 w-full rounded-[22px] border border-white/[0.08] bg-[#0d0e1a] p-4 text-white shadow-xl transition-all duration-300 hover:border-white/20">
      
      {/* --- TOP ROW (EXACT 4 COLUMN GRID) --- */}
      <div className="grid grid-cols-12 items-center gap-2">
        
        {/* Col 1: Icon + Pair + Type + Risk (Spans 4) */}
        <div className="col-span-4 flex items-center gap-3">
          {pairDetails.icon}
          <div>
            <h3 className="text-[15px] font-extrabold tracking-tight text-white leading-tight">
              {signal.pair.replace("/", "")}
            </h3>
            <p className="text-[10px] font-medium text-slate-400 leading-tight">
              {pairDetails.sub}
            </p>

            <div className="mt-1.5 flex items-center gap-2">
              {/* Type Badge */}
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide leading-none",
                  isBuy ? "bg-[#10b981] text-black" : "bg-[#ef4444] text-white"
                )}
              >
                {signal.type.toUpperCase()}
              </span>

              {/* Risk Badge */}
              {signal.risk_level && (
                <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-400 leading-none">
                  <Shield className="h-2.5 w-2.5" />
                  {signal.risk_level} Risk
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Col 2: Entry Price (Spans 2) */}
        <div className="col-span-2 text-left pl-1 flex flex-col">
          <span className="text-[10px] font-medium text-slate-400 leading-tight">Entry Price</span>
          <span className="font-mono text-sm font-bold text-white tracking-tight mt-0.5">
            {signal.entry}
          </span>
        </div>

        {/* Col 3: Current Price (Spans 3) */}
        <div className="col-span-3 text-left pl-1 flex flex-col">
          <span className="text-[10px] font-medium text-slate-400 leading-tight">Current Price</span>
          <span
            className={cn(
              "font-mono text-sm font-bold tracking-tight mt-0.5",
              isBuy ? "text-[#10b981]" : "text-[#ef4444]"
            )}
          >
            {currentPriceNum > 0 ? currentPriceNum.toFixed(2) : signal.entry}
          </span>
        </div>

        {/* Col 4: Time (Spans 3) */}
        <div className="col-span-3 text-right flex flex-col items-end">
          <span className="text-[10px] font-medium text-slate-400 leading-tight">Time</span>
          <div className="flex items-center justify-end gap-1 mt-0.5 text-[11px] font-medium text-slate-300">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>{getTimeAgo(signal.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="my-3.5 h-[1px] w-full bg-white/[0.06]" />

      {/* --- BOTTOM ROW (SL, TP1, TP2, VIEW DETAILS - RIGHT ALIGNED) --- */}
      <div className="flex items-center justify-between">
        
        {/* SL, TP1, TP2 Group */}
        <div className="flex items-center gap-4 text-xs font-bold">
          
          {/* SL - Red */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase font-medium text-slate-500">SL</span>
            <span className="font-mono text-slate-300">{signal.sl}</span>
          </div>

          {/* TP1 - Green */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase font-medium text-slate-500">TP1</span>
            <span className="font-mono text-[#10b981]">{signal.tp1}</span>
          </div>

          {/* TP2 - Green (Conditional) */}
          {signal.tp2 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] uppercase font-medium text-slate-500">TP2</span>
              <span className="font-mono text-[#10b981]">{signal.tp2}</span>
            </div>
          )}
        </div>

        {/* EXACT "View Details ->" Purple Oval Button (As per Image) */}
        <button
          onClick={() => navigate(`/signal/${signal.id}`)}
          className="flex items-center gap-1.5 rounded-full border border-purple-500/50 bg-transparent px-4 py-1.5 text-xs font-bold text-white transition-all hover:bg-purple-500/20 hover:border-purple-400"
        >
          View Details
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Optional Profit Note (Green bar at bottom, if data exists) */}
      {signal.profit_note && (
        <div className="mt-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-center text-[11px] font-semibold text-emerald-300">
          {signal.profit_note}
        </div>
      )}

    </div>
  );
};

export default SignalCardNew;
