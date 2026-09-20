// ============================================================
// REWARDED AD TRIGGER — scoped to the "Watch Ad" button only
// ============================================================
// We switched away from Monetag's OnClick/Popunder tag (which
// attached a global click-listener to the whole page — ANY tap
// anywhere could silently open an ad tab). That script has been
// removed from index.html.
//
// Instead we use Monetag's "Direct Link" format: a plain URL that
// we open ourselves, exactly once, only when the user taps
// "Watch Ad" — nowhere else in the app.
//
// ⚠️ SET THIS: go to your Monetag dashboard → zone 11845159 (or a
// new zone) → "Direct Link" tab → copy the URL it gives you and
// paste it below. Leave it empty/placeholder and the countdown
// will still run (no ad tab opens), so the app keeps working
// while you're mid-setup — just no monetization until this is
// filled in.
const MONETAG_DIRECT_LINK_URL = "https://omg10.com/4/11847978";

export const REWARDED_AD_SECONDS = 10;

/**
 * Opens the Monetag Direct Link exactly once, in a new tab, without
 * blocking or waiting on it (Direct Link doesn't give a completion
 * signal — same limitation as before). Safe to call even if the
 * placeholder URL hasn't been replaced yet.
 */
const openDirectLinkAd = () => {
  if (!MONETAG_DIRECT_LINK_URL || MONETAG_DIRECT_LINK_URL.includes("REPLACE_WITH_YOUR")) {
    return;
  }
  try {
    window.open(MONETAG_DIRECT_LINK_URL, "_blank", "noopener,noreferrer");
  } catch {
    // Popup blocked or similar — fine, the countdown/unlock still proceeds.
  }
};

/**
 * Runs a visible countdown from REWARDED_AD_SECONDS down to 0.
 * Fires the Direct Link ad once at the start (this call IS the
 * qualifying user click/gesture Monetag needs). onTick is called
 * once per second with the seconds remaining (including the
 * initial call with the full duration), so the caller can render
 * "10", "9", "8"... in the UI. Resolves true once the countdown
 * finishes naturally.
 */
export const showRewardedAd = (
  onTick?: (secondsRemaining: number) => void
): Promise<boolean> => {
  openDirectLinkAd();

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
