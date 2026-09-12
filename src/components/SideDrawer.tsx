import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Menu, ChevronDown, ExternalLink, LineChart, Crown, User, Bell, Settings,
  Smartphone, LogOut, Briefcase, BarChart3, Calendar as CalendarIcon,
  Calculator as CalcIcon, Gift, Bell as BellIcon, BookOpen, Sparkles,
  Trophy, GraduationCap, Newspaper, History, TrendingUp, PieChart,
  TrendingUp as LiveIcon, 
  BookOpen as LearnIcon,
  Wrench as ToolsIcon,
  Crown as PremiumIcon,
  Settings as AccountIcon,
  Languages as LanguagesIcon, Check
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
          "group relative flex items-center gap-3.5 h-10 px-3 rounded-xl font-sans text-xs font-bold transition-all duration-300 ease-out active:scale-[0.98]",
          active
            ? "bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border border-emerald-500/40 text-emerald-400 font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            : "text-muted-foreground/90 hover:bg-emerald-500/10 hover:text-foreground hover:translate-x-1"
        )}
      >
        <span className="flex items-center justify-center shrink-0">
          <Icon
            className={cn(
              "h-4 w-4 transition-transform duration-300 group-hover:scale-125",
              active ? "text-emerald-400 stroke-[2.5]" : item.tint
            )}
          />
        </span>
        <span className="text-[12px] tracking-wide truncate">
          {item.label}
        </span>
        {item.badge && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase shrink-0 animate-pulse">
            {item.badge}
          </span>
        )}
        {active && (
          <span className="ml-auto h-4 w-1 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981] shrink-0" />
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
        <CollapsibleTrigger className="w-full my-1">
          <div className={cn(
            "group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent transition-all duration-300",
            isOpen 
              ? "bg-emerald-500/10 border-emerald-500/20 text-foreground shadow-sm" 
              : "hover:bg-accent/50 hover:border-border/60"
          )}>
            <span className="flex items-center justify-center shrink-0 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
            </span>
            <span className="flex-1 text-left text-[11px] font-black uppercase tracking-wider text-foreground/90 font-mono">
              {group.title}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-300 text-muted-foreground",
                isOpen && "rotate-180 text-emerald-400"
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="ml-3 pl-3 border-l-2 border-emerald-500/20 space-y-1 py-1.5">
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

const ResetToEnglishButton = ({ current, onReset }: { current: string; onReset: () => void }) => (
  <button
    type="button"
    onClick={onReset}
    className={cn(
      "flex w-full items-center justify-between h-9 px-3 rounded-xl text-[11.5px] font-extrabold tracking-tight my-1",
      "border transition-all duration-300 active:scale-[0.98]",
      current === "en"
        ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
        : "border-amber-500/30 text-amber-400/90 hover:bg-amber-500/10"
    )}
  >
    <span>English (Default)</span>
    {current === "en" && <Check className="h-4 w-4 shrink-0 text-amber-400" />}
  </button>
);

const LanguageCategory = memo(
  ({ isOpen, onToggle, closeDrawer }: { isOpen: boolean; onToggle: () => void; closeDrawer: () => void }) => {
    const [current, setCurrent] = useState(getSavedLanguage());

    return (
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger className="w-full my-1">
          <div className={cn(
            "group flex items-center justify-between px-3.5 py-3 rounded-2xl border transition-all duration-300 shadow-md",
            "bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
          )}>
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center shrink-0 p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                <LanguagesIcon className="h-4 w-4" />
              </span>
              <span className="text-[11.5px] font-black uppercase tracking-wider text-amber-400 font-mono">
                SELECTED LANGUAGE
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold font-mono text-amber-300">
                {SITE_LANGUAGES.find((l) => l.code === current)?.label ?? "English"}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-300 text-amber-400 shrink-0",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="ml-3 pl-3 border-l-2 border-amber-500/30 py-2 space-y-1.5">
            <ResetToEnglishButton current={current} onReset={() => { setCurrent("en"); setSiteLanguage("en"); }} />

            <div className="space-y-1 max-h-52 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-amber-500/20">
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
                    "flex w-full items-center justify-between h-9 px-3 rounded-xl text-[11.5px] font-bold tracking-tight",
                    "transition-all duration-200 active:scale-[0.98]",
                    current === lang.code
                      ? "bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <span className="truncate">{lang.label}</span>
                  {current === lang.code && <Check className="h-4 w-4 shrink-0 text-amber-400" />}
                </button>
              ))}
            </div>

            <ResetToEnglishButton current={current} onReset={() => { setCurrent("en"); setSiteLanguage("en"); }} />
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
          { label: t("live_signals"), path: "/signals", icon: LineChart, tint: "text-emerald-400" },
          { label: "Portfolio", path: "/portfolio", icon: PieChart, tint: "text-teal-400" },
          { label: t("trade_journal"), path: "/trade-journal", icon: BookOpen, tint: "text-lime-400" },
          { label: t("results"), path: "/results", icon: BarChart3, tint: "text-violet-400" },
        ],
      },
      {
        title: "Learn & Analyze",
        icon: LearnIcon,
        items: [
          { label: "Daily Market Brief", path: "/market-brief", icon: Newspaper, tint: "text-sky-400" },
          { label: "Economic Calendar", path: "/economic-calendar", icon: CalendarIcon, tint: "text-indigo-400" },
          { label: "Trading Academy", path: "/academy", icon: GraduationCap, tint: "text-emerald-400" },
          { label: "Backtesting", path: "/backtesting", icon: History, tint: "text-purple-400" },
        ],
      },
      {
        title: "Tools",
        icon: ToolsIcon,
        items: [
          { label: "AI Assistant", path: "/ai-chat", icon: Sparkles, tint: "text-fuchsia-400", badge: "New" },
          { label: "Risk Calculator", path: "/calculator", icon: CalcIcon, tint: "text-cyan-400" },
          { label: "Compound Calculator", path: "/compound", icon: TrendingUp, tint: "text-green-400" },
          { label: t("price_alerts"), path: "/price-alerts", icon: BellIcon, tint: "text-pink-400" },
        ],
      },
      {
        title: "Premium",
        icon: PremiumIcon,
        items: [
          { label: t("premium"), path: "/premium", icon: Crown, tint: "text-amber-400", badge: "Pro" },
          { label: "Gift Premium", path: "/gift-premium", icon: Gift, tint: "text-rose-400" },
          { label: "Invite & Earn", path: "/referrals", icon: Gift, tint: "text-orange-400" },
        ],
      },
      {
        title: "Account",
        icon: AccountIcon,
        items: [
          { label: "Account Management", path: "/account-management", icon: Briefcase, tint: "text-teal-400" },
          { label: "My Profile", path: "/profile", icon: User, tint: "text-purple-400" },
          { label: t("notifications"), path: "/notifications", icon: Bell, tint: "text-rose-400" },
          { label: t("settings"), path: "/settings", icon: Settings, tint: "text-slate-400" },
          { label: "Leaderboard", path: "/leaderboard", icon: Trophy, tint: "text-amber-400" },
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
          className="p-2 rounded-xl hover:bg-accent/80 transition-colors duration-200 active:scale-95"
        >
          <Menu className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[82vw] max-w-[320px] p-0 border-r border-emerald-500/20 shadow-2xl flex flex-col h-dvh max-h-dvh overflow-hidden bg-background/95 backdrop-blur-xl transition-all duration-300 [&>button]:hidden"
      >
        <div className="flex flex-col h-full min-h-0">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3.5 border-b border-emerald-500/20 bg-background/90">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0 flex items-center justify-center p-0.5 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse">
                <img
                  src={trendFriendLogo}
                  alt="Trend is Friend logo"
                  width={34}
                  height={34}
                  loading="eager"
                  decoding="async"
                  className="w-8 h-8 rounded-lg object-cover"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-background shadow-[0_0_8px_#10b981]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xs font-black tracking-wider truncate leading-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  TREND IS FRIEND
                </h2>
                <p className="text-[10px] font-bold font-mono text-emerald-500 truncate leading-tight tracking-wide">
                  Live Signals
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          {/* Menu Sections */}
          <nav
            ref={menuScrollRef}
            onScroll={rememberScroll}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth [-webkit-overflow-scrolling:touch] px-3 py-2 space-y-1"
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

            {/* Selected Language Category */}
            <LanguageCategory
              isOpen={openCategories["Selected Language"] ?? false}
              onToggle={() => toggleCategory("Selected Language")}
              closeDrawer={closeDrawer}
            />

            {/* Other Apps */}
            <div className="my-1">
              <Collapsible open={otherAppsOpen} onOpenChange={setOtherAppsOpen}>
                <CollapsibleTrigger className="w-full">
                  <div className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent transition-all duration-300",
                    otherAppsOpen 
                      ? "bg-cyan-500/10 border-cyan-500/20 text-foreground" 
                      : "hover:bg-accent/50 hover:border-border/60"
                  )}>
                    <span className="flex items-center justify-center shrink-0 p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Smartphone className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                    </span>
                    <span className="flex-1 text-left text-[11px] font-black uppercase tracking-wider text-foreground/90 font-mono">
                      Other Apps
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-300 text-muted-foreground",
                        otherAppsOpen && "rotate-180 text-cyan-400"
                      )}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <div className="ml-3 pl-3 border-l-2 border-cyan-500/20 space-y-1 py-1.5">
                    <a
                      href="http://cryptoincome.vercel.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeDrawer}
                      className="flex items-center justify-between py-2 px-3 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-cyan-500/10 transition-colors duration-200 group"
                    >
                      <span>Crypto Investment</span>
                      <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                    </a>
                    <a
                      href="https://one.exnessonelink.com/a/vtkbbmje"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeDrawer}
                      className="flex items-center justify-between py-2 px-3 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-cyan-500/10 transition-colors duration-200 group"
                    >
                      <span>Open Forex Account</span>
                      <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                    </a>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* LOGOUT BUTTON */}
            <div className="pt-2 pb-1">
              <button
                onClick={handleLogout}
                className="group flex items-center gap-3 h-10 px-3.5 rounded-xl w-full transition-all duration-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 active:scale-[0.98] text-rose-400 font-bold"
              >
                <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                <span className="text-xs font-black uppercase tracking-wider">Logout</span>
              </button>
            </div>

            <div className="h-2" />
          </nav>

          {/* Footer - Version Badge */}
          <div className="shrink-0 px-4 py-3 border-t border-emerald-500/20 bg-background/90 flex items-center justify-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10.5px] font-mono font-bold text-emerald-400 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SideDrawer;
