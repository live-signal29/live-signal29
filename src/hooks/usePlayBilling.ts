import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isMedianApp, purchaseMedianProduct } from "@/lib/playBilling";

// One Play Console subscription product, with a base plan per
// duration (set up as base plans under this same product — see
// chat for exact Play Console steps). Must match exactly.
export const PREMIUM_PRODUCT_ID = "premium";

// Base plan IDs — must exactly match what you create in Play
// Console under the "premium" subscription.
export const PREMIUM_BASE_PLANS = {
  monthly: "monthly",
  quarterly: "quarterly",
  halfyearly: "half-yearly",
  yearly: "yearly",
} as const;

export type PremiumPlanId = keyof typeof PREMIUM_BASE_PLANS;

export type BuyPremiumResult =
  | "success"
  | "unavailable"
  | "cancelled"
  | "error";

export function usePlayBilling() {
  const [purchasing, setPurchasing] = useState(false);

  /**
   * Runs the full flow for whichever plan the user picked: checks
   * we're inside the Median app, opens Median's native Google Play
   * purchase sheet for that base plan's offer, then asks the
   * backend to verify the purchase with Google before granting
   * premium.
   *
   * Returns "unavailable" when not running inside the Median app
   * (e.g. a normal mobile browser) — the caller should fall back
   * to the existing /premium page.
   */
  const buyPremium = useCallback(
    async (plan: PremiumPlanId = "monthly"): Promise<BuyPremiumResult> => {
      if (!isMedianApp()) return "unavailable";

      const basePlanId = PREMIUM_BASE_PLANS[plan];

      setPurchasing(true);
      try {
        const result = await purchaseMedianProduct(
          PREMIUM_PRODUCT_ID,
          basePlanId
        );
        if (!result) {
          return "cancelled";
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return "error";

        // Same verify-play-purchase Edge Function regardless of
        // plan — the productId is always "premium"; Google's
        // verification response identifies which base plan/offer
        // was actually purchased.
        const { data, error } = await supabase.functions.invoke(
          "verify-play-purchase",
          {
            body: {
              userId: user.id,
              productId: PREMIUM_PRODUCT_ID,
              purchaseToken: result.purchaseToken,
              purchaseType: "subs",
            },
          }
        );

        if (error || !data?.success) {
          console.error("Purchase verification failed:", error || data);
          return "error";
        }

        return "success";
      } catch (err) {
        console.error("buyPremium failed:", err);
        return "error";
      } finally {
        setPurchasing(false);
      }
    },
    []
  );

  return { buyPremium, purchasing };
}
