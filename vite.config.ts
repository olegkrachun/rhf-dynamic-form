import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Vite config for the sample app dev server only.
 * Library build is handled by tsdown.
 */
export default defineConfig({
  plugins: [react()],
  root: "sample",
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
