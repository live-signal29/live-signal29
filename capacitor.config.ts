import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.median.android.krkqyaz',
  appName: 'Live Signals Buy/Sell',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://live-signal29.vercel.app/',
    cleartext: false,
  },
  // Keeps the branded splash (resources/splash.png) on screen while the
  // remote URL above is being fetched, instead of a blank white WebView.
  // launchAutoHide + launchShowDuration hides it automatically once that
  // load has had time to finish, since this build has no local bundle to
  // signal "ready" from.
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#0b1a1f',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
