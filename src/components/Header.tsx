import React, { useState } from "react";
import { Link } from "react-router-dom";
import TrialBanner from "./TrialBanner";
import AppInstallBanner from "./AppInstallBanner";
import { SideDrawer } from "./SideDrawer";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearch } from "./GlobalSearch";
import { FlashSaleBanner } from "./FlashSaleBanner";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { cn } from "@/lib/utils";

interface HeaderProps {
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
}

const CATEGORIES = [
  { key: "COMMODITIES", label: "Gold" },
  { key: "FOREX", label: "Forex" },
  { key: "CRYPTO", label: "Crypto" },
  { key: "DERIV/BINARY", label: "Deriv" },
  { key: "MARKET IDEAS", label: "Ideas" },
];

const Header: React.FC<HeaderProps> = ({
  activeCategory: externalCategory,
  onCategoryChange,
}) => {
  const { subscriptionStatus } = useSubscriptionAccess();
  const isPremium = subscriptionStatus === "premium";

  const [internalCategory, setInternalCategory] = useState("COMMODITIES");
  const currentCategory = externalCategory || internalCategory;

  const handleCategoryClick = (key: string) => {
    setInternalCategory(key);
    if (typeof onCategoryChange === "function") {
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

      <header className="sticky top-0 z-40 w-full border-b bg-background shadow-sm">
        <div>
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-4">
            
            {/* Brand Title */}
            <Link to="/" className="flex items-center gap-1.5 shrink-0">
              <span className="text-lg font-bold tracking-tight text-foreground">
                Live <span className="text-amber-500">Signals</span>
              </span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                  isPremium
                    ? "bg-amber-500 text-black"
                    : "bg-muted text-muted-foreground border border-border"
                )}
              >
                {isPremium ? "Pro" : "Free"}
              </span>
            </Link>

            {/* Desktop Navigation Tabs (Simple & Light) */}
            <nav className="hidden md:flex items-center gap-1">
              {CATEGORIES.map((cat) => {
                const isActive = currentCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleCategoryClick(cat.key)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </nav>

            {/* Actions Right */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5">
                <GlobalSearch />
                <ThemeToggle />
              </div>
              <SideDrawer />
              <NotificationBell />
            </div>
          </div>

          {/* Mobile Scrollable Tabs (Pill Style Like Old UI) */}
          <div className="md:hidden overflow-x-auto scrollbar-hide border-t bg-muted/20 px-2 py-1.5 flex items-center gap-1.5">
            {CATEGORIES.map((cat) => {
              const isActive = currentCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => handleCategoryClick(cat.key)}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap shrink-0 transition-colors border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {cat.label}
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
