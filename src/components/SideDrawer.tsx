import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SideDrawer = () => {
  const [open, setOpen] = useState(false);
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
    { label: "Crypto Deposit", path: "/crypto-deposit" },
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
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">TF</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">TREND IS FRIEND</h2>
              <p className="text-xs text-muted-foreground">Live Trading Signals</p>
            </div>
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
