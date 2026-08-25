import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";

import TrialBanner from "./TrialBanner";
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
  const [isScrolled, setIsScrolled] = useState(false);

  const PLAY_STORE_URL =
    "https://play.google.com/store/apps/details?id=co.median.android.krkqyaz";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleGetApp = () => {
    window.open(
      PLAY_STORE_URL,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <>
      {/* Top Banners */}
      {!isPremium ? (
        <>
          <FlashSaleBanner />
          <TrialBanner />
        </>
      ) : null}

      {/* Header */}
      <header
        className={cn(
          "sticky top-0 z-40 w-full border-b transition-all duration-300",
          isScrolled
            ? "border-border/30 bg-background/80 backdrop-blur-xl shadow-lg"
            : "border-border/50 bg-background/95 backdrop-blur-2xl shadow-md"
        )}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-4">

          {/* Brand Logo */}
          <Link
            to="/"
            className="min-w-0 flex flex-col justify-center shrink-0"
          >
            <span className="flex items-center gap-1.5 leading-none">

              {/* Live */}
              <span
                className="
                  text-lg
                  sm:text-xl
                  font-black
                  tracking-tight
                  bg-gradient-to-r
                  from-emerald-400
                  via-teal-400
                  to-cyan-400
                  bg-clip-text
                  text-transparent
                "
              >
                Live
              </span>

              {/* Signals */}
              <span
                className="
                  text-lg
                  sm:text-xl
                  font-black
                  tracking-tight
                  bg-gradient-to-r
                  from-amber-400
                  via-yellow-400
                  to-amber-500
                  bg-clip-text
                  text-transparent
                "
              >
                Signals
              </span>

              {/* Free / Pro */}
              <span
                className={
                  isPremium
                    ? `
                      rounded
                      bg-gradient-to-r
                      from-amber-500
                      to-yellow-400
                      px-1
                      py-0.5
                      text-[7px]
                      font-black
                      uppercase
                      leading-none
                      text-black
                      shadow-sm
                    `
                    : `
                      rounded
                      border
                      border-border/70
                      bg-muted
                      px-1
                      py-0.5
                      text-[7px]
                      font-bold
                      uppercase
                      leading-none
                      text-muted-foreground
                    `
                }
              >
                {isPremium ? "Pro" : "Free"}
              </span>
            </span>

            {/* Trend is Friend */}
            <span
              className="
                mt-1
                text-[10px]
                sm:text-[11px]
                font-semibold
                leading-none
                flex
                items-center
                gap-1
              "
            >
              <span
                className="
                  w-1.5
                  h-1.5
                  rounded-full
                  bg-gradient-to-r
                  from-emerald-400
                  to-cyan-400
                  animate-pulse
                "
              />

              <span
                className="
                  bg-gradient-to-r
                  from-emerald-400
                  via-teal-400
                  to-cyan-400
                  bg-clip-text
                  text-transparent
                  font-bold
                "
              >
                Trend is Friend
              </span>
            </span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 shrink-0">

            {/* Desktop Search + Theme */}
            <div className="hidden sm:flex items-center gap-1.5">
              <GlobalSearch />
              <ThemeToggle />
            </div>

            {/* Menu */}
            <div className="icon-3d h-9 w-9">
              <SideDrawer />
            </div>

            {/* Get App */}
            <button
              onClick={handleGetApp}
              aria-label="Get App"
              className="
                h-8
                px-2
                sm:px-2.5
                rounded-md
                flex
                items-center
                justify-center
                gap-1
                bg-emerald-500
                hover:bg-emerald-400
                text-white
                text-[10px]
                sm:text-[11px]
                font-bold
                border
                border-emerald-400/30
                shadow-sm
                active:scale-95
                transition-all
                duration-200
                whitespace-nowrap
              "
            >
              <Download className="h-3 w-3" />
              <span>Get App</span>
            </button>

            {/* Notification */}
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
