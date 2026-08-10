import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Coins,
  Bitcoin,
  BarChart3,
  LineChart,
  Crown,
  User,
  Menu,
  X,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import ProfileDrawer from "@/components/ProfileDrawer";

interface HeaderProps {
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
}

// Fixed 5 Core Categories (Removed 'ALL' to avoid RPC query crash)
const NAV_CATEGORIES = [
  { id: "COMMODITIES", label: "Gold", icon: TrendingUp },
  { id: "FOREX", label: "Forex", icon: Coins },
  { id: "CRYPTO", label: "Crypto", icon: Bitcoin },
  { id: "DERIV/BINARY", label: "Deriv", icon: BarChart3 },
  { id: "MARKET IDEAS", label: "Ideas", icon: LineChart },
];

const Header: React.FC<HeaderProps> = ({
  activeCategory = "COMMODITIES",
  onCategoryChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHomePage = location.pathname === "/" || location.pathname === "/signals-dashboard";

  const handleCategoryClick = (catId: string) => {
    if (onCategoryChange) {
      onCategoryChange(catId);
    }
    if (!isHomePage) {
      navigate("/");
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-2 sm:px-4 max-w-7xl flex h-14 items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
              Trend Is Friend
            </span>
          </Link>

          {/* Category Tabs (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1 bg-muted/50 p-1 rounded-xl border border-border/50">
            {NAV_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive =
                activeCategory.toUpperCase() === cat.id.toUpperCase() ||
                (cat.id === "COMMODITIES" && activeCategory.toUpperCase() === "GOLD");

              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-background text-primary shadow-sm border border-border/40 font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/pricing")}
              className="hidden sm:flex border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-1 text-xs"
            >
              <Crown className="h-3.5 w-3.5 text-amber-500" />
              <span>VIP Plans</span>
            </Button>

            {user ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setProfileOpen(true)}
                className="rounded-full border border-border/60 hover:bg-accent"
              >
                <User className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => navigate("/auth")}
                className="text-xs"
              >
                Login
              </Button>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Category Navigation (Mobile Horizontal Bar) */}
        <div className="md:hidden overflow-x-auto no-scrollbar border-t border-border/40 bg-muted/30 px-2 py-1.5 flex items-center gap-1.5">
          {NAV_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive =
              activeCategory.toUpperCase() === cat.id.toUpperCase() ||
              (cat.id === "COMMODITIES" && activeCategory.toUpperCase() === "GOLD");

            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "bg-background/80 text-muted-foreground border border-border/40 hover:text-foreground"
                )}
              >
                <Icon className="h-3 w-3" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* User Profile Drawer */}
      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
};

export default Header;
