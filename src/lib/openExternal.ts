/**
 * Opens an outbound link (broker / affiliate / social).
 *
 *  - Inside the Android app: NativeBrowser.open() shows the page in an
 *    in-app Chrome Custom Tab (Telegram / WhatsApp / Play Store links open
 *    their own app). The Android BACK button (or the X) returns straight
 *    to the app exactly where the user was — no switching back from a
 *    browser, and the site does not reload.
 *  - In a normal mobile browser: unchanged behaviour (Android intent://
 *    trick so the link escapes a PWA / wrapped view).
 *  - Everywhere else: a normal target="_blank" open.
 */

declare global {
  interface Window {
    // Java bridges injected by MainActivity (see .github/workflows/build-android.yml)
    NativeBrowser?: { open: (url: string) => void };
    // Called by MainActivity when the Android BACK button is pressed.
    // Returns true when the web app handled it (navigated back / closed
    // something); false means "nothing left to go back to".
    __appBack?: () => boolean;
  }
}

export function isNativeApp(): boolean {
  return typeof window !== "undefined" && !!window.NativeBrowser;
}

export function openExternal(url: string) {
  if (typeof window !== "undefined" && window.NativeBrowser) {
    try {
      window.NativeBrowser.open(url);
      return;
    } catch {
      // fall through to the browser behaviour below
    }
  }

  const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

  if (isAndroid) {
    try {
      const noScheme = url.replace(/^https?:\/\//, "");
      const intentUrl = `intent://${noScheme}#Intent;scheme=https;action=android.intent.action.VIEW;launchFlags=0x10000000;end`;
      window.location.href = intentUrl;
      return;
    } catch {
      // fall through to the normal open below
    }
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
