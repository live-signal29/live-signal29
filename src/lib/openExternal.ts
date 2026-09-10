/**
 * Forces an outbound link to open in the device's actual external browser
 * instead of staying inside an in-app WebView / Trusted-Web-Activity
 * Custom Tab — the usual reason a link "opens inside the app" when the
 * site is also installed/wrapped as a Play Store app.
 *
 * On Android, navigating to an `intent://` URL hands control to the OS's
 * own app/browser chooser, which reliably escapes the wrapping
 * WebView/Custom Tab. That trick is Android-only, so everywhere else this
 * just does a normal target="_blank" open.
 */
export function openExternal(url: string) {
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
