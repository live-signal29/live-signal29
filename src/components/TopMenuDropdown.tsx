import {
  MoreVertical,
  Share2,
  Star,
  Shield,
  LogOut,
} from "lucide-react";

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

export const TopMenuDrawer = () => {
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
    toast.success(
      "Thank you for your interest! Rating feature coming soon."
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="
            flex h-7 w-7 shrink-0
            items-center justify-center
            rounded-full
            border border-border/40
            bg-background/60
            backdrop-blur-md
            shadow-sm
            transition-colors
            hover:bg-background
            hover:border-border/70
            focus:outline-none
          "
        >
          <MoreVertical className="h-3.5 w-3.5 text-foreground/70" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={5}
        className="
          w-[128px]
          min-w-0
          rounded-lg
          border border-border/40
          bg-background/95
          p-1
          shadow-lg
          backdrop-blur-xl
        "
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenuItem
          onClick={handleShare}
          className="
            h-6 min-h-0
            cursor-pointer
            rounded-md
            px-2 py-0
            text-[10px]
            leading-none
            gap-0
            focus:bg-primary/10
            focus:text-primary
          "
        >
          <Share2 className="mr-1.5 h-3 w-3 shrink-0" />
          <span>Share</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleRateUs}
          className="
            h-6 min-h-0
            cursor-pointer
            rounded-md
            px-2 py-0
            text-[10px]
            leading-none
            gap-0
            focus:bg-primary/10
            focus:text-primary
          "
        >
          <Star className="mr-1.5 h-3 w-3 shrink-0" />
          <span>Rate Us</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate("/privacy")}
          className="
            h-6 min-h-0
            cursor-pointer
            rounded-md
            px-2 py-0
            text-[10px]
            leading-none
            gap-0
            focus:bg-primary/10
            focus:text-primary
          "
        >
          <Shield className="mr-1.5 h-3 w-3 shrink-0" />
          <span>Privacy</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="mx-1 my-1 h-px bg-border/30" />

        <DropdownMenuItem
          onClick={handleLogout}
          className="
            h-6 min-h-0
            cursor-pointer
            rounded-md
            px-2 py-0
            text-[10px]
            leading-none
            gap-0
            text-destructive
            focus:bg-destructive/10
            focus:text-destructive
          "
        >
          <LogOut className="mr-1.5 h-3 w-3 shrink-0" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
