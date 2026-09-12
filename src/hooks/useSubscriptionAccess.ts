import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Single source of truth for signal access.
 *
 * IMPORTANT:
 * The profiles table uses these fields:
 *   - subscription_status
 *   - trial_end_date
 *   - subscription_end_date
 *
 * Do not select plan_type / trial_expires_at here. Those fields are not part
 * of the profiles schema used by this project and a failed SELECT can make
 * the UI fall back to the wrong access state.
 */

const toDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeStatus = (value: unknown): string => {
  return String(value ?? "free").trim().toLowerCase().replace(/[\s-]+/g, "_");
};

export const useSubscriptionAccess = () => {
  // Start locked, then unlock only after the real profile has been checked.
  // This prevents a logged-out/free user from briefly seeing premium data.
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null
  );
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  const checkAccess = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        if (!mountedRef.current) return;
        setHasAccess(false);
        setSubscriptionStatus("free");
        setTrialExpired(false);
        setTrialEndDate(null);
        retryCountRef.current = 0;
        return;
      }

      // Select ONLY columns that actually exist in public.profiles.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "subscription_status, trial_end_date, subscription_end_date"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        if (!mountedRef.current) return;
        setHasAccess(false);
        setSubscriptionStatus("free");
        setTrialExpired(false);
        setTrialEndDate(null);
        return;
      }

      const status = normalizeStatus(profile.subscription_status);
      const now = new Date();

      const trialEnd = toDate(profile.trial_end_date);
      const subscriptionEnd = toDate(profile.subscription_end_date);

      if (!mountedRef.current) return;

      setSubscriptionStatus(status);
      setTrialEndDate(trialEnd);
      retryCountRef.current = 0;

      /*
       * Premium/pro/yearly:
       * Access is valid only while subscription_end_date is in the future.
       *
       * Trial:
       * Access is valid only while trial_end_date is in the future.
       *
       * "active" is supported for older accounts; if it has a future
       * subscription end date OR trial end date, access is granted.
       */
      const isPremiumStatus = ["premium", "pro", "yearly"].includes(status);
      const isTrialStatus = ["free_trial", "trial"].includes(status);
      const isActiveStatus = status === "active";

      let access = false;
      let expired = false;

      if (isPremiumStatus) {
        access = !subscriptionEnd || subscriptionEnd > now;
        expired = !access;
      } else if (isTrialStatus) {
        access = !!trialEnd && trialEnd > now;
        expired = !access;
      } else if (isActiveStatus) {
        access =
          (!!subscriptionEnd && subscriptionEnd > now) ||
          (!!trialEnd && trialEnd > now);
        expired = !access;
      } else {
        // Normal free account.
        access = false;
        expired = false;
      }

      setHasAccess(access);
      setTrialExpired(expired);
    } catch (error) {
      console.error("Error checking subscription access:", error);

      if (!mountedRef.current) return;

      retryCountRef.current += 1;

      // Never grant premium access just because the profile request failed.
      setHasAccess(false);

      if (retryCountRef.current < 3) {
        window.setTimeout(() => {
          if (mountedRef.current) {
            void checkAccess();
          }
        }, 1500 * retryCountRef.current);
      } else {
        setSubscriptionStatus((current) => current ?? "free");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Initial auth/profile check.
    void checkAccess();

    // Keep access state correct after login/logout/token changes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // Defer the profile query so Supabase has finished updating the session.
      window.setTimeout(() => {
        if (mountedRef.current) {
          retryCountRef.current = 0;
          void checkAccess();
        }
      }, 0);
    });

    // Refresh once when the browser tab becomes active again.
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        void checkAccess();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkAccess]);

  return {
    hasAccess,
    loading,
    subscriptionStatus,
    trialExpired,
    trialEndDate,
    refetch: checkAccess,
  };
};
