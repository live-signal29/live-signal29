// ============================================================
// REWARDED AD — AdMob rewarded video (Monetag removed)
// ============================================================
// Android app: real AdMob rewarded ad, unlock only when reward is earned.
// If AdMob isn't available (website / Median build / no fill): the
// plain 10-second countdown runs, then the signal unlocks.
import { toast } from "sonner";
import { AdMob, ADMOB_IDS, initAdMob, isNativeApp } from "@/lib/admob";

export const REWARDED_AD_SECONDS = 10;

type AdMobResult = "rewarded" | "closed" | "unavailable";

/**
 * Real AdMob rewarded video (Android app only). Resolves:
 *  - "rewarded"    user watched the ad and earned the reward -> unlock
 *  - "closed"      user closed the ad early -> NO unlock
 *  - "unavailable" no ad / plugin missing / error -> caller falls back
 */
const showAdMobRewarded = async (): Promise<AdMobResult> => {
  if (!isNativeApp()) return "unavailable";
  if (!(await initAdMob())) return "unavailable";

  return new Promise<AdMobResult>((resolve) => {
    const handles: any[] = [];
    let rewarded = false;
    let showed = false;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const done = (r: AdMobResult) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      handles.forEach((h) => {
        try {
          h?.remove?.();
        } catch {
          /* ignore */
        }
      });
      resolve(r);
    };

    (async () => {
      try {
        handles.push(
          await AdMob.addListener("onRewardedVideoAdReward", () => {
            rewarded = true;
          }),
          await AdMob.addListener("onRewardedVideoAdShowed", () => {
            showed = true;
          }),
          await AdMob.addListener("onRewardedVideoAdDismissed", () =>
            done(rewarded ? "rewarded" : "closed")
          ),
          await AdMob.addListener("onRewardedVideoAdFailedToLoad", () =>
            done("unavailable")
          ),
          await AdMob.addListener("onRewardedVideoAdFailedToShow", () =>
            done("unavailable")
          )
        );

        // If the ad never starts within 30s (slow network / no fill), fall back.
        timer = setTimeout(() => {
          if (!showed) done("unavailable");
        }, 30000);

        await AdMob.prepareRewardVideoAd({
          adId: ADMOB_IDS.rewarded,
          // Dev builds use Google's test ads. Never tap your own live ads.
          isTesting: import.meta.env.DEV,
        });
        await AdMob.showRewardVideoAd();
      } catch (e) {
        console.warn("AdMob rewarded failed:", e);
        done("unavailable");
      }
    })();
  });
};

const runCountdown = (
  onTick?: (secondsRemaining: number) => void
): Promise<boolean> =>
  new Promise((resolve) => {
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

/**
 * Flow: tap -> AdMob rewarded ad plays -> user comes back after the
 * reward -> 10 second countdown -> signal unlocks.
 * Ad closed early (no reward) -> no unlock.
 * AdMob unavailable (website / no fill) -> just the 10s countdown.
 */
export const showRewardedAd = async (
  onTick?: (secondsRemaining: number) => void
): Promise<boolean> => {
  if (isNativeApp()) {
    const result = await showAdMobRewarded();
    if (result === "closed") {
      toast.info("Ad poora dekhna zaroori hai, tab signal unlock hoga.");
      return false;
    }
    // "rewarded" or "unavailable" -> countdown below
  }

  return runCountdown(onTick);
};
