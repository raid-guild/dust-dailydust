import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths({
      // If you keep aliases in tsconfig.app.json, point to it explicitly:
      projects: ["./tsconfig.app.json"],
    }),
  ],
  server: {
    allowedHosts: true,
    cors: {
      origin: "*",
      credentials: false,
    },
  },
});
