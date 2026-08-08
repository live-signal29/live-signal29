import { MoreVertical, Share2, Star, Shield, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const TopMenuDropdown = () => {
  const navigate = useNavigate();

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
  };

  const handleRateUs = () => {
    toast.success("Thank you for your interest! Rating feature coming soon.");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/50 backdrop-blur-sm border border-border/50 hover:border-border hover:bg-background/80 transition-all duration-300 shadow-sm hover:shadow-md">
          <MoreVertical className="h-4 w-4 text-foreground/70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-[150px] rounded-xl bg-background/80 backdrop-blur-xl border border-border/50 shadow-xl shadow-black/5 p-1.5"
        sideOffset={8}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuItem onClick={handleShare} className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[12px] transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:scale-[1.02]">
          <Share2 className="mr-2 h-3.5 w-3.5" /> Share Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleRateUs} className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[12px] transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:scale-[1.02]">
          <Star className="mr-2 h-3.5 w-3.5" /> Rate Us
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/privacy")} className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[12px] transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:scale-[1.02]">
          <Shield className="mr-2 h-3.5 w-3.5" /> Privacy Policy
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/30 mx-1 my-1" />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[12px] text-destructive transition-all duration-200 hover:bg-destructive/10 hover:text-destructive hover:scale-[1.02]">
          <LogOut className="mr-2 h-3.5 w-3.5" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
