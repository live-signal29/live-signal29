import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isMedianApp, purchaseMedianProduct } from "@/lib/playBilling";

// Must EXACTLY match the subscription product IDs you create in
// Play Console — same ones listed in productsGoogle.json's
// "subProducts" array. Keys match this app's existing plan
// tiers (Monthly/Quarterly/Half-Yearly/Yearly).
export const PREMIUM_PLAN_SKUS = {
  monthly: "premium_monthly",
  quarterly: "premium_quarterly",
  halfyearly: "premium_halfyearly",
  yearly: "premium_yearly",
} as const;

export type PremiumPlanId = keyof typeof PREMIUM_PLAN_SKUS;

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
   * purchase sheet for that plan's SKU, then asks the backend to
   * verify the purchase with Google before granting premium.
   *
   * Returns "unavailable" when not running inside the Median app
   * (e.g. a normal mobile browser) — the caller should fall back
   * to the existing /premium page.
   */
  const buyPremium = useCallback(
    async (plan: PremiumPlanId = "monthly"): Promise<BuyPremiumResult> => {
      if (!isMedianApp()) return "unavailable";

      const productId = PREMIUM_PLAN_SKUS[plan];

      setPurchasing(true);
      try {
        const result = await purchaseMedianProduct(productId);
        if (!result) {
          return "cancelled";
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return "error";

        // Same verify-play-purchase Edge Function regardless of
        // plan — it just needs a real Google purchase token, which
        // Median's native billing produces exactly like any other
        // Play purchase.
        const { data, error } = await supabase.functions.invoke(
          "verify-play-purchase",
          {
            body: {
              userId: user.id,
              productId,
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
