import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("react-router")) {
            return "router";
          }

          if (id.includes("@xyflow")) {
            return "flow";
          }

          if (id.includes("@base-ui") || id.includes("sonner")) {
            return "ui";
          }

          if (id.includes("lucide-react")) {
            return "icons";
          }

          if (id.includes("react-dom") || id.includes("node_modules/react/")) {
            return "react";
          }

          return undefined;
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    restoreMocks: true,
  },
});
