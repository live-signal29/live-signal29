import { useEffect, useState } from 'react';
import OneSignal from 'react-onesignal';
import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID =
  import.meta.env.VITE_ONESIGNAL_APP_ID || 'ecd43f8e-031e-41f0-a082-9af60943a575';

// Inside the Android APK the *native* OneSignal SDK handles push (see
// .github/workflows/build-android.yml). WebViews can't do web push, so the web
// SDK must not run there. The APK exposes window.NativePush for user linking.
export const isNativeApp = () =>
  typeof window !== 'undefined' &&
  (!!(window as any).NativePush || !!(window as any).Capacitor?.isNativePlatform?.());

let initPromise: Promise<boolean> | null = null;

// OneSignal.init() must run exactly once. A second call throws
// "SDK already initialized" and aborts everything after it (that's what broke push before).
export const initOneSignalOnce = (): Promise<boolean> => {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (isNativeApp()) return false;
    try {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        // Own scope so it doesn't fight with /service-worker.js (PWA cache worker)
        serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/push/onesignal/' },
      });
      console.log('OneSignal initialized');
      return true;
    } catch (error) {
      console.error('OneSignal initialization error:', error);
      initPromise = null; // allow a retry
      return false;
    }
  })();
  return initPromise;
};

// Link this device to the logged-in user (external_id = supabase user id),
// so the backend can target admins / a specific user.
let lastLinkedId: string | null | undefined;
const linkUser = async (userId: string | null, attempt = 0) => {
  if (lastLinkedId === userId) return;
  lastLinkedId = userId;
  try {
    if (isNativeApp()) {
      const bridge = (window as any).NativePush;
      if (!bridge) {
        // JS bridge is attached right after the WebView is created — retry shortly
        lastLinkedId = undefined;
        if (attempt < 6) setTimeout(() => linkUser(userId, attempt + 1), 1500);
        return;
      }
      if (userId) bridge.login(userId);
      else bridge.logout();
      return;
    }
    if (!(await initOneSignalOnce())) return;
    if (userId) await OneSignal.login(userId);
    else await OneSignal.logout();
  } catch (error) {
    console.error('OneSignal user link error:', error);
  }
};

export const useOneSignal = () => {
  const [initialized, setInitialized] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Init + permission prompt (asked on the first tap — browsers block prompts without a gesture)
  useEffect(() => {
    let cancelled = false;
    let removeGesture: (() => void) | undefined;

    (async () => {
      const ok = await initOneSignalOnce();
      if (!ok || cancelled) return;
      setInitialized(true);

      const notif: any = OneSignal.Notifications;
      setPermissionGranted(!!notif.permission);
      notif.addEventListener?.('permissionChange', (granted: boolean) => setPermissionGranted(!!granted));

      if (notif.permission) {
        try { await (OneSignal.User as any).PushSubscription.optIn(); } catch { /* already opted in */ }
        return;
      }
      if (notif.permissionNative === 'denied') return;

      const ask = async () => {
        removeGesture?.();
        try {
          const granted = await OneSignal.Notifications.requestPermission();
          setPermissionGranted(!!granted);
        } catch (e) {
          console.error('Push permission error:', e);
        }
      };
      window.addEventListener('pointerdown', ask, { once: true });
      removeGesture = () => window.removeEventListener('pointerdown', ask);
    })();

    return () => {
      cancelled = true;
      removeGesture?.();
    };
  }, []);

  // Keep OneSignal external_id in sync with the Supabase session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => linkUser(data.session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      linkUser(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { initialized, permissionGranted };
};
