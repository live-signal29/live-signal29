// Tiny event bus so every screen re-reads the user's subscription right
// after a purchase / restore, instead of waiting for a full page reload.
// (useSubscriptionAccess keeps separate state per component, so without
// this the locked signal cards stayed locked after a successful payment.)

export const SUBSCRIPTION_UPDATED_EVENT = "live-signals:subscription-updated";

export function notifySubscriptionUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SUBSCRIPTION_UPDATED_EVENT));
}
