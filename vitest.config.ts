import { defineConfig } from "vitest/config";

// Separate from vite.config.ts, which is rooted at ./example for the playground.
// @react-three/test-renderer needs no DOM, so the node environment is enough.
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    setupFiles: ["src/test/setup.ts"],
  },
});
