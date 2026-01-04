import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import { Loader2, Clock, CheckCircle, AlertTriangle } from "lucide-react";

const FreeTrial = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trialInfo, setTrialInfo] = useState<{
    startDate: string;
    endDate: string;
    remainingDays: number;
    remainingHours: number;
    remainingMinutes: number;
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    fetchTrialInfo();
  }, []);

  // Live countdown update
  useEffect(() => {
    if (!trialInfo || trialInfo.isExpired) return;

    const interval = setInterval(() => {
      fetchTrialInfo();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [trialInfo]);

  const fetchTrialInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("trial_end_date, created_at, subscription_status")
        .eq("id", user.id)
        .single();

      if (profile) {
        const endDate = new Date(profile.trial_end_date);
        const startDate = new Date(profile.created_at);
        const now = new Date();
        const isExpired = now > endDate;

        const remainingDays = Math.max(0, differenceInDays(endDate, now));
        const remainingHours = Math.max(0, differenceInHours(endDate, now) % 24);
        const remainingMinutes = Math.max(0, differenceInMinutes(endDate, now) % 60);

        setTrialInfo({
          startDate: format(startDate, "dd MMM yyyy"),
          endDate: format(endDate, "dd MMM yyyy"),
          remainingDays,
          remainingHours,
          remainingMinutes,
          isExpired,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-primary">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-primary mb-2">
                {trialInfo?.isExpired ? "Trial Expired 🔒" : "Welcome to TREND IS FRIEND"}
              </CardTitle>
              <p className="text-muted-foreground">Your free trial details</p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {trialInfo && (
                <>
                  {/* Live Countdown */}
                  {!trialInfo.isExpired && (
                    <div className="bg-primary/10 border border-primary rounded-lg p-6 text-center">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Clock className="h-5 w-5 text-primary" />
                        <span className="text-lg font-semibold text-primary">Trial ends in:</span>
                      </div>
                      <div className="flex justify-center gap-4">
                        <div className="bg-background rounded-lg p-4 min-w-[80px] shadow-sm">
                          <span className="text-3xl font-bold text-primary">{trialInfo.remainingDays}</span>
                          <p className="text-xs text-muted-foreground mt-1">Days</p>
                        </div>
                        <div className="bg-background rounded-lg p-4 min-w-[80px] shadow-sm">
                          <span className="text-3xl font-bold text-primary">{trialInfo.remainingHours}</span>
                          <p className="text-xs text-muted-foreground mt-1">Hours</p>
                        </div>
                        <div className="bg-background rounded-lg p-4 min-w-[80px] shadow-sm">
                          <span className="text-3xl font-bold text-primary">{trialInfo.remainingMinutes}</span>
                          <p className="text-xs text-muted-foreground mt-1">Minutes</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trial Details */}
                  <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-lg text-muted-foreground">Started On</span>
                      <span className="text-xl font-semibold">{trialInfo.startDate}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-lg text-muted-foreground">Valid Till</span>
                      <span className="text-xl font-semibold">{trialInfo.endDate}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-lg text-muted-foreground">Status</span>
                      {trialInfo.isExpired ? (
                        <span className="flex items-center gap-2 text-destructive font-bold">
                          <AlertTriangle className="h-5 w-5" />
                          Expired
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-success font-bold">
                          <CheckCircle className="h-5 w-5" />
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Banner */}
                  {trialInfo.isExpired ? (
                    <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
                      <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                      <p className="text-destructive font-bold text-xl">FREE TRIAL EXPIRED</p>
                      <p className="text-muted-foreground mt-2 text-sm">
                        Upgrade to premium to continue receiving live trading signals.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-success/10 border border-success rounded-lg p-6 text-center">
                      <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
                      <p className="text-success font-bold text-2xl">FREE TRIAL IS ACTIVE</p>
                    </div>
                  )}

                  <Button
                    onClick={() => navigate("/premium")}
                    className="w-full h-14 text-xl font-semibold"
                    size="lg"
                  >
                    {trialInfo.isExpired ? "Upgrade to Premium" : "Take Premium Now"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FreeTrial;
