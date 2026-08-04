import { Link, useLocation } from "react-router-dom";
import { TrendingUp, BarChart3, User, Wallet, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const navItems = [
  { icon: TrendingUp, label: "Signals", path: "/", gradient: "from-emerald-500 to-teal-400" },
  { icon: BarChart3, label: "Results", path: "/results", gradient: "from-violet-500 to-purple-400" },
  { icon: ClipboardList, label: "Account", path: "/account-management", gradient: "from-blue-500 to-cyan-400" },
  { icon: Wallet, label: "Premium", path: "/premium", gradient: "from-amber-500 to-orange-400" },
  { icon: User, label: "Profile", path: "/profile", gradient: "from-rose-500 to-pink-400" },
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

  // Check if current route should hide the navigation
  const shouldHide = hiddenRoutes.some(route => 
    location.pathname === route || location.pathname.startsWith("/admin")
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (shouldHide) return null;

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 md:hidden",
      "transition-all duration-500 ease-out",
      mounted ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
    )}>
      {/* Flat compact bar like reference */}
      <div className="border-t border-border bg-background/95 backdrop-blur-xl">
        <div className="flex items-center justify-around px-1 py-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path === "/" && (location.pathname === "/signals" || location.pathname.includes("signals")));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex flex-col items-center gap-[2px] rounded-full border px-3 py-1 transition-colors active:scale-95",
                  isActive ? "border-border bg-muted" : "border-transparent"
                )}
              >
                <item.icon className={cn(
                  "h-4 w-4",
                  isActive ? "text-foreground stroke-[2.25]" : "text-muted-foreground stroke-[1.75]"
                )} />
                <span className={cn(
                  "text-[8px] leading-none",
                  isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                )}>
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
