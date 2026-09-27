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
  plugins: {
    SplashScreen: {
      // Let Android show its launch splash only briefly, then hand over to
      // the lightweight HTML loader. Do NOT call SplashScreen.show() manually.
      launchAutoHide: true,
      launchShowDuration: 700,
      launchFadeOutDuration: 180,
      backgroundColor: '#EFFFF8',
      androidScaleType: 'CENTER',
      showSpinner: false,
      spinnerColor: '#22C55E',
      androidSpinnerStyle: 'small',
      splashFullScreen: false,
      splashImmersive: false,
    },
  },
};

export default config;
