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

  const cleanPair = (signal.pair || "XAUUSD").split("(")[0].trim().replace("/", "");

  return (
    <div className="relative mb-4 w-full overflow-hidden rounded-[22px] border border-white/10 bg-[#0c0e17] p-4 text-white shadow-xl">
      
      {/* TOP ROW: Icon, Pair Name, Prices, Time */}
      <div className="flex items-center justify-between gap-2">
        
        {/* Left Section: Icon & Details */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-xl">
            🪙
          </div>

          <div className="truncate">
            <h3 className="text-base font-black tracking-tight text-white leading-none">
              {cleanPair}
            </h3>
            <p className="text-[10px] font-medium text-slate-400 mt-1">
              Gold / US Dollar
            </p>

            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase",
                  isBuy ? "bg-emerald-500 text-slate-950" : "bg-red-500 text-white"
                )}
              >
                {signal.type.toUpperCase()}
              </span>

              {signal.risk_level && (
                <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-400">
                  <Shield className="h-2.5 w-2.5" />
                  {signal.risk_level}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Middle Section: Entry & Current Price */}
        <div className="flex items-center gap-4 text-left shrink-0">
          <div>
            <span className="block text-[10px] font-medium text-slate-400">Entry</span>
            <span className="font-mono text-xs font-bold text-white">
              {signal.entry}
            </span>
          </div>

          <div>
            <span className="block text-[10px] font-medium text-slate-400">Current</span>
            <span
              className={cn(
                "font-mono text-xs font-bold",
                isBuy ? "text-emerald-400" : "text-red-400"
              )}
            >
              {currentPriceNum > 0 ? currentPriceNum.toFixed(2) : signal.entry}
            </span>
          </div>
        </div>

        {/* Right Section: Time */}
        <div className="text-right shrink-0">
          <span className="block text-[10px] font-medium text-slate-400">Time</span>
          <div className="flex items-center justify-end gap-1 text-[10px] font-medium text-slate-300">
            <Clock className="h-2.5 w-2.5 text-slate-400" />
            <span>{getTimeAgo(signal.created_at)}</span>
          </div>
        </div>

      </div>

      {/* DIVIDER */}
      <div className="my-3 h-[1px] w-full bg-white/10" />

      {/* BOTTOM ROW: SL, TP & View Details Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs font-bold">
          <div className="flex items-center gap-1 text-red-400">
            <span className="text-[10px]">SL</span>
            <span className="font-mono text-white text-xs">{signal.sl}</span>
          </div>

          <div className="h-3 w-[1px] bg-white/10" />

          <div className="flex items-center gap-1 text-emerald-400">
            <span className="text-[10px]">TP1</span>
            <span className="font-mono text-xs">{signal.tp1}</span>
          </div>

          {signal.tp2 && (
            <>
              <div className="h-3 w-[1px] bg-white/10" />
              <div className="flex items-center gap-1 text-emerald-400">
                <span className="text-[10px]">TP2</span>
                <span className="font-mono text-xs">{signal.tp2}</span>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => navigate(`/signal/${signal.id}`)}
          className="flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-950/40 px-3.5 py-1.5 text-xs font-bold text-white shadow-[0_0_12px_rgba(168,85,247,0.25)] hover:bg-purple-900/60"
        >
          View Details
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* PROFIT NOTE */}
      {signal.profit_note && (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-center text-[10px] font-semibold text-emerald-300">
          {signal.profit_note}
        </div>
      )}

    </div>
  );
};

export default SignalCardNew;
