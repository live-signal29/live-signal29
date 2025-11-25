import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  endDate: Date;
  title: string;
  description?: string;
}

const CountdownTimer = ({ endDate, title, description }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = endDate.getTime() - new Date().getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 border border-primary/30 rounded-lg p-4 sm:p-6 mb-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="text-lg sm:text-xl font-bold text-foreground">{title}</h3>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
        )}
        <div className="flex justify-center gap-2 sm:gap-4">
          <div className="bg-background/80 rounded-lg p-2 sm:p-3 min-w-[60px] sm:min-w-[80px]">
            <div className="text-2xl sm:text-3xl font-bold text-primary">{timeLeft.days}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Days</div>
          </div>
          <div className="bg-background/80 rounded-lg p-2 sm:p-3 min-w-[60px] sm:min-w-[80px]">
            <div className="text-2xl sm:text-3xl font-bold text-primary">{timeLeft.hours}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Hours</div>
          </div>
          <div className="bg-background/80 rounded-lg p-2 sm:p-3 min-w-[60px] sm:min-w-[80px]">
            <div className="text-2xl sm:text-3xl font-bold text-primary">{timeLeft.minutes}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Minutes</div>
          </div>
          <div className="bg-background/80 rounded-lg p-2 sm:p-3 min-w-[60px] sm:min-w-[80px]">
            <div className="text-2xl sm:text-3xl font-bold text-primary">{timeLeft.seconds}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Seconds</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
