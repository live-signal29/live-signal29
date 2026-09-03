import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSubscriptionAccess = () => {
  const [hasAccess, setHasAccess] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialExpired, setTrialExpired] = useState<boolean>(false);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      setLoading(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setHasAccess(false);
        setTrialExpired(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("subscription_status, trial_end_date, subscription_end_date")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        setHasAccess(false);
        setTrialExpired(false);
        return;
      }

      const now = new Date();
      const status = profile.subscription_status;
      setSubscriptionStatus(status);

      // 1. Check IF Premium
      if (status === "premium") {
        const subEnd = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
        if (subEnd && subEnd > now) {
          setHasAccess(true);
          setTrialExpired(false);
        } else {
          setHasAccess(false);
          setTrialExpired(true);
        }
        return;
      }

      // 2. Check Trial Expiry (For ALL Non-Premium users)
      const trialEnd = profile.trial_end_date ? new Date(profile.trial_end_date) : null;
      setTrialEndDate(trialEnd);

      if (trialEnd) {
        if (now > trialEnd) {
          // TRIAL IS EXPIRED! BLOCK ACCESS IMMEDIATELY
          setHasAccess(false);
          setTrialExpired(true);
        } else {
          // Trial is still valid
          setHasAccess(true);
          setTrialExpired(false);
        }
      } else {
        // If no trial date set and not premium -> Block
        setHasAccess(false);
        setTrialExpired(true);
      }
    } catch (err) {
      console.error("Subscription check error:", err);
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
    refetch: checkAccess,
  };
};
