import React, { useState } from "react";
import {
  ChevronDown,
  TrendingUp,
  BookOpen,
  Award,
  Newspaper,
  Calendar,
  GraduationCap,
  History,
  Sparkles,
  Calculator,
  PieChart,
  Bell,
  Crown,
  Gift,
  Globe,
  LogOut,
  User,
  Settings,
  Shield,
  Share2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SideDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const navigate = useNavigate();

  // Sabhi sub-categories default HIDDEN (null) hain
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggleCategory = (catName: string) => {
    setExpandedCategory((prev) => (prev === catName ? null : catName));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div className="relative w-[280px] h-full bg-[#0d131d] text-slate-200 flex flex-col justify-between p-4 shadow-2xl border-r border-slate-800/60 z-10 overflow-y-auto">
        
        {/* Top App Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-xs">
                TF
              </div>
              <div>
                <h3 className="text-xs font-black tracking-wider uppercase text-white">TREND IS FRIEND</h3>
                <p className="text-[10px] text-slate-400">Live Signals</p>
              </div>
            </div>
          </div>

          {/* Accordion List Categories */}
          <div className="space-y-2">

            {/* 1. LIVE TRADING */}
            <div className="border border-slate-800/60 rounded-xl overflow-hidden bg-slate-900/40">
              <button
                onClick={() => toggleCategory("live")}
                className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase hover:bg-slate-800/50 transition-all"
              >
                <span className="flex items-center gap-2 text-slate-300">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> LIVE TRADING
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedCategory === "live" ? "rotate-180 text-emerald-400" : ""}`} />
              </button>
              
              {expandedCategory === "live" && (
                <div className="px-2 py-1.5 space-y-1 bg-slate-950/70 border-t border-slate-800/60">
                  <div onClick={() => handleNavigation("/")} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer">
                    <TrendingUp className="w-4 h-4 text-emerald-400" /> Live Signals
                  </div>
                  <div onClick={() => handleNavigation("/portfolio")} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer">
                    <PieChart className="w-4 h-4 text-cyan-400" /> Portfolio
                  </div>
                  <div onClick={() => handleNavigation("/trade-journal")} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer">
                    <BookOpen className="w-4 h-4 text-amber-400" /> Trade Journal
                  </div>
                  <div onClick={() => handleNavigation("/results")} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer">
                    <Award className="w-4 h-4 text-purple-400" /> Results
                  </div>
                </div>
              )}
            </div>

            {/* 2. LEARN & ANALYZE */}
            <div className="border border-slate-800/60 rounded-xl overflow-hidden bg-slate-900/40">
              <button
                onClick={() => toggleCategory("learn")}
                className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase hover:bg-slate-800/50 transition-all"
              >
                <span className="flex items-center gap-2 text-slate-300">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" /> LEARN & ANALYZE
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedCategory === "learn" ? "rotate-180 text-blue-400" : ""}`} />
              </button>

              {expandedCategory === "learn" && (
                <div className="px-2 py-1.5 space-y-1 bg-slate-950/70 border-t border-slate-800/60">
                  <div onClick={() => handleNavigation("/market-brief")} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer">
                    <Newspaper className="w-4 h-4 text-blue-400" /> Daily Market Brief
                  </div>
                  <div onClick={() => handleNavigation("/calendar")} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer">
                    <Calendar className="w-4 h-4 text-indigo-400" /> Economic Calendar
                  </div>
                  <div onClick={() => handleNavigation("/academy")} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer">
                    <GraduationCap className="w-4 h-4 text-teal-400" /> Trading Academy
                  </div>
                  <div onClick={() => handleNavigation("/backtesting")} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer">
                    <History className="w-4 h-4 text-rose-400" /> Backtesting
                  </div>
                </div>
              )}
            </div>

            {/* 3. TOOLS */}
            <div className="border border-slate-800/60 rounded-xl overflow-hidden bg-slate-900/40">
              <button
                onClick={() => toggleCategory("tools")}
                className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase hover:bg-slate-800/50 transition-all"
              >
                <span className="flex items-center gap-2 text-slate-300">
                  <Calculator className="w-3.5 h-3.5 text-amber-400" /> TOOLS
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedCategory === "tools" ? "rotate-180 text-amber-400" : ""}`} />
              </button>

              {expandedCategory === "tools" && (
                <div className="px-2 py-1.5 space-y-1 bg-slate-950/70 border-t border-slate-800/60">
                  <div onClick={() => handleNavigation("/ai-assistant")} className="flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-purple-400" /> AI Assistant
                    </div>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black border border-emerald-500/30">NEW</span>
                  </div>
                  <div onClick={() => handleNavigation("/risk-calculator")} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer">
                    <Calculator className="w-4 h-4 text-cyan-400" /> Risk Calculator
                  </div>
                  <div onClick={() => handleNavigation("/compound-calculator")} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer">
                    <TrendingUp className="w-4 h-4 text-emerald-400" /> Compound Calculator
                  </div>
                  <div onClick={() => handleNavigation("/price-alerts")} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer">
                    <Bell className="w-4 h-4 text-amber-400" /> Price Alerts
                  </div>
                </div>
              )}
            </div>

            {/* 4. PREMIUM */}
            <div className="border border-amber-500/30 rounded-xl overflow-hidden bg-amber-500/5">
              <button
                onClick={() => toggleCategory("premium")}
                className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold tracking-wider text-amber-400 uppercase hover:bg-amber-500/10 transition-all"
              >
                <span className="flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5 text-amber-400" /> PREMIUM
                </span>
                <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform duration-200 ${expandedCategory === "premium" ? "rotate-180" : ""}`} />
              </button>

              {expandedCategory === "premium" && (
                <div className="px-2 py-1.5 space-y-1 bg-slate-950/70 border-t border-amber-500/20">
                  <div onClick={() => handleNavigation("/premium")} className="flex items-center justify-between px-3 py-2 text-xs text-amber-300 hover:text-amber-200 rounded-lg hover:bg-amber-500/10 cursor-pointer font-bold">
                    <div className="flex items-center gap-2.5">
                      <Crown className="w-4 h-4 text-amber-400" /> VIP Upgrade
                    </div>
                    <span className="text-[9px] bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-black">PRO</span>
                  </div>
                  <div onClick={() => handleNavigation("/invite-earn")} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer">
                    <Gift className="w-4 h-4 text-rose-400" /> Invite & Earn
                  </div>
                </div>
              )}
            </div>

            {/* 5. ACCOUNT */}
            <div className="border border-slate-800/60 rounded-xl overflow-hidden bg-slate-900/40">
              <button
                onClick={() => toggleCategory("account")}
                className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase hover:bg-slate-800/50 transition-all"
              >
                <span className="flex items-center gap-2 text-slate-300">
                  <User className="w-3.5 h-3.5 text-cyan-400" /> ACCOUNT
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedCategory === "account" ? "rotate-180 text-cyan-400" : ""}`} />
              </button>

              {expandedCategory === "account" && (
                <div className="px-2 py-1.5 space-y-1 bg-slate-950/70 border-t border-slate-800/60">
                  <div onClick={() => handleNavigation("/profile")} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer">
                    <User className="w-4 h-4 text-blue-400" /> My Profile
                  </div>
                  <div onClick={() => handleNavigation("/settings")} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer">
                    <Settings className="w-4 h-4 text-slate-400" /> Settings
                  </div>
                  <div onClick={() => handleNavigation("/privacy")} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/60 cursor-pointer">
                    <Shield className="w-4 h-4 text-emerald-400" /> Privacy Policy
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer: Bottom Controls Fix (Gesture bar Safe Zone) */}
        <div className="pt-4 mt-auto border-t border-slate-800/60 space-y-3 pb-8">
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Globe className="w-4 h-4" />
              <span>English</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-950/50 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Account</span>
          </button>
        </div>

      </div>
    </div>
  );
};
