import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSubscriptionAccess = () => {
  const [hasAccess, setHasAccess] = useState(true);
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setHasAccess(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, trial_end_date, subscription_end_date')
        .eq('id', user.id)
        .single();

      if (!profile) {
        setHasAccess(false);
        return;
      }

      setSubscriptionStatus(profile.subscription_status);

      const now = new Date();

      if (profile.subscription_status === 'premium') {
        const endDate = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
        if (endDate && endDate > now) {
          setHasAccess(true);
          setTrialExpired(false);
        } else {
          setHasAccess(false);
          setTrialExpired(false);
        }
      } else if (profile.subscription_status === 'free_trial') {
        const trialEnd = profile.trial_end_date ? new Date(profile.trial_end_date) : null;
        setTrialEndDate(trialEnd);

        if (trialEnd && trialEnd > now) {
          setHasAccess(true);
          setTrialExpired(false);
        } else {
          setHasAccess(false);
          setTrialExpired(true);
        }
      } else {
        setHasAccess(false);
        setTrialExpired(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      // Keep optimistic access on error - prevent white screen
      setHasAccess(true);
      setTrialExpired(false);
    } finally {
      // Always set loading to false after 1.5 seconds max
      setTimeout(() => {
        setLoading(false);
      }, 1500);
    }
  };

  return {
    hasAccess,
    loading,
    subscriptionStatus,
    trialExpired,
    trialEndDate,
    refetch: checkAccess
  };
};
