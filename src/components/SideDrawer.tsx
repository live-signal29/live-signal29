import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Menu, ChevronDown, ExternalLink, LineChart, Crown, User, Bell, Settings,
  Smartphone, LogOut, Briefcase, BarChart3, Calendar as CalendarIcon,
  Calculator as CalcIcon, Gift, Bell as BellIcon, BookOpen, Sparkles,
  Trophy, GraduationCap, Newspaper, History, TrendingUp, PieChart,
  TrendingUp as LiveIcon, 
  BookOpen as LearnIcon,
  Wrench as ToolsIcon,
  Crown as PremiumIcon,
  Settings as AccountIcon
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";
import trendFriendLogo from "@/assets/trend-friend-logo-new.png";
import { Languages as LanguagesIcon, Check } from "lucide-react";
import { SITE_LANGUAGES, getSavedLanguage, setSiteLanguage } from "@/lib/googleTranslate";

const APP_VERSION = "1.7.9";

type MenuItem = {
  label: string;
  path: string;
  icon: typeof LineChart;
  tint: string;
  badge?: string;
};

type MenuGroup = {
  title: string;
  icon: typeof LineChart;
  items: MenuItem[];
};

const MenuRow = memo(
  ({ item, active, onNavigate }: { item: MenuItem; active: boolean; onNavigate: () => void }) => {
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={onNavigate}
        className={cn(
          "group flex items-center gap-2.5 h-8 px-2 rounded-lg font-sans",
          "transition-all duration-200 ease-out active:scale-[0.98]",
          active
            ? "bg-primary/10 text-primary font-semibold shadow-[0_2px_8px_-3px_hsl(var(--glow-primary)/0.4)]"
            : "text-muted-foreground hover:bg-accent/40 hover:text-foreground hover:translate-x-0.5"
        )}
      >
        <span className="flex items-center justify-center shrink-0">
          <Icon
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110",
              active ? "text-primary stroke-[2.5]" : item.tint
            )}
          />
        </span>
        <span className="text-[11px] font-medium tracking-tight truncate">
          {item.label}
        </span>
        {item.badge && (
          <span className="ml-auto px-1.2 py-0.2 rounded bg-primary/15 text-primary text-[8px] font-bold uppercase shrink-0">
            {item.badge}
          </span>
        )}
        {active && (
          <span className={cn("h-3.5 w-0.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--glow-primary))] shrink-0", !item.badge && "ml-auto")} />
        )}
      </Link>
    );
  }
);
MenuRow.displayName = "MenuRow";

const CategoryGroup = memo(
  ({ 
    group, 
    isOpen, 
    onToggle,
    locationPath,
    closeDrawer 
  }: { 
    group: MenuGroup; 
    isOpen: boolean; 
    onToggle: () => void;
    locationPath: string;
    closeDrawer: () => void;
  }) => {
    const Icon = group.icon;
    
    return (
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger className="w-full">
          <div className={cn(
            "flex items-center gap-2 px-2 py-1 rounded-lg",
            "transition-all duration-200 hover:bg-accent/40",
            isOpen && "bg-accent/20"
          )}>
            <span className="flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-primary/70" />
            </span>
            <span className="flex-1 text-left text-[10px] font-extrabold uppercase tracking-wider text-foreground/80 font-mono">
              {group.title}
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200 text-muted-foreground",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="ml-2 pl-3 border-l border-border/40 space-y-0.5 py-1">
            {group.items.map((item) => (
              <MenuRow
                key={item.path + item.label}
                item={item}
                active={locationPath === item.path}
                onNavigate={closeDrawer}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }
);
CategoryGroup.displayName = "CategoryGroup";

/**
 * Fixed "Selected Language" category — always present in the menu (not
 * part of menuGroups since its rows aren't page links). Switches the
 * whole site's language via Google Translate (src/lib/googleTranslate.ts),
 * so every page translates, not just the handful of manually-translated
 * strings.
 */
const LanguageCategory = memo(
  ({ isOpen, onToggle, closeDrawer }: { isOpen: boolean; onToggle: () => void; closeDrawer: () => void }) => {
    const [current, setCurrent] = useState(getSavedLanguage());

    return (
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger className="w-full">
          <div className={cn(
            "flex items-center gap-2 px-2 py-1 rounded-lg",
            "transition-all duration-200 hover:bg-accent/40",
            isOpen && "bg-accent/20"
          )}>
            <span className="flex items-center justify-center shrink-0">
              <LanguagesIcon className="h-4 w-4 text-primary/70" />
            </span>
            <span className="flex-1 text-left text-[10px] font-extrabold uppercase tracking-wider text-foreground/80 font-mono">
              Selected Language
            </span>
            <span className="text-[9px] font-mono text-muted-foreground truncate max-w-[70px]">
              {SITE_LANGUAGES.find((l) => l.code === current)?.label ?? "English"}
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200 text-muted-foreground shrink-0",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="ml-2 pl-3 border-l border-border/40 space-y-0.5 py-1 max-h-56 overflow-y-auto">
            {SITE_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setCurrent(lang.code);
                  setSiteLanguage(lang.code);
                  closeDrawer();
                }}
                className={cn(
                  "flex w-full items-center justify-between h-8 px-2 rounded-lg text-[11px] font-medium tracking-tight",
                  "transition-all duration-200 active:scale-[0.98]",
                  current === lang.code
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                )}
              >
                <span className="truncate">{lang.label}</span>
                {current === lang.code && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }
);
LanguageCategory.displayName = "LanguageCategory";

export const SideDrawer = () => {
  const [open, setOpen] = useState(false);
  const [otherAppsOpen, setOtherAppsOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    "Live Trading": true,
    "Learn & Analyze": false,
    "Tools": false,
    "Premium": false,
    "Account": false,
    "Selected Language": false,
  });
  
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

  const toggleCategory = useCallback((title: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    setOpen(false);
    navigate("/login");
  }, [navigate]);

  const menuGroups = useMemo<MenuGroup[]>(
    () => [
      {
        title: "Live Trading",
        icon: LiveIcon,
        items: [
          { label: t("live_signals"), path: "/signals", icon: LineChart, tint: "text-emerald-500" },
          { label: "Portfolio", path: "/portfolio", icon: PieChart, tint: "text-teal-500" },
          { label: t("trade_journal"), path: "/trade-journal", icon: BookOpen, tint: "text-lime-600" },
          { label: t("results"), path: "/results", icon: BarChart3, tint: "text-violet-500" },
        ],
      },
      {
        title: "Learn & Analyze",
        icon: LearnIcon,
        items: [
          { label: "Daily Market Brief", path: "/market-brief", icon: Newspaper, tint: "text-sky-500" },
          { label: "Economic Calendar", path: "/economic-calendar", icon: CalendarIcon, tint: "text-indigo-500" },
          { label: "Trading Academy", path: "/academy", icon: GraduationCap, tint: "text-emerald-500" },
          { label: "Backtesting", path: "/backtesting", icon: History, tint: "text-purple-500" },
        ],
      },
      {
        title: "Tools",
        icon: ToolsIcon,
        items: [
          { label: "AI Assistant", path: "/ai-chat", icon: Sparkles, tint: "text-fuchsia-500", badge: "New" },
          { label: "Risk Calculator", path: "/calculator", icon: CalcIcon, tint: "text-cyan-500" },
          { label: "Compound Calculator", path: "/compound", icon: TrendingUp, tint: "text-green-500" },
          { label: t("price_alerts"), path: "/price-alerts", icon: BellIcon, tint: "text-pink-500" },
        ],
      },
      {
        title: "Premium",
        icon: PremiumIcon,
        items: [
          { label: t("premium"), path: "/premium", icon: Crown, tint: "text-amber-500", badge: "Pro" },
          { label: "Gift Premium", path: "/gift-premium", icon: Gift, tint: "text-rose-500" },
          { label: "Invite & Earn", path: "/referrals", icon: Gift, tint: "text-orange-500" },
        ],
      },
      {
        title: "Account",
        icon: AccountIcon,
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
        className="w-[220px] max-w-[70vw] p-0 border-r border-border/40 shadow-2xl flex flex-col h-dvh max-h-dvh overflow-hidden bg-background/95 backdrop-blur-md transition-all duration-300 [&>button]:hidden"
      >
        <div className="flex flex-col h-full min-h-0">
          {/* Header */}
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-background/80">
            <div className="relative shrink-0">
              <img
                src={trendFriendLogo}
                alt="Trend is Friend logo"
                width={30}
                height={30}
                loading="eager"
                decoding="async"
                className="w-7.5 h-7.5 rounded-md ring-1 ring-primary/20 shadow-sm object-cover"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-background" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[11px] font-black tracking-tight truncate leading-tight bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                TREND IS FRIEND
              </h2>
              <p className="text-[9px] font-mono text-muted-foreground/80 truncate leading-tight tracking-wide">
                Live Signals
              </p>
            </div>
            <ThemeToggle />
          </div>

          {/* Menu Sections */}
          <nav
            ref={menuScrollRef}
            onScroll={rememberScroll}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-2 py-1 space-y-0.5"
          >
            {menuGroups.map((group) => (
              <CategoryGroup
                key={group.title}
                group={group}
                isOpen={openCategories[group.title] ?? false}
                onToggle={() => toggleCategory(group.title)}
                locationPath={location.pathname}
                closeDrawer={closeDrawer}
              />
            ))}

            {/* Selected Language — fixed category, always visible */}
            <LanguageCategory
              isOpen={openCategories["Selected Language"] ?? false}
              onToggle={() => toggleCategory("Selected Language")}
              closeDrawer={closeDrawer}
            />

            {/* Other Apps */}
            <div className="pt-0.5">
              <Collapsible open={otherAppsOpen} onOpenChange={setOtherAppsOpen}>
                <CollapsibleTrigger className="w-full">
                  <div className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded-lg",
                    "transition-all duration-200 hover:bg-accent/40",
                    otherAppsOpen && "bg-accent/20"
                  )}>
                    <span className="flex items-center justify-center shrink-0">
                      <Smartphone className="h-4 w-4 text-cyan-500" />
                    </span>
                    <span className="flex-1 text-left text-[10px] font-extrabold uppercase tracking-wider text-foreground/80 font-mono">
                      Other Apps
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200 text-muted-foreground",
                        otherAppsOpen && "rotate-180"
                      )}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <div className="ml-2 pl-3 border-l border-border/40 space-y-0.5 py-1">
                    <a
                      href="http://cryptoincome.vercel.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeDrawer}
                      className="flex items-center justify-between py-1 px-1.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors duration-200 group"
                    >
                      <span>Crypto Investment</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
                    </a>
                    <a
                      href="https://one.exnessonelink.com/a/vtkbbmje"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeDrawer}
                      className="flex items-center justify-between py-1 px-1.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors duration-200 group"
                    >
                      <span>Open Forex Account</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
                    </a>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* ⬇️ LOGOUT BUTTON - Other Apps ke neeche */}
            <div className="pt-1 pb-0.5">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 h-8 px-2 rounded-lg w-full transition-all duration-200 hover:bg-destructive/10 active:scale-[0.98] text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium tracking-tight">Logout</span>
              </button>
            </div>

            <div className="h-1" />
          </nav>

          {/* Footer - Version only (Language moved to its own fixed category above, NO LOGOUT here) */}
          <div className="shrink-0 px-3 py-2 border-t border-border/40 bg-background/80">
            <div className="flex items-center justify-end gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 text-[10px] font-mono text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />v{APP_VERSION}
              </span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
