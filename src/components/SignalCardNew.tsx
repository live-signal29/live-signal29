import { Shield, Clock, ArrowRight, Coins, Bitcoin, BarChart3 } from "lucide-react";
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

  const currentPriceNum =
    livePrice ||
    (signal.current_price
      ? parseFloat(signal.current_price)
      : 0);

  const getTimeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
      })
        .replace("about ", "")
        .replace("minutes", "m")
        .replace("minute", "m")
        .replace("hours", "h")
        .replace("hour", "h")
        .replace("days", "d")
        .replace("day", "d");
    } catch {
      return "just now";
    }
  };

  const cleanPair = (signal.pair || "XAUUSD")
    .split("(")[0]
    .trim()
    .replace("/", "");

  const category = (signal.category || "").toLowerCase();

  const isGold =
    category.includes("gold") ||
    cleanPair.includes("XAU");

  const isCrypto =
    category.includes("crypto") ||
    cleanPair.includes("BTC") ||
    cleanPair.includes("ETH");

  const isForex =
    category.includes("forex") ||
    ["EUR", "GBP", "USD", "JPY", "AUD", "CAD", "CHF", "NZD"].some(
      (x) => cleanPair.startsWith(x)
    );

  const getAssetName = () => {
    if (isGold) return "Gold / US Dollar";
    if (isCrypto) return "Crypto / US Dollar";
    if (isForex) return "Forex Pair";
    return signal.category || "Trading Signal";
  };

  const getRiskClass = () => {
    switch (signal.risk_level?.toLowerCase()) {
      case "low":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

      case "high":
        return "bg-red-500/10 text-red-400 border-red-500/20";

      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  const getAssetIcon = () => {
    if (isGold) {
      return (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-yellow-400/50 bg-gradient-to-br from-yellow-500/25 to-orange-500/10 shadow-[0_0_22px_rgba(250,204,21,0.18)]">
          <Coins className="h-6 w-6 text-yellow-400" />
        </div>
      );
    }

    if (isCrypto) {
      return (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-orange-400/50 bg-orange-500/10 shadow-[0_0_22px_rgba(249,115,22,0.18)]">
          <Bitcoin className="h-6 w-6 text-orange-400" />
        </div>
      );
    }

    if (isForex) {
      return (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 shadow-[0_0_22px_rgba(59,130,246,0.15)]">
          <BarChart3 className="h-6 w-6 text-blue-400" />
        </div>
      );
    }

    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-purple-400/40 bg-purple-500/10">
        <BarChart3 className="h-6 w-6 text-purple-400" />
      </div>
    );
  };

  return (
    <article
      className={cn(
        "group relative w-full overflow-hidden rounded-[22px]",
        "border border-white/[0.08]",
        "bg-gradient-to-br from-[#10131f] via-[#0d101a] to-[#090c14]",
        "shadow-[0_10px_35px_rgba(0,0,0,0.28)]",
        "transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-white/[0.15]"
      )}
    >
      {/* TOP ACCENT */}
      <div
        className={cn(
          "absolute left-0 top-0 h-[2px] w-full",
          isBuy
            ? "bg-gradient-to-r from-emerald-400 via-emerald-500/50 to-transparent"
            : "bg-gradient-to-r from-red-500 via-orange-400/50 to-transparent"
        )}
      />

      <div className="p-4 sm:p-5">

        {/* ================= TOP INFORMATION ================= */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr_0.7fr] lg:items-center">

          {/* ASSET */}
          <div className="flex min-w-0 items-center gap-3">
            {getAssetIcon()}

            <div className="min-w-0">
              <h3 className="truncate text-lg font-black tracking-tight text-white">
                {cleanPair}
              </h3>

              <p className="mt-0.5 text-xs text-slate-400">
                {getAssetName()}
              </p>

              {/* BUY / SELL + RISK */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">

                <span
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[9px] font-black uppercase tracking-wide",
                    isBuy
                      ? "bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                      : "bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                  )}
                >
                  {signal.type.toUpperCase()}
                </span>

                {signal.risk_level && (
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-bold",
                      getRiskClass()
                    )}
                  >
                    <Shield className="h-2.5 w-2.5" />
                    {signal.risk_level} Risk
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ENTRY + CURRENT */}
          <div className="grid grid-cols-2 gap-5 border-t border-white/[0.06] pt-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">

            <div>
              <p className="text-[10px] font-medium text-slate-400">
                Entry Price
              </p>

              <p className="mt-1 font-mono text-base font-bold text-white">
                {signal.entry}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-slate-400">
                Current Price
              </p>

              <p
                className={cn(
                  "mt-1 font-mono text-base font-bold",
                  isBuy
                    ? "text-emerald-400"
                    : "text-red-400"
                )}
              >
                {currentPriceNum > 0
                  ? currentPriceNum.toFixed(2)
                  : signal.entry}
              </p>
            </div>
          </div>

          {/* TIME */}
          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 lg:block lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">

            <p className="text-[10px] font-medium text-slate-400">
              Time
            </p>

            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {getTimeAgo(signal.created_at)}
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="my-4 h-px w-full bg-white/[0.07]" />

        {/* ================= SL / TP / BUTTON ================= */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          {/* SL / TP */}
          <div className="grid grid-cols-2 gap-0 sm:flex sm:items-center">

            {/* SL */}
            <div className="border-r border-white/[0.08] pr-5">
              <p className="text-[10px] font-medium text-slate-500">
                SL
              </p>

              <p className="mt-1 font-mono text-sm font-bold text-red-400">
                {signal.sl}
              </p>
            </div>

            {/* TP1 */}
            <div className="border-r border-white/[0.08] px-5">
              <p className="text-[10px] font-medium text-slate-500">
                TP1
              </p>

              <p className="mt-1 font-mono text-sm font-bold text-emerald-400">
                {signal.tp1}
              </p>
            </div>

            {/* TP2 */}
            {signal.tp2 && (
              <div className="px-5">
                <p className="text-[10px] font-medium text-slate-500">
                  TP2
                </p>

                <p className="mt-1 font-mono text-sm font-bold text-emerald-400">
                  {signal.tp2}
                </p>
              </div>
            )}
          </div>

          {/* VIEW DETAILS */}
          <button
            type="button"
            onClick={() => navigate(`/signal/${signal.id}`)}
            className={cn(
              "flex w-full items-center justify-center gap-2",
              "rounded-full border border-purple-500/30",
              "bg-purple-500/[0.04]",
              "px-5 py-2.5",
              "text-xs font-bold text-purple-300",
              "transition-all duration-200",
              "hover:border-purple-400/60",
              "hover:bg-purple-500/10",
              "hover:text-purple-200",
              "lg:w-auto"
            )}
          >
            View Details
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* PROFIT NOTE */}
        {signal.profit_note && (
          <div className="mt-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2 text-center text-[10px] font-semibold text-emerald-300">
            {signal.profit_note}
          </div>
        )}
      </div>
    </article>
  );
};

export default SignalCardNew;
