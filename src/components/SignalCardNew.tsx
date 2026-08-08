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

  // Time format: "2m ago", "5m ago" etc.
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

  // Dynamic Icon & Subtitle based on Pair
  const renderPairIconAndSub = () => {
    const pairUpper = signal.pair?.toUpperCase() || "";
    if (pairUpper.includes("XAU") || pairUpper.includes("GOLD")) {
      return {
        icon: (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-gradient-to-b from-amber-400/20 via-amber-600/10 to-amber-950/40 text-2xl shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            🪙
          </div>
        ),
        sub: "Gold / US Dollar",
      };
    }
    if (pairUpper.includes("BTC") || pairUpper.includes("BITCOIN")) {
      return {
        icon: (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f7931a] text-xl font-black text-white shadow-[0_0_15px_rgba(247,147,26,0.3)]">
            ₿
          </div>
        ),
        sub: "Bitcoin / US Dollar",
      };
    }
    return {
      icon: (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-950/40 text-xl font-bold text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]">
          🇪🇺
        </div>
      ),
      sub: signal.category || "Forex / US Dollar",
    };
  };

  const pairDetails = renderPairIconAndSub();

  return (
    <div className="relative mb-3.5 w-full rounded-[22px] border border-white/[0.08] bg-[#0c0e18] p-4 text-white shadow-xl backdrop-blur-md transition-all duration-300 hover:border-white/20">
      
      {/* --- TOP ROW --- */}
      <div className="grid grid-cols-12 items-center gap-2">
        
        {/* Left: Icon + Pair Name + Badges */}
        <div className="col-span-5 flex items-center gap-3">
          {pairDetails.icon}
          <div>
            <h3 className="text-base font-extrabold tracking-tight text-white leading-tight">
              {signal.pair.replace("/", "")}
            </h3>
            <p className="text-[10px] font-medium text-slate-400">
              {pairDetails.sub}
            </p>

            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider",
                  isBuy ? "bg-[#10b981] text-slate-950" : "bg-[#ef4444] text-white"
                )}
              >
                {signal.type.toUpperCase()}
              </span>

              {signal.risk_level && (
                <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-400">
                  <Shield className="h-2.5 w-2.5" />
                  {signal.risk_level} Risk
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Entry Price */}
        <div className="col-span-3 text-left pl-1">
          <span className="text-[10px] font-medium text-slate-400 block">Entry Price</span>
          <span className="font-mono text-sm font-bold text-white tracking-tight">
            {signal.entry}
          </span>
        </div>

        {/* Center-Right: Current Price */}
        <div className="col-span-2 text-left">
          <span className="text-[10px] font-medium text-slate-400 block">Current Price</span>
          <span
            className={cn(
              "font-mono text-sm font-bold tracking-tight",
              isBuy ? "text-[#10b981]" : "text-[#ef4444]"
            )}
          >
            {currentPriceNum > 0 ? currentPriceNum.toFixed(2) : signal.entry}
          </span>
        </div>

        {/* Right: Time */}
        <div className="col-span-2 text-right">
          <span className="text-[10px] font-medium text-slate-400 block">Time</span>
          <div className="flex items-center justify-end gap-1 text-[11px] font-medium text-slate-300">
            <Clock className="h-3 w-3 text-slate-400" />
            <span>{getTimeAgo(signal.created_at)}</span>
          </div>
        </div>

      </div>

      {/* Divider */}
      <div className="my-3.5 h-[1px] w-full bg-white/[0.06]" />

      {/* --- BOTTOM ROW (SL, TPs & View Details) --- */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs font-bold">
          
          {/* SL */}
          <div className="flex items-center gap-1 text-[#ef4444]">
            <span className="text-[11px] uppercase">SL</span>
            <span className="font-mono text-slate-200">{signal.sl}</span>
          </div>

          <div className="h-3 w-[1px] bg-white/10" />

          {/* TP1 */}
          <div className="flex items-center gap-1 text-[#10b981]">
            <span className="text-[11px] uppercase">TP1</span>
            <span className="font-mono text-[#10b981]">{signal.tp1}</span>
          </div>

          {/* TP2 */}
          {signal.tp2 && (
            <>
              <div className="h-3 w-[1px] bg-white/10" />
              <div className="flex items-center gap-1 text-[#10b981]">
                <span className="text-[11px] uppercase">TP2</span>
                <span className="font-mono text-[#10b981]">{signal.tp2}</span>
              </div>
            </>
          )}

        </div>

        {/* Reference Exact Purple "View Details ->" Oval Button */}
        <button
          onClick={() => navigate(`/signal/${signal.id}`)}
          className="flex items-center gap-1.5 rounded-full border border-purple-500/50 bg-gradient-to-r from-purple-900/40 via-purple-900/20 to-purple-950/40 px-4 py-1.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all hover:bg-purple-900/60"
        >
          View Details
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Optional Profit Note */}
      {signal.profit_note && (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-center text-[11px] font-semibold text-emerald-300">
          {signal.profit_note}
        </div>
      )}

    </div>
  );
};

export default SignalCardNew;
