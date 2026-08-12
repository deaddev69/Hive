import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.hivenow.seller",
  appName: "Hive Partners",
  webDir: "public",
  server: {
    url: "https://seller.hivenow.in",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "seller.hivenow.in",
      "clerk.hivenow.in",
      "accounts.hivenow.in",
      "*.clerk.accounts.dev",
      "*.clerk.com",
      "accounts.google.com",
      "*.google.com",
      "*.google.co.in",
      "*.googleapis.com",
      "*.gstatic.com",
    ],
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
