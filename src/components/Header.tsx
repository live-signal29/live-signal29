import { Link } from "react-router-dom";
import TrialBanner from "./TrialBanner";
import AppInstallBanner from "./AppInstallBanner";
import { SideDrawer } from "./SideDrawer";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearch } from "./GlobalSearch";
import { FlashSaleBanner } from "./FlashSaleBanner";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

const Header = () => {
  const { subscriptionStatus } = useSubscriptionAccess();

  const isPremium = subscriptionStatus === "premium";

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

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-3 sm:px-4">

          {/* Brand */}
          <Link
            to="/"
            className="min-w-0 flex flex-col justify-center"
          >
            <div className="flex items-center gap-1.5 leading-none">

              <span className="text-xl font-extrabold tracking-tight">
                Live
              </span>

              <span className="bg-gradient-to-r from-warning via-affiliate to-warning bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
                Signals
              </span>

              <span
                className={
                  isPremium
                    ? "shine rounded-md bg-gradient-to-br from-warning to-affiliate px-1.5 py-0.5 text-[9px] font-bold uppercase text-warning-foreground"
                    : "rounded-md border border-border/70 bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground"
                }
              >
                {isPremium ? "Pro" : "Free"}
              </span>
            </div>

            <span className="mt-1 text-[11px] font-medium leading-none text-muted-foreground">
              ·{" "}
              <span className="text-warning">
                Trend is Friend
              </span>
            </span>
          </Link>

          {/* Right controls */}
          <div className="flex shrink-0 items-center gap-1.5">

            {/* Desktop controls */}
            <div className="hidden items-center gap-1.5 sm:flex">
              <GlobalSearch />
              <ThemeToggle />
            </div>

            {/* Menu */}
            <div className="flex h-8 w-8 items-center justify-center">
              <SideDrawer />
            </div>

            {/* Notifications */}
            <div className="flex h-8 w-8 items-center justify-center">
              <NotificationBell />
            </div>

          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
