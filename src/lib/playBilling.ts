// ============================================================
// GOOGLE PLAY BILLING — one API, two possible Android wrappers
//
//  1. "native"  window.NativeBilling — our own Java bridge
//               (BillingBridge.java, injected by
//               .github/workflows/build-android.yml). This is what the
//               Capacitor build that goes to Play Console uses.
//  2. "median"  window.median.iap — Median.co's bridge (kept so an old
//               Median build keeps working).
//
// In a normal browser neither exists -> isPlayBillingAvailable() is
// false and the site shows the crypto checkout instead.
//
// Everything is ONE Play subscription product ("premium") with four
// base plans (monthly / quarterly / half-yearly / yearly) — see
// PLAY_BILLING_SETUP.md.
// ============================================================

export const PREMIUM_PRODUCT_ID = "premium";

export interface PlayPlanOffer {
  basePlanId: string;
  formattedPrice: string; // localized, e.g. "$75.00" / "₹6,200"
  priceAmountMicros: number;
  currency: string;
  billingPeriod: string; // ISO-8601, e.g. "P3M"
}

export interface PlayPurchaseInfo {
  productId: string;
  purchaseToken: string;
  purchaseState: number; // 1 = purchased, 2 = pending
  autoRenewing?: boolean;
}

export type PurchaseOutcome =
  | { status: "purchased"; purchaseToken: string; orderId?: string }
  | { status: "pending" }
  | { status: "cancelled" }
  | { status: "error"; message?: string };

// ---------- global typings ----------

interface NativeBillingBridge {
  getOffers: (callbackId: string, productId: string) => void;
  purchase: (
    callbackId: string,
    productId: string,
    basePlanId: string,
    accountId: string
  ) => void;
  getPurchases: (callbackId: string) => void;
  manage: (productId: string) => void;
}

interface MedianProduct {
  productID: string;
  type: "inapp" | "subs";
  subscriptionOfferDetails?: Array<{
    offerId?: string;
    offerToken: string;
    basePlanId: string;
    pricingPhases: Array<{
      priceAmountMicros: number;
      priceCurrencyCode: string;
      formattedPrice: string;
      billingPeriod: string;
    }>;
  }>;
}

declare global {
  interface Window {
    NativeBilling?: NativeBillingBridge;
    __nativeBilling?: { resolve: (id: string, payload: unknown) => void };
    median?: {
      iap?: {
        info: () => Promise<{ inAppPurchases?: { products?: MedianProduct[] } }>;
        purchase: (opts: {
          productID: string;
          offerToken?: string;
        }) => Promise<{ purchaseToken: string; orderId: string }>;
        purchases: () => Promise<{
          allPurchases: Array<{
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

export type BillingProvider = "native" | "median";

export function getBillingProvider(): BillingProvider | null {
  if (typeof window === "undefined") return null;
  if (window.NativeBilling) return "native";
  if (window.median?.iap) return "median";
  return null;
}

export function isPlayBillingAvailable(): boolean {
  return getBillingProvider() !== null;
}

// ---------- native bridge plumbing ----------
// Java can't return a Promise to JS, so every call carries an id and the
// Java side answers with window.__nativeBilling.resolve(id, payload).

const pending = new Map<string, (payload: unknown) => void>();
let seq = 0;

function ensureNativeCallback() {
  if (!window.__nativeBilling) {
    window.__nativeBilling = {
      resolve: (id, payload) => {
        const done = pending.get(id);
        if (done) {
          pending.delete(id);
          done(payload);
        }
      },
    };
  }
}

function callNative<T>(
  start: (callbackId: string) => void,
  timeoutMs = 120_000
): Promise<T> {
  ensureNativeCallback();
  return new Promise<T>((resolve, reject) => {
    const id = `b${Date.now()}_${++seq}`;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Google Play did not respond"));
    }, timeoutMs);
    pending.set(id, (payload) => {
      clearTimeout(timer);
      resolve(payload as T);
    });
    try {
      start(id);
    } catch (err) {
      clearTimeout(timer);
      pending.delete(id);
      reject(err);
    }
  });
}

// ---------- prices / offers ----------

export async function getPlayOffers(): Promise<Record<string, PlayPlanOffer>> {
  const provider = getBillingProvider();
  const result: Record<string, PlayPlanOffer> = {};

  try {
    if (provider === "native") {
      const res = await callNative<{
        ok: boolean;
        offers?: Array<PlayPlanOffer & { offerId?: string | null }>;
      }>((id) => window.NativeBilling!.getOffers(id, PREMIUM_PRODUCT_ID), 30_000);

      for (const o of res.ok ? res.offers ?? [] : []) {
        // Skip promo/intro offers — show the regular base-plan price.
        if (o.offerId) continue;
        result[o.basePlanId] = {
          basePlanId: o.basePlanId,
          formattedPrice: o.formattedPrice,
          priceAmountMicros: o.priceAmountMicros,
          currency: o.currency,
          billingPeriod: o.billingPeriod,
        };
      }
    } else if (provider === "median") {
      const info = await window.median!.iap!.info();
      const product = info.inAppPurchases?.products?.find(
        (p) => p.productID === PREMIUM_PRODUCT_ID
      );
      for (const offer of product?.subscriptionOfferDetails ?? []) {
        if (offer.offerId) continue;
        const phase = offer.pricingPhases[offer.pricingPhases.length - 1];
        if (!phase) continue;
        result[offer.basePlanId] = {
          basePlanId: offer.basePlanId,
          formattedPrice: phase.formattedPrice,
          priceAmountMicros: phase.priceAmountMicros,
          currency: phase.priceCurrencyCode,
          billingPeriod: phase.billingPeriod,
        };
      }
    }
  } catch (err) {
    console.error("Failed to load Google Play prices:", err);
  }

  return result;
}

// ---------- purchase ----------

/**
 * Opens Google's purchase sheet for one base plan.
 * `accountId` (the Supabase user id) is attached to the purchase as
 * Play's "obfuscated account id" so the server can prove the purchase
 * belongs to the logged-in user.
 */
export async function purchasePlayPlan(
  basePlanId: string,
  accountId: string
): Promise<PurchaseOutcome> {
  const provider = getBillingProvider();

  try {
    if (provider === "native") {
      const res = await callNative<{
        ok: boolean;
        code?: "cancelled" | "pending" | "error";
        message?: string;
        purchases?: Array<{ purchaseToken: string; orderId?: string }>;
      }>(
        (id) =>
          window.NativeBilling!.purchase(
            id,
            PREMIUM_PRODUCT_ID,
            basePlanId,
            accountId
          ),
        // the user may take a while in the Google sheet
        10 * 60_000
      );

      if (res.ok && res.purchases?.[0]) {
        return {
          status: "purchased",
          purchaseToken: res.purchases[0].purchaseToken,
          orderId: res.purchases[0].orderId,
        };
      }
      if (res.code === "cancelled") return { status: "cancelled" };
      if (res.code === "pending") return { status: "pending" };
      return { status: "error", message: res.message };
    }

    if (provider === "median") {
      const info = await window.median!.iap!.info();
      const product = info.inAppPurchases?.products?.find(
        (p) => p.productID === PREMIUM_PRODUCT_ID
      );
      const offer = product?.subscriptionOfferDetails?.find(
        (o) => o.basePlanId === basePlanId && !o.offerId
      );
      if (!offer) {
        return {
          status: "error",
          message: `Base plan "${basePlanId}" not found in Play Console`,
        };
      }
      const r = await window.median!.iap!.purchase({
        productID: PREMIUM_PRODUCT_ID,
        offerToken: offer.offerToken,
      });
      return {
        status: "purchased",
        purchaseToken: r.purchaseToken,
        orderId: r.orderId,
      };
    }
  } catch (err) {
    console.error("Play purchase failed:", err);
    return { status: "error", message: String((err as Error)?.message ?? err) };
  }

  return { status: "error", message: "Google Play billing is not available" };
}

// ---------- existing purchases (restore / renewals) ----------

export async function getExistingPlayPurchases(): Promise<PlayPurchaseInfo[]> {
  const provider = getBillingProvider();
  try {
    if (provider === "native") {
      const res = await callNative<{
        ok: boolean;
        purchases?: PlayPurchaseInfo[];
      }>((id) => window.NativeBilling!.getPurchases(id), 30_000);
      return res.ok ? res.purchases ?? [] : [];
    }
    if (provider === "median") {
      const res = await window.median!.iap!.purchases();
      return (res.allPurchases ?? []).map((p) => ({
        productId: p.productID,
        purchaseToken: p.purchaseToken,
        purchaseState: p.purchaseState,
        autoRenewing: p.autoRenewing,
      }));
    }
  } catch (err) {
    console.error("Failed to read Google Play purchases:", err);
  }
  return [];
}

/** Opens the Play Store's own "Manage subscription" screen. */
export function openPlaySubscriptionSettings() {
  const provider = getBillingProvider();
  if (provider === "native") {
    window.NativeBilling!.manage(PREMIUM_PRODUCT_ID);
  } else if (provider === "median") {
    window.median!.iap!.manageSubscription({ productID: PREMIUM_PRODUCT_ID });
  } else {
    window.open(
      "https://play.google.com/store/account/subscriptions",
      "_blank",
      "noopener,noreferrer"
    );
  }
}
