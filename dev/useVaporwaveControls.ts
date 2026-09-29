import { useControls } from "leva";

import {
  DEFAULT_CONFIG,
  type VaporwaveConfigOverrides,
  type VaporwaveScene,
} from "../src";

/**
 * Dev-only leva panel over the whole config. Lives outside `src/` so leva never
 * ships with the package — Storybook and the example playground use it to feed
 * `VaporwaveConfigProvider` / the `config` prop.
 *
 * Folders are generated from the defaults, so new config values show up here
 * automatically. Values without a range below get leva's plain number input.
 */

type Range = { min?: number; max?: number; step?: number };

const CELL = DEFAULT_CONFIG.scene.track.cell;

const RANGES: {
  [S in keyof VaporwaveScene]?: { [K in keyof VaporwaveScene[S]]?: Range };
} = {
  camera: {
    fov: { min: 20, max: 120, step: 1 },
    tiltX: { min: -0.5, max: 0.5, step: 0.005 },
  },
  track: {
    halfWidth: { min: 0.1, max: 6, step: 0.05 },
    cell: { min: 0.1, max: 2, step: 0.05 },
    speed: { min: -3, max: 3, step: 0.05 },
    lineWidth: { min: 0, max: 0.1, step: 0.001 },
    glowWidth: { min: 0, max: 0.5, step: 0.005 },
    rail: { min: 0, max: 3, step: 0.05 },
  },
  water: {
    amp: { min: 0, max: 0.5, step: 0.005 },
    falloff: { min: 0, max: 3, step: 0.05 },
    rows: { min: 16, max: 640, step: 1 },
    cols: { min: 16, max: 640, step: 1 },
  },
  mountains: {
    valley: { min: 0, max: 10, step: 0.05 },
    ramp: { min: 0.1, max: 15, step: 0.1 },
    height: { min: 0, max: 10, step: 0.05 },
    scale: { min: 0.5, max: 20, step: 0.1 },
    // Extents must stay whole cells so the lattice lines meet the track's.
    halfWidth: { min: CELL, max: 100, step: CELL },
    near: { min: -20, max: 20, step: CELL },
    far: { min: -400, max: 0, step: CELL },
    lineWidth: { min: 0, max: 0.1, step: 0.001 },
    glowWidth: { min: 0, max: 0.5, step: 0.005 },
  },
  sun: {
    radius: { min: 1, max: 30, step: 0.5 },
    bands: { min: 0, max: 40, step: 1 },
    emission: { min: 0, max: 3, step: 0.05 },
  },
  glitch: {
    rate: { min: 0, max: 10, step: 0.1 },
    chance: { min: 0, max: 1, step: 0.01 },
    duration: { min: 0, max: 1, step: 0.01 },
    slices: { min: 1, max: 64, step: 1 },
    amount: { min: 0, max: 0.3, step: 0.005 },
    density: { min: 0, max: 1, step: 0.01 },
    split: { min: 0, max: 0.1, step: 0.001 },
    dropout: { min: 0, max: 1, step: 0.01 },
  },
  sunGlow: {
    radius: { min: 0, max: 5, step: 0.05 },
    strength: { min: 0, max: 1, step: 0.01 },
    skyRadius: { min: 0.5, max: 89, step: 0.5 },
    skyStrength: { min: 0, max: 1, step: 0.01 },
    fogRadius: { min: 0.5, max: 89, step: 0.5 },
    fogStrength: { min: 0, max: 1, step: 0.01 },
  },
  reflection: {
    scale: { min: 0.1, max: 1, step: 0.05 },
    strength: { min: 0, max: 1, step: 0.01 },
    distort: { min: 0, max: 0.2, step: 0.005 },
  },
  fog: {
    near: { min: 0, max: 50, step: 0.1 },
    far: { min: 1, max: 200, step: 0.5 },
    power: { min: 0.1, max: 4, step: 0.05 },
  },
  stars: {
    count: { min: 0, max: 5000, step: 10 },
    radius: { min: 50, max: 1000, step: 10 },
  },
};

type Field =
  boolean | number | string | readonly number[] | ({ value: number } & Range);

function schemaFor(section: keyof VaporwaveScene): Record<string, Field> {
  const defaults = DEFAULT_CONFIG.scene[section] as Record<string, Field>;
  const ranges = (RANGES[section] ?? {}) as Record<string, Range | undefined>;

  return Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => {
      const range = ranges[key];
      return [
        key,
        typeof value === "number" && range ? { value, ...range } : value,
      ];
    }),
  );
}

const FOLDER = { collapsed: true };

export function useVaporwaveControls(): VaporwaveConfigOverrides {
  // One call per section: leva wants keys unique within a call, and several
  // sections share names like `near`, `far` and `radius`.
  const camera = useControls("Camera", schemaFor("camera"), FOLDER);
  const track = useControls("Track", schemaFor("track"), FOLDER);
  const water = useControls("Water", schemaFor("water"), FOLDER);
  const mountains = useControls("Mountains", schemaFor("mountains"), FOLDER);
  const sun = useControls("Sun", schemaFor("sun"), FOLDER);
  const glitch = useControls("Glitch", schemaFor("glitch"), FOLDER);
  const sunGlow = useControls("Sun glow", schemaFor("sunGlow"), FOLDER);
  const reflection = useControls("Reflection", schemaFor("reflection"), FOLDER);
  const fog = useControls("Fog", schemaFor("fog"), FOLDER);
  const stars = useControls("Stars", schemaFor("stars"), FOLDER);
  const palette = useControls("Palette", { ...DEFAULT_CONFIG.palette }, FOLDER);

  return {
    scene: {
      camera,
      track,
      water,
      mountains,
      sun,
      glitch,
      sunGlow,
      reflection,
      fog,
      stars,
    } as VaporwaveConfigOverrides["scene"],
    palette,
  };
}
