import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  PieChart,
  BookOpen,
  Award,
  Newspaper,
  Calendar,
  GraduationCap,
  History,
  Sparkles,
  Calculator,
  LineChart,
  Bell,
  Crown,
  Gift,
  Users,
  User,
  Settings,
  Grid,
  Globe,
  LogOut,
  Sun,
  Moon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SideDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const navigate = useNavigate();
  
  // Sabhi sub-categories default HIDDEN (null) hain
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const toggleCategory = (cat: string) => {
    setOpenCategory((prev) => (prev === cat ? null : cat));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const handleNav = (path: string) => {
    navigate(path);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Drawer Body - Exact Light Theme Matching Your App */}
      <div className="relative w-[280px] h-full bg-[#f8fafc] dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 flex flex-col justify-between p-4 shadow-2xl z-10 overflow-y-auto font-sans">
        
        <div>
          {/* Top Logo & Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-cyan-500/20">
                TF
              </div>
              <div>
                <h3 className="text-xs font-black tracking-tight text-emerald-500 uppercase">TREND IS FRIEND</h3>
                <p className="text-[10px] text-slate-400 font-medium">Live Signals</p>
              </div>
            </div>
          </div>

          {/* Navigation Links List */}
          <div className="mt-4 space-y-1">

            {/* LIVE TRADING */}
            <div>
              <button
                onClick={() => toggleCategory("live")}
                className="w-full flex items-center justify-between py-2.5 px-2 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <span>LIVE TRADING</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openCategory === "live" ? "rotate-180 text-emerald-500" : ""}`} />
              </button>
              
              {openCategory === "live" && (
                <div className="pl-2 space-y-1 my-1">
                  <div onClick={() => handleNav("/")} className="flex items-center gap-3 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Live Signals
                  </div>
                  <div onClick={() => handleNav("/portfolio")} className="flex items-center gap-3 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <PieChart className="w-4 h-4 text-cyan-500" /> Portfolio
                  </div>
                  <div onClick={() => handleNav("/trade-journal")} className="flex items-center gap-3 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <BookOpen className="w-4 h-4 text-amber-500" /> Trade Journal
                  </div>
                  <div onClick={() => handleNav("/results")} className="flex items-center gap-3 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <Award className="w-4 h-4 text-purple-500" /> Results
                  </div>
                </div>
              )}
            </div>

            {/* LEARN & ANALYZE */}
            <div>
              <button
                onClick={() => toggleCategory("learn")}
                className="w-full flex items-center justify-between py-2.5 px-2 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <span>LEARN & ANALYZE</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openCategory === "learn" ? "rotate-180 text-emerald-500" : ""}`} />
              </button>

              {openCategory === "learn" && (
                <div className="pl-2 space-y-1 my-1">
                  <div onClick={() => handleNav("/market-brief")} className="flex items-center gap-3 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <Newspaper className="w-4 h-4 text-blue-500" /> Daily Market Brief
                  </div>
                  <div onClick={() => handleNav("/calendar")} className="flex items-center gap-3 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <Calendar className="w-4 h-4 text-indigo-500" /> Economic Calendar
                  </div>
                  <div onClick={() => handleNav("/academy")} className="flex items-center gap-3 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <GraduationCap className="w-4 h-4 text-teal-500" /> Trading Academy
                  </div>
                  <div onClick={() => handleNav("/backtesting")} className="flex items-center gap-3 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <History className="w-4 h-4 text-rose-500" /> Backtesting
                  </div>
                </div>
              )}
            </div>

            {/* TOOLS */}
            <div>
              <button
                onClick={() => toggleCategory("tools")}
                className="w-full flex items-center justify-between py-2.5 px-2 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <span>TOOLS</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openCategory === "tools" ? "rotate-180 text-emerald-500" : ""}`} />
              </button>

              {openCategory === "tools" && (
                <div className="pl-2 space-y-1 my-1">
                  <div onClick={() => handleNav("/ai-assistant")} className="flex items-center justify-between py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-purple-500" /> AI Assistant
                    </div>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-600 font-extrabold px-1.5 py-0.5 rounded">NEW</span>
                  </div>
                  <div onClick={() => handleNav("/risk-calculator")} className="flex items-center gap-3 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <Calculator className="w-4 h-4 text-cyan-500" /> Risk Calculator
                  </div>
                  <div onClick={() => handleNav("/compound-calculator")} className="flex items-center gap-3 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <LineChart className="w-4 h-4 text-emerald-500" /> Compound Calculator
                  </div>
                  <div onClick={() => handleNav("/price-alerts")} className="flex items-center gap-3 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <Bell className="w-4 h-4 text-amber-500" /> Price Alerts
                  </div>
                </div>
              )}
            </div>

            {/* PREMIUM */}
            <div>
              <button
                onClick={() => toggleCategory("premium")}
                className="w-full flex items-center justify-between py-2.5 px-2 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <span>PREMIUM</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openCategory === "premium" ? "rotate-180 text-amber-500" : ""}`} />
              </button>

              {openCategory === "premium" && (
                <div className="pl-2 space-y-1 my-1">
                  <div onClick={() => handleNav("/premium")} className="flex items-center justify-between py-2 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-amber-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Crown className="w-4 h-4 text-amber-500" /> Premium
                    </div>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-600 font-extrabold px-1.5 py-0.5 rounded">PRO</span>
                  </div>
                  <div onClick={() => handleNav("/gift-premium")} className="flex items-center gap-3 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <Gift className="w-4 h-4 text-rose-500" /> Gift Premium
                  </div>
                  <div onClick={() => handleNav("/invite-earn")} className="flex items-center gap-3 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <Users className="w-4 h-4 text-orange-500" /> Invite & Earn
                  </div>
                </div>
              )}
            </div>

            {/* ACCOUNT */}
            <div>
              <button
                onClick={() => toggleCategory("account")}
                className="w-full flex items-center justify-between py-2.5 px-2 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <span>ACCOUNT</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openCategory === "account" ? "rotate-180 text-emerald-500" : ""}`} />
              </button>

              {openCategory === "account" && (
                <div className="pl-2 space-y-1 my-1">
                  <div onClick={() => handleNav("/profile")} className="flex items-center gap-3 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <User className="w-4 h-4 text-emerald-500" /> My Profile
                  </div>
                  <div onClick={() => handleNav("/settings")} className="flex items-center gap-3 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <Settings className="w-4 h-4 text-slate-500" /> Settings
                  </div>
                </div>
              )}
            </div>

            {/* OTHER */}
            <div>
              <button
                onClick={() => toggleCategory("other")}
                className="w-full flex items-center justify-between py-2.5 px-2 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <span>OTHER</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openCategory === "other" ? "rotate-180 text-emerald-500" : ""}`} />
              </button>

              {openCategory === "other" && (
                <div className="pl-2 space-y-1 my-1">
                  <div onClick={() => handleNav("/other-apps")} className="flex items-center gap-3 py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-500 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/80 cursor-pointer">
                    <Grid className="w-4 h-4 text-slate-500" /> Other Apps
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Bottom Drawer Fixed Section (Language & Pink Logout Button) */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 mb-6">
          <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-4 py-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
              <Globe className="w-4 h-4" />
              <span>English</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Original Pink Pill Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#f43f5e] hover:bg-[#e11d48] text-white font-bold text-xs rounded-full shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

      </div>
    </div>
  );
};
