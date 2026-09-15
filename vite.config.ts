import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

// Standard TanStack Start Vite config (previously wrapped by
// @lovable.dev/vite-tanstack-config, which has been removed).
// src/server.ts is kept as the custom SSR entry, matching the app's
// existing error-handling wrapper.
export default defineConfig({
  server: {
    allowedHosts: ["breezy-attend.onrender.com"],
  },
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    viteReact(),
  ],
});
