import React from "react";
import { Sparkles, Moon } from "lucide-react";

interface MarketClosedBannerProps {
  category: string;
}

export const MarketClosedBanner: React.FC<MarketClosedBannerProps> = ({ category }) => {
  const isWeekendClosed = (): boolean => {
    const now = new Date();
    const day = now.getUTCDay(); // 0 = Sun, 6 = Sat
    const hour = now.getUTCHours();

    if (day === 6) return true;
    if (day === 5 && hour >= 22) return true;
    if (day === 0 && hour < 22) return true;

    return false;
  };

  const isClosedCategory = category === "COMMODITIES" || category === "FOREX";

  if (!isClosedCategory || !isWeekendClosed()) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/10 dark:bg-amber-500/5 px-3.5 py-2.5 mb-4 backdrop-blur-md shadow-sm transition-all">
      {/* Subtle Glow */}
      <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />

      <div className="relative flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500">
            <Moon className="h-3.5 w-3.5" />
          </span>
          <p className="font-medium text-foreground truncate">
            <span className="font-bold text-amber-500">Happy Weekend Traders!</span> Enjoy your weekly profits & rest up.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/20">
          <Sparkles className="h-3 w-3" />
          <span>Market Closed</span>
        </div>
      </div>
    </div>
  );
};
