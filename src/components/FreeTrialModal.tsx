import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { AlertTriangle, CheckCircle } from "lucide-react";

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
      .select("trial_end_date, created_at")
      .eq("id", user.id)
      .single();

    if (profile) {
      const endDate = new Date(profile.trial_end_date);
      const startDate = new Date(profile.created_at);
      const remaining = differenceInDays(endDate, new Date());
      const expired = remaining <= 0;

      setTrialInfo({
        startDate: format(startDate, "dd MMM yyyy"),
        endDate: format(endDate, "dd MMM yyyy"),
        remainingDays: Math.max(0, remaining),
        isExpired: expired,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center font-bold text-primary">
            {trialInfo?.isExpired ? "Trial Expired" : "Welcome to TREND IS FRIEND"}
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
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Remaining</span>
                <span className={`font-bold ${trialInfo.isExpired ? "text-destructive" : "text-warning"}`}>
                  {trialInfo.isExpired ? "Expired" : `${trialInfo.remainingDays} days`}
                </span>
              </div>
            </div>

            {trialInfo.isExpired ? (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-destructive font-bold text-lg">FREE TRIAL EXPIRED</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upgrade to premium to continue receiving signals
                </p>
              </div>
            ) : (
              <div className="bg-success/10 border border-success rounded-lg p-4 text-center">
                <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
                <p className="text-success font-bold text-lg">FREE TRIAL IS ACTIVE</p>
              </div>
            )}

            <Button
              onClick={() => {
                onOpenChange(false);
                navigate("/premium");
              }}
              className="w-full h-12 text-lg font-semibold"
              size="lg"
            >
              {trialInfo.isExpired ? "Upgrade to Premium" : "Take Premium Now"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
