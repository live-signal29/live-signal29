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

export const showRewardedAd = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Agar future me Monetag function create kare
    if (typeof (window as any).show_11845159 === "function") {
      (window as any)
        .show_11845159()
        .then(() => resolve(true))
        .catch(() => resolve(false));
    } else {
      // Instant unlock: Popunder ad background me trigger ho jayega
      resolve(true);
    }
  });
};
