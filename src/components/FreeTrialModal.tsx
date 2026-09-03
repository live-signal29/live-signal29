import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { Loader2 } from "lucide-react";

interface FreeTrialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FreeTrialModal = ({ open, onOpenChange }: FreeTrialModalProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trialInfo, setTrialInfo] = useState<{
    startDate: string;
    endDate: string;
    remainingDays: number;
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    if (open) {
      fetchTrialInfo();
    }
  }, [open]);

  const fetchTrialInfo = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("trial_end_date, created_at, subscription_status")
        .eq("id", user.id)
        .single();

      if (profile) {
        const endDate = profile.trial_end_date ? new Date(profile.trial_end_date) : new Date();
        const startDate = profile.created_at ? new Date(profile.created_at) : new Date();
        const today = new Date();
        const remaining = differenceInDays(endDate, today);
        
        // Agar status premium nahi hai aur trial date guzar gayi hai toh Expired hai
        const isExpired = profile.subscription_status !== "premium" && (today > endDate || remaining <= 0);

        setTrialInfo({
          startDate: format(startDate, "dd MMM yyyy"),
          endDate: format(endDate, "dd MMM yyyy"),
          remainingDays: Math.max(0, remaining),
          isExpired,
        });
      }
    } catch (err) {
      console.error("Error fetching trial info:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    onOpenChange(false);
    navigate("/premium");
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(val) => {
        // Expiry par modal ko close mat hone do
        if (trialInfo?.isExpired) return;
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-md [&>button]:hidden z-[100] bg-background border-border">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Checking Subscription Status...</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl text-center font-black text-primary">
                {trialInfo?.isExpired ? "Free Trial Expired" : "Welcome to TREND IS FRIEND"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {trialInfo && (
                <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Started On</span>
                    <span className="font-semibold">{trialInfo.startDate}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Valid Till</span>
                    <span className="font-semibold">{trialInfo.endDate}</span>
                  </div>
                  {!trialInfo.isExpired && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Remaining</span>
                      <span className="font-bold text-amber-500">{trialInfo.remainingDays} days</span>
                    </div>
                  )}
                </div>
              )}

              {trialInfo?.isExpired ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center space-y-1">
                  <p className="text-destructive font-black text-base">YOUR TRIAL HAS EXPIRED</p>
                  <p className="text-xs text-muted-foreground">Upgrade to Premium to continue accessing live signals.</p>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
                  <p className="text-emerald-500 font-bold text-base">FREE TRIAL IS ACTIVE</p>
                </div>
              )}

              <Button
                onClick={handleAction}
                className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                {trialInfo?.isExpired ? "Upgrade to Premium Now" : "Take Premium Now"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FreeTrialModal;
