import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import TrialBanner from "./TrialBanner";
import AppInstallBanner from "./AppInstallBanner";
import { SideDrawer } from "./SideDrawer";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearch } from "./GlobalSearch";
import { FlashSaleBanner } from "./FlashSaleBanner";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { cn } from "@/lib/utils";

const Header = () => {
  const { subscriptionStatus } = useSubscriptionAccess();
  const isPremium = subscriptionStatus === "premium";

  const CATEGORIES = [
    { key: "COMMODITIES", label: "Gold" },
    { key: "FOREX", label: "Forex" },
    { key: "CRYPTO", label: "Crypto" },
    { key: "DERIV/BINARY", label: "Deriv" },
    { key: "MARKET IDEAS", label: "Ideas" },
  ];

  return (
    <>
      {/* Promo strips */}
      {!isPremium ? (
        <>
          <FlashSaleBanner />
          <TrialBanner />
        </>
      ) : (
        <AppInstallBanner />
      )}

      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-2xl shadow-[0_6px_24px_-20px_hsl(var(--glow-primary)/0.9)]">
        <div>
          {/* Top Header Row */}
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-4">
            {/* Left: Brand */}
            <Link to="/" className="min-w-0 flex flex-col justify-center">
              <span className="flex items-center gap-1.5 leading-none">
                <span className="text-xl font-extrabold tracking-tight">Live</span>
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-warning via-affiliate to-warning bg-clip-text text-transparent">
                  Signals
                </span>
                <span
                  className={
                    isPremium
                      ? "shine rounded-md bg-gradient-to-br from-warning to-affiliate px-1.5 py-0.5 text-[9px] font-bold uppercase text-warning-foreground shadow-[0_0_12px_hsl(var(--affiliate)/0.6)]"
                      : "rounded-md border border-border/70 bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground"
                  }
                >
                  {isPremium ? "Pro" : "Free"}
                </span>
              </span>
              <span className="mt-1 text-[11px] font-medium leading-none text-muted-foreground">
                · <span className="text-warning">Trend is Friend</span>
              </span>
            </Link>

            {/* Right: Menu + Bell */}
            <div className="flex items-center gap-1.5">
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

          {/* 👇 Category Tabs - Below Header */}
          <div className="border-t border-border/30 bg-muted/20 px-3 sm:px-4">
            <div className="mx-auto max-w-7xl flex gap-2 overflow-x-auto scrollbar-hide py-2">
              {CATEGORIES.map((category, i) => {
                const isGold = category.key === "COMMODITIES";
                return (
                  <button
                    key={category.key}
                    onClick={() => {
                      // This will trigger category change in dashboard
                      window.dispatchEvent(new CustomEvent('categoryChange', { 
                        detail: { category: category.key } 
                      }));
                    }}
                    className={cn(
                      "flex-shrink-0 rounded-full border px-4 py-1.5 text-[11.5px] font-bold whitespace-nowrap",
                      "transition-all duration-200 active:scale-95",
                      "border-border/70 bg-muted/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
                    )}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
