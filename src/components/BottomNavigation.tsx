import { Link, useLocation } from "react-router-dom";
import {
  TrendingUp,
  Link2,
  User,
  Wallet,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    icon: TrendingUp,
    label: "Signals",
    path: "/",
  },
  {
    icon: Link2,
    label: "MT5 Copy",
    path: "/?tab=copier",
  },
  {
    icon: ClipboardList,
    label: "Management",
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

  const shouldHide = hiddenRoutes.some(
    (route) =>
      location.pathname === route ||
      location.pathname.startsWith("/admin")
  );

  if (shouldHide) return null;

  const searchParams = new URLSearchParams(location.search);
  const isCopierTab =
    location.pathname === "/" &&
    searchParams.get("tab") === "copier";

  return (
    <nav
      className={cn(
        "pointer-events-none fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "px-3 pb-[calc(0.5rem+min(env(safe-area-inset-bottom),0.5rem))]"
      )}
    >
      {/* floating glass bar (Telegram style) */}
      <div
        className={cn(
          "pointer-events-auto mx-auto max-w-md",
          "rounded-[28px] border border-border/50",
          "bg-card/70 backdrop-blur-xl backdrop-saturate-150",
          "shadow-[0_8px_30px_-6px_rgba(15,23,42,0.28)]"
        )}
      >
        <div className="flex items-center justify-around gap-1 p-1.5">
          {navItems.map((item) => {
            const isSignals = item.label === "Signals";
            const isCopier = item.label === "MT5 Copy";

            const isActive = isSignals
              ? location.pathname === "/" && !isCopierTab
              : isCopier
              ? location.pathname === "/" && isCopierTab
              : location.pathname === item.path;

            return (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center",
                  "gap-1 rounded-[22px] px-1 py-2",
                  "transition-all duration-200 active:scale-95"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[21px] w-[21px]",
                    isActive
                      ? "text-emerald-600 dark:text-emerald-400 stroke-[2.3]"
                      : "text-slate-600 dark:text-slate-300 stroke-[1.8]"
                  )}
                />

                <span
                  className={cn(
                    "whitespace-nowrap text-[10px] leading-none tracking-tight",
                    "transition-colors duration-200",
                    isActive
                      ? "font-bold text-emerald-600 dark:text-emerald-400"
                      : "font-medium text-slate-600 dark:text-slate-300"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
