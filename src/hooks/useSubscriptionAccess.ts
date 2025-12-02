import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSubscriptionAccess = () => {
  const [hasAccess, setHasAccess] = useState(true); // Optimistically assume access
  const [loading, setLoading] = useState(false); // Start as not loading
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

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

      // Only premium users have access to locked signals
      if (profile.subscription_status === 'premium') {
        const endDate = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
        if (endDate && endDate > now) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      }
      // Free trial and free users do NOT have access to premium signals
      else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
    }
  };

  return { hasAccess, loading, subscriptionStatus, refetch: checkAccess };
};
