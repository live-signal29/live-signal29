import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, BarChart3, User, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: TrendingUp, label: "Signals", path: "/signals" },
  { icon: BarChart3, label: "Results", path: "/results" },
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
  const [activeIndex, setActiveIndex] = useState(0);

  // Check if current route should hide the navigation
  const shouldHide = hiddenRoutes.some(route => 
    location.pathname === route || location.pathname.startsWith("/admin")
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const currentIndex = navItems.findIndex(
      item => location.pathname === item.path || 
      (item.path === "/signals" && location.pathname.includes("signals"))
    );
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex);
    }
  }, [location.pathname]);

  if (shouldHide) return null;

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 md:hidden",
      "transition-all duration-500 ease-out",
      mounted ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
    )}>
      {/* Glassmorphism background with modern blur */}
      <div className="mx-2 mb-2 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/80 to-background/60 backdrop-blur-xl" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        
        <div className="relative flex items-center justify-around py-2 px-1">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path || 
              (item.path === "/signals" && location.pathname.includes("signals"));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl",
                  "transition-all duration-300 ease-out",
                  "active:scale-95",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
              >
                {/* Active background glow */}
                {isActive && (
                  <div className="absolute inset-0 bg-primary/15 rounded-2xl animate-scale-in" />
                )}
                
                {/* Icon with bounce animation */}
                <div className={cn(
                  "relative z-10 transition-all duration-300",
                  isActive && "animate-bounce-once"
                )}>
                  <item.icon className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isActive ? "stroke-[2.5]" : "stroke-[1.5]"
                  )} />
                </div>
                
                {/* Label */}
                <span className={cn(
                  "relative z-10 text-[10px] transition-all duration-300",
                  isActive ? "font-bold" : "font-medium opacity-70"
                )}>
                  {item.label}
                </span>
                
                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute -bottom-0.5 w-1.5 h-1.5 bg-primary rounded-full animate-scale-in shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
