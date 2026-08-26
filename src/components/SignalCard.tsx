import { useEffect, useState } from "react";
import {
  Shield,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown
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

// Database Pair Name ko MT5 / Deriv WebSocket Symbol Code me convert karne ke liye Helper
const getDerivSymbolCode = (pair: string): string | null => {
  const p = pair.toUpperCase();
  if (p.includes("XAU") || p.includes("GOLD")) return "frxXAUUSD";
  if (p.includes("BOOM 1000")) return "BOOM1000";
  if (p.includes("BOOM 500")) return "BOOM500";
  if (p.includes("CRASH 1000")) return "CRASH1000";
  if (p.includes("CRASH 500")) return "CRASH500";
  if (p.includes("VOLATILITY 75") || p.includes("VOL 75")) return "R_75";
  if (p.includes("BTC")) return "cryBTCUSD";
  if (p.includes("ETH")) return "cryETHUSD";
  if (p.includes("EURUSD") || p.includes("EUR/USD")) return "frxEURUSD";
  if (p.includes("GBPUSD") || p.includes("GBP/USD")) return "frxGBPUSD";
  return null;
};

const SignalCard = ({ signal, onViewDetails }: SignalCardProps) => {
  const isBuy = signal.type === "Buy";
  const [livePrice, setLivePrice] = useState<string | null>(
    signal.current_price || null
  );

  // Live WebSocket Price Fetcher (Direct Deriv / MT5 Feed)
  useEffect(() => {
    const symbolCode = getDerivSymbolCode(signal.pair);
    if (!symbolCode) return;

    // Connect to Deriv Ticker Socket
    const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");

    ws.onopen = () => {
      ws.send(JSON.stringify({ ticks: symbolCode }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.tick && data.tick.quote !== undefined) {
          setLivePrice(data.tick.quote.toString());
        }
      } catch (err) {
        console.error("Live price stream error:", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [signal.pair]);

  // Display price logic (Pehle Live WebSocket, phir DB current_price, phir Entry)
  const displayPrice = livePrice || signal.current_price || signal.entry;

  const entryVal = parseFloat(signal.entry) || 0;
  const currentVal = parseFloat(displayPrice) || entryVal;

  const isInProfit = isBuy ? currentVal > entryVal : currentVal < entryVal;
  const isInLoss = isBuy ? currentVal < entryVal : currentVal > entryVal;

  const riskColor =
    signal.risk_level?.toLowerCase() === "low"
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
      : signal.risk_level?.toLowerCase() === "high"
      ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
      : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400";

  const getSymbolIcon = (pair: string) => {
    if (pair.includes("XAU") || pair.includes("GOLD")) return "Au";
    if (pair.includes("BTC") || pair.includes("ETH")) return "₿";
    if (pair.includes("EUR") || pair.includes("USD") || pair.includes("GBP")) return "💱";
    return "📈";
  };

  return (
    <article
      className={cn(
        "relative w-full overflow-hidden rounded-2xl transition-all duration-300 p-4 sm:p-5",
        "bg-white border border-slate-200/80 shadow-md shadow-slate-200/50 text-slate-900",
        "dark:bg-slate-900/90 dark:border-slate-800 dark:text-white dark:shadow-[0_10px_30px_rgba(0,0,0,0.5)]",
        "hover:border-amber-500/40 dark:hover:border-amber-500/40 backdrop-blur-xl"
      )}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/90 to-amber-600 border border-amber-500/30 text-amber-950 font-black text-base shadow-sm shrink-0">
            {getSymbolIcon(signal.pair)}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {signal.pair}
              </h3>

              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {signal.status || "LIVE"}
              </span>
            </div>

            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {signal.category || "Forex / Market"}
            </p>

            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-sm",
                  isBuy
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-red-500 text-white"
                )}
              >
                {isBuy ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {signal.type}
              </span>

              {signal.risk_level && (
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold",
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

        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
          <Clock className="h-3 w-3" />
          <span>
            {format(new Date(signal.created_at), "HH:mm")}
          </span>
        </div>
      </div>

      {/* Entry & Live Current Price */}
      <div className="mt-4 grid grid-cols-3 gap-2 items-center border-t border-slate-200/70 dark:border-slate-800/80 pt-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Entry</span>
          <p className="mt-0.5 font-mono text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
            {signal.entry}
          </p>
        </div>

        <div className="h-9 w-full flex items-center justify-center px-1">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30">
            <path
              d={isBuy ? "M 0 22 Q 20 8, 40 18 T 80 5 T 100 2" : "M 0 5 Q 20 22, 40 12 T 80 20 T 100 28"}
              fill="none"
              stroke={isInLoss ? "#ef4444" : "#10b981"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Real-time MT5 / Deriv Sync Price */}
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current</span>
          <p
            className={cn(
              "mt-0.5 font-mono text-sm sm:text-base font-extrabold tracking-tight transition-colors duration-200",
              isInProfit
                ? "text-emerald-600 dark:text-emerald-400"
                : isInLoss
                ? "text-red-600 dark:text-red-400"
                : "text-slate-900 dark:text-white"
            )}
          >
            {displayPrice}
          </p>
        </div>
      </div>

      {/* Targets & Action */}
      <div className="mt-4 border-t border-slate-200/70 dark:border-slate-800/80 pt-3">
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400">
              <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400">SL:</span>
              <span className="font-mono text-slate-900 dark:text-slate-200">{signal.sl}</span>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400">TP1:</span>
              <span className="font-mono">{signal.tp1}</span>
            </div>

            {signal.tp2 && (
              <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400">TP2:</span>
                <span className="font-mono">{signal.tp2}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => onViewDetails && onViewDetails(signal.id)}
            className="flex items-center gap-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border border-amber-500/30 px-3 py-1.5 text-xs font-extrabold text-amber-700 dark:text-amber-400 transition-all active:scale-95 ml-auto"
          >
            Details
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </article>
  );
};

export default SignalCard;
