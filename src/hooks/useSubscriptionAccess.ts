import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSubscriptionAccess = () => {
  const [loading, setLoading] = useState(true);
  const [trialExpired, setTrialExpired] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setTrialExpired(false);
        setHasAccess(true);
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("trial_end_date, subscription_status")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        setLoading(false);
        return;
      }

      const isPremium = profile.subscription_status === "premium";
      const now = new Date().getTime();
      const trialEnd = profile.trial_end_date ? new Date(profile.trial_end_date).getTime() : 0;

      // Agar user premium nahi hai AUR current time trial_end_date se agay nikal gaya hai
      const isExpired = !isPremium && (trialEnd === 0 || now > trialEnd);

      setTrialExpired(isExpired);
      setHasAccess(isPremium || !isExpired);
    } catch (err) {
      console.error("Subscription check error:", err);
    } finally {
      setLoading(false);
    }
  };

  return { loading, trialExpired, hasAccess };
};
