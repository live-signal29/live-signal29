import { Link, useLocation } from "react-router-dom";
import { Menu, MoreVertical, User, LogOut, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import TrialBanner from "./TrialBanner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Header = () => {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  
  const menuItems = [
    { name: "Signals", path: "/" },
    { name: "Contact", path: "/contact" },
    { name: "Open Exness Account", path: "https://one.exnessonelink.com/a/vtkbbmje", external: true },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <TrialBanner />
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background backdrop-blur supports-[backdrop-filter]:bg-background/95">
        <div className="flex h-16 items-center justify-between px-4">
          {/* Hamburger Menu + Live Signals */}
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="flex flex-col gap-4 mt-8">
                  {menuItems.map((item) => (
                    item.external ? (
                      <a
                        key={item.path}
                        href={item.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-medium transition-colors hover:text-primary py-2 text-muted-foreground"
                      >
                        {item.name}
                      </a>
                    ) : (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`text-lg font-medium transition-colors hover:text-primary py-2 ${
                          isActive(item.path) ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {item.name}
                      </Link>
                    )
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex items-center gap-2 group">
              <div className="relative">
                <Globe className="h-5 w-5 text-primary animate-pulse group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:blur-lg transition-all duration-300"></div>
              </div>
              <span className="text-lg font-bold gradient-text bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent animate-fade-in group-hover:scale-105 transition-transform duration-300">
                Live Signals
              </span>
            </Link>
          </div>

          {/* Three Dots Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {user ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/login" className="cursor-pointer">Login</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/signup" className="cursor-pointer">Sign Up</Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
};

export default Header;
