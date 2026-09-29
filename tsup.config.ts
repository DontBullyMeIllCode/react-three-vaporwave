import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  // tsup injects `baseUrl`, which TS 6 deprecates
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    "react",
    "react/jsx-runtime",
    "three",
    "@react-three/fiber",
    "@react-three/drei",
  ],
});
