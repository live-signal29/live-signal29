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
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
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
        setSubscriptionStatus("free");
        setLoading(false);
        return;
      }

      const profile = await fetchWithRetry(async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_plan, trial_end_date, subscription_end_date')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        return data;
      }, 2, 1000);

      if (!profile) {
        setHasAccess(false);
        setSubscriptionStatus("free");
        setLoading(false);
        return;
      }

      const status = String(profile.subscription_status || profile.subscription_plan || 'free').trim().toLowerCase();
      setSubscriptionStatus(status);
      retryCountRef.current = 0; // Reset on success

      const now = new Date();

      // Check if Premium User
      if (status === 'premium' || status === 'yearly' || status === 'pro' || status === 'active') {
        const endDate = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
        if (endDate && endDate > now) {
          setHasAccess(true);
          setTrialExpired(false);
        } else {
          setHasAccess(false);
          setTrialExpired(true);
        }
      }
      // Check if Free Trial User (Active or Expired)
      else if (status === 'free_trial' || status === 'trial') {
        const trialEndRaw = profile.trial_end_date;
        const trialEnd = trialEndRaw ? new Date(trialEndRaw) : null;
        setTrialEndDate(trialEnd);
        
        // If trialEnd date exists and is in future -> Active 5-Day Trial
        if (trialEnd && trialEnd > now) {
          // FREE TRIAL is still a FREE plan.
          // Trial users can see premium signal cards, but must tap
          // "Premium Signal - Tap to Unlock" to open the Premium page.
          setHasAccess(false);
          setTrialExpired(false);
        } else {
          // Trial expired
          setHasAccess(false);
          setTrialExpired(true);
        }
      }
      // Default Free User
      else {
        setHasAccess(false);
        setTrialExpired(true);
      }
    } catch (error) {
      setHasAccess(false);
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
