// ============================================================
// REWARDED AD TRIGGER
// ============================================================
// Most rewarded-ad networks (Adsterra, Monetag, etc.) give you
// a <script> snippet to paste in index.html, which exposes a
// global function on `window`. That function returns a Promise
// that resolves once the user has watched the FULL ad — not if
// they skip or close it early.
//
// 1. Get your rewarded ad zone snippet from your network's
//    dashboard and paste it in index.html (or load it dynamically).
// 2. Replace `show_REWARDED_AD_ZONE_ID` below with the exact
//    function name your network's snippet defines.
// ============================================================

declare global {
  interface Window {
    show_REWARDED_AD_ZONE_ID?: () => Promise<void>;
  }
}

export const showRewardedAd = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window.show_REWARDED_AD_ZONE_ID === "function") {
      window
        .show_REWARDED_AD_ZONE_ID()
        .then(() => resolve(true))
        .catch(() => resolve(false));
    } else {
      console.error(
        "Rewarded ad SDK not loaded — check that the ad network's script tag is in index.html"
      );
      resolve(false);
    }
  });
};
