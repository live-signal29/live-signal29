import { Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
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
    tp3?: string;
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
    if (pairUpper.includes("XAU") || pairUpper.includes("GOLD")) return "🪙";
    if (pairUpper.includes("BTC") || pairUpper.includes("BITCOIN")) return "₿";
    return "💶";
  };

  // ===== SIMPLE & STRAIGHT COLOR LOGIC =====
  const getTargetColor = (target: "sl" | "tp1" | "tp2" | "tp3") => {
    const note = signal.profit_note?.toLowerCase() || "";

    // 1. SL is ALWAYS Red
    if (target === "sl") return "text-rose-500";

    // 2. TP1 is ALWAYS Blue (even if hit. Matches screenshot)
    if (target === "tp1") return "text-blue-400";

    // 3. TP2 is Green ONLY IF "TP2" is mentioned. Otherwise Blue.
    if (target === "tp2") {
      return note.includes("tp2") ? "text-emerald-400" : "text-blue-400";
    }

    // 4. TP3 is Green ONLY IF "TP3" is mentioned. Otherwise Blue.
    if (target === "tp3") {
      return note.includes("tp3") ? "text-emerald-400" : "text-blue-400";
    }

    return "text-blue-400";
  };

  // Banner text color
  const getBannerColor = () => {
    const note = signal.profit_note?.toLowerCase() || "";
    if (note.includes("sl")) return "text-rose-400";
    if (note.includes("tp1") || note.includes("breakeven")) return "text-blue-400";
    return "text-emerald-300";
  };

  return (
    <div 
      onClick={() => navigate(`/signal/${signal.id}`)}
      className="relative mb-2.5 w-full rounded-[14px] bg-[#0e101c] border border-white/5 p-3.5 text-white shadow-md hover:border-white/10 transition-all duration-300 cursor-pointer"
    >
      
      {/* ===== 1. HEADER ===== */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1px] border-yellow-500/30 bg-[#0e101c] text-[14px]">
            {renderIcon()}
          </div>
          <div>
            <h3 className="text-[12px] font-bold text-white leading-tight">{signal.pair.replace("/", "")}</h3>
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

      {/* ===== 2. PRICES (Fixed Layout: Entry -> Current -> Badge) ===== */}
      <div className="flex items-center justify-between rounded-[10px] bg-white/[0.02] border border-white/5 px-2.5 py-2 mb-2">
        <div className="flex items-center gap-3">
          
          {/* ENTRY (Left) */}
          <div className="flex flex-col">
            <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500">Entry</span>
            <span className="font-mono text-[12px] font-bold text-white mt-0.5">{signal.entry}</span>
          </div>

          <span className="text-slate-600 text-[8px] mt-1.5">→</span>

          {/* CURRENT (Middle, now SMALLER size as requested) */}
          <div className="flex flex-col">
            <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500">Current</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={cn("font-mono text-[10px] font-bold", isBuy ? "text-emerald-400" : "text-rose-400")}>
                {currentPriceNum > 0 ? currentPriceNum.toFixed(2) : signal.entry}
              </span>
            </div>
          </div>
        </div>

        {/* BADGES (Right side - where "Current" used to be) */}
        <div className="flex flex-col items-end gap-0.5">
          <span className={cn("rounded-full px-2.5 py-[0.5px] text-[7px] font-bold uppercase", isBuy ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300")}>
            {signal.type.toUpperCase()}
          </span>
          {signal.risk_level && (
            <span className={cn("flex items-center gap-0.5 text-[7px] font-medium", signal.risk_level === "High" ? "text-rose-400" : signal.risk_level === "Medium" ? "text-amber-400" : "text-emerald-400")}>
              <AlertCircle className="h-2 w-2" /> {signal.risk_level}
            </span>
          )}
        </div>
      </div>

      {/* ===== 3. TARGETS (TP Logic 100% Fixed now) ===== */}
      <div className="flex items-center justify-between px-0.5 mb-2">
        <div className="flex items-center gap-3">
          
          {/* SL (ALWAYS RED) */}
          <div className="flex flex-col items-start">
            <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500">Stop Loss</span>
            <span className={`font-mono text-[11px] font-bold mt-0.5 ${getTargetColor("sl")}`}>{signal.sl}</span>
          </div>

          <div className="h-3 w-[1px] bg-white/10" />

          {/* TP1 (ALWAYS BLUE) */}
          <div className="flex flex-col items-start">
            <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500">Target 1</span>
            <span className={`font-mono text-[11px] font-bold mt-0.5 ${getTargetColor("tp1")}`}>{signal.tp1}</span>
          </div>

          {/* TP2 (GREEN ONLY if note says "TP2") */}
          {signal.tp2 && (
            <>
              <div className="h-3 w-[1px] bg-white/10" />
              <div className="flex flex-col items-start">
                <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500">Target 2</span>
                <span className={`font-mono text-[11px] font-bold mt-0.5 ${getTargetColor("tp2")}`}>{signal.tp2}</span>
              </div>
            </>
          )}

          {/* TP3 (GREEN ONLY if note says "TP3") */}
          {signal.tp3 && (
            <>
              <div className="h-3 w-[1px] bg-white/10" />
              <div className="flex flex-col items-start">
                <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500">Target 3</span>
                <span className={`font-mono text-[11px] font-bold mt-0.5 ${getTargetColor("tp3")}`}>{signal.tp3}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== 4. STATUS BANNER ===== */}
      {signal.profit_note && (
        <div className={`flex items-center gap-2 rounded-[10px] border px-3 py-1.5 ${signal.profit_note.toLowerCase().includes("sl") ? 'border-rose-500/20 bg-rose-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
          {signal.profit_note.toLowerCase().includes("sl") ? (
            <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          )}
          <span className={`text-[10px] font-medium leading-tight ${getBannerColor()}`}>
            {signal.profit_note}
          </span>
        </div>
      )}

    </div>
  );
};

export default SignalCardNew;
