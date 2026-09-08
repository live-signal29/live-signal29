import { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import {
  getMarketPhase,
  getNextMondayUTC,
  formatCountdown,
} from "@/lib/marketSession";

/**
 * Shows a "weekend mode" notice on the dashboard so users know
 * why Gold/Forex signals have paused, that BTC signals are still
 * live, and roughly when things resume — instead of silently
 * wondering where Monday's signals are.
 *
 * Renders nothing Monday-Friday (normal trading days).
 */
const MarketSessionBanner = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const phase = getMarketPhase(now);

  if (phase !== "weekend") return null;

  const nextMonday = getNextMondayUTC(now);
  const countdown = formatCountdown(nextMonday, now);

  return (
    <div className="bg-gradient-to-r from-indigo-500/15 to-violet-500/15 border-b border-indigo-500/20">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs sm:text-sm">
          <Moon className="h-4 w-4 text-indigo-500 shrink-0" />
          <span className="font-semibold">
            Gold &amp; Forex closed for the weekend
          </span>
          <span className="text-muted-foreground">
            • 🟠 BTC signals are live •
          </span>
          <span className="font-medium text-indigo-500">
            Reopens in {countdown}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MarketSessionBanner;
