import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSubscriptionAccess = () => {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, trial_end_date, subscription_end_date')
        .eq('id', user.id)
        .single();

      if (!profile) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setSubscriptionStatus(profile.subscription_status);

      const now = new Date();

      // Check if premium
      if (profile.subscription_status === 'premium') {
        const endDate = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
        if (endDate && endDate > now) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      }
      // Check if free trial
      else if (profile.subscription_status === 'free_trial') {
        const trialEndDate = profile.trial_end_date ? new Date(profile.trial_end_date) : null;
        if (trialEndDate && trialEndDate > now) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      }
      // Otherwise no access
      else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  return { hasAccess, loading, subscriptionStatus, refetch: checkAccess };
};
