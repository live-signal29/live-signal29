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

/**
 * Runs a visible countdown from REWARDED_AD_SECONDS down to 0.
 * onTick is called
 * once per second with the seconds remaining (including the
 * initial call with the full duration), so the caller can render
 * "10", "9", "8"... in the UI. Resolves true once the countdown
 * finishes naturally.
 */
export const showRewardedAd = async (
  onTick?: (secondsRemaining: number) => void
): Promise<boolean> => {
  // 1) Android app: real AdMob rewarded ad. Unlock ONLY if watched fully.
  if (isNativeApp()) {
    const result = await showAdMobRewarded();
    if (result === "rewarded") {
      onTick?.(0);
      return true;
    }
    if (result === "closed") {
      toast.info("Ad poora dekhna zaroori hai, tab signal unlock hoga.");
      return false;
    }
    // "unavailable" -> fall through to the old countdown below
  }

  // 2) Website (or no AdMob ad available): old countdown flow.
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
