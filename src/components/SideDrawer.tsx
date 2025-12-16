import { useState } from "react";
import { 
  Menu, 
  ChevronDown, 
  ExternalLink, 
  LineChart, 
  Play, 
  Crown, 
  User, 
  Bell, 
  Settings, 
  Smartphone, 
  LogOut,
  Briefcase,
  BarChart3
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ThemeToggle } from "./ThemeToggle";
import trendFriendLogo from "@/assets/trend-friend-logo-new.png";
import { cn } from "@/lib/utils";

const APP_VERSION = "1.0.0";

export const SideDrawer = () => {
  const [open, setOpen] = useState(false);
  const [otherAppsOpen, setOtherAppsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login");
    setOpen(false);
  };

  const menuItems = [
    { label: "Live Signals", path: "/signals", icon: LineChart, color: "text-emerald-500", bg: "bg-emerald-500/10", activeBg: "bg-emerald-500/20" },
    { label: "Free Trial", path: "/free-trial", icon: Play, color: "text-blue-500", bg: "bg-blue-500/10", activeBg: "bg-blue-500/20" },
    { label: "Premium", path: "/premium", icon: Crown, color: "text-amber-500", bg: "bg-amber-500/10", activeBg: "bg-amber-500/20" },
    { label: "Account Management", path: "/account-management", icon: Briefcase, color: "text-teal-500", bg: "bg-teal-500/10", activeBg: "bg-teal-500/20" },
    { label: "Results", path: "/results", icon: BarChart3, color: "text-indigo-500", bg: "bg-indigo-500/10", activeBg: "bg-indigo-500/20" },
    { label: "My Profile", path: "/profile", icon: User, color: "text-purple-500", bg: "bg-purple-500/10", activeBg: "bg-purple-500/20" },
    { label: "Notifications", path: "/settings", icon: Bell, color: "text-rose-500", bg: "bg-rose-500/10", activeBg: "bg-rose-500/20" },
    { label: "Settings", path: "/settings", icon: Settings, color: "text-slate-500", bg: "bg-slate-500/10", activeBg: "bg-slate-500/20" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="p-2 hover:bg-accent rounded-md transition-all duration-200 hover:scale-105 active:scale-95">
          <Menu className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[350px] p-0 border-r border-border/50">
        <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/30">
          {/* Logo & App Name */}
          <div className="flex items-center gap-3 p-5 border-b border-border/50 bg-background/80 backdrop-blur-sm">
            <div className="relative">
              <img 
                src={trendFriendLogo} 
                alt="TREND IS FRIEND Logo" 
                className="w-14 h-14 rounded-full shadow-lg shadow-primary/30 ring-2 ring-primary/20"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold tracking-wide bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                TREND IS FRIEND
              </h2>
              <p className="text-xs text-muted-foreground">Live Trading Signals</p>
            </div>
            <ThemeToggle />
          </div>

          {/* Menu Items */}
          <nav className="flex flex-col gap-1.5 p-4 flex-1 overflow-y-auto">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path + item.label}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={cn(
                    "group relative px-4 py-3.5 rounded-xl font-medium flex items-center gap-3",
                    "transition-all duration-300 ease-out",
                    "hover:translate-x-1 active:scale-[0.98]",
                    "animate-fade-in",
                    active 
                      ? `${item.activeBg} ${item.color} shadow-sm` 
                      : "text-foreground/80 hover:bg-accent/80"
                  )}
                >
                  {/* Active indicator */}
                  {active && (
                    <div className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full",
                      item.color.replace('text-', 'bg-')
                    )} />
                  )}
                  
                  {/* Icon container */}
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300",
                    active ? item.bg : "bg-muted/50 group-hover:bg-accent",
                    "group-hover:scale-110 group-hover:rotate-3"
                  )}>
                    <Icon className={cn(
                      "h-5 w-5 transition-colors duration-300",
                      active ? item.color : "text-muted-foreground group-hover:text-foreground"
                    )} />
                  </div>
                  
                  <span className="transition-colors duration-300">{item.label}</span>
                  
                  {/* Hover glow effect */}
                  <div className={cn(
                    "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10",
                    "bg-gradient-to-r from-transparent via-primary/5 to-transparent"
                  )} />
                </Link>
              );
            })}
            
            {/* Other Apps Section */}
            <Collapsible open={otherAppsOpen} onOpenChange={setOtherAppsOpen}>
              <CollapsibleTrigger className={cn(
                "w-full px-4 py-3.5 rounded-xl font-medium flex items-center justify-between",
                "transition-all duration-300 ease-out",
                "hover:bg-accent/80 hover:translate-x-1 active:scale-[0.98]",
                "text-foreground/80 group"
              )}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50 group-hover:bg-accent transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <Smartphone className="h-5 w-5 text-cyan-500" />
                  </div>
                  <span>Other Apps</span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-300",
                  otherAppsOpen ? 'rotate-180' : ''
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent className="animate-accordion-down">
                <div className="ml-6 mt-1 space-y-1 border-l-2 border-border/50 pl-4">
                  <a
                    href="http://cryptoincome.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-accent/80 transition-all duration-200 text-sm text-muted-foreground hover:text-foreground group"
                  >
                    <span>Crypto Investment</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5" />
                  </a>
                  <a
                    href="https://one.exnessonelink.com/a/vtkbbmje"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-accent/80 transition-all duration-200 text-sm text-muted-foreground hover:text-foreground group"
                  >
                    <span>Open Forex Account</span>
                    <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5" />
                  </a>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </nav>

          {/* Footer Section */}
          <div className="p-4 border-t border-border/50 bg-background/50 backdrop-blur-sm space-y-3">
            {/* App Version */}
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Version {APP_VERSION}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={cn(
                "w-full px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2",
                "bg-gradient-to-r from-destructive to-destructive/80",
                "text-destructive-foreground shadow-lg shadow-destructive/20",
                "transition-all duration-300 ease-out",
                "hover:shadow-xl hover:shadow-destructive/30 hover:scale-[1.02]",
                "active:scale-[0.98]"
              )}
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
