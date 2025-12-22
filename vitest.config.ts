import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["server/**/*.test.ts", "client/**/*.test.ts", "client/**/*.test.tsx"],
    globals: true,
    environment: "jsdom",
    setupFiles: ["./client/src/test/setup.ts"],
  },
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@": path.resolve(import.meta.dirname, "client/src"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
});
