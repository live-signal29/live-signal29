import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import TrialBanner from "./TrialBanner";
import { SideDrawer } from "./SideDrawer";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearch } from "./GlobalSearch";
import { FlashSaleBanner } from "./FlashSaleBanner";

import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { cn } from "@/lib/utils";

// Google Play's actual multi-color triangle mark — reads instantly as
// "this opens the Play Store" instead of a generic download arrow.
const PlayStoreBadgeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
    <path
      d="M99.617 8.057a19.777 19.777 0 0 0-13.462 19.075v457.744c0 8.987 5.404 16.436 13.462 19.075l281.303-247.947z"
      fill="#00d0ff"
    />
    <path
      d="M370.719 255.998L99.617 8.057c1.339-.633 2.828-1.048 4.371-1.221 4.048-.454 8.209.412 11.845 2.596l246.16 145.204z"
      fill="#00f076"
    />
    <path
      d="M361.993 357.362l-246.16 145.205c-3.636 2.184-7.797 3.049-11.845 2.596-1.543-.173-3.032-.588-4.371-1.221l271.102-247.943z"
      fill="#ff3a44"
    />
    <path
      d="M493.279 234.629c14.395 8.496 14.395 33.746 0 42.243l-59.083 34.868-71.477-55.741 71.477-55.741z"
      fill="#ffcf00"
    />
  </svg>
);

const Header = () => {
  const { subscriptionStatus } = useSubscriptionAccess();
  const isPremium = subscriptionStatus === "premium";
  const [isScrolled, setIsScrolled] = useState(false);

  const PLAY_STORE_URL =
    "https://play.google.com/store/apps/dev?id=8617006322141073240";

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

            {/* Desktop Search */}
            <div className="hidden sm:flex items-center">
              <GlobalSearch />
            </div>

            {/* Theme toggle — small icon, visible on every screen size */}
            <div className="icon-3d h-8 w-8 sm:h-9 sm:w-9">
              <ThemeToggle />
            </div>

            {/* Menu */}
            <div className="icon-3d h-8 w-8 sm:h-9 sm:w-9">
              <SideDrawer />
            </div>

            {/* Get App — Play Store badge, compact & professional */}
            <button
              onClick={handleGetApp}
              aria-label="Get App"
              className="
                h-7
                sm:h-8
                pl-1.5
                pr-2
                sm:pr-2.5
                rounded-full
                flex
                items-center
                justify-center
                gap-1
                bg-white
                hover:bg-white/95
                text-slate-900
                text-[10px]
                sm:text-[11px]
                font-bold
                ring-1
                ring-black/10
                shadow-sm
                active:scale-95
                transition-all
                duration-200
                whitespace-nowrap
              "
            >
              <PlayStoreBadgeIcon className="h-3 w-3 shrink-0" />
              <span>Get App</span>
            </button>

            {/* Notification */}
            <div className="icon-3d h-8 w-8 sm:h-9 sm:w-9">
              <NotificationBell />
            </div>

          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
