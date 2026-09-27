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
  // Plain dark background (resources/splash.png is now a solid color, no
  // logo/text baked in) + Android's own small native spinner — a minimal,
  // modern "just spinning" look instead of a big branded splash graphic.
  // launchAutoHide is OFF: src/main.tsx hides it once the web app is ready,
  // with a 20s hard safety ceiling so it can never get stuck.
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#EAFBF4',
      androidScaleType: 'CENTER',
      showSpinner: true,
      spinnerColor: '#16A34A',
      androidSpinnerStyle: 'large',
    },
  },
};

export default config;
