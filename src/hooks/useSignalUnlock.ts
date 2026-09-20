import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Change this to control how many free ad-unlocks a non-premium
// user gets per day. Once used up, only "Go Premium" works.
const DAILY_FREE_AD_UNLOCKS = 5;

export function useSignalUnlock(
  signalId: string,
  isPremium: boolean
) {
  const [isUnlocked, setIsUnlocked] = useState(isPremium);
  const [loading, setLoading] = useState(true);
  const [dailyUnlocksUsed, setDailyUnlocksUsed] = useState(0);

  useEffect(() => {
    // Premium users skip the whole gate entirely.
    if (isPremium) {
      setIsUnlocked(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const checkUnlock = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      // Has this specific signal already been unlocked
      // by this user (ad watched earlier, or paid)?
      const { data: unlockRow } = await supabase
        .from("signal_unlocks")
        .select("id")
        .eq("user_id", user.id)
        .eq("signal_id", signalId)
        .maybeSingle();

      if (cancelled) return;
      setIsUnlocked(!!unlockRow);

      // How many ad-unlocks has this user used today?
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("signal_unlocks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("method", "ad")
        .gte("unlocked_at", todayStart.toISOString());

      if (cancelled) return;
      setDailyUnlocksUsed(count || 0);
      setLoading(false);
    };

    checkUnlock();

    return () => {
      cancelled = true;
    };
  }, [signalId, isPremium]);

  // Call this AFTER the ad has actually finished playing
  // (or after a successful payment), never before.
  const recordUnlock = useCallback(
    async (method: "ad" | "paid") => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return false;

      const { error } = await supabase
        .from("signal_unlocks")
        .insert({
          user_id: user.id,
          signal_id: signalId,
          method,
        });

      if (!error) {
        setIsUnlocked(true);
        if (method === "ad") {
          setDailyUnlocksUsed((n) => n + 1);
        }
        return true;
      }

      // Likely a duplicate-unlock race (unique constraint) —
      // treat as already unlocked rather than an error.
      if (error.code === "23505") {
        setIsUnlocked(true);
        return true;
      }

      console.error("Failed to record unlock:", error);
      return false;
    },
    [signalId]
  );

  return {
    isUnlocked,
    loading,
    recordUnlock,
    dailyUnlocksRemaining: Math.max(
      0,
      DAILY_FREE_AD_UNLOCKS - dailyUnlocksUsed
    ),
  };
}
