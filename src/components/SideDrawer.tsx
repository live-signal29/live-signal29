import { useState } from "react";
import { Menu, ChevronDown, ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ThemeToggle } from "./ThemeToggle";
import trendFriendLogo from "@/assets/trend-friend-logo-new.png";

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
    { label: "Live Signals", path: "/signals" },
    { label: "Free Trial", path: "/free-trial" },
    { label: "Premium", path: "/premium" },
    { label: "My Profile", path: "/profile" },
    { label: "Extra Benefits", path: "/benefits" },
    { label: "Contact Us", path: "/contact" },
    { label: "Settings", path: "/settings" },
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
          <nav className="flex flex-col gap-2 py-4 flex-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-md hover:bg-accent transition-colors text-foreground hover:text-primary font-medium"
              >
                {item.label}
              </Link>
            ))}
            
            {/* Other Apps Section */}
            <Collapsible open={otherAppsOpen} onOpenChange={setOtherAppsOpen}>
              <CollapsibleTrigger className="w-full px-4 py-3 rounded-md hover:bg-accent transition-colors text-foreground hover:text-primary font-medium flex items-center justify-between">
                <span>Other Apps</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${otherAppsOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <a
                  href="http://cryptoincome.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="pl-8 pr-4 py-3 rounded-md hover:bg-accent transition-colors text-foreground hover:text-primary font-medium flex items-center justify-between group"
                >
                  <span>Crypto Investment</span>
                  <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a
                  href="https://one.exnessonelink.com/a/vtkbbmje"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="pl-8 pr-4 py-3 rounded-md hover:bg-accent transition-colors text-foreground hover:text-primary font-medium flex items-center justify-between group"
                >
                  <span>Open Forex Account</span>
                  <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </CollapsibleContent>
            </Collapsible>
          </nav>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="px-4 py-3 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-medium mt-auto"
          >
            Logout
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
