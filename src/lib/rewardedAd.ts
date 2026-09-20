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
// its own if one is due. We show a visible countdown instead of
// a spinner, so it reads as "watch a few seconds to unlock"
// rather than a fake ad, then unlock once it hits zero.
//
// Setup: paste Monetag's <script> snippet (the one with
// `data-zone` / `tag.min.js`) once in index.html — do NOT put it
// inside this file, it just needs to be loaded on the page.
//
// If you later get a real rewarded format from Monetag (one that
// gives you a `show_XXXXXXX()` function returning a Promise),
// swap the body of showRewardedAd() below to call that instead —
// the rest of the app (SignalUnlockGate, etc.) doesn't need to
// change, just make sure to still call onTick if you want the
// countdown UI to keep working.
// ============================================================

export const REWARDED_AD_SECONDS = 10;

/**
 * Runs a visible countdown from REWARDED_AD_SECONDS down to 0.
 * onTick is called once per second with the seconds remaining
 * (including the initial call with the full duration), so the
 * caller can render "10", "9", "8"... in the UI.
 * Resolves true once the countdown finishes naturally.
 */
export const showRewardedAd = (
  onTick?: (secondsRemaining: number) => void
): Promise<boolean> => {
  return new Promise((resolve) => {
    let secondsRemaining = REWARDED_AD_SECONDS;
    onTick?.(secondsRemaining);

    const interval = setInterval(() => {
      secondsRemaining -= 1;
      onTick?.(Math.max(0, secondsRemaining));

      if (secondsRemaining <= 0) {
        clearInterval(interval);
        resolve(true);
      }
    }, 1000);
  });
};
