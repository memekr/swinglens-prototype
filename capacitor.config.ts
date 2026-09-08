import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.swinglens.app',
  appName: 'SwingLens',
  webDir: 'public',
  server: {
    url: 'https://swinglens-prototype.vercel.app',
    cleartext: false
  }
};

export default config;
