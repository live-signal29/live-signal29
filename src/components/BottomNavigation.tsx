import { Link, useLocation } from "react-router-dom";
import {
  TrendingUp,
  BarChart3,
  User,
  Wallet,
  ClipboardList,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

const navItems = [
  { icon: TrendingUp, label: "Signals", path: "/" },
  { icon: BarChart3, label: "Results", path: "/results" },
  { icon: ClipboardList, label: "Account", path: "/account-management" },
  { icon: Wallet, label: "Premium", path: "/premium" },
  { icon: User, label: "Profile", path: "/profile" },
];

const hiddenRoutes = [
  "/login",
  "/signup",
  "/admin/login",
  "/admin/dashboard",
  "/onboarding",
];

export const BottomNavigation = () => {
  const location = useLocation();

  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide navigation after 10 seconds
  useEffect(() => {
    if (!mounted) return;

    setIsVisible(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 10000);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [location.pathname, mounted]);

  // Re-open navigation from arrow
  const openNavigation = () => {
    setIsVisible(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 10000);
  };

  const shouldHide = hiddenRoutes.some(
    (route) =>
      location.pathname === route ||
      location.pathname.startsWith("/admin")
  );

  if (shouldHide) return null;

  return (
    <>
      {/* Small reopen arrow */}
      {!isVisible && (
        <button
          type="button"
          onClick={openNavigation}
          aria-label="Open navigation"
          className={cn(
            "fixed bottom-[max(0.7rem,env(safe-area-inset-bottom))] left-2 z-[60]",
            "flex h-7 w-7 items-center justify-center",
            "rounded-full border border-border/60",
            "bg-background/90 backdrop-blur-xl",
            "shadow-[0_4px_18px_-6px_hsl(var(--glow-primary)/0.6)]",
            "text-muted-foreground",
            "transition-all duration-300",
            "active:scale-90 hover:text-foreground"
          )}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Bottom Navigation */}
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 md:hidden",
          "px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))]",
          "transition-all duration-500 ease-out",
          mounted && isVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-[120%] opacity-0 pointer-events-none"
        )}
      >
        <div className="mx-auto max-w-md">
          <div className="glow-border rounded-[17px]">
            <div
              className={cn(
                "rounded-[17px]",
                "border border-border/60",
                "bg-background/88 backdrop-blur-2xl",
                "shadow-[0_-5px_22px_-12px_hsl(var(--glow-primary)/0.55)]"
              )}
            >
              <div className="flex h-[52px] items-center justify-around px-1">
                {navItems.map((item) => {
                  const isActive =
                    location.pathname === item.path ||
                    (item.path === "/" &&
                      (location.pathname === "/signals" ||
                        location.pathname.includes("signals")));

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "relative flex min-w-0 flex-1 flex-col",
                        "items-center justify-center",
                        "gap-[3px] px-1 py-0.5",
                        "transition-transform duration-200",
                        "active:scale-90"
                      )}
                    >
                      {/* Icon */}
                      <span
                        className={cn(
                          "icon-3d h-7 w-7",
                          "transition-all duration-200",
                          isActive &&
                            "icon-3d-active animate-glow-breathe"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "relative z-[1] h-[15px] w-[15px]",
                            isActive
                              ? "text-primary-foreground stroke-[2.3]"
                              : "text-muted-foreground stroke-[1.9]"
                          )}
                        />
                      </span>

                      {/* Label */}
                      <span
                        className={cn(
                          "text-[8px] leading-none tracking-tight",
                          "whitespace-nowrap",
                          isActive
                            ? "font-bold text-primary"
                            : "font-medium text-muted-foreground"
                        )}
                      >
                        {item.label}
                      </span>

                      {/* Active indicator */}
                      {isActive && (
                        <span className="absolute -bottom-[1px] h-[2px] w-4 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--glow-primary)/0.8)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
