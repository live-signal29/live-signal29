import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BrokerAccountButton } from "@/components/BrokerAccountButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { Loader2 } from "lucide-react";

const FreeTrial = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trialInfo, setTrialInfo] = useState<{
    startDate: string;
    endDate: string;
    remainingDays: number;
  } | null>(null);

  useEffect(() => {
    fetchTrialInfo();
  }, []);

  const fetchTrialInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("trial_end_date, created_at")
        .eq("id", user.id)
        .single();

      if (profile) {
        const endDate = new Date(profile.trial_end_date);
        const startDate = new Date(profile.created_at);
        const remaining = differenceInDays(endDate, new Date());

        setTrialInfo({
          startDate: format(startDate, "dd MMM yyyy"),
          endDate: format(endDate, "dd MMM yyyy"),
          remainingDays: Math.max(0, remaining),
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
                Welcome to TREND IS FRIEND
              </CardTitle>
              <p className="text-muted-foreground">Your free trial details</p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {trialInfo && (
                <>
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
                      <span className="text-lg text-muted-foreground">Remaining</span>
                      <span className="text-2xl font-bold text-warning">
                        {trialInfo.remainingDays} days
                      </span>
                    </div>
                  </div>

                  <div className="bg-success/10 border border-success rounded-lg p-6 text-center">
                    <p className="text-success font-bold text-2xl">FREE TRIAL IS ACTIVE</p>
                  </div>

                  <Button
                    onClick={() => navigate("/premium")}
                    className="w-full h-14 text-xl font-semibold"
                    size="lg"
                  >
                    Take Premium Now
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <BrokerAccountButton />
      <Footer />
    </div>
  );
};

export default FreeTrial;
