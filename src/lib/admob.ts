// AdMob (native Android app only). On the website nothing here runs.
// The native plugin (@capacitor-community/admob) is installed by the Android
// build workflow, so the website build needs no extra npm package.
import { registerPlugin } from "@capacitor/core";

export const AdMob = registerPlugin<any>("AdMob");

export const ADMOB_IDS = {
  appId: "ca-app-pub-1895906484640218~1309077730", // set in the build workflow
  banner: "ca-app-pub-1895906484640218/9845162393",
  // Created in AdMob but NOT used yet (too intrusive for a signals app):
  interstitial: "ca-app-pub-1895906484640218/6424792134",
  rewarded: "ca-app-pub-1895906484640218/7139108003",
  appOpen: "ca-app-pub-1895906484640218/5826026338",
};

// Space (dp) kept free at the bottom so the banner sits ABOVE the bottom menu.
const BANNER_BOTTOM_MARGIN = 78;

export const isNativeApp = () =>
  !!(window as any).Capacitor?.isNativePlatform?.();

let ready: Promise<boolean> | null = null;

/** Consent form (EEA/UK users) + SDK init. Safe to call many times. */
export const initAdMob = (): Promise<boolean> => {
  if (!isNativeApp()) return Promise.resolve(false);
  if (!ready) {
    ready = (async () => {
      try {
        try {
          const info = await AdMob.requestConsentInfo();
          if (info.isConsentFormAvailable && info.status === "REQUIRED") {
            await AdMob.showConsentForm();
          }
        } catch (e) {
          console.warn("AdMob consent step failed:", e);
        }
        await AdMob.initialize();
        return true;
      } catch (e) {
        // Old app build without the native plugin, or init failed.
        console.warn("AdMob unavailable:", e);
        return false;
      }
    })();
  }
  return ready;
};

export const showBanner = async () => {
  if (!(await initAdMob())) return;
  try {
    await AdMob.showBanner({
      adId: ADMOB_IDS.banner,
      adSize: "ADAPTIVE_BANNER",
      position: "BOTTOM_CENTER",
      margin: BANNER_BOTTOM_MARGIN,
      // Dev builds use Google's test ads. Never tap your own live ads.
      isTesting: import.meta.env.DEV,
    });
  } catch (e) {
    console.warn("AdMob banner failed:", e);
  }
};

export const removeBanner = async () => {
  if (!isNativeApp()) return;
  try {
    await AdMob.removeBanner();
  } catch {
    /* nothing to remove */
  }
};
