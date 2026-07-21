import { Link } from "react-router-dom";
import TrialBanner from "./TrialBanner";
import AppInstallBanner from "./AppInstallBanner";
import { SideDrawer } from "./SideDrawer";
import { TopMenuDropdown } from "./TopMenuDropdown";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearch } from "./GlobalSearch";
import { FlashSaleBanner } from "./FlashSaleBanner";
import exnessLogo from "@/assets/exness-logo-real.png";
import trendFriendLogo from "@/assets/trend-friend-logo-new.png";

const Header = () => {
  return (
    <>
      <FlashSaleBanner />
      <AppInstallBanner />
      <TrialBanner />
      <header className="sticky top-0 z-40 w-full">
        <div className="glass-card rounded-b-2xl mx-2 mt-0 border-t-0">
          <div className="flex h-14 items-center justify-between px-3">
            {/* Left: Menu + Logo */}
            <div className="flex items-center gap-2">
              <SideDrawer />

              <Link to="/" className="flex items-center gap-2 group">
                {/* Logo Image */}
                <div className="relative">
                  <img 
                    src={trendFriendLogo} 
                    alt="Trend is Friend Logo" 
                    className="w-10 h-10 rounded-xl shadow-lg shadow-primary/20 ring-2 ring-primary/20"
                  />
                  <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-background">
                    <span className="absolute inset-0 bg-success rounded-full animate-ping opacity-75"></span>
                  </div>
                </div>
                
                {/* Brand Text */}
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground tracking-tight leading-tight">
                    Live Signals
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight font-medium">
                    Trend is Friend
                  </span>
                </div>
              </Link>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5">
              <GlobalSearch />
              <ThemeToggle />
              
              {/* Exness CTA - Desktop only */}
              <a
                href="https://one.exnessonelink.com/a/vtkbbmje"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-affiliate hover:bg-affiliate/90 text-affiliate-foreground font-semibold text-xs rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                <img src={exnessLogo} alt="Exness" className="w-4 h-4 rounded-full" />
                <span>Join Exness</span>
              </a>
              
              <TopMenuDropdown />
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
