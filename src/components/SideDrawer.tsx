import { useEffect, useRef, useState, type TouchEvent } from "react";
import {
  Menu, ChevronDown, ExternalLink, LineChart, Crown, User, Settings,
  Smartphone, LogOut, Briefcase, BarChart3, Calendar as CalendarIcon,
  Calculator as CalcIcon, Gift, TrendingUp, PieChart, Home,
  History, HeadphonesIcon, ChevronRight
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";
import trendFriendLogo from "@/assets/trend-friend-logo-new.png";

const APP_VERSION = "1.0.0";

export const SideDrawer = () => {
  const [open, setOpen] = useState(false);
  const [otherAppsOpen, setOtherAppsOpen] = useState(false);
  const menuScrollRef = useRef<HTMLElement | null>(null);
  const touchStartY = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;

    const htmlOverscroll = document.documentElement.style.overscrollBehaviorY;
    const bodyOverscroll = document.body.style.overscrollBehaviorY;

    document.documentElement.style.overscrollBehaviorY = "none";
    document.body.style.overscrollBehaviorY = "none";

    return () => {
      document.documentElement.style.overscrollBehaviorY = htmlOverscroll;
      document.body.style.overscrollBehaviorY = bodyOverscroll;
    };
  }, [open]);

  const handleMenuTouchStart = (event: TouchEvent<HTMLElement>) => {
    touchStartY.current = event.touches[0]?.clientY ?? 0;
  };

  const handleMenuTouchMove = (event: TouchEvent<HTMLElement>) => {
    const scroller = menuScrollRef.current;
    const currentY = event.touches[0]?.clientY ?? touchStartY.current;
    const pullDirection = currentY - touchStartY.current;

    if (!scroller) return;

    const atTop = scroller.scrollTop <= 0;
    const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;

    if ((atTop && pullDirection > 0) || (atBottom && pullDirection < 0)) {
      event.preventDefault();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login");
    setOpen(false);
  };

  const menuItems = [
    { label: "Dashboard", path: "/", icon: Home, gradient: "from-emerald-500 to-teal-400" },
    { label: "Live Signals", path: "/signals", icon: LineChart, gradient: "from-emerald-500 to-green-400" },
    { label: "Signal History", path: "/backtesting", icon: History, gradient: "from-slate-500 to-slate-400" },
    { label: "Results", path: "/results", icon: BarChart3, gradient: "from-violet-500 to-purple-400" },
    { label: "Economic Calendar", path: "/economic-calendar", icon: CalendarIcon, gradient: "from-indigo-500 to-blue-400" },
    { label: "Risk Calculator", path: "/calculator", icon: CalcIcon, gradient: "from-cyan-500 to-sky-400" },
    { label: "Compound Calculator", path: "/compound", icon: TrendingUp, gradient: "from-green-500 to-emerald-400" },
    { label: "Portfolio", path: "/portfolio", icon: PieChart, gradient: "from-teal-500 to-cyan-400" },
    { label: "Premium VIP", path: "/premium", icon: Crown, gradient: "from-amber-500 to-yellow-400" },
    { label: "Invite & Earn", path: "/referrals", icon: Gift, gradient: "from-orange-500 to-amber-400" },
    { label: "Account Management", path: "/account-management", icon: Briefcase, gradient: "from-teal-500 to-emerald-400" },
    { label: "My Profile", path: "/profile", icon: User, gradient: "from-purple-500 to-pink-400" },
    { label: "Settings", path: "/settings", icon: Settings, gradient: "from-slate-500 to-gray-400" },
    { label: "Contact Support", path: "/contact", icon: HeadphonesIcon, gradient: "from-rose-500 to-pink-400" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="p-2 hover:bg-accent rounded-md transition-all duration-200 hover:scale-105 active:scale-95">
          <Menu className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[350px] p-0 border-r border-border/50 flex flex-col h-dvh max-h-dvh overflow-hidden overscroll-none touch-pan-y">
        <div className="flex flex-col h-full min-h-0 bg-gradient-to-b from-background to-muted/30 overscroll-none">

          {/* Logo & App Name */}
          <div className="flex items-center gap-3 p-5 border-b border-border/50 bg-background/80 backdrop-blur-sm">
            <div className="relative">
              <img 
                src={trendFriendLogo} 
                alt="Trend is Friend Logo" 
                className="w-14 h-14 rounded-2xl shadow-lg shadow-primary/30 ring-2 ring-primary/20"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold tracking-wide bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                TREND IS FRIEND
              </h2>
              <p className="text-xs text-muted-foreground">Live Trading Signals</p>
            </div>
            <ThemeToggle />
          </div>

          {/* Menu Items - Ultra Modern */}
          <nav
            data-sidebar-menu-scroll="true"
            ref={menuScrollRef}
            onTouchStart={handleMenuTouchStart}
            onTouchMove={handleMenuTouchMove}
            className="flex flex-col gap-2 p-4 flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
          >
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path + item.label}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  style={{ 
                    animationDelay: `${index * 60}ms`,
                    animationFillMode: 'backwards'
                  }}
                  className={cn(
                    "group relative px-4 py-3.5 rounded-2xl font-medium flex items-center gap-3",
                    "transition-all duration-300 ease-out overflow-hidden",
                    "hover:translate-x-1 active:scale-[0.98]",
                    "animate-slide-in-menu",
                    active 
                      ? "shadow-lg" 
                      : "text-foreground/80 hover:bg-accent/50"
                  )}
                >
                  {/* Active gradient background */}
                  {active && (
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-r opacity-90",
                      item.gradient
                    )} />
                  )}
                  
                  {/* Shimmer for active */}
                  {active && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
                  )}
                  
                  {/* Icon container */}
                  <div className={cn(
                    "relative z-10 flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-300",
                    active 
                      ? "bg-white/20 shadow-inner" 
                      : "bg-muted/50 group-hover:bg-accent",
                    "group-hover:scale-110"
                  )}>
                    <Icon className={cn(
                      "h-5 w-5 transition-all duration-300",
                      active ? "text-white" : "text-muted-foreground group-hover:text-foreground",
                      "group-hover:scale-110"
                    )} />
                  </div>
                  
                  <span className={cn(
                    "relative z-10 transition-all duration-300 font-semibold",
                    active ? "text-white" : ""
                  )}>
                    {item.label}
                  </span>
                  
                  {/* Active indicator dot */}
                  {active && (
                    <div className="relative z-10 ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
                  )}
                </Link>
              );
            })}
            
            {/* Other Apps Section */}
            <Collapsible open={otherAppsOpen} onOpenChange={setOtherAppsOpen}>
              <CollapsibleTrigger className={cn(
                "w-full px-4 py-3.5 rounded-xl font-medium flex items-center justify-between",
                "transition-all duration-300 ease-out",
                "hover:bg-accent/80 hover:translate-x-1 active:scale-[0.98]",
                "text-foreground/80 group"
              )}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50 group-hover:bg-accent transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <Smartphone className="h-5 w-5 text-cyan-500" />
                  </div>
                  <span>Other Apps</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-300",
                  otherAppsOpen ? 'rotate-180' : ''
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent className="animate-accordion-down">
                <div className="ml-6 mt-1 space-y-1 border-l-2 border-border/50 pl-4">
                  <a
                    href="http://cryptoincome.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-accent/80 transition-all duration-200 text-sm text-muted-foreground hover:text-foreground group"
                  >
                    <span>Crypto Investment</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5" />
                  </a>
                  <a
                    href="https://one.exnessonelink.com/a/vtkbbmje"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-accent/80 transition-all duration-200 text-sm text-muted-foreground hover:text-foreground group"
                  >
                    <span>Open Forex Account</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5" />
                  </a>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </nav>

          {/* Footer Section */}
          <div className="p-4 border-t border-border/50 bg-background/50 backdrop-blur-sm space-y-3">
            {/* Language Switcher */}
            <div className="flex justify-center">
              <LanguageSwitcher />
            </div>

            {/* App Version */}
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Version {APP_VERSION}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={cn(
                "w-full px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2",
                "bg-gradient-to-r from-destructive to-destructive/80",
                "text-destructive-foreground shadow-lg shadow-destructive/20",
                "transition-all duration-300 ease-out",
                "hover:shadow-xl hover:shadow-destructive/30 hover:scale-[1.02]",
                "active:scale-[0.98]"
              )}
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
