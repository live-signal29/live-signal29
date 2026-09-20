// ============================================================
// MEDIAN IN-APP PURCHASES (Google Play, via Median JS Bridge)
// ============================================================
// This app is wrapped with Median.co, NOT a Bubblewrap TWA — so
// billing goes through Median's own JavaScript Bridge
// (`window.median.iap`), not the Digital Goods API.
//
// This only exists inside the installed Android app. Always
// check isMedianApp() first and fall back to your existing
// payment page if it's false (see usePlayBilling.ts).
//
// Setup required in Median App Studio (see chat for full steps):
//   1. Native Plugins tab -> enable "In-App Purchases"
//   2. Set productsUrl to a JSON file hosted on your site, e.g.
//      https://livesignals29.online/iap/productsGoogle.json
//      containing: { "inappProducts": [], "subProducts": ["premium_monthly"] }
//   3. Rebuild and re-publish the app after enabling the plugin —
//      it will not appear in an already-installed build.
// ============================================================

export interface MedianProduct {
  productID: string;
  type: "inapp" | "subs";
  title: string;
  name: string;
  description: string;
  purchaseOfferDetails?: {
    priceAmountMicros: number;
    priceCurrencyCode: string;
    formattedPrice: string;
  };
  subscriptionOfferDetails?: Array<{
    offerId?: string;
    offerToken: string;
    basePlanId: string;
    pricingPhases: Array<{
      priceAmountMicros: number;
      priceCurrencyCode: string;
      formattedPrice: string;
      billingPeriod: string;
      billingCycleCount: number;
      recurrenceMode: number;
    }>;
    offerTags: string[];
  }>;
}

interface MedianIAPInfo {
  inAppPurchases: {
    platform: string;
    libraryVersion: number;
    products: MedianProduct[];
  };
}

interface MedianPurchaseResult {
  productID: string;
  purchaseToken: string;
  orderId: string;
  purchaseState: number;
  acknowledged: boolean;
  [key: string]: unknown;
}

declare global {
  interface Window {
    median?: {
      iap?: {
        info: () => Promise<MedianIAPInfo>;
        purchase: (opts: {
          productID: string;
          offerToken?: string;
        }) => Promise<MedianPurchaseResult>;
        purchases: () => Promise<{
          platform: string;
          allPurchases: Array<{
            orderId: string;
            productID: string;
            purchaseToken: string;
            purchaseState: number;
            autoRenewing: boolean;
          }>;
        }>;
        manageSubscription: (opts: { productID: string }) => void;
        manageAllSubscriptions: () => void;
      };
    };
  }
}

export function isMedianApp(): boolean {
  return typeof window !== "undefined" && !!window.median?.iap;
}

export async function getMedianProducts(): Promise<MedianProduct[]> {
  if (!isMedianApp()) return [];
  try {
    const info = await window.median!.iap!.info();
    return info.inAppPurchases?.products ?? [];
  } catch (err) {
    console.error("Failed to fetch Median IAP product info:", err);
    return [];
  }
}

/**
 * Launches Median's native Google Play purchase flow for the
 * "premium" subscription product, picking the offer that matches
 * the given base plan ID (e.g. "monthly", "yearly"). Returns the
 * purchase token on success, or null if the user cancelled or
 * something failed.
 */
export async function purchaseMedianProduct(
  productId: string,
  basePlanId?: string
): Promise<{ purchaseToken: string; orderId: string } | null> {
  if (!isMedianApp()) return null;

  try {
    const products = await getMedianProducts();
    const product = products.find((p) => p.productID === productId);

    // Subscription ("subs") purchases require an offerToken taken
    // from the current product info. When the product has multiple
    // base plans (monthly/quarterly/etc.), pick the one matching
    // basePlanId; otherwise fall back to the first available offer.
    let offerToken: string | undefined;

    if (product?.type === "subs" && product.subscriptionOfferDetails) {
      const matchingOffer = basePlanId
        ? product.subscriptionOfferDetails.find(
            (o) => o.basePlanId === basePlanId
          )
        : product.subscriptionOfferDetails[0];

      offerToken = matchingOffer?.offerToken;

      if (basePlanId && !offerToken) {
        console.error(
          `No offer found for basePlanId "${basePlanId}" on product "${productId}"`
        );
        return null;
      }
    }

    const result = await window.median!.iap!.purchase({
      productID: productId,
      ...(offerToken ? { offerToken } : {}),
    });

    return { purchaseToken: result.purchaseToken, orderId: result.orderId };
  } catch (err) {
    // User cancelled the sheet, or a genuine failure — Median
    // throws for both, caller treats it as "cancelled"
    console.error("Median IAP purchase failed/cancelled:", err);
    return null;
  }
}
