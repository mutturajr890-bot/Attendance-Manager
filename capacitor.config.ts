import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.smartattendance.app",
  appName: "Smart Attendance Manager",
  // This app is server-rendered (TanStack Start), so it can't be bundled
  // as static files the way Capacitor normally expects. Instead, the app
  // loads your live deployed website directly. Replace the URL below with
  // your own deployed site once you have it.
  webDir: "capacitor-www",
  android: {
    backgroundColor: "#0d2149",
  },
  server: {
    url: "http://10.0.2.2:5173",
    androidScheme: "https",
  },
};

export default config;