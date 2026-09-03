import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2, Clock, CheckCircle, AlertTriangle } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const FreeTrial = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);
  const [trialStartDate, setTrialStartDate] = useState<string>("");
  const [trialEndDateFormatted, setTrialEndDateFormatted] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    fetchTrialInfo();
  }, []);

  // Live countdown update every second
  useEffect(() => {
    if (!trialEndDate || isPremium) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = trialEndDate.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
        setIsExpired(false);
      } else {
        setTimeLeft(null);
        setIsExpired(true);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [trialEndDate, isPremium]);

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
        // Check if user is premium
        if (profile.subscription_status === 'premium') {
          setIsPremium(true);
        } else {
          const endDate = new Date(profile.trial_end_date);
          const startDate = new Date(profile.created_at);
          
          setTrialEndDate(endDate);
          setTrialStartDate(format(startDate, "dd MMM yyyy"));
          setTrialEndDateFormatted(format(endDate, "dd MMM yyyy"));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Premium user view
  if (isPremium) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-primary">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-primary mb-2">
                  You are already Premium ⭐
                </CardTitle>
                <p className="text-muted-foreground">Enjoy unlimited access to all signals</p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="bg-success/10 border border-success rounded-lg p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
                  <p className="text-success font-bold text-2xl">PREMIUM MEMBER</p>
                  <p className="text-muted-foreground mt-2">
                    You have full access to all premium signals and features.
                  </p>
                </div>
                
                <Button
                  onClick={() => navigate("/signals")}
                  className="w-full h-14 text-xl font-semibold"
                  size="lg"
                >
                  View Live Signals
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
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
                {isExpired ? "Trial Expired 🔒" : "Welcome to TREND IS FRIEND"}
              </CardTitle>
              <p className="text-muted-foreground">Your free trial details</p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {trialEndDate && (
                <>
                  {/* Live Countdown */}
                  {!isExpired && timeLeft && (
                    <div className="bg-primary/10 border border-primary rounded-lg p-6 text-center">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Clock className="h-5 w-5 text-primary animate-pulse" />
                        <span className="text-lg font-semibold text-primary">Trial ends in:</span>
                      </div>
                      <div className="flex justify-center gap-3">
                        <div className="bg-background rounded-lg p-3 min-w-[70px] shadow-sm">
                          <span className="text-2xl font-bold text-primary">{pad(timeLeft.days)}</span>
                          <p className="text-xs text-muted-foreground mt-1">Days</p>
                        </div>
                        <div className="bg-background rounded-lg p-3 min-w-[70px] shadow-sm">
                          <span className="text-2xl font-bold text-primary">{pad(timeLeft.hours)}</span>
                          <p className="text-xs text-muted-foreground mt-1">Hours</p>
                        </div>
                        <div className="bg-background rounded-lg p-3 min-w-[70px] shadow-sm">
                          <span className="text-2xl font-bold text-primary">{pad(timeLeft.minutes)}</span>
                          <p className="text-xs text-muted-foreground mt-1">Mins</p>
                        </div>
                        <div className="bg-background rounded-lg p-3 min-w-[70px] shadow-sm">
                          <span className="text-2xl font-bold text-primary">{pad(timeLeft.seconds)}</span>
                          <p className="text-xs text-muted-foreground mt-1">Secs</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trial Details */}
                  <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-lg text-muted-foreground">Started On</span>
                      <span className="text-xl font-semibold">{trialStartDate}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b">
                      <span className="text-lg text-muted-foreground">Valid Till</span>
                      <span className="text-xl font-semibold">{trialEndDateFormatted}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-lg text-muted-foreground">Status</span>
                      {isExpired ? (
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
                  {isExpired ? (
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
                    {isExpired ? "Upgrade to Premium" : "Take Premium Now"}
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
