import { useState } from "react";
import {
  MoreVertical,
  Share2,
  Star,
  Shield,
  LogOut,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Calculator,
  TrendingUp,
  Crown,
  Gift,
  Users,
  User,
  Bell,
  Settings,
  Trophy,
  Grid,
  ExternalLink,
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
import { cn } from "@/lib/utils";

export const TopMenuDropdown = () => {
  const navigate = useNavigate();

  // Accordion state for expandable categories
  const [openCategory, setOpenCategory] = useState<string | null>("tools");

  const toggleCategory = (cat: string) => {
    setOpenCategory(openCategory === cat ? null : cat);
  };

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 active:scale-95 focus:outline-none">
          <MoreVertical className="h-5 w-5 text-slate-700 dark:text-slate-200" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-72 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto space-y-2 select-none"
      >
        {/* ================= TOOLS CATEGORY ================= */}
        <div className="rounded-xl border border-slate-100 dark:border-slate-800/60 overflow-hidden bg-slate-50/50 dark:bg-slate-800/20">
          <button
            onClick={() => toggleCategory("tools")}
            className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Calculator className="h-3.5 w-3.5 text-amber-500" /> Tools
            </span>
            {openCategory === "tools" ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>

          {openCategory === "tools" && (
            <div className="p-1 space-y-0.5 border-t border-slate-100 dark:border-slate-800/40">
              <DropdownMenuItem
                onClick={() => navigate("/ai-assistant")}
                className="flex items-center justify-between px-2.5 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-amber-500/10 hover:text-amber-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  AI Assistant
                </div>
                <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                  NEW
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigate("/compound-calculator")}
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-amber-500/10 hover:text-amber-600 transition-colors"
              >
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Compound Calculator
              </DropdownMenuItem>
            </div>
          )}
        </div>

        {/* ================= PREMIUM CATEGORY ================= */}
        <div className="rounded-xl border border-amber-500/20 overflow-hidden bg-amber-500/5 dark:bg-amber-500/10">
          <button
            onClick={() => toggleCategory("premium")}
            className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider hover:bg-amber-500/10 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 text-amber-500" /> Premium
            </span>
            {openCategory === "premium" ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>

          {openCategory === "premium" && (
            <div className="p-1 space-y-0.5 border-t border-amber-500/20">
              <DropdownMenuItem
                onClick={() => navigate("/premium")}
                className="flex items-center justify-between px-2.5 py-2 text-xs font-bold rounded-lg cursor-pointer hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  VIP Upgrade
                </div>
                <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                  PRO
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigate("/invite-earn")}
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-amber-500/10 transition-colors"
              >
                <Gift className="h-4 w-4 text-rose-500" />
                Invite & Earn
              </DropdownMenuItem>
            </div>
          )}
        </div>

        {/* ================= ACCOUNT & APP CATEGORY ================= */}
        <div className="rounded-xl border border-slate-100 dark:border-slate-800/60 overflow-hidden bg-slate-50/50 dark:bg-slate-800/20">
          <button
            onClick={() => toggleCategory("account")}
            className="w-full flex items-center justify-between p-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-blue-500" /> Account & App
            </span>
            {openCategory === "account" ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>

          {openCategory === "account" && (
            <div className="p-1 space-y-0.5 border-t border-slate-100 dark:border-slate-800/40">
              <DropdownMenuItem
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-blue-500/10 transition-colors"
              >
                <User className="h-4 w-4 text-blue-500" />
                My Profile
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigate("/notifications")}
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-blue-500/10 transition-colors"
              >
                <Bell className="h-4 w-4 text-amber-500" />
                Notifications
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigate("/settings")}
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-blue-500/10 transition-colors"
              >
                <Settings className="h-4 w-4 text-slate-500" />
                Settings
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleShare}
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-blue-500/10 transition-colors"
              >
                <Share2 className="h-4 w-4 text-indigo-500" />
                Share Link
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigate("/privacy")}
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-blue-500/10 transition-colors"
              >
                <Shield className="h-4 w-4 text-emerald-500" />
                Privacy Policy
              </DropdownMenuItem>
            </div>
          )}
        </div>

        {/* Separator spacing */}
        <div className="pt-2 pb-1">
          <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* ================= LOGOUT BUTTON (FIXED FOR MOBILE TAP) ================= */}
        <div className="pt-1 pb-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-500/25 transition-all duration-150 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Logout Account
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
