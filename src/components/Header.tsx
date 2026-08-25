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

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Open Play Store
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

      {/* Main Header */}
      <header
        className={cn(
          "sticky top-0 z-40 w-full border-b transition-all duration-300",
          isScrolled
            ? "border-border/30 bg-background/80 backdrop-blur-xl shadow-lg"
            : "border-border/50 bg-background/95 backdrop-blur-2xl shadow-md"
        )}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-4">

          {/* ================= BRAND ================= */}
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
                      rounded-md
                      bg-gradient-to-r
                      from-amber-500
                      to-yellow-400
                      px-1.5
                      py-0.5
                      text-[9px]
                      font-black
                      uppercase
                      text-black
                      shadow-sm
                    `
                    : `
                      rounded-md
                      border
                      border-border/70
                      bg-muted
                      px-1.5
                      py-0.5
                      text-[9px]
                      font-bold
                      uppercase
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

          {/* ================= RIGHT ACTIONS ================= */}
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

            {/* ================= GET APP ================= */}
            <button
              onClick={handleGetApp}
              aria-label="Get App"
              className="
                relative
                h-9
                px-2.5
                sm:px-3
                rounded-full
                flex
                items-center
                justify-center
                gap-1.5
                overflow-hidden
                bg-gradient-to-r
                from-emerald-500
                via-teal-400
                to-amber-400
                text-white
                font-black
                text-[11px]
                border
                border-white/20
                shadow-[0_0_12px_rgba(16,185,129,0.45)]
                hover:shadow-[0_0_20px_rgba(245,185,40,0.65)]
                hover:scale-105
                active:scale-95
                transition-all
                duration-200
                whitespace-nowrap
              "
            >
              {/* Shine */}
              <span
                className="
                  absolute
                  inset-0
                  bg-gradient-to-r
                  from-transparent
                  via-white/30
                  to-transparent
                  -translate-x-full
                  animate-[shimmer_2.5s_infinite]
                "
              />

              <Download className="relative h-3.5 w-3.5" />

              <span className="relative">
                Get App
              </span>
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
