// ============================================================
// REWARDED AD TRIGGER
// ============================================================
// IMPORTANT: Monetag's OnClick (Popunder) tag — the classic
// tag.min.js script — does NOT expose a callable function or a
// "did the user finish watching" signal. It's a global click
// listener: any click anywhere on the page may (subject to
// Monetag's own frequency capping) silently open a popunder tab
// in the background. There is nothing to await.
//
// So instead of waiting on a real completion callback (which
// this ad format cannot provide), clicking "Unlock" itself is
// already a qualifying click for Monetag — the popunder fires on
// its own if one is due. We simply show a short timed "loading"
// state so it still feels like an ad was watched, then unlock.
//
// Setup: paste Monetag's <script> snippet (the one with
// `data-zone` / `tag.min.js`) once in index.html — do NOT put it
// inside this file, it just needs to be loaded on the page.
//
// If you later get a real rewarded format from Monetag (one that
// gives you a `show_XXXXXXX()` function returning a Promise),
// swap the body of showRewardedAd() below to call that instead —
// the rest of the app (SignalUnlockGate, etc.) doesn't need to
// change.
// ============================================================

const SIMULATED_AD_DURATION_MS = 6000;

export const showRewardedAd = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // The click that led here already happened — Monetag's global
    // listener (if loaded) has already had its chance to fire a
    // popunder. We just wait out a short "watching" period.
    setTimeout(() => {
      resolve(true);
    }, SIMULATED_AD_DURATION_MS);
  });
};
