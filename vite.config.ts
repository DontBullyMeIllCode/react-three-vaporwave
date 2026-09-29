import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev playground: serves ./example and resolves the package name to ./src
export default defineConfig({
  root: "example",
  plugins: [react()],
  resolve: {
    alias: {
      "@dontbullymeillcode/react-three-vaporwave": fileURLToPath(
        new URL("./src/index.ts", import.meta.url),
      ),
    },
  },
});
