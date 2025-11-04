import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import TrialBanner from "./TrialBanner";
import { SideDrawer } from "./SideDrawer";
import { TopMenuDropdown } from "./TopMenuDropdown";

const Header = () => {

  return (
    <>
      <TrialBanner />
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background backdrop-blur supports-[backdrop-filter]:bg-background/95">
        <div className="flex h-14 sm:h-16 items-center justify-between px-2 sm:px-4">
          {/* Side Drawer Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SideDrawer />

            <Link to="/" className="flex items-center gap-1.5 sm:gap-2 group">
              <div className="relative">
                <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary animate-pulse group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:blur-lg transition-all duration-300"></div>
              </div>
              <span className="text-sm sm:text-base md:text-lg font-bold gradient-text bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent animate-fade-in group-hover:scale-105 transition-transform duration-300">
                Live Signals
              </span>
            </Link>
          </div>

          {/* Top Menu Dropdown */}
          <TopMenuDropdown />
        </div>
      </header>
    </>
  );
};

export default Header;
