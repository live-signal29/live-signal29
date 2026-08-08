import { Link, useLocation } from "react-router-dom";
import { TrendingUp, BarChart3, User, Wallet, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const shouldHide = hiddenRoutes.some(route =>
    location.pathname === route || location.pathname.startsWith("/admin")
  );

  if (shouldHide) return null;

  return (
    <div className="fixed bottom-2 left-0 right-0 z-50 flex justify-center pointer-events-none">
      
      {/* ULTRA SMALL & COMPACT GLASS CARD */}
      <div className="pointer-events-auto w-[92%] max-w-[340px] rounded-[16px] border border-border/40 bg-background/85 backdrop-blur-xl shadow-lg p-1">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path === "/" && (location.pathname === "/signals" || location.pathname.includes("signals")));

            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center gap-[2px] px-2 py-1.5 transition-all duration-200"
              >
                <div className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md transition-all duration-200",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground/60 hover:text-foreground/80"
                )}>
                  <item.icon className={cn("h-[13px] w-[13px]", isActive && "stroke-[2.5]")} />
                </div>
                <span className={cn(
                  "text-[8px] leading-none font-medium tracking-tight",
                  isActive ? "font-bold text-primary" : "text-muted-foreground/60"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      
    </div>
  );
};
