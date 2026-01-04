import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";

interface HeaderTrialIndicatorProps {
  trialEndDate: Date | null;
  trialExpired: boolean;
  subscriptionStatus: string | null;
}

const HeaderTrialIndicator = ({ trialEndDate, trialExpired, subscriptionStatus }: HeaderTrialIndicatorProps) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    if (!trialEndDate || trialExpired) return;

    const calculateTimeLeft = () => {
      const difference = trialEndDate.getTime() - new Date().getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [trialEndDate, trialExpired]);

  // Only show for free_trial users
  if (subscriptionStatus !== 'free_trial') return null;

  // Trial expired state
  if (trialExpired) {
    return (
      <Link
        to="/premium"
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20 transition-colors"
      >
        <Clock className="h-3 w-3" />
        <span className="hidden sm:inline">Trial expired – Upgrade to Premium</span>
        <span className="sm:hidden">Expired – Upgrade</span>
      </Link>
    );
  }

  // Active trial countdown
  return (
    <Link
      to="/premium"
      className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
    >
      <Clock className="h-3 w-3 animate-pulse" />
      <span className="hidden sm:inline">
        Trial ends in: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
      </span>
      <span className="sm:hidden">
        {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
      </span>
    </Link>
  );
};

export default HeaderTrialIndicator;
