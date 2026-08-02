import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Menu, ChevronDown, ExternalLink, LineChart, Crown, User, Bell, Settings,
  Smartphone, LogOut, Briefcase, BarChart3, Calendar as CalendarIcon,
  Calculator as CalcIcon, Gift, Bell as BellIcon, BookOpen, Sparkles,
  Trophy, GraduationCap, Newspaper, History, TrendingUp, PieChart
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

type MenuItem = {
  label: string;
  path: string;
  icon: typeof LineChart;
  tint: string;
};

const MenuRow = memo(
  ({ item, active, onNavigate }: { item: MenuItem; active: boolean; onNavigate: () => void }) => {
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 h-[50px] px-3 rounded-xl",
          "transition-colors duration-200 will-change-transform",
          active
            ? "bg-primary/12 text-primary shadow-sm shadow-primary/10"
            : "text-foreground/85 hover:bg-accent/60 active:bg-accent"
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg shrink-0",
            active ? "bg-primary/15" : "bg-muted/60"
          )}
        >
          <Icon className={cn("h-[22px] w-[22px]", active ? "text-primary" : item.tint)} />
        </span>
        <span className={cn("text-sm tracking-tight truncate", active ? "font-semibold" : "font-medium")}>
          {item.label}
        </span>
        {active && <span className="ml-auto h-5 w-1 rounded-full bg-primary shrink-0" />}
      </Link>
    );
  }
);
MenuRow.displayName = "MenuRow";

export const SideDrawer = () => {
  const [open, setOpen] = useState(false);
  const [otherAppsOpen, setOtherAppsOpen] = useState(false);
  const menuScrollRef = useRef<HTMLElement | null>(null);
  const scrollPos = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Lock the page behind the drawer without touching touch-action inside it,
  // so the menu list keeps native 60 FPS scrolling and never triggers pull-to-refresh.
  useEffect(() => {
    if (!open) return;

    const root = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverscroll: root.style.overscrollBehaviorY,
      bodyOverscroll: body.style.overscrollBehaviorY,
      bodyOverflow: body.style.overflow,
    };

    root.style.overscrollBehaviorY = "none";
    body.style.overscrollBehaviorY = "none";
    body.style.overflow = "hidden";

    // Restore scroll position of the menu list when reopening.
    const scroller = menuScrollRef.current;
    if (scroller) scroller.scrollTop = scrollPos.current;

    return () => {
      root.style.overscrollBehaviorY = prev.htmlOverscroll;
      body.style.overscrollBehaviorY = prev.bodyOverscroll;
      body.style.overflow = prev.bodyOverflow;
    };
  }, [open]);

  const rememberScroll = useCallback(() => {
    if (menuScrollRef.current) scrollPos.current = menuScrollRef.current.scrollTop;
  }, []);

  const closeDrawer = useCallback(() => {
    rememberScroll();
    setOpen(false);
  }, [rememberScroll]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    setOpen(false);
    navigate("/login");
  }, [navigate]);

  const menuGroups = useMemo<{ title: string; items: MenuItem[] }[]>(
    () => [
      {
        title: "Live Trading",
        items: [
          { label: t("live_signals"), path: "/signals", icon: LineChart, tint: "text-emerald-500" },
          { label: "Portfolio", path: "/portfolio", icon: PieChart, tint: "text-teal-500" },
          { label: t("trade_journal"), path: "/trade-journal", icon: BookOpen, tint: "text-lime-600" },
          { label: t("results"), path: "/results", icon: BarChart3, tint: "text-violet-500" },
        ],
      },
      {
        title: "Learn & Analyze",
        items: [
          { label: "Daily Market Brief", path: "/market-brief", icon: Newspaper, tint: "text-sky-500" },
          { label: "Economic Calendar", path: "/economic-calendar", icon: CalendarIcon, tint: "text-indigo-500" },
          { label: "Trading Academy", path: "/academy", icon: GraduationCap, tint: "text-emerald-500" },
          { label: "Backtesting", path: "/backtesting", icon: History, tint: "text-purple-500" },
        ],
      },
      {
        title: "Tools",
        items: [
          { label: "AI Assistant", path: "/ai-chat", icon: Sparkles, tint: "text-fuchsia-500", badge: "New" },
          { label: "Risk Calculator", path: "/calculator", icon: CalcIcon, tint: "text-cyan-500" },
          { label: "Compound Calculator", path: "/compound", icon: TrendingUp, tint: "text-green-500" },
          { label: t("price_alerts"), path: "/price-alerts", icon: BellIcon, tint: "text-pink-500" },
        ],
      },
      {
        title: "Premium",
        items: [
          { label: t("premium"), path: "/premium", icon: Crown, tint: "text-amber-500", badge: "Pro" },
          { label: "Gift Premium", path: "/gift-premium", icon: Gift, tint: "text-rose-500" },
          { label: "Invite & Earn", path: "/referrals", icon: Gift, tint: "text-orange-500" },
        ],
      },
      {
        title: "Account",
        items: [
          { label: "Account Management", path: "/account-management", icon: Briefcase, tint: "text-teal-500" },
          { label: "My Profile", path: "/profile", icon: User, tint: "text-purple-500" },
          { label: t("notifications"), path: "/notifications", icon: Bell, tint: "text-rose-500" },
          { label: t("settings"), path: "/settings", icon: Settings, tint: "text-slate-500" },
          { label: "Leaderboard", path: "/leaderboard", icon: Trophy, tint: "text-amber-500" },
        ],
      },
    ],
    [t]
  );


  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) rememberScroll();
        setOpen(next);
      }}
    >
      <SheetTrigger asChild>
        <button
          aria-label="Open menu"
          className="p-2 rounded-lg hover:bg-accent transition-colors duration-200 active:scale-95"
        >
          <Menu className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[286px] sm:w-[320px] p-0 border-r border-border/60 shadow-2xl flex flex-col h-dvh max-h-dvh overflow-hidden"
      >
        <div className="flex flex-col h-full min-h-0 bg-background">
          {/* Sticky header */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-3.5 border-b border-border/60 bg-background/95 backdrop-blur-md">
            <div className="relative shrink-0">
              <img
                src={trendFriendLogo}
                alt="Trend is Friend logo"
                width={44}
                height={44}
                loading="eager"
                decoding="async"
                className="w-11 h-11 rounded-xl ring-1 ring-primary/20 shadow-md shadow-primary/20"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-bold tracking-tight truncate">TREND IS FRIEND</h2>
              <p className="text-[11px] text-muted-foreground truncate">Live Trading Signals</p>
            </div>
            <ThemeToggle />
          </div>

          {/* Scrollable menu */}
          <nav
            ref={menuScrollRef}
            onScroll={rememberScroll}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-2.5 py-2.5 space-y-1"
          >
            {menuItems.map((item) => (
              <MenuRow
                key={item.path + item.label}
                item={item}
                active={location.pathname === item.path}
                onNavigate={closeDrawer}
              />
            ))}

            <Collapsible open={otherAppsOpen} onOpenChange={setOtherAppsOpen}>
              <CollapsibleTrigger className="w-full h-[50px] px-3 rounded-xl flex items-center gap-3 text-foreground/85 hover:bg-accent/60 transition-colors duration-200">
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted/60 shrink-0">
                  <Smartphone className="h-[22px] w-[22px] text-cyan-500" />
                </span>
                <span className="text-sm font-medium">Other Apps</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 ml-auto transition-transform duration-200",
                    otherAppsOpen && "rotate-180"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <div className="ml-6 my-1 space-y-0.5 border-l border-border/60 pl-3">
                  <a
                    href="http://cryptoincome.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeDrawer}
                    className="flex items-center justify-between py-2.5 px-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors duration-200 group"
                  >
                    <span>Crypto Investment</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                  </a>
                  <a
                    href="https://one.exnessonelink.com/a/vtkbbmje"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeDrawer}
                    className="flex items-center justify-between py-2.5 px-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors duration-200 group"
                  >
                    <span>Open Forex Account</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" />
                  </a>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </nav>

          {/* Sticky footer */}
          <div className="shrink-0 px-3 py-3 border-t border-border/60 bg-background/95 backdrop-blur-md space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <LanguageSwitcher />
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-[11px] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />v{APP_VERSION}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-destructive text-destructive-foreground shadow-md shadow-destructive/20 transition-colors duration-200 hover:bg-destructive/90 active:scale-[0.99]"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Logout
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
