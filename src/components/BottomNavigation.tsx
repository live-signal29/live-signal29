import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, BarChart3, User, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const navItems = [
  { icon: Home, label: "Home", path: "/", gradient: "from-blue-500 to-cyan-400" },
  { icon: TrendingUp, label: "Signals", path: "/signals", gradient: "from-emerald-500 to-teal-400" },
  { icon: BarChart3, label: "Results", path: "/results", gradient: "from-violet-500 to-purple-400" },
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
      {/* Modern floating bar with gradient border */}
      <div className="mx-3 mb-3">
        <div className="relative rounded-[28px] overflow-hidden">
          {/* Animated gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 animate-[shimmer_3s_ease-in-out_infinite]" />
          
          {/* Inner background */}
          <div className="absolute inset-[1px] rounded-[27px] bg-background/95 backdrop-blur-2xl" />
          
          {/* Content */}
          <div className="relative flex items-center justify-around py-1 px-1">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path || 
                (item.path === "/signals" && location.pathname.includes("signals"));
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl",
                    "transition-all duration-300 ease-out",
                    "active:scale-90",
                    isActive ? "scale-105" : "hover:scale-105"
                  )}
                >
                  {/* Active background with gradient */}
                  {isActive && (
                    <div className={cn(
                      "absolute inset-0 rounded-xl bg-gradient-to-br opacity-20",
                      item.gradient,
                      "animate-scale-in"
                    )} />
                  )}
                  
                  {/* Icon container */}
                  <div className={cn(
                    "relative z-10 flex items-center justify-center w-8 h-8 rounded-lg",
                    "transition-all duration-300",
                    isActive 
                      ? cn("bg-gradient-to-br shadow-md", item.gradient)
                      : "bg-muted/50"
                  )}>
                    <item.icon className={cn(
                      "h-4 w-4 transition-all duration-300",
                      isActive 
                        ? "text-white stroke-[2.5] drop-shadow-sm" 
                        : "text-muted-foreground stroke-[1.5]"
                    )} />
                  </div>
                  
                  {/* Label */}
                  <span className={cn(
                    "relative z-10 text-[9px] transition-all duration-300",
                    isActive 
                      ? "font-bold text-foreground" 
                      : "font-medium text-muted-foreground"
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
