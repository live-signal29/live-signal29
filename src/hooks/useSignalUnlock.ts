import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Change this to control how many free ad-unlocks a non-premium
// user gets per day. Once used up, only "Go Premium" works.
const DAILY_FREE_AD_UNLOCKS = 10;

// ============================================================
// SHARED UNLOCK CACHE
// ============================================================
// Previously every <SignalUnlockGate> (one per visible signal card)
// ran its own supabase.auth.getUser() call (a network round trip to
// re-verify the session every single time) PLUS two separate DB
// queries. With 5-10 cards on screen that was 15-30 network calls
// just to render the list — very slow on a weak connection.
//
// Now the whole page shares ONE fetch: a single query for this
// user's full unlock history, cached in module scope. Every card
// just reads from that shared cache. recordUnlock() updates the
// cache in place and notifies all mounted cards, so counts and
// unlocked state stay in sync without any extra round trips.
// ============================================================

type UnlockState = {
  userId: string | null;
  unlockedSignalIds: Set<string>;
  dailyAdCount: number;
};

let cachedState: UnlockState | null = null;
let inFlight: Promise<UnlockState> | null = null;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((fn) => fn());
}

function todayStartISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function loadUnlockState(forceRefresh = false): Promise<UnlockState> {
  if (cachedState && !forceRefresh) return cachedState;
  if (inFlight && !forceRefresh) return inFlight;

  inFlight = (async () => {
    // getSession() reads the session from local storage — no network
    // round trip — unlike getUser(), which re-verifies with the auth
    // server on every single call.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    if (!userId) {
      const empty: UnlockState = {
        userId: null,
        unlockedSignalIds: new Set(),
        dailyAdCount: 0,
      };
      cachedState = empty;
      return empty;
    }

    // ONE query instead of two: pulls this user's whole unlock
    // history, then both the "already unlocked?" set and today's
    // ad-unlock count are derived from it locally.
    const { data, error } = await supabase
      .from("signal_unlocks")
      .select("signal_id, method, unlocked_at")
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to load unlock state:", error);
      const fallback: UnlockState = {
        userId,
        unlockedSignalIds: new Set(),
        dailyAdCount: 0,
      };
      cachedState = fallback;
      return fallback;
    }

    const todayStart = todayStartISO();
    const unlockedSignalIds = new Set<string>();
    let dailyAdCount = 0;

    for (const row of data || []) {
      unlockedSignalIds.add(row.signal_id as string);
      if (row.method === "ad" && (row.unlocked_at as string) >= todayStart) {
        dailyAdCount += 1;
      }
    }

    const state: UnlockState = { userId, unlockedSignalIds, dailyAdCount };
    cachedState = state;
    return state;
  })();

  const result = await inFlight;
  inFlight = null;
  return result;
}

// Login/logout invalidates the cache so the next read re-fetches
// for the correct user.
supabase.auth.onAuthStateChange(() => {
  cachedState = null;
  inFlight = null;
  notifySubscribers();
});

export function useSignalUnlock(signalId: string, isPremium: boolean) {
  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(!isPremium);

  useEffect(() => {
    if (isPremium) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const rerender = () => {
      if (!cancelled) setTick((n) => n + 1);
    };

    subscribers.add(rerender);

    loadUnlockState().then(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      subscribers.delete(rerender);
    };
  }, [isPremium]);

  const isUnlocked =
    isPremium || (cachedState?.unlockedSignalIds.has(signalId) ?? false);
  const dailyUnlocksUsed = cachedState?.dailyAdCount ?? 0;

  // Call this AFTER the ad has actually finished playing
  // (or after a successful payment), never before.
  const recordUnlock = useCallback(
    async (method: "ad" | "paid") => {
      const state = await loadUnlockState();
      if (!state.userId) return false;

      const { error } = await supabase.from("signal_unlocks").insert({
        user_id: state.userId,
        signal_id: signalId,
        method,
      });

      if (!error) {
        if (cachedState) {
          cachedState.unlockedSignalIds.add(signalId);
          if (method === "ad") {
            cachedState.dailyAdCount += 1;
          }
        }
        notifySubscribers();
        return true;
      }

      // Likely a duplicate-unlock race (unique constraint) —
      // treat as already unlocked rather than an error.
      if (error.code === "23505") {
        if (cachedState) {
          cachedState.unlockedSignalIds.add(signalId);
        }
        notifySubscribers();
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
