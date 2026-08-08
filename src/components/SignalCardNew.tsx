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
    signal_status?: string;
  };
  livePrice?: number;
}

const SignalCardNew = ({ signal, livePrice }: SignalCardProps) => {
  const navigate = useNavigate();

  const isBuy = signal.type?.toLowerCase() === "buy";

  const currentPriceNum =
    livePrice ||
    (signal.current_price ? parseFloat(signal.current_price) : 0);

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
  const note = signal.profit_note || "";

  // ===== SIGNAL STATUS =====
  const getSignalStatus = () => {
    const status = signal.signal_status?.toUpperCase();

    if (status === "CLOSE" || status === "CLOSED") return "CLOSED";
    if (status === "OPEN") return "OPEN";
    if (status === "ACTIVE") return "ACTIVE";
    if (status === "RUNNING") return "RUNNING";

    if (
      note.includes("SL") ||
      note.includes("TP") ||
      note.includes("Breakeven")
    ) {
      return "CLOSED";
    }

    return "RUNNING";
  };

  const statusText = getSignalStatus();

  const getStatusStyle = () => {
    switch (statusText) {
      case "CLOSED":
        return "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400";
      case "OPEN":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400";
      case "ACTIVE":
        return "bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-400";
      default:
        return "bg-blue-500/10 border-blue-500/20 text-blue-500 dark:text-blue-400";
    }
  };

  // ===== TARGET COLOR LOGIC =====
  const getTargetColor = (
    targetType: "sl" | "tp1" | "tp2" | "tp3"
  ) => {
    if (targetType === "sl") {
      return "text-rose-500 dark:text-rose-500";
    }

    if (note.includes("TP3")) {
      return "text-emerald-500 dark:text-emerald-400";
    }

    if (note.includes("TP2")) {
      return "text-emerald-500 dark:text-emerald-400";
    }

    if (
      note.includes("TP1") &&
      !note.includes("TP2") &&
      !note.includes("TP3")
    ) {
      return "text-emerald-500 dark:text-emerald-400";
    }

    if (note.includes("SL")) {
      return "text-blue-600 dark:text-blue-400";
    }

    return "text-blue-600 dark:text-blue-400";
  };

  // ===== BANNER COLOR LOGIC =====
  const getBannerColor = () => {
    if (note.includes("SL")) {
      return "text-rose-600 dark:text-rose-400";
    }

    if (note.includes("TP1") || note.includes("Breakeven")) {
      return "text-blue-600 dark:text-blue-400";
    }

    return "text-emerald-600 dark:text-emerald-300";
  };

  const bannerColorClass = getBannerColor();
  const isSLHit = note.includes("SL");

  return (
    <div
      onClick={() => navigate(`/signal/${signal.id}`)}
      className="relative mb-2 w-full rounded-[12px] bg-card border border-border/50 p-2.5 text-foreground shadow-sm hover:border-border hover:shadow-md transition-all duration-300 cursor-pointer"
    >
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between mb-1.5">
        
        {/* LEFT: Icon + Pair */}
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Asset Icon */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-yellow-500/40 bg-background/60 text-[10px] shadow-sm">
            {pairUpper.includes("XAU")
              ? "🪙"
              : pairUpper.includes("BTC")
              ? "₿"
              : "💶"}
          </div>

          {/* Pair information */}
          <div className="flex flex-col min-w-0">
            <h3 className="text-[10.5px] font-bold text-foreground leading-tight">
              {signal.pair.replace("/", "")}
            </h3>

            <p className="text-[7.5px] text-muted-foreground leading-tight">
              {pairUpper.includes("XAU")
                ? "Gold"
                : pairUpper.includes("BTC")
                ? "Bitcoin"
                : "Forex"}
            </p>
          </div>
        </div>

        {/* CENTER/RIGHT: Status + Time */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Compact Status */}
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-1.5 py-[2px] text-[6px] font-bold uppercase tracking-wide leading-none",
              getStatusStyle()
            )}
          >
            <span
              className={cn(
                "mr-1 h-1 w-1 rounded-full",
                statusText === "CLOSED"
                  ? "bg-rose-500"
                  : statusText === "OPEN"
                  ? "bg-emerald-500"
                  : "bg-blue-500"
              )}
            />
            {statusText}
          </span>

          {/* Time */}
          <div className="flex items-center gap-0.5 text-[7.5px] text-muted-foreground">
            <Clock className="h-2 w-2" />
            <span>{getTimeAgo(signal.created_at)}</span>
          </div>
        </div>
      </div>

      {/* ===== PRICES ===== */}
      <div className="flex items-center justify-between rounded-[9px] bg-muted/30 border border-border/50 px-2 py-1.5 mb-1.5">
        
        {/* Entry */}
        <div className="flex flex-col">
          <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Entry
          </span>

          <span className="font-mono text-[10.5px] font-bold text-foreground">
            {signal.entry}
          </span>
        </div>

        {/* Current */}
        <div className="flex flex-col items-center">
          <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Current
          </span>

          <span
            className={cn(
              "font-mono text-[11px] font-bold",
              isBuy
                ? "text-emerald-500 dark:text-emerald-400"
                : "text-rose-500 dark:text-rose-400"
            )}
          >
            {currentPriceNum > 0
              ? currentPriceNum.toFixed(2)
              : signal.entry}
          </span>
        </div>

        {/* Type + Risk */}
        <div className="flex flex-col items-end gap-0.5">
          <span
            className={cn(
              "rounded-full px-1.5 py-[0.5px] text-[6.5px] font-bold uppercase",
              isBuy
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                : "bg-rose-500/20 text-rose-600 dark:text-rose-300"
            )}
          >
            {signal.type.toUpperCase()}
          </span>

          {signal.risk_level && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[6.5px] font-medium",
                signal.risk_level === "High"
                  ? "text-rose-500 dark:text-rose-400"
                  : signal.risk_level === "Medium"
                  ? "text-amber-500 dark:text-amber-400"
                  : "text-emerald-500 dark:text-emerald-400"
              )}
            >
              <AlertCircle className="h-2 w-2" />
              {signal.risk_level}
            </span>
          )}
        </div>
      </div>

      {/* ===== TARGETS ===== */}
      <div className="flex items-center justify-between px-0.5 mb-1.5">
        <div className="flex items-center gap-2.5">

          {/* SL */}
          <div className="flex flex-col items-start">
            <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Stop Loss
            </span>

            <span
              className={`font-mono text-[10px] font-bold mt-0.5 ${getTargetColor(
                "sl"
              )}`}
            >
              {signal.sl}
            </span>
          </div>

          <div className="h-3 w-[1px] bg-border/50" />

          {/* TP1 */}
          <div className="flex flex-col items-start">
            <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Target 1
            </span>

            <span
              className={`font-mono text-[10px] font-bold mt-0.5 ${getTargetColor(
                "tp1"
              )}`}
            >
              {signal.tp1}
            </span>
          </div>

          {/* TP2 */}
          {signal.tp2 && (
            <>
              <div className="h-3 w-[1px] bg-border/50" />

              <div className="flex flex-col items-start">
                <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Target 2
                </span>

                <span
                  className={`font-mono text-[10px] font-bold mt-0.5 ${getTargetColor(
                    "tp2"
                  )}`}
                >
                  {signal.tp2}
                </span>
              </div>
            </>
          )}

          {/* TP3 */}
          {signal.tp3 && (
            <>
              <div className="h-3 w-[1px] bg-border/50" />

              <div className="flex flex-col items-start">
                <span className="text-[6.5px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Target 3
                </span>

                <span
                  className={`font-mono text-[10px] font-bold mt-0.5 ${getTargetColor(
                    "tp3"
                  )}`}
                >
                  {signal.tp3}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== PROFIT / STATUS NOTE ===== */}
      {signal.profit_note && (
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1",
            isSLHit
              ? "border-rose-500/30 bg-rose-500/10"
              : "border-emerald-500/30 bg-emerald-500/10"
          )}
        >
          {isSLHit ? (
            <XCircle className="h-3 w-3 text-rose-500 dark:text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
          )}

          <span
            className={cn(
              "text-[9px] font-medium leading-tight",
              bannerColorClass
            )}
          >
            {signal.profit_note}
          </span>
        </div>
      )}
    </div>
  );
};

export default SignalCardNew;
