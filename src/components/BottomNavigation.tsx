import { Link, useLocation } from "react-router-dom";
import { TrendingUp, BarChart3, User, Wallet, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const navItems = [
  { icon: TrendingUp, label: "Signals", path: "/" },
  { icon: BarChart3, label: "Results", path: "/results" },
  { icon: ClipboardList, label: "Account", path: "/account-management" },
  { icon: Wallet, label: "Premium", path: "/premium" },
  { icon: User, label: "Profile", path: "/profile" },
];

// Routes where bottom navigation should be hidden
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

  const shouldHide = hiddenRoutes.some(route =>
    location.pathname === route || location.pathname.startsWith("/admin")
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (shouldHide) return null;

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 md:hidden px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
      "transition-all duration-500 ease-out",
      mounted ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
    )}>
      <div className="glow-border rounded-[22px]">
        {/* CARD SIZE CHHOTA (max-w, px, py) */}
        <div className="mx-auto max-w-[300px] rounded-[22px] border border-border/60 bg-background/85 backdrop-blur-2xl shadow-[0_-6px_28px_-12px_hsl(var(--glow-primary)/0.5)] px-1 py-1">
          
          <div className="flex items-center justify-around gap-0.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path === "/" && (location.pathname === "/signals" || location.pathname.includes("signals")));

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-col items-center gap-[2px] px-1.5 py-1"
                >
                  <span className={cn(
                    "icon-3d flex h-7 w-7 items-center justify-center",
                    isActive && "icon-3d-active animate-glow-breathe"
                  )}>
                    <item.icon className={cn(
                      "h-[14px] w-[14px] relative z-[1]",
                      isActive
                        ? "text-primary-foreground stroke-[2.4]"
                        : "text-muted-foreground stroke-[2]"
                    )} />
                  </span>
                  <span className={cn(
                    "text-[8px] leading-none tracking-tight",
                    isActive ? "font-bold text-primary" : "font-medium text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
          
        </div>
      </div>
    </nav>
  );
};
