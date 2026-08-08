import {
  Link,
  useLocation,
} from "react-router-dom";

import {
  TrendingUp,
  BarChart3,
  User,
  Wallet,
  ClipboardList,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

const navItems = [
  {
    icon: TrendingUp,
    label: "Signals",
    path: "/",
  },
  {
    icon: BarChart3,
    label: "Results",
    path: "/results",
  },
  {
    icon: ClipboardList,
    label: "Account",
    path: "/account-management",
  },
  {
    icon: Wallet,
    label: "Premium",
    path: "/premium",
  },
  {
    icon: User,
    label: "Profile",
    path: "/profile",
  },
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

  const [isOpen, setIsOpen] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* --------------------------------
     Hide navigation on auth/admin pages
  --------------------------------- */

  const shouldHide =
    hiddenRoutes.includes(location.pathname) ||
    location.pathname.startsWith("/admin");

  /* --------------------------------
     Clear timer
  --------------------------------- */

  const clearAutoHide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  /* --------------------------------
     Auto hide after 15 seconds
  --------------------------------- */

  useEffect(() => {
    clearAutoHide();

    if (!isOpen) return;

    timerRef.current = setTimeout(() => {
      setIsOpen(false);
      timerRef.current = null;
    }, 15000);

    return clearAutoHide;
  }, [isOpen]);

  /* --------------------------------
     Cleanup
  --------------------------------- */

  useEffect(() => {
    return () => {
      clearAutoHide();
    };
  }, []);

  /* --------------------------------
     Toggle
  --------------------------------- */

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  /* --------------------------------
     Navigation click
  --------------------------------- */

  const handleNavClick = () => {
    clearAutoHide();
    setIsOpen(false);
  };

  /* --------------------------------
     Don't render on hidden pages
  --------------------------------- */

  if (shouldHide) {
    return null;
  }

  return (
    <div
      className="
        fixed
        bottom-0
        left-0
        right-0
        z-50
        flex
        flex-col
        items-center
        pb-1.5
        pointer-events-none
      "
    >
      {/* =========================
          TOGGLE BUTTON
      ========================== */}

      <button
        type="button"
        onClick={handleToggle}
        aria-label={isOpen ? "Hide navigation" : "Show navigation"}
        className={cn(
          `
          pointer-events-auto
          mb-1
          flex
          h-6
          w-10
          items-center
          justify-center
          rounded-full
          border
          border-border/40
          bg-background/85
          backdrop-blur-xl
          shadow-md
          transition-all
          duration-200
          active:scale-95
          focus:outline-none
          `,
          isOpen &&
            "border-primary/30 bg-primary/10"
        )}
      >
        {isOpen ? (
          <ChevronDown
            className="h-3 w-3 text-foreground/70"
          />
        ) : (
          <ChevronUp
            className="h-3 w-3 text-foreground/70"
          />
        )}
      </button>

      {/* =========================
          BOTTOM NAVIGATION
      ========================== */}

      <div
        className={cn(
          `
          pointer-events-auto
          w-[92%]
          max-w-[380px]
          transition-all
          duration-300
          ease-out
          `,
          isOpen
            ? "translate-y-0 opacity-100"
            : "translate-y-[calc(100%+12px)] opacity-0 pointer-events-none"
        )}
      >
        <div
          className="
            rounded-[16px]
            border
            border-border/40
            bg-background/92
            backdrop-blur-xl
            shadow-[0_-4px_18px_-8px_rgba(0,0,0,0.35)]
            px-1
            py-1
          "
        >
          <div className="flex items-center justify-between">

            {navItems.map((item) => {
              const Icon = item.icon;

              const isActive =
                location.pathname === item.path ||
                (
                  item.path === "/" &&
                  (
                    location.pathname === "/signals" ||
                    location.pathname.includes("/signals")
                  )
                );

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className="
                    flex
                    min-w-0
                    flex-1
                    flex-col
                    items-center
                    justify-center
                    gap-0.5
                    py-1
                    active:scale-95
                    transition-transform
                  "
                >
                  {/* Icon */}
                  <span
                    className={cn(
                      `
                      flex
                      h-6
                      w-6
                      items-center
                      justify-center
                      rounded-md
                      transition-all
                      duration-200
                      `,
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5",
                        isActive && "stroke-[2.5]"
                      )}
                    />
                  </span>

                  {/* Label */}
                  <span
                    className={cn(
                      `
                      text-[8px]
                      leading-none
                      whitespace-nowrap
                      `,
                      isActive
                        ? "font-bold text-primary"
                        : "font-medium text-muted-foreground/80"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}

          </div>
        </div>
      </div>
    </div>
  );
};
