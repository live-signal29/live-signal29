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

// Last reason AdMob wasn't available — shown as a toast so we can see
// WHY the ad didn't play (remove the toast once ads work).
let lastAdError = "";

/**
 * Real AdMob rewarded video (Android app only). Resolves:
 *  - "rewarded"    user watched the ad and earned the reward -> unlock
 *  - "closed"      user closed the ad early -> NO unlock
 *  - "unavailable" no ad / plugin missing / error -> caller falls back
 */
const showAdMobRewarded = async (): Promise<AdMobResult> => {
  if (!isNativeApp()) {
    lastAdError = "not native app (Capacitor missing)";
    return "unavailable";
  }
  if (!(await initAdMob())) {
    lastAdError = "AdMob plugin missing / init failed (old app build?)";
    return "unavailable";
  }

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
          await AdMob.addListener("onRewardedVideoAdFailedToLoad", (err: any) => {
            lastAdError = `load failed: code ${err?.code} ${err?.message ?? ""}`;
            done("unavailable");
          }),
          await AdMob.addListener("onRewardedVideoAdFailedToShow", (err: any) => {
            lastAdError = `show failed: code ${err?.code} ${err?.message ?? ""}`;
            done("unavailable");
          })
        );

        // If the ad never starts within 30s (slow network / no fill), fall back.
        timer = setTimeout(() => {
          if (!showed) {
            lastAdError = "timeout: ad did not start in 30s";
            done("unavailable");
          }
        }, 30000);

        await AdMob.prepareRewardVideoAd({
          adId: ADMOB_IDS.rewarded,
          // Dev builds use Google's test ads. Never tap your own live ads.
          isTesting: import.meta.env.DEV,
        });
        await AdMob.showRewardVideoAd();
      } catch (e) {
        console.warn("AdMob rewarded failed:", e);
        lastAdError = `error: ${(e as any)?.message ?? String(e)}`;
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
  let result: AdMobResult = "unavailable";

  if (isNativeApp()) {
    result = await showAdMobRewarded();
  } else {
    lastAdError = "not native app (Capacitor missing) - old/Median build?";
  }

  if (result === "closed") {
    toast.info("Ad poora dekhna zaroori hai, tab signal unlock hoga.");
    return false;
  }

  if (result === "unavailable") {
    // Debug toast (v3): tells us WHY the ad did not play. Remove later.
    toast.error(`[v3] Ad nahi chala: ${lastAdError || "unknown"}`, {
      duration: 12000,
    });
  }

  // "rewarded" or "unavailable" -> countdown
  return runCountdown(onTick);
};
