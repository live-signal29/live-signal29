import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { AlertTriangle, Clock, Crown } from "lucide-react";

interface TrialExpiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TrialExpiredModal = ({ open, onOpenChange }: TrialExpiredModalProps) => {
  const navigate = useNavigate();
  const [trialEndDate, setTrialEndDate] = useState<string>("");

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
      .select("trial_end_date")
      .eq("id", user.id)
      .single();

    if (profile?.trial_end_date) {
      setTrialEndDate(format(new Date(profile.trial_end_date), "dd MMM yyyy"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Free Trial Expired
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Your 5-day free trial has ended. Upgrade to Premium to continue accessing live trading signals.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {trialEndDate && (
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Trial Ended On
                </span>
                <span className="font-semibold">{trialEndDate}</span>
              </div>
            </div>
          )}

          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-center">
            <p className="text-destructive font-semibold">
              Access to live signals has been restricted
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Upgrade now to continue receiving real-time trading opportunities
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12"
            >
              Maybe Later
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                navigate("/premium");
              }}
              className="h-12 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
            >
              <Crown className="h-5 w-5 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
