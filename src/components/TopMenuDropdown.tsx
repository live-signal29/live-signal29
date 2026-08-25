import { useState } from "react";
import {
  MoreVertical,
  Share2,
  Star,
  Shield,
  LogOut,
  ChevronDown,
  Sparkles,
  Calculator,
  TrendingUp,
  Crown,
  Gift,
  User,
  Bell,
  Settings,
  TrendingDown,
  BookOpen,
  PieChart,
  Globe,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const TopMenuDropdown = () => {
  const navigate = useNavigate();

  // Sabhi categories default CLOSED (null) hain
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const toggleCategory = (cat: string) => {
    setOpenCategory((prev) => (prev === cat ? null : cat));
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-2 hover:bg-slate-800/80 rounded-xl transition-all active:scale-95 focus:outline-none">
          <MoreVertical className="h-5 w-5 text-slate-200" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-72 p-3 bg-slate-950/95 text-slate-200 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto space-y-2 select-none"
      >
        {/* ================= 1. LIVE TRADING ================= */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
          <button
            onClick={() => toggleCategory("live")}
            className="w-full flex items-center justify-between p-3 text-[11px] font-black tracking-wider text-slate-400 uppercase hover:bg-slate-800/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-slate-300">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Live Trading
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                openCategory === "live" && "rotate-180 text-emerald-400"
              )}
            />
          </button>

          {/* Sub Categories (Hidden by default) */}
          {openCategory === "live" && (
            <div className="p-1.5 space-y-1 border-t border-slate-800/60 bg-slate-950/40">
              <div
                onClick={() => navigate("/")}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-800/80 text-slate-200 transition-colors"
              >
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Live Signals
              </div>
              <div
                onClick={() => navigate("/journal")}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-800/80 text-slate-200 transition-colors"
              >
                <BookOpen className="h-4 w-4 text-cyan-400" />
                Trade Journal
              </div>
            </div>
          )}
        </div>

        {/* ================= 2. TOOLS ================= */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
          <button
            onClick={() => toggleCategory("tools")}
            className="w-full flex items-center justify-between p-3 text-[11px] font-black tracking-wider text-slate-400 uppercase hover:bg-slate-800/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-slate-300">
              <Calculator className="h-3.5 w-3.5 text-amber-400" /> Tools
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                openCategory === "tools" && "rotate-180 text-amber-400"
              )}
            />
          </button>

          {/* Sub Categories (Hidden by default) */}
          {openCategory === "tools" && (
            <div className="p-1.5 space-y-1 border-t border-slate-800/60 bg-slate-950/40">
              <div
                onClick={() => navigate("/ai-assistant")}
                className="flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-800/80 text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  AI Assistant
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-500/30">
                  NEW
                </span>
              </div>
              <div
                onClick={() => navigate("/compound-calculator")}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-800/80 text-slate-200 transition-colors"
              >
                <PieChart className="h-4 w-4 text-amber-400" />
                Compound Calculator
              </div>
            </div>
          )}
        </div>

        {/* ================= 3. PREMIUM ================= */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
          <button
            onClick={() => toggleCategory("premium")}
            className="w-full flex items-center justify-between p-3 text-[11px] font-black tracking-wider text-amber-400 uppercase hover:bg-amber-500/10 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Crown className="h-3.5 w-3.5 text-amber-400" /> Premium
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-amber-400 transition-transform duration-200",
                openCategory === "premium" && "rotate-180"
              )}
            />
          </button>

          {/* Sub Categories (Hidden by default) */}
          {openCategory === "premium" && (
            <div className="p-1.5 space-y-1 border-t border-amber-500/20 bg-slate-950/60">
              <div
                onClick={() => navigate("/premium")}
                className="flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg cursor-pointer hover:bg-amber-500/20 text-amber-300 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Crown className="h-4 w-4 text-amber-400" />
                  VIP Upgrade
                </div>
                <span className="bg-amber-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded shadow">
                  PRO
                </span>
              </div>
              <div
                onClick={() => navigate("/invite-earn")}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-800/80 text-slate-200 transition-colors"
              >
                <Gift className="h-4 w-4 text-rose-400" />
                Invite & Earn
              </div>
            </div>
          )}
        </div>

        {/* ================= 4. ACCOUNT & SETTINGS ================= */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
          <button
            onClick={() => toggleCategory("account")}
            className="w-full flex items-center justify-between p-3 text-[11px] font-black tracking-wider text-slate-400 uppercase hover:bg-slate-800/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-slate-300">
              <User className="h-3.5 w-3.5 text-blue-400" /> Account
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                openCategory === "account" && "rotate-180 text-blue-400"
              )}
            />
          </button>

          {/* Sub Categories (Hidden by default) */}
          {openCategory === "account" && (
            <div className="p-1.5 space-y-1 border-t border-slate-800/60 bg-slate-950/40">
              <div
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-800/80 text-slate-200 transition-colors"
              >
                <User className="h-4 w-4 text-blue-400" />
                My Profile
              </div>
              <div
                onClick={() => navigate("/notifications")}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-800/80 text-slate-200 transition-colors"
              >
                <Bell className="h-4 w-4 text-amber-400" />
                Notifications
              </div>
              <div
                onClick={() => navigate("/settings")}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-800/80 text-slate-200 transition-colors"
              >
                <Settings className="h-4 w-4 text-slate-400" />
                Settings
              </div>
              <div
                onClick={handleShare}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-800/80 text-slate-200 transition-colors"
              >
                <Share2 className="h-4 w-4 text-indigo-400" />
                Share Link
              </div>
              <div
                onClick={() => navigate("/privacy")}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-800/80 text-slate-200 transition-colors"
              >
                <Shield className="h-4 w-4 text-emerald-400" />
                Privacy Policy
              </div>
            </div>
          )}
        </div>

        {/* LOGOUT BUTTON - Bottom Spacing Adjusted */}
        <div className="pt-2 pb-1 px-0.5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-black text-xs rounded-xl shadow-lg shadow-rose-900/30 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Logout Account
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
