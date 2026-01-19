import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: "public/manifest.json",
      additionalInputs: ["settings.html"],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
