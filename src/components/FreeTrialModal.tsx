import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";

interface FreeTrialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FreeTrialModal = ({ open, onOpenChange }: FreeTrialModalProps) => {
  const navigate = useNavigate();
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("trial_end_date, created_at, subscription_status")
      .eq("id", user.id)
      .single();

    if (profile) {
      const endDate = new Date(profile.trial_end_date);
      const startDate = new Date(profile.created_at);
      const today = new Date();
      const remaining = differenceInDays(endDate, today);
      const isExpired = today > endDate && profile.subscription_status !== "premium";

      setTrialInfo({
        startDate: format(startDate, "dd MMM yyyy"),
        endDate: format(endDate, "dd MMM yyyy"),
        remainingDays: Math.max(0, remaining),
        isExpired,
      });
    }
  };

  const handleAction = () => {
    onOpenChange(false);
    navigate("/premium");
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (trialInfo?.isExpired) return;
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center font-bold text-primary">
            {trialInfo?.isExpired ? "Free Trial Expired" : "Welcome to TREND IS FRIEND"}
          </DialogTitle>
        </DialogHeader>
        
        {trialInfo && (
          <div className="space-y-4 py-4">
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Started On</span>
                <span className="font-semibold">{trialInfo.startDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valid Till</span>
                <span className="font-semibold">{trialInfo.endDate}</span>
              </div>
              {!trialInfo.isExpired && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Remaining</span>
                  <span className="font-bold text-warning">{trialInfo.remainingDays} days</span>
                </div>
              )}
            </div>

            {trialInfo.isExpired ? (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-center space-y-1">
                <p className="text-destructive font-bold text-lg">YOUR TRIAL HAS EXPIRED</p>
                <p className="text-xs text-muted-foreground">Upgrade to Premium to continue accessing live signals.</p>
              </div>
            ) : (
              <div className="bg-success/10 border border-success rounded-lg p-4 text-center">
                <p className="text-success font-bold text-lg">FREE TRIAL IS ACTIVE</p>
              </div>
            )}

            <Button
              onClick={handleAction}
              className="w-full h-12 text-lg font-semibold"
              size="lg"
              variant={trialInfo.isExpired ? "default" : "secondary"}
            >
              {trialInfo.isExpired ? "OK - Upgrade to Premium" : "Take Premium Now"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
