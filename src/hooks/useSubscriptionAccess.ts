import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSubscriptionAccess = () => {
  const [hasAccess, setHasAccess] = useState(true); // Optimistically assume access
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
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

      // Check if premium
      if (profile.subscription_status === 'premium') {
        const endDate = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
        if (endDate && endDate > now) {
          setHasAccess(true);
          setTrialExpired(false);
        } else {
          setHasAccess(false);
          setTrialExpired(false);
        }
      }
      // Check if free trial
      else if (profile.subscription_status === 'free_trial') {
        const trialEnd = profile.trial_end_date ? new Date(profile.trial_end_date) : null;
        setTrialEndDate(trialEnd);
        
        if (trialEnd && trialEnd > now) {
          // Trial is still active
          setHasAccess(true);
          setTrialExpired(false);
        } else {
          // Trial has expired - but still allow dashboard access with filtered signals
          setHasAccess(true); // Allow access to dashboard
          setTrialExpired(true); // Mark trial as expired for filtering
        }
      }
      // Otherwise no access
      else {
        setHasAccess(false);
        setTrialExpired(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
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
