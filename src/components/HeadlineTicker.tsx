import React from "react";
import { Link } from "react-router-dom";
import TrialBanner from "./TrialBanner";
import AppInstallBanner from "./AppInstallBanner";
import { SideDrawer } from "./SideDrawer";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearch } from "./GlobalSearch";
import { FlashSaleBanner } from "./FlashSaleBanner";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import {
  TrendingUp,
  Coins,
  Bitcoin,
  BarChart3,
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
}

const CATEGORIES = [
  { key: "COMMODITIES", label: "Gold", icon: Coins },
  { key: "FOREX", label: "Forex", icon: TrendingUp },
  { key: "CRYPTO", label: "Crypto", icon: Bitcoin },
  { key: "DERIV/BINARY", label: "Deriv", icon: BarChart3 },
  { key: "MARKET IDEAS", label: "Ideas", icon: LineChart },
];

const Header: React.FC<HeaderProps> = ({
  activeCategory = "COMMODITIES",
  onCategoryChange,
}) => {
  const { subscriptionStatus } = useSubscriptionAccess();
  const isPremium = subscriptionStatus === "premium";

  const handleCategoryClick = (key: string) => {
    if (onCategoryChange) {
      onCategoryChange(key);
    }
  };

  return (
    <>
      {!isPremium ? (
        <>
          <FlashSaleBanner />
          <TrialBanner />
        </>
      ) : (
        <AppInstallBanner />
      )}

      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/95 backdrop-blur-2xl shadow-md">
        <div>
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-4">
            
            {/* Left: Brand Name (Always Visible) */}
            <Link to="/" className="min-w-0 flex flex-col justify-center shrink-0">
              <span className="flex items-center gap-1.5 leading-none">
                <span className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                  Live
                </span>
                <span className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                  Signals
                </span>
                <span
                  className={
                    isPremium
                      ? "rounded-md bg-gradient-to-r from-amber-500 to-yellow-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-black shadow-sm"
                      : "rounded-md border border-border/70 bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground"
                  }
                >
                  {isPremium ? "Pro" : "Free"}
                </span>
              </span>
              <span className="mt-1 text-[10px] sm:text-[11px] font-semibold leading-none text-muted-foreground">
                · <span className="text-amber-500 font-bold">Trend is Friend</span>
              </span>
            </Link>

            {/* Desktop Navigation Categories */}
            <nav className="hidden md:flex items-center space-x-1 bg-muted/60 p-1 rounded-xl border border-border/50">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.key;
                const isGold = cat.key === "COMMODITIES";

                return (
                  <button
                    key={cat.key}
                    onClick={() => handleCategoryClick(cat.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200",
                      isActive
                        ? isGold
                          ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.6)] border border-amber-300 scale-105"
                          : "bg-primary text-primary-foreground shadow-sm scale-105"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Action Icons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5">
                <GlobalSearch />
                <ThemeToggle />
              </div>

              <div className="icon-3d h-9 w-9">
                <SideDrawer />
              </div>

              <div className="icon-3d h-9 w-9">
                <NotificationBell />
              </div>
            </div>
          </div>

          {/* Mobile Categories Scrollable Bar with Gold Highlight */}
          <div className="md:hidden overflow-x-auto scrollbar-hide border-t border-border/40 bg-muted/40 px-2 py-1.5 flex items-center gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              const isGold = cat.key === "COMMODITIES";

              return (
                <button
                  key={cat.key}
                  onClick={() => handleCategoryClick(cat.key)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap shrink-0 transition-all",
                    isActive
                      ? isGold
                        ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-extrabold shadow-[0_0_12px_rgba(245,158,11,0.7)] border border-amber-300 scale-105"
                        : "bg-primary text-primary-foreground font-bold shadow-sm scale-105"
                      : "bg-background/80 text-muted-foreground border border-border/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
