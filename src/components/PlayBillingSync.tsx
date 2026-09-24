import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PREMIUM_PRODUCT_ID,
  getExistingPlayPurchases,
  isPlayBillingAvailable,
} from "@/lib/playBilling";
import { verifyPlayPurchase } from "@/hooks/usePlayBilling";
import { notifySubscriptionUpdated } from "@/lib/subscriptionEvents";

/**
 * Inside the Android app only: on launch / login / coming back to the
 * foreground, re-verify the Play subscription this device owns so that
 *  - renewals extend subscription_end_date,
 *  - a reinstall or a new phone gets premium back without re-buying,
 *  - a purchase that succeeded but was never verified (app killed
 *    mid-flow) is finished — Google auto-refunds unacknowledged
 *    purchases after 3 days, so this matters.
 * Renders nothing.
 */
const PlayBillingSync = () => {
  useEffect(() => {
    if (!isPlayBillingAvailable()) return;

    let lastRun = 0;
    let running = false;

    const run = async (force = false) => {
      if (running) return;
      if (!force && Date.now() - lastRun < 60_000) return;
      running = true;
      lastRun = Date.now();

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const owned = await getExistingPlayPurchases();
        let anyActive = false;

        for (const p of owned) {
          if (p.productId !== PREMIUM_PRODUCT_ID || p.purchaseState !== 1) continue;
          if ((await verifyPlayPurchase(p.purchaseToken)) === "active") {
            anyActive = true;
          }
        }

        if (anyActive) notifySubscriptionUpdated();
      } catch (err) {
        console.error("Play billing sync failed:", err);
      } finally {
        running = false;
      }
    };

    run(true);

    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisible);

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") run(true);
    });

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      authSub.subscription.unsubscribe();
    };
  }, []);

  return null;
};

export default PlayBillingSync;
