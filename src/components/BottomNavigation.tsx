import { Link, useLocation } from "react-router-dom";
import { TrendingUp, BarChart3, User, Wallet, ClipboardList, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

const navItems = [
  { icon: TrendingUp, label: "Signals", path: "/" },
  { icon: BarChart3, label: "Results", path: "/results" },
  { icon: ClipboardList, label: "Account", path: "/account-management" },
  { icon: Wallet, label: "Premium", path: "/premium" },
  { icon: User, label: "Profile", path: "/profile" },
];

const hiddenRoutes = [
  "/login", "/signup", "/admin/login", "/admin/dashboard", "/onboarding",
];

export const BottomNavigation = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const shouldHide = hiddenRoutes.some(route =>
    location.pathname === route || location.pathname.startsWith("/admin")
  );

  // ===== AUTO HIDE LOGIC (15 Seconds) =====
  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isOpen) {
      timerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 15000); // 15 seconds
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    // If opening, start the timer. If closing, clear the timer.
    if (!isOpen) {
      timerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 15000);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  };

  // Reset timer whenever the menu stays open due to interaction
  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen]);

  if (shouldHide) return null;

  return (
    <div className="fixed left-3 top-1/2 -translate-y-1/2 z-50 flex items-center gap-2">
      
      {/* ===== MAIN MENU PILL (Left Side) ===== */}
      <div
        className={cn(
          "bg-background/90 backdrop-blur-xl border border-border/40 shadow-xl transition-all duration-500 ease-in-out rounded-2xl p-1.5 flex flex-col gap-1",
          isOpen ? "opacity-100 translate-x-0 scale-100" : "opacity-0 -translate-x-20 scale-95 pointer-events-none"
        )}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === "/" && (location.pathname === "/signals" || location.pathname.includes("signals")));

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                setIsOpen(false);
                if (timerRef.current) clearTimeout(timerRef.current);
              }}
              className={cn(
                "relative flex flex-row items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-300",
                isActive 
                  ? "bg-primary/10 text-primary shadow-sm" 
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-[14px] w-[14px] stroke-[2]", isActive && "stroke-[2.4]")} />
              <span className={cn("text-[10px] font-medium leading-none whitespace-nowrap", isActive ? "font-bold" : "font-medium")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* ===== TOGGLE BUTTON (Always Visible on Left) ===== */}
      <button
        onClick={handleToggle}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-border/40 shadow-md transition-all duration-300 hover:scale-105 hover:border-primary/30",
          isOpen && "border-primary/30 bg-primary/10 text-primary"
        )}
        title={isOpen ? "Close Menu" : "Open Menu"}
      >
        {isOpen ? (
          <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
        ) : (
          <ChevronRight className="h-4 w-4 stroke-[2.5]" />
        )}
      </button>
    </div>
  );
};
