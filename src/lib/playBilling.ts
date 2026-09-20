// ============================================================
// GOOGLE PLAY BILLING (via Digital Goods API + Payment Request API)
// ============================================================
// Works ONLY inside the TWA app installed from Google Play —
// never in a normal mobile/desktop browser. ALWAYS check
// isPlayBillingAvailable() first and fall back to your existing
// payment page if it's false (see usePlayBilling.ts).
// ============================================================

const PLAY_BILLING_METHOD = "https://play.google.com/billing";

export interface PlayProductDetails {
  itemId: string;
  title: string;
  description: string;
  price: { currency: string; value: string };
}

let cachedService: any = null;

async function getDigitalGoodsService() {
  if (cachedService) return cachedService;

  if (!("getDigitalGoodsService" in window)) {
    return null;
  }

  try {
    // @ts-ignore — getDigitalGoodsService isn't in the default TS lib yet
    cachedService = await (window as any).getDigitalGoodsService(
      PLAY_BILLING_METHOD
    );
    return cachedService;
  } catch {
    return null;
  }
}

export async function isPlayBillingAvailable(): Promise<boolean> {
  const service = await getDigitalGoodsService();
  return !!service;
}

export async function getProductDetails(
  productIds: string[]
): Promise<PlayProductDetails[]> {
  const service = await getDigitalGoodsService();
  if (!service) return [];
  try {
    return await service.getDetails(productIds);
  } catch (err) {
    console.error("Failed to fetch Play product details:", err);
    return [];
  }
}

/**
 * Launches the native Play Store checkout sheet for a product or
 * subscription. Returns the purchase token on success, or null if
 * the user cancelled or something failed.
 */
export async function purchaseProduct(
  productId: string
): Promise<{ purchaseToken: string } | null> {
  const service = await getDigitalGoodsService();
  if (!service) return null;

  try {
    const paymentMethods = [
      {
        supportedMethods: PLAY_BILLING_METHOD,
        data: { sku: productId },
      },
    ];

    // The actual price shown to the user comes from Play Console,
    // not from this object — this is just required by the
    // PaymentRequest API's shape.
    const paymentDetails = {
      total: {
        label: "Total",
        amount: { currency: "USD", value: "0" },
      },
    };

    // @ts-ignore — PaymentRequest is a global DOM API
    const request = new PaymentRequest(paymentMethods, paymentDetails);
    const response = await request.show();

    const purchaseToken = response.details.purchaseToken as string;

    // Required: tells the browser the "payment" step succeeded
    await response.complete("success");

    return { purchaseToken };
  } catch (err) {
    // User closed the sheet, or something genuinely failed —
    // both look the same from here, caller treats it as "cancelled"
    console.error("Play Billing purchase failed/cancelled:", err);
    return null;
  }
}

/**
 * For ONE-TIME (consumable) products only — call this after your
 * backend has verified the purchase, so Google knows the item can
 * be bought again later (e.g. "remove ads for 30 days" repurchase).
 * Do NOT call this for subscriptions.
 */
export async function acknowledgeConsumable(purchaseToken: string) {
  const service = await getDigitalGoodsService();
  if (!service) return;
  try {
    await service.consume(purchaseToken);
  } catch (err) {
    console.error("Failed to consume purchase:", err);
  }
}
