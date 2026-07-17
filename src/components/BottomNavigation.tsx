import { Link, useLocation } from "react-router-dom";
import { Home, LineChart, BarChart3, User, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const leftItems = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: LineChart, label: "Signals", path: "/signals" },
];

const rightItems = [
  { icon: BarChart3, label: "Results", path: "/results" },
  { icon: User, label: "Profile", path: "/profile" },
];

const hiddenRoutes = ["/login", "/signup", "/admin/login", "/admin/dashboard", "/onboarding"];

export const BottomNavigation = () => {
  const location = useLocation();
  const [mounted, setMounted] = useState(false);

  const shouldHide = hiddenRoutes.some(
    (route) => location.pathname === route || location.pathname.startsWith("/admin")
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (shouldHide) return null;

  const NavBtn = ({
    icon: Icon,
    label,
    path,
  }: {
    icon: typeof Home;
    label: string;
    path: string;
  }) => {
    const active = location.pathname === path || (path === "/" && location.pathname === "/signals");
    return (
      <Link
        to={path}
        className="flex flex-col items-center justify-center gap-1 py-2 flex-1 min-w-0 group"
      >
        <Icon
          className={cn(
            "h-5 w-5 transition-all",
            active ? "text-emerald-400 scale-110" : "text-muted-foreground group-hover:text-foreground"
          )}
          strokeWidth={active ? 2.4 : 1.8}
        />
        <span
          className={cn(
            "text-[9px] font-bold uppercase tracking-wider transition-colors",
            active ? "text-emerald-400" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none",
        "transition-all duration-500 ease-out",
        mounted ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-3 mb-3 pointer-events-auto">
        <div className="relative">
          {/* Bar */}
          <div className="relative rounded-[28px] bg-[hsl(210_25%_9%/0.95)] backdrop-blur-2xl border border-white/[0.08] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)]">
            <div className="flex items-stretch px-2">
              {leftItems.map((it) => (
                <NavBtn key={it.path} {...it} />
              ))}
              {/* Spacer for center button */}
              <div className="w-16 shrink-0" aria-hidden />
              {rightItems.map((it) => (
                <NavBtn key={it.path} {...it} />
              ))}
            </div>
          </div>

          {/* Floating center action */}
          <Link
            to="/signals"
            className="absolute left-1/2 -translate-x-1/2 -top-6 group"
            aria-label="New Signal"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/50 blur-xl group-hover:blur-2xl transition-all" />
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border-[3px] border-[hsl(210_30%_5%)] shadow-[0_10px_30px_-5px_hsl(152_76%_45%/0.6)] flex items-center justify-center group-active:scale-95 transition-transform">
                <Send className="h-5 w-5 text-black" strokeWidth={2.5} />
              </div>
              <p className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-widest text-emerald-400 whitespace-nowrap">
                New
              </p>
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
};
