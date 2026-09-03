import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Zap, CheckCircle2, Crown, Loader2 } from "lucide-react";

interface FreeTrialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FreeTrialModal = ({ open, onOpenChange }: FreeTrialModalProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (open) {
      checkTrialStatus();
    }
  }, [open]);

  const checkTrialStatus = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("trial_end_date, subscription_status")
        .eq("id", user.id)
        .single();

      if (profile) {
        const endDate = profile.trial_end_date ? new Date(profile.trial_end_date) : new Date(0);
        const today = new Date();
        const expired = profile.subscription_status !== "premium" && today > endDate;
        setIsExpired(expired);
      }
    } catch (err) {
      console.error("Trial status check error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/premium");
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(val) => {
        // Stop closing modal when trial is expired
        if (isExpired) return;
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-md [&>button]:hidden z-[100] p-0 overflow-hidden border-0 bg-slate-950 text-white shadow-2xl rounded-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
            <p className="text-xs text-slate-400 font-medium">Verifying Account Status...</p>
          </div>
        ) : (
          <div className="relative p-6 sm:p-8 bg-gradient-to-b from-slate-900 via-slate-950 to-black text-center space-y-6">
            
            {/* Top Glowing Lock Badge */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
              <div className="p-3 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-full text-slate-950 shadow-md">
                <Crown className="w-8 h-8 fill-slate-950" />
              </div>
            </div>

            {/* Main Heading & Punchy Description */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5" /> Access Restricted
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Your Free Trial Has Expired!
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
                Live trading signals, TP/SL targets, and market updates are now locked.
              </p>
            </div>

            {/* Impressive Feature Benefits */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-left space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant High-Accuracy VIP Signals (XAUUSD & Forex)</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Real-Time Entry, Take Profit & Stop Loss Alerts</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Full Access to MT5 Auto Copier & Analysis</span>
              </div>
            </div>

            {/* High-Converting CTA Button */}
            <div className="pt-2">
              <Button
                onClick={handleUpgrade}
                size="lg"
                className="w-full h-13 text-base font-black bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] rounded-xl flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5 fill-slate-950" />
                Unlock Premium Access Now
              </Button>
              <p className="text-[11px] text-slate-500 mt-2.5">
                Join our VIP members trading with high accuracy today.
              </p>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FreeTrialModal;
