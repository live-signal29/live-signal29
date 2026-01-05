import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const TrialBanner = () => {
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    loadTrialInfo();
  }, []);

  // Live countdown timer
  useEffect(() => {
    if (!trialEndDate) return;

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
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [trialEndDate]);

  const loadTrialInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, trial_end_date, subscription_end_date')
      .eq('id', user.id)
      .single();

    if (!profile) return;

    // Check for premium users
    if (profile.subscription_status === 'premium') {
      setIsPremium(true);
      return;
    }

    // Set trial end date for free_trial users
    if (profile.subscription_status === 'free_trial' && profile.trial_end_date) {
      setTrialEndDate(new Date(profile.trial_end_date));
    }
  };

  // Show premium banner for premium users
  if (isPremium) {
    return (
      <div className="bg-gradient-to-r from-primary/20 to-success/20 border-b border-primary/30">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="font-medium">
              ⭐ You are our Premium User - Enjoy unlimited access!
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Show trial banner with live countdown
  if (timeLeft) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    return (
      <div className="bg-gradient-to-r from-success/20 to-warning/20 border-b border-success/30">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-success animate-pulse" />
            <span className="font-medium">
              🎉 Free Trial: 
              <span className="ml-1.5 font-mono font-bold text-success">
                {timeLeft.days}d {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s
              </span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TrialBanner;
