export { LinearVaporwave } from "./components/LinearVaporwave";
export type {
  LinearVaporwaveProps,
  VaporwaveGround,
} from "./components/LinearVaporwave";

// Configuration
export { DEFAULT_CONFIG, resolveConfig } from "./utils/config";
export type {
  VaporwaveConfig,
  VaporwaveConfigOverrides,
  VaporwavePalette,
  VaporwaveScene,
} from "./utils/config";
export {
  useVaporwaveConfig,
  VaporwaveConfigProvider,
} from "./utils/config-context";

// Individual pieces, for composing a custom scene
export { default as GridTrack } from "./components/grid-track";
export { default as Mountains } from "./components/mountains";
export { Sky, Stars } from "./components/sky";
export { default as Sun } from "./components/sun";
export { default as Water } from "./components/water";
