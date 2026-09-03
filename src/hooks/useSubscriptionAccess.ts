import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Retry helper for VPN/proxy compatibility
const fetchWithRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries) throw error;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
};

export const useSubscriptionAccess = () => {
  const [hasAccess, setHasAccess] = useState(true);
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    const timeout = setTimeout(() => {
      checkAccess();
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  const checkAccess = async () => {
    try {
      setLoading(true);
      
      const user = await fetchWithRetry(async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
      }, 2, 1000);
      
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const profile = await fetchWithRetry(async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_status, trial_end_date, subscription_end_date')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        return data;
      }, 2, 1000);

      if (!profile) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setSubscriptionStatus(profile.subscription_status);
      retryCountRef.current = 0;

      const now = new Date();

      // Check if premium
      if (profile.subscription_status === 'premium') {
        const endDate = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
        if (endDate && endDate > now) {
          setHasAccess(true);
          setTrialExpired(false);
        } else {
          setHasAccess(false);
          setTrialExpired(true);
        }
      }
      // Check free trial or default trial expiration check
      else {
        const trialEnd = profile.trial_end_date ? new Date(profile.trial_end_date) : null;
        setTrialEndDate(trialEnd);
        
        if (trialEnd && trialEnd > now) {
          // Trial active
          setHasAccess(true);
          setTrialExpired(false);
        } else {
          // Trial expired -> Block access
          setHasAccess(false);
          setTrialExpired(true);
        }
      }
    } catch (error) {
      retryCountRef.current++;
      if (retryCountRef.current <= 2) {
        console.error("Error checking access:", error);
      }
      if (retryCountRef.current < maxRetries) {
        setTimeout(checkAccess, 2000 * retryCountRef.current);
      }
    } finally {
      setLoading(false);
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
