import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isPlayBillingAvailable, purchaseProduct } from "@/lib/playBilling";

// Replace with the EXACT Product ID you create in Play Console
// (Monetization -> Subscriptions, or Products for a one-time buy).
export const PREMIUM_SUBSCRIPTION_SKU = "premium_monthly";

export type BuyPremiumResult =
  | "success"
  | "unavailable"
  | "cancelled"
  | "error";

export function usePlayBilling() {
  const [purchasing, setPurchasing] = useState(false);

  /**
   * Runs the full flow: checks Play Billing is available, opens the
   * native Google checkout, then asks the backend to verify the
   * purchase with Google before granting premium.
   *
   * Returns "unavailable" when not running inside the TWA app —
   * the caller should fall back to the existing /premium page.
   */
  const buyPremium = useCallback(async (): Promise<BuyPremiumResult> => {
    const available = await isPlayBillingAvailable();
    if (!available) return "unavailable";

    setPurchasing(true);
    try {
      const result = await purchaseProduct(PREMIUM_SUBSCRIPTION_SKU);
      if (!result) {
        return "cancelled";
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return "error";

      const { data, error } = await supabase.functions.invoke(
        "verify-play-purchase",
        {
          body: {
            userId: user.id,
            productId: PREMIUM_SUBSCRIPTION_SKU,
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
  }, []);

  return { buyPremium, purchasing };
}
