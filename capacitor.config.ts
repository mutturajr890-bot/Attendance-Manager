import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.smartattendance.app",
  appName: "Smart Attendance Manager",
  webDir: "capacitor-www",

  android: {
    backgroundColor: "#0d2149",
  },

  server: {
    url: "https://attendance-manager-2wit.onrender.com",
    androidScheme: "https",
  },
};

export default config;