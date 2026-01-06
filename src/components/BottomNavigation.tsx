import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, BarChart3, User, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: TrendingUp, label: "Signals", path: "/signals" },
  { icon: BarChart3, label: "Results", path: "/results" },
  { icon: Wallet, label: "Premium", path: "/premium" },
  { icon: User, label: "Profile", path: "/profile" },
];

export const BottomNavigation = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Glassmorphism background */}
      <div className="glass-card border-t border-border/50 rounded-t-3xl mx-2 mb-safe">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path === "/signals" && location.pathname.includes("signals"));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300",
                  isActive 
                    ? "bg-primary/15 text-primary scale-105" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-transform duration-300",
                  isActive && "scale-110"
                )} />
                <span className={cn(
                  "text-[10px] font-medium",
                  isActive && "font-semibold"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-0.5 w-1 h-1 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
