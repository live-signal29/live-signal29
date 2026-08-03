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

const Header = () => {
  const { subscriptionStatus } = useSubscriptionAccess();
  const isPremium = subscriptionStatus === "premium";

  return (
    <>
      <FlashSaleBanner />
      <AppInstallBanner />
      <TrialBanner />
      <header className="sticky top-0 z-40 w-full">
        <div className="glass-card rounded-b-2xl mx-2 mt-0 border-t-0">
          <div className="flex h-14 items-center justify-between px-3">
            {/* Left: Brand */}
            <Link to="/" className="min-w-0 flex flex-col justify-center">
              <span className="flex items-center gap-1.5 leading-none">
                <span className="text-xl font-extrabold tracking-tight">Live</span>
                <span className="text-xl font-extrabold tracking-tight text-warning">
                  Signals
                </span>
                <span
                  className={
                    isPremium
                      ? "rounded-md bg-warning/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-warning"
                      : "rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground"
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

              <div className="rounded-full border border-border/70 bg-muted/50 px-1">
                <SideDrawer />
              </div>

              <NotificationBell />
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
