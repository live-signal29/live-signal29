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
  LogOut 
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ThemeToggle } from "./ThemeToggle";
import trendFriendLogo from "@/assets/trend-friend-logo-new.png";

const APP_VERSION = "1.0.0";

export const SideDrawer = () => {
  const [open, setOpen] = useState(false);
  const [otherAppsOpen, setOtherAppsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login");
    setOpen(false);
  };

  const menuItems = [
    { label: "Live Signals", path: "/signals", icon: LineChart },
    { label: "Free Trial", path: "/free-trial", icon: Play },
    { label: "Premium", path: "/premium", icon: Crown },
    { label: "My Profile", path: "/profile", icon: User },
    { label: "Notifications", path: "/settings", icon: Bell },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="p-2 hover:bg-accent rounded-md transition-colors">
          <Menu className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[350px]">
        <div className="flex flex-col h-full">
          {/* Logo & App Name */}
          <div className="flex items-center gap-3 pb-6 border-b border-border">
            <img 
              src={trendFriendLogo} 
              alt="TREND IS FRIEND Logo" 
              className="w-14 h-14 rounded-full shadow-lg shadow-primary/20"
            />
            <div className="flex-1">
              <h2 className="text-lg font-bold tracking-wide">TREND IS FRIEND</h2>
              <p className="text-sm text-muted-foreground">Live Trading Signals</p>
            </div>
            <ThemeToggle />
          </div>

          {/* Menu Items */}
          <nav className="flex flex-col gap-1 py-4 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path + item.label}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className="px-4 py-3 rounded-md hover:bg-accent transition-colors text-foreground hover:text-primary font-medium flex items-center gap-3"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            {/* Other Apps Section */}
            <Collapsible open={otherAppsOpen} onOpenChange={setOtherAppsOpen}>
              <CollapsibleTrigger className="w-full px-4 py-3 rounded-md hover:bg-accent transition-colors text-foreground hover:text-primary font-medium flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <span>Other Apps</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${otherAppsOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <a
                  href="http://cryptoincome.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="pl-12 pr-4 py-3 rounded-md hover:bg-accent transition-colors text-foreground hover:text-primary font-medium flex items-center justify-between group"
                >
                  <span>Crypto Investment</span>
                  <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a
                  href="https://one.exnessonelink.com/a/vtkbbmje"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="pl-12 pr-4 py-3 rounded-md hover:bg-accent transition-colors text-foreground hover:text-primary font-medium flex items-center justify-between group"
                >
                  <span>Open Forex Account</span>
                  <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </CollapsibleContent>
            </Collapsible>
          </nav>

          {/* App Version */}
          <div className="px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground">
              Version {APP_VERSION}
            </p>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="px-4 py-3 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
