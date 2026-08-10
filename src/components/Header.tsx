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
import { cn } from "@/lib/utils";

const Header = () => {
  const { subscriptionStatus } = useSubscriptionAccess();
  const isPremium = subscriptionStatus === "premium";

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
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-4">
          
          {/* Brand Logo */}
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
      </header>
    </>
  );
};

export default Header;
