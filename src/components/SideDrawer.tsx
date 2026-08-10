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
  badge?: string;
};

const MenuRow = memo(
  ({ item, active, onNavigate }: { item: MenuItem; active: boolean; onNavigate: () => void }) => {
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={onNavigate}
        className={cn(
          "group flex items-center gap-2.5 h-9 px-2 rounded-lg",
          "transition-all duration-200 ease-out active:scale-[0.98]",
          active
            ? "bg-primary/10 text-primary shadow-[0_2px_10px_-4px_hsl(var(--glow-primary)/0.5)] font-semibold"
            : "text-foreground/80 hover:bg-accent/50 hover:text-foreground hover:translate-x-0.5"
        )}
      >
        <span className="flex items-center justify-center shrink-0">
          <Icon
            className={cn(
              "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
              active ? "text-primary stroke-[2.5]" : item.tint
            )}
          />
        </span>
        <span className="text-xs tracking-tight truncate">
          {item.label}
        </span>
        {item.badge && (
          <span className="ml-auto px-1.5 py-0.2 rounded bg-primary/15 text-primary text-[8px] font-bold uppercase shrink-0">
            {item.badge}
          </span>
        )}
        {active && (
          <span className={cn("h-4 w-1 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--glow-primary))] shrink-0", !item.badge && "ml-auto")} />
        )}
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
          className="p-1.5 rounded-lg hover:bg-accent transition-colors duration-200 active:scale-95"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[230px] max-w-[75vw] p-0 border-r border-border/40 shadow-2xl flex flex-col h-dvh max-h-dvh overflow-hidden bg-background/95 backdrop-blur-md transition-all duration-300 [&>button]:hidden"
      >
        <div className="flex flex-col h-full min-h-0">
          {/* Header */}
          <div className="shrink-0 flex items-center gap-2.5 px-3 py-2.5 border-b border-border/40 bg-background/80">
            <div className="relative shrink-0">
              <img
                src={trendFriendLogo}
                alt="Trend is Friend logo"
                width={32}
                height={32}
                loading="eager"
                decoding="async"
                className="w-8 h-8 rounded-lg ring-1 ring-primary/20 shadow-sm"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-background" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xs font-bold tracking-tight truncate leading-tight">TREND IS FRIEND</h2>
              <p className="text-[10px] text-muted-foreground truncate leading-tight">Live Trading Signals</p>
            </div>
            <ThemeToggle />
          </div>

          {/* Menu Items */}
          <nav
            ref={menuScrollRef}
            onScroll={rememberScroll}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-2 py-1.5 space-y-0.5"
          >
            {menuGroups.map((group) => (
              <div key={group.title} className="pb-1">
                <p className="px-2 pt-2 pb-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <MenuRow
                      key={item.path + item.label}
                      item={item}
                      active={location.pathname === item.path}
                      onNavigate={closeDrawer}
                    />
                  ))}
                </div>
              </div>
            ))}

            <p className="px-2 pt-2 pb-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
              Other
            </p>

            <Collapsible open={otherAppsOpen} onOpenChange={setOtherAppsOpen}>
              <CollapsibleTrigger className="w-full h-8 px-2 rounded-lg flex items-center gap-2.5 text-foreground/80 hover:bg-accent/50 transition-colors duration-200">
                <span className="flex items-center justify-center shrink-0">
                  <Smartphone className="h-4 w-4 text-cyan-500" />
                </span>
                <span className="text-xs font-medium">Other Apps</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 ml-auto transition-transform duration-200 text-muted-foreground",
                    otherAppsOpen && "rotate-180"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <div className="ml-4 my-0.5 space-y-0.5 border-l border-border/40 pl-2">
                  <a
                    href="http://cryptoincome.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeDrawer}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors duration-200 group"
                  >
                    <span>Crypto Investment</span>
                    <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                  </a>
                  <a
                    href="https://one.exnessonelink.com/a/vtkbbmje"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeDrawer}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors duration-200 group"
                  >
                    <span>Open Forex Account</span>
                    <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                  </a>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </nav>

          {/* Footer */}
          <div className="shrink-0 px-2.5 py-2 border-t border-border/40 bg-background/80 space-y-2">
            <div className="flex items-center justify-between gap-1">
              <LanguageSwitcher />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 text-[10px] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />v{APP_VERSION}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="w-full h-8 rounded-lg font-medium text-xs flex items-center justify-center gap-2 bg-destructive text-destructive-foreground shadow-sm transition-all duration-200 hover:bg-destructive/90 active:scale-[0.98]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
