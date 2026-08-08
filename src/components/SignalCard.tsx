import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SignalCardProps {
  signal: {
    id: string;
    pair: string;
    type: "Buy" | "Sell";
    entry: string;
    current_price?: string;
    tp1: string;
    tp2?: string;
    tp3?: string;
    tp4?: string;
    sl: string;
    tp1_hit: boolean;
    tp2_hit: boolean;
    tp3_hit: boolean;
    tp4_hit: boolean;
    sl_hit?: boolean;
    status: string;
    note?: string;
    created_at: string;
    category: string;
    risk_level?: string;
    profit_note?: string;
    tag?: string;
  };
  onViewDetails?: (id: string) => void;
}

const SignalCard = ({ signal, onViewDetails }: SignalCardProps) => {
  const isBuy = signal.type === "Buy";

  const riskColor =
    signal.risk_level?.toLowerCase() === "low"
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
      : signal.risk_level?.toLowerCase() === "high"
      ? "bg-red-500/10 border-red-500/30 text-red-400"
      : "bg-amber-500/10 border-amber-500/30 text-amber-400";

  // Symbol Icons Placeholder
  const getSymbolIcon = (pair: string) => {
    if (pair.includes("XAU") || pair.includes("GOLD")) return "🪙";
    if (pair.includes("BTC") || pair.includes("ETH")) return "₿";
    if (pair.includes("EUR") || pair.includes("USD") || pair.includes("GBP")) return "💱";
    return "📈";
  };

  return (
    <article
      className={cn(
        "relative w-full overflow-hidden rounded-2xl",
        "border border-white/[0.08] bg-[#0c0f17]/90 backdrop-blur-xl",
        "p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]",
        "transition-all duration-300 hover:border-white/20 hover:shadow-[0_15px_40px_rgba(0,0,0,0.7)]"
      )}
    >
      {/* Top Header: Pair Info & Badge */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* 3D Icon Container */}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-600/5 border border-amber-500/20 text-2xl shadow-inner">
            {getSymbolIcon(signal.pair)}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold tracking-wide text-white">
                {signal.pair}
              </h3>
            </div>
            <p className="text-[11px] font-medium text-slate-400">
              {signal.category || "Forex / Market"}
            </p>

            {/* Badges */}
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                  isBuy
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-red-500 text-white"
                )}
              >
                {signal.type}
              </span>

              {signal.risk_level && (
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                    riskColor
                  )}
                >
                  <Shield className="h-2.5 w-2.5" />
                  {signal.risk_level} Risk
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Time Stamp */}
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Clock className="h-3 w-3" />
          <span>
            {format(new Date(signal.created_at), "HH:mm")}
          </span>
        </div>
      </div>

      {/* Middle Grid: Entry & Current Price */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-3">
        <div>
          <span className="text-[11px] font-medium text-slate-400">Entry Price</span>
          <p className="mt-0.5 font-mono text-base font-bold tracking-tight text-white">
            {signal.entry}
          </p>
        </div>

        <div>
          <span className="text-[11px] font-medium text-slate-400">Current Price</span>
          <p
            className={cn(
              "mt-0.5 font-mono text-base font-bold tracking-tight",
              isBuy ? "text-emerald-400" : "text-red-400"
            )}
          >
            {signal.current_price || signal.entry}
          </p>
        </div>
      </div>

      {/* Targets Grid: SL, TP1, TP2 */}
      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <div className="flex items-center justify-between gap-2">
          {/* SL */}
          <div className="flex items-center gap-1 text-xs font-semibold text-red-400">
            <span>SL</span>
            <span className="font-mono text-white">{signal.sl}</span>
          </div>

          {/* TP1 */}
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <span>TP1</span>
            <span className="font-mono text-emerald-400">{signal.tp1}</span>
          </div>

          {/* TP2 */}
          {signal.tp2 && (
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
              <span>TP2</span>
              <span className="font-mono text-emerald-400">{signal.tp2}</span>
            </div>
          )}

          {/* View Details Button */}
          <button
            onClick={() => onViewDetails && onViewDetails(signal.id)}
            className="flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-600/15 px-3 py-1.5 text-xs font-bold text-purple-300 transition-all hover:bg-purple-600 hover:text-white"
          >
            View Details
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </article>
  );
};

export default SignalCard;
