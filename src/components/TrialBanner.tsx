import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";

const TrialBanner = () => {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    loadTrialInfo();
  }, []);

  const loadTrialInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('trial_end_date')
      .eq('id', user.id)
      .single();

    if (profile?.trial_end_date) {
      const endDate = new Date(profile.trial_end_date);
      const now = new Date();
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        setDaysRemaining(diffDays);
      }
    }
  };

  if (daysRemaining === null || daysRemaining <= 0) return null;

  return (
    <div className="bg-gradient-to-r from-success/20 to-warning/20 border-b border-success/30">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-success" />
          <span className="font-medium">
            🎉 Free Trial Active: {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
          </span>
        </div>
      </div>
    </div>
  );
};

export default TrialBanner;
