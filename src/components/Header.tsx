import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import TrialBanner from "./TrialBanner";
import AppInstallBanner from "./AppInstallBanner";
import { SideDrawer } from "./SideDrawer";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearch } from "./GlobalSearch";
import { FlashSaleBanner } from "./FlashSaleBanner";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

// Signal structure interface
interface Signal {
  id?: string;
  category?: string;
  status?: string; // 'OPEN' ya 'CLOSED'
}

interface HeaderProps {
  signals?: Signal[];
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
}

const CATEGORY_LIST = [
  { id: "gold", label: "GOLD" },
  { id: "forex", label: "FOREX" },
  { id: "crypto", label: "CRYPTO" },
  { id: "deriv", label: "DERIV" },
  { id: "ideas", label: "IDEAS" },
];

const Header = ({
  signals = [],
  activeCategory = "gold",
  onCategoryChange,
}: HeaderProps) => {
  const { subscriptionStatus } = useSubscriptionAccess();
  const isPremium = subscriptionStatus === "premium";

  const [selectedCategory, setSelectedCategory] = useState(activeCategory);

  // Real-time Active/Open Signals Dynamic Count
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      gold: 0,
      forex: 0,
      crypto: 0,
      deriv: 0,
      ideas: 0,
    };

    if (Array.isArray(signals)) {
      signals.forEach((sig) => {
        const isLive = sig.status?.toUpperCase() === "OPEN" || sig.status?.toUpperCase() === "ACTIVE";
        if (isLive && sig.category) {
          const catKey = sig.category.toLowerCase();
          if (counts[catKey] !== undefined) {
            counts[catKey] += 1;
          }
        }
      });
    }

    return counts;
  }, [signals]);

  const handleSelect = (catId: string) => {
    setSelectedCategory(catId);
    if (onCategoryChange) {
      onCategoryChange(catId);
    }
  };

  const currentCategory = activeCategory || selectedCategory;

  return (
    <>
      {/* Promo area */}
      {!isPremium ? (
        <>
          <FlashSaleBanner />
          <TrialBanner />
        </>
      ) : (
        <AppInstallBanner />
      )}

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/85 backdrop-blur-xl transition-colors duration-300">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-3 sm:px-4">

          {/* Brand Logo & Status */}
          <Link
            to="/"
            className="min-w-0 flex flex-col justify-center group"
          >
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Live
              </span>

              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-clip-text text-xl font-black tracking-tight text-transparent">
                Signals
              </span>

              {/* Status Badge */}
              <span
                className={
                  isPremium
                    ? "rounded-md bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-950 shadow-sm shadow-amber-500/20"
                    : "rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400"
                }
              >
                {isPremium ? "PRO" : "FREE"}
              </span>
            </div>

            <span className="mt-1 text-[10px] font-semibold leading-none tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-amber-500 inline-block animate-pulse"></span>
              Trend is Friend
            </span>
          </Link>

          {/* Right controls */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <GlobalSearch />
              <ThemeToggle />
            </div>

            <div className="flex items-center gap-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                <SideDrawer />
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                <NotificationBell />
              </div>
            </div>
          </div>
        </div>

        {/* Integrated Top Categories with Dynamic Real Signal Badge Count */}
        <div className="flex items-center overflow-x-auto no-scrollbar border-t border-slate-200/60 dark:border-slate-800/60 px-2">
          {CATEGORY_LIST.map((cat) => {
            const isActive = currentCategory.toLowerCase() === cat.id.toLowerCase();
            const openCount = categoryCounts[cat.id] || 0;

            return (
              <button
                key={cat.id}
                onClick={() => handleSelect(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold uppercase whitespace-nowrap transition-all duration-200 border-b-2 ${
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400 border-emerald-500"
                    : "text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <span>{cat.label}</span>
                {openCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold transition-colors ${
                      isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {openCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>
    </>
  );
};

export default Header;
