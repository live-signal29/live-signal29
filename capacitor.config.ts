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
  // launchAutoHide is OFF on purpose: with a remote server.url there is no
  // local bundle to time against, so a fixed duration used to hide the
  // splash before a slow connection had actually finished loading the page
  // — that gap was the white screen. The splash now stays up until
  // src/main.tsx calls SplashScreen.hide() itself, right after the web
  // app has taken over (see that file).
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0b1a1f',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
