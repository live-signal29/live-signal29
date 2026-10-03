import { supabase } from "@/integrations/supabase/client";

// Deep-link scheme = Android appId. Must match the intent-filter in AndroidManifest.xml
// and be whitelisted in Supabase → Auth → URL Configuration → Redirect URLs.
const SCHEME = "co.median.android.krkqyaz";
export const NATIVE_REDIRECT = `${SCHEME}://auth/callback`;

export const isNativeApp = () =>
  !!(window as any).Capacitor?.isNativePlatform?.();

type Provider = "google" | "apple";

/** OAuth login that works on web AND inside the Android app. */
export async function oauthSignIn(provider: Provider, webPath = "/") {
  if (!isNativeApp()) {
    return supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${webPath}` },
    });
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return { error: error ?? new Error("No OAuth URL") };

  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: data.url });
  return { error: null };
}

let listening = false;

/** Call once at startup: catches the deep link coming back from the browser. */
export async function initNativeAuthListener() {
  if (!isNativeApp() || listening) return;
  listening = true;

  const [{ App }, { Browser }] = await Promise.all([
    import("@capacitor/app"),
    import("@capacitor/browser"),
  ]);

  App.addListener("appUrlOpen", async ({ url }) => {
    if (!url || !url.startsWith(NATIVE_REDIRECT)) return;
    try { await Browser.close(); } catch { /* already closed */ }

    try {
      const u = new URL(url);
      const code = u.searchParams.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      } else {
        const hash = new URLSearchParams(u.hash.replace(/^#/, ""));
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      }
    } finally {
      window.location.replace("/");
    }
  });
}
