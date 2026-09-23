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
};

export default config;
