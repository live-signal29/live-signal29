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
  const [hasAccess, setHasAccess] = useState(true); // Optimistically assume access
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    // Small delay to let app stabilize (helps with VPN connections)
    const timeout = setTimeout(() => {
      checkAccess();
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  const checkAccess = async () => {
    try {
      setLoading(true);
      
      // Use retry logic for VPN/proxy compatibility
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
      retryCountRef.current = 0; // Reset on success

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
      retryCountRef.current++;
      
      // Only log first few errors to avoid spam
      if (retryCountRef.current <= 2) {
        console.error("Error checking access:", error);
      }
      
      // On network errors, keep optimistic access instead of blocking user
      // This prevents VPN/proxy users from being locked out
      if (retryCountRef.current < maxRetries) {
        // Retry after delay
        setTimeout(checkAccess, 2000 * retryCountRef.current);
      }
      // Keep hasAccess as true (optimistic) on persistent failures
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
