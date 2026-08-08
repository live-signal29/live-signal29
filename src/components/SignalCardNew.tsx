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
  const note = signal.profit_note || ""; // REMOVED toLowerCase() to fix detection

  // ===== STATUS LOGIC =====
  let statusText = "Running";
  let statusColor = "text-blue-500 dark:text-blue-400"; 

  if (note.includes("SL") || note.includes("TP") || note.includes("Breakeven")) {
    statusText = "Closed";
    statusColor = "text-white"; 
  }

  // ===== TARGET COLOR LOGIC (Case sensitive fix) =====
  const getTargetColor = (targetType: "sl" | "tp1" | "tp2" | "tp3") => {
    if (targetType === "sl") return "text-rose-500 dark:text-rose-500";
    if (note.includes("TP3")) return "text-emerald-500 dark:text-emerald-400";
    if (note.includes("TP2")) return "text-emerald-500 dark:text-emerald-400";
    if (note.includes("TP1") && !note.includes("TP2") && !note.includes("TP3")) {
        return "text-emerald-500 dark:text-emerald-400";
    }
    if (note.includes("SL")) return "text-blue-600 dark:text-blue-400";
    return "text-blue-600 dark:text-blue-400"; 
  };

  // ===== BANNER COLOR LOGIC =====
  const getBannerColor = () => {
    if (note.includes("SL")) return "text-rose-600 dark:text-rose-400";
    if (note.includes("TP1") || note.includes("Breakeven")) return "text-blue-600 dark:text-blue-400";
    return "text-emerald-600 dark:text-emerald-300"; 
  };

  const bannerColorClass = getBannerColor();
  const isSLHit = note.includes("SL");

  return (
    <div 
      onClick={() => navigate(`/signal/${signal.id}`)}
      className="relative mb-2.5 w-full rounded-[14px] bg-card border border-border/50 p-3.5 text-foreground shadow-md hover:border-border transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center justify-center gap-[2px] shrink-0 relative -mt-3.5">
            <span className={`text-[7px] font-bold uppercase tracking-wider ${statusColor} leading-none whitespace-nowrap`}>
              {statusText}
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1px] border-yellow-500/40 bg-background/50 text-[12px]">
              {pairUpper.includes("XAU") ? "🪙" : pairUpper.includes("BTC") ? "₿" : "💶"}
            </div>
          </div>
          <div className="flex flex-col pt-1">
            <h3 className="text-[12px] font-bold text-foreground leading-tight">{signal.pair.replace("/", "")}</h3>
            <p className="text-[9px] text-muted-foreground leading-tight">
              {pairUpper.includes("XAU") ? "Gold" : pairUpper.includes("BTC") ? "Bitcoin" : "Forex"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1">
          <Clock className="h-2.5 w-2.5" />
          <span>{getTimeAgo(signal.created_at)}</span>
        </div>
      </div>

      {/* Prices */}
      <div className="flex items-center justify-between rounded-[10px] bg-muted/30 border border-border/50 px-2.5 py-2 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col">
            <span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground/70">Entry</span>
            <span className="font-mono text-[12px] font-bold text-foreground">{signal.entry}</span>
          </div>
          <span className="text-muted-foreground/50 text-[8px] mt-1.5">→</span>
          <div className="flex flex-col">
            <span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground/70">Current</span>
            <div className="flex items-center gap-1">
              <span className={cn("font-mono text-[12px] font-bold", isBuy ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400")}>
                {currentPriceNum > 0 ? currentPriceNum.toFixed(2) : signal.entry}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className={cn("rounded-full px-2 py-[0.5px] text-[7px] font-bold uppercase", isBuy ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300" : "bg-rose-500/20 text-rose-600 dark:text-rose-300")}>
            {signal.type.toUpperCase()}
          </span>
          {signal.risk_level && (
            <span className={cn("flex items-center gap-0.5 text-[7px] font-medium", signal.risk_level === "High" ? "text-rose-500 dark:text-rose-400" : signal.risk_level === "Medium" ? "text-amber-500 dark:text-amber-400" : "text-emerald-500 dark:text-emerald-400")}>
              <AlertCircle className="h-2 w-2" /> {signal.risk_level}
            </span>
          )}
        </div>
      </div>

      {/* Targets */}
      <div className="flex items-center justify-between px-0.5 mb-2">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-start">
            <span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground/70">Stop Loss</span>
            <span className={`font-mono text-[11px] font-bold mt-0.5 ${getTargetColor("sl")}`}>{signal.sl}</span>
          </div>
          <div className="h-3 w-[1px] bg-border/50" />
          <div className="flex flex-col items-start">
            <span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground/70">Target 1</span>
            <span className={`font-mono text-[11px] font-bold mt-0.5 ${getTargetColor("tp1")}`}>{signal.tp1}</span>
          </div>
          {signal.tp2 && (
            <>
              <div className="h-3 w-[1px] bg-border/50" />
              <div className="flex flex-col items-start">
                <span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground/70">Target 2</span>
                <span className={`font-mono text-[11px] font-bold mt-0.5 ${getTargetColor("tp2")}`}>{signal.tp2}</span>
              </div>
            </>
          )}
          {signal.tp3 && (
            <>
              <div className="h-3 w-[1px] bg-border/50" />
              <div className="flex flex-col items-start">
                <span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground/70">Target 3</span>
                <span className={`font-mono text-[11px] font-bold mt-0.5 ${getTargetColor("tp3")}`}>{signal.tp3}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {signal.profit_note && (
        <div className={`flex items-center gap-2 rounded-[10px] border px-3 py-1.5 ${isSLHit ? 'border-rose-500/30 bg-rose-500/10' : 'border-emerald-500/30 bg-emerald-500/10'}`}>
          {isSLHit ? (
            <XCircle className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
          )}
          <span className={`text-[10px] font-medium leading-tight ${bannerColorClass}`}>{signal.profit_note}</span>
        </div>
      )}
    </div>
  );
};

export default SignalCardNew;
