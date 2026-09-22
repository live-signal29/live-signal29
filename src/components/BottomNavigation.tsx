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
  // IMPORTANT:
  // Signals explicitly removes ?tab=copier
  { icon: TrendingUp, label: "Signals", path: "/" },

  { icon: Link2, label: "MT5 Copy", path: "/?tab=copier" },
  { icon: ClipboardList, label: "Management", path: "/account-management" },
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

  const shouldHide = hiddenRoutes.some(
    (route) =>
      location.pathname === route ||
      location.pathname.startsWith("/admin")
  );

  if (shouldHide) return null;

  const searchParams = new URLSearchParams(location.search);
  const onCopierTab = searchParams.get("tab") === "copier";

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))]"
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
                const isSignals = item.label === "Signals";
                const isCopier = item.label === "MT5 Copy";

                const isActive = isSignals
                  ? location.pathname === "/" && !onCopierTab
                  : isCopier
                  ? location.pathname === "/" && onCopierTab
                  : location.pathname === item.path;

                // IMPORTANT:
                // Signals must ALWAYS go to the main dashboard
                // without the copier query parameter.
                const targetPath = isSignals
                  ? "/"
                  : item.path;

                return (
                  <Link
                    key={item.label}
                    to={targetPath}
                    replace={isSignals}
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
  );
};

export default BottomNavigation;
