import React from "react";
import { Clock, Info } from "lucide-react";

interface MarketClosedBannerProps {
  category: string;
}

export const MarketClosedBanner: React.FC<MarketClosedBannerProps> = ({ category }) => {
  const isWeekendClosed = (): boolean => {
    const now = new Date();
    const day = now.getUTCDay(); // 0 = Sun, 6 = Sat
    const hour = now.getUTCHours();

    // Market closes Friday 22:00 UTC and opens Sunday 22:00 UTC
    if (day === 6) return true; // Saturday
    if (day === 5 && hour >= 22) return true; // Friday night after 22:00 UTC
    if (day === 0 && hour < 22) return true; // Sunday before 22:00 UTC

    return false;
  };

  const isClosedCategory = category === "COMMODITIES" || category === "FOREX";

  if (!isClosedCategory || !isWeekendClosed()) {
    return null;
  }

  const categoryName = category === "COMMODITIES" ? "Gold & Commodities" : "Forex";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 dark:from-amber-500/20 dark:via-amber-500/5 dark:to-amber-500/15 p-4 mb-4 backdrop-blur-md shadow-lg shadow-amber-500/5 animate-pulse transition-all duration-300">
      {/* Background Soft Glow Effect */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

      <div className="relative flex items-start gap-3.5 sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <Clock className="h-5 w-5 animate-spin-slow" />
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-bold tracking-wide text-amber-700 dark:text-amber-300 uppercase">
              {categoryName} Market Closed (Weekend)
            </h4>
            <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300 border border-amber-500/30">
              OFF-MARKET
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {categoryName} markets remain closed on Saturdays and Sundays. New live signals for this category will resume on Monday market opening.
          </p>

          <div className="pt-1 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <Info className="h-3.5 w-3.5" />
            <span>Note: Crypto and Deriv markets are active 24/7.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
