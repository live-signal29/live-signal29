import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, TrendingUp, Bell, Shield } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const Onboarding = () => {
  const [showTrialPopup, setShowTrialPopup] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
    }
  };

  const handleGetStarted = () => {
    setShowTrialPopup(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-accent/20">
      <Dialog open={showTrialPopup} onOpenChange={setShowTrialPopup}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center space-y-4 py-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-success to-warning rounded-full flex items-center justify-center animate-float">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold gradient-text">
              🎉 Congratulations!
            </h2>
            
            <div className="space-y-2">
              <p className="text-lg font-semibold">
                You got <span className="text-success">8 days FREE TRIAL</span>
              </p>
              <p className="text-muted-foreground">
                of our premium trading signals service!
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3 text-left">
                <TrendingUp className="h-5 w-5 text-success flex-shrink-0" />
                <p className="text-sm">Access to premium trading signals</p>
              </div>
              <div className="flex items-center gap-3 text-left">
                <Bell className="h-5 w-5 text-success flex-shrink-0" />
                <p className="text-sm">Real-time signal notifications</p>
              </div>
              <div className="flex items-center gap-3 text-left">
                <Shield className="h-5 w-5 text-success flex-shrink-0" />
                <p className="text-sm">Expert market analysis</p>
              </div>
            </div>

            <Button 
              onClick={handleGetStarted}
              className="w-full btn-glow mt-6"
              size="lg"
            >
              Start Trading Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="w-full max-w-2xl">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold gradient-text">
              Welcome to VIP Gold Signals
            </h1>
            
            <p className="text-xl text-muted-foreground">
              Let's get you started with premium trading signals
            </p>

            <div className="grid md:grid-cols-3 gap-6 pt-8">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Live Signals</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time trading signals across multiple markets
                </p>
              </div>

              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Instant Alerts</h3>
                <p className="text-sm text-muted-foreground">
                  Get notified immediately when new signals are posted
                </p>
              </div>

              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Expert Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Professional chart analysis and market insights
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
