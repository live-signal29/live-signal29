import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSubscriptionAccess = () => {
  const [hasAccess, setHasAccess] = useState(false); // Only premium users get access
  const [hasTrial, setHasTrial] = useState(false); // Track if user has valid trial
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setHasAccess(false);
        setHasTrial(false);
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
        setHasTrial(false);
        setLoading(false);
        return;
      }

      setSubscriptionStatus(profile.subscription_status);
      const now = new Date();

      // ONLY premium users with valid subscription get hasAccess = true
      if (profile.subscription_status === 'premium') {
        const endDate = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
        if (endDate && endDate > now) {
          setHasAccess(true);
          setHasTrial(false);
        } else {
          setHasAccess(false);
          setHasTrial(false);
        }
      }
      // Free trial users - can view app but NOT premium signals
      else if (profile.subscription_status === 'free_trial') {
        const trialEndDate = profile.trial_end_date ? new Date(profile.trial_end_date) : null;
        if (trialEndDate && trialEndDate > now) {
          setHasAccess(false); // Trial users don't have premium signal access
          setHasTrial(true);
        } else {
          setHasAccess(false);
          setHasTrial(false);
        }
      }
      // Otherwise no access
      else {
        setHasAccess(false);
        setHasTrial(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      setHasTrial(false);
    } finally {
      setLoading(false);
    }
  };

  return { hasAccess, hasTrial, loading, subscriptionStatus, refetch: checkAccess };
};
