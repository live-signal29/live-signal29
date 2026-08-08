import { MoreVertical, Share2, Star, Shield, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const TopMenuDropdown = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "TREND IS FRIEND - Live Trading Signals",
        text: "Check out the best trading signals platform!",
        url: window.location.origin,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.origin);
      toast.success("Link copied to clipboard!");
    }
    setIsOpen(false);
  };

  const handleRateUs = () => {
    toast.success("Thank you for your interest! Rating feature coming soon.");
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login");
    setIsOpen(false);
  };

  // Custom Logic: Click Outside to close, but SCROLL DOES NOT CLOSE IT
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      {/* Small Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/50 backdrop-blur-sm border border-border/50 hover:border-border hover:bg-background/80 transition-all duration-300 shadow-sm hover:shadow-md"
      >
        <MoreVertical className="h-4 w-4 text-foreground/70" />
      </button>

      {/* Premium Dropdown Menu (Will NOT close on scroll) */}
      <div
        ref={dropdownRef}
        className={cn(
          "absolute right-0 top-10 z-[999] w-[150px] rounded-xl bg-background/80 backdrop-blur-xl border border-border/50 shadow-xl shadow-black/5 p-1.5 transition-all duration-300 origin-top-right",
          isOpen
            ? "opacity-100 scale-100 translate-y-0 visible"
            : "opacity-0 scale-95 -translate-y-2 invisible pointer-events-none"
        )}
      >
        <button
          onClick={handleShare}
          className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-[12px] transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:scale-[1.02] text-left"
        >
          <Share2 className="mr-2 h-3.5 w-3.5" />
          <span>Share Link</span>
        </button>

        <button
          onClick={handleRateUs}
          className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-[12px] transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:scale-[1.02] text-left"
        >
          <Star className="mr-2 h-3.5 w-3.5" />
          <span>Rate Us</span>
        </button>

        <button
          onClick={() => {
            navigate("/privacy");
            setIsOpen(false);
          }}
          className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-[12px] transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:scale-[1.02] text-left"
        >
          <Shield className="mr-2 h-3.5 w-3.5" />
          <span>Privacy Policy</span>
        </button>

        <div className="bg-border/30 mx-1 my-1 h-[1px]" />

        <button
          onClick={handleLogout}
          className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-[12px] text-destructive transition-all duration-200 hover:bg-destructive/10 hover:text-destructive hover:scale-[1.02] text-left"
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
