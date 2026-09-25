import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PREMIUM_PRODUCT_ID,
  getExistingPlayPurchases,
  getPlayOffers,
  isPlayBillingAvailable,
  openPlaySubscriptionSettings,
  purchasePlayPlan,
  type PlayPlanOffer,
} from "@/lib/playBilling";
import { notifySubscriptionUpdated } from "@/lib/subscriptionEvents";

export { PREMIUM_PRODUCT_ID };

// Base plan IDs — must exactly match the base plans created under the
// "premium" subscription in Play Console (and the values the admin panel
// stores in profiles.subscription_plan).
export const PREMIUM_BASE_PLANS = {
  monthly: "monthly",
  quarterly: "quarterly",
  halfyearly: "half-yearly",
  yearly: "yearly",
} as const;

export type PremiumPlanId = keyof typeof PREMIUM_BASE_PLANS;

export type BuyPremiumResult =
  | "success"
  | "pending"
  | "unavailable"
  | "cancelled"
  | "error";

export interface BuyPremiumOutcome {
  status: BuyPremiumResult;
  // The real reason, straight from Google Play / our server — shown to the
  // user for now so we can see the exact failure instead of guessing.
  message?: string;
}

/**
 * Asks the backend to check a purchase token with Google and grant
 * premium. Returns true only when the subscription is active.
 */
export async function verifyPlayPurchase(
  purchaseToken: string
): Promise<{ state: "active" | "pending" | "failed"; message?: string }> {
  const { data, error } = await supabase.functions.invoke(
    "verify-play-purchase",
    { body: { purchaseToken, productId: PREMIUM_PRODUCT_ID } }
  );

  if (error) {
    console.error("verify-play-purchase failed:", error);
    return { state: "failed", message: String((error as Error)?.message ?? error) };
  }
  if (data?.success) return { state: "active" };
  if (data?.pending) return { state: "pending", message: data?.error };
  console.error("Purchase not active:", data);
  return { state: "failed", message: data?.error ?? data?.details };
}

export function usePlayBilling() {
  const available = isPlayBillingAvailable();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  // Localized prices straight from Google Play, keyed by base plan id.
  const [offers, setOffers] = useState<Record<string, PlayPlanOffer>>({});

  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    getPlayOffers().then((o) => {
      if (!cancelled) setOffers(o);
    });
    return () => {
      cancelled = true;
    };
  }, [available]);

  /**
   * Full flow for one plan: Google's purchase sheet -> backend verifies the
   * token with Google -> premium granted -> every screen refreshes.
   */
  const buyPremium = useCallback(
    async (plan: PremiumPlanId): Promise<BuyPremiumOutcome> => {
      if (!isPlayBillingAvailable()) return { status: "unavailable" };

      setPurchasing(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { status: "error", message: "Not logged in" };

        const outcome = await purchasePlayPlan(PREMIUM_BASE_PLANS[plan], user.id);

        if (outcome.status === "cancelled") return { status: "cancelled" };
        if (outcome.status === "pending") return { status: "pending" };
        if (outcome.status === "error") {
          return { status: "error", message: outcome.message };
        }

        const verified = await verifyPlayPurchase(outcome.purchaseToken);
        if (verified.state === "active") {
          notifySubscriptionUpdated();
          return { status: "success" };
        }
        return {
          status: verified.state === "pending" ? "pending" : "error",
          message: verified.message,
        };
      } catch (err) {
        console.error("buyPremium failed:", err);
        return { status: "error", message: String((err as Error)?.message ?? err) };
      } finally {
        setPurchasing(false);
      }
    },
    []
  );

  /**
   * Re-checks whatever Google says this Play account already owns
   * (new phone, reinstall, renewal). Returns true if premium is active.
   */
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!isPlayBillingAvailable()) return false;
    setRestoring(true);
    try {
      const owned = await getExistingPlayPurchases();
      let active = false;
      for (const p of owned) {
        if (p.productId !== PREMIUM_PRODUCT_ID || p.purchaseState !== 1) continue;
        if ((await verifyPlayPurchase(p.purchaseToken)).state === "active") active = true;
      }
      if (active) notifySubscriptionUpdated();
      return active;
    } finally {
      setRestoring(false);
    }
  }, []);

  return {
    available,
    offers,
    purchasing,
    restoring,
    buyPremium,
    restorePurchases,
    manageSubscription: openPlaySubscriptionSettings,
  };
}
