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

  // Exact Icon rendering as per screenshot
  const renderPairIconAndSub = () => {
    const pairUpper = signal.pair?.toUpperCase() || "";
    
    // XAUUSD (Gold Coins Icon with Yellow Ring)
    if (pairUpper.includes("XAU") || pairUpper.includes("GOLD")) {
      return {
        icon: (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-amber-500/40 bg-gradient-to-br from-amber-100 via-amber-500 to-amber-800 shadow-[0_0_20px_rgba(245,158,11,0.2)] text-3xl">
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
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f7931a] text-2xl font-bold text-white shadow-[0_0_20px_rgba(247,147,26,0.3)]">
            ₿
          </div>
        ),
        sub: "Bitcoin / US Dollar",
      };
    }
    // EURUSD (EU Flag Icon with Blue Ring)
    return {
      icon: (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-blue-500/40 bg-blue-900/60 text-2xl shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          🇪🇺
        </div>
      ),
      sub: "Euro / US Dollar",
    };
  };

  const pairDetails = renderPairIconAndSub();

  return (
    <div className="relative mb-4 w-full rounded-[22px] border border-white/[0.06] bg-[#0b0d17] p-5 text-white shadow-2xl transition-all duration-300 hover:border-white/20">
      
      {/* --- TOP SECTION (Pair, Prices, Time) --- */}
      <div className="flex items-start justify-between">
        
        {/* Left: Icon + Pair Info */}
        <div className="flex items-center gap-4">
          {pairDetails.icon}
          <div>
            <h3 className="text-lg font-bold tracking-tight text-white leading-tight">
              {signal.pair.replace("/", "")}
            </h3>
            <p className="text-[12px] font-medium text-slate-400 leading-tight">
              {pairDetails.sub}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {/* Type Badge */}
              <span
                className={cn(
                  "rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none",
                  isBuy ? "bg-[#10b981] text-black" : "bg-[#ef4444] text-white"
                )}
              >
                {signal.type.toUpperCase()}
              </span>
              
              {/* Risk Badge with Icon (Exactly as image) */}
              {signal.risk_level && (
                <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-[10px] font-semibold text-amber-400 leading-none">
                  <Shield className="h-3 w-3 fill-amber-400/20" />
                  {signal.risk_level} Risk
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Prices and Time (Grouped) */}
        <div className="flex items-start gap-6">
          
          {/* Entry Price */}
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-medium text-slate-400">Entry Price</span>
            <span className="mt-1 font-mono text-lg font-bold text-white tracking-tight">
              {signal.entry}
            </span>
          </div>

          {/* Current Price */}
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-medium text-slate-400">Current Price</span>
            <span
              className={cn(
                "mt-1 font-mono text-lg font-bold tracking-tight",
                isBuy ? "text-[#10b981]" : "text-[#ef4444]"
              )}
            >
              {currentPriceNum > 0 ? currentPriceNum.toFixed(2) : signal.entry}
            </span>
          </div>

          {/* Time */}
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-medium text-slate-400">Time</span>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-300">
              <Clock className="h-4 w-4 text-slate-500" />
              <span>{getTimeAgo(signal.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="my-5 h-[1px] w-full bg-white/[0.06]" />

      {/* --- BOTTOM SECTION (SL, TP1, TP2, VIEW DETAILS with Verticle Dividers) --- */}
      <div className="flex items-center justify-between pr-1">
        
        {/* Targets Group */}
        <div className="flex items-center gap-6 text-sm font-bold">
          
          {/* SL Block */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-slate-500">SL</span>
            <span className="font-mono text-slate-200">{signal.sl}</span>
          </div>

          {/* Vertical Divider */}
          <div className="h-4 w-[1px] bg-white/[0.08]" />

          {/* TP1 Block */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-slate-500">TP1</span>
            <span className="font-mono text-[#10b981]">{signal.tp1}</span>
          </div>

          {/* Vertical Divider */}
          {signal.tp2 && (
            <>
              <div className="h-4 w-[1px] bg-white/[0.08]" />
              
              {/* TP2 Block */}
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-slate-500">TP2</span>
                <span className="font-mono text-[#10b981]">{signal.tp2}</span>
              </div>
            </>
          )}
        </div>

        {/* EXACT "View Details ->" Button (Right aligned, Purple text/border) */}
        <button
          onClick={() => navigate(`/signal/${signal.id}`)}
          className="flex items-center gap-2 rounded-full border border-purple-500/50 bg-purple-900/10 px-5 py-2 text-sm font-bold text-purple-300 transition-all hover:bg-purple-500/20 hover:text-white"
        >
          View Details
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Optional Profit Note */}
      {signal.profit_note && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-center text-[12px] font-semibold text-emerald-300">
          {signal.profit_note}
        </div>
      )}

    </div>
  );
};

export default SignalCardNew;
