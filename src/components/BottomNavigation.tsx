import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, BarChart3, User, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const navItems = [
  { icon: Home, label: "Home", path: "/", color: "text-primary" },
  { icon: TrendingUp, label: "Signals", path: "/signals", color: "text-success", badge: true },
  { icon: BarChart3, label: "Results", path: "/results", color: "text-blue-500" },
  { icon: Crown, label: "Premium", path: "/premium", color: "text-yellow-500" },
  { icon: User, label: "Profile", path: "/profile", color: "text-purple-500" },
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
      {/* Premium Glassmorphism Container */}
      <div className="mx-3 mb-3 rounded-[24px] overflow-hidden shadow-2xl shadow-black/20">
        {/* Background layers */}
        <div className="absolute inset-0 bg-card/95 backdrop-blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-muted/50 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        
        <div className="relative flex items-center justify-around py-2.5 px-2">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path || 
              (item.path === "/signals" && location.pathname.includes("signals"));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-5 py-2.5 rounded-2xl",
                  "transition-all duration-300 ease-out",
                  "active:scale-90",
                  isActive && "bg-primary/10"
                )}
              >
                {/* Badge for Signals */}
                {item.badge && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-[9px] font-bold text-destructive-foreground">2</span>
                  </div>
                )}
                
                {/* Icon */}
                <div className={cn(
                  "relative transition-all duration-300",
                  isActive && "scale-110"
                )}>
                  <item.icon className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isActive ? item.color : "text-muted-foreground",
                    isActive ? "stroke-[2.5]" : "stroke-[1.5]"
                  )} />
                </div>
                
                {/* Label */}
                <span className={cn(
                  "text-[10px] transition-all duration-300",
                  isActive 
                    ? cn("font-bold", item.color)
                    : "font-medium text-muted-foreground"
                )}>
                  {item.label}
                </span>
                
                {/* Active indicator line */}
                {isActive && (
                  <div className="absolute -bottom-0.5 w-8 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
