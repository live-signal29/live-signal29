import { Link, useLocation } from "react-router-dom";
import { TrendingUp, BarChart3, User, Wallet, ClipboardList, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

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
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center pb-2 pointer-events-none">
      
      {/* ===== TOGGLE BUTTON (Center, floating above) ===== */}
      <button
        onClick={handleToggle}
        className={cn(
          "pointer-events-auto mb-1 flex h-6 w-12 items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-border/40 shadow-md transition-all duration-300 hover:scale-105",
          isOpen && "border-primary/30 bg-primary/10 text-primary"
        )}
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3 stroke-[2.5] text-foreground/70" />
        ) : (
          <ChevronUp className="h-3 w-3 stroke-[2.5] text-foreground/70" />
        )}
      </button>

      {/* ===== MAIN BOTTOM MENU ===== */}
      <div
        className={cn(
          "pointer-events-auto w-[96%] max-w-md transition-all duration-500 ease-in-out",
          isOpen ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        )}
      >
        <div className="rounded-[20px] border border-border/40 bg-background/90 backdrop-blur-xl shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.3)] p-1.5">
          <div className="flex items-center justify-around">
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
                  className="relative flex flex-col items-center gap-0.5 px-2 py-1"
                >
                  <span className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  )}>
                    <item.icon className={cn("h-[14px] w-[14px]", isActive && "stroke-[2.5]")} />
                  </span>
                  <span className={cn(
                    "text-[8px] leading-none tracking-tight",
                    isActive ? "font-bold text-primary" : "font-medium text-muted-foreground/80"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
