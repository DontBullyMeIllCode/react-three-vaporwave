/**
 * Shared tuning for the vaporwave scene.
 *
 * The scene is small: the camera sits ~1.1 units back and a third of a unit
 * above a neon grid that runs to the horizon, with sea or hills on either
 * side. Every distance below is in those units.
 */

export const SCENE = {
  camera: {
    position: [0, 0.34, 1.1] as [number, number, number],
    fov: 72,
    near: 0.01,
    far: 1200,
    /** Upward tilt, dropping the horizon below centre to leave room for the sun. */
    tiltX: 0.09,
  },
  track: {
    halfWidth: 2.4,
    /** Track spans this z range; the far end is swallowed by fog. */
    near: 3,
    far: -160,
    /** Grid cell size in world units. */
    cell: 0.4,
    /**
     * World units per second the grid rushes toward the camera, matching the
     * direction the swell travels. Negate to run the scene in reverse.
     */
    speed: 0.6,
    lineWidth: 0.022,
    glowWidth: 0.14,
    /** Brightness of the neon rails down the track's edges. 0 hides them. */
    rail: 0,
  },
  water: {
    /** Sits just below the track so waves lap at its edge without clipping. */
    level: -0.055,
    /** Peak wave height. Crests reach roughly this far above `level`. */
    amp: 0.09,
    halfWidth: 160,
    near: 3,
    far: -160,
    /** Distance over which waves ramp up from flat at the track edge. */
    falloff: 0.3,
    /** Mesh density. Rows/cols are graded, so most land near the camera. */
    rows: 320,
    cols: 220,
  },
  sun: {
    position: [0, 4, -30] as [number, number, number],
    radius: 10.5,
    bands: 14,
    /**
     * Brightness multiplier on the disc itself. Anything above 1 pushes it past
     * the bloom pass's luminance threshold, and how far past is what decides
     * how hard it blooms — so this is the knob for the sun's emission, not the
     * palette colours, which only set its hue.
     */
    emission: 1.15,
  },
  /**
   * VHS-style tearing on the sun's disc. It fires in short bursts rather than
   * running continuously, so it reads as a fault rather than an animation.
   */
  glitch: {
    /** Turn the tearing off entirely for a clean, steady disc. */
    enabled: false,
    /** Slots per second. Each slot is one roll for whether a burst happens. */
    rate: 2.5,
    /** Chance that any given slot tears. */
    chance: 0.3,
    /** How much of a slot the burst lasts, as a fraction of it. */
    duration: 0.35,
    /** Horizontal slices the disc tears into. */
    slices: 24,
    /** Furthest a slice slides sideways, in UV. */
    amount: 0.06,
    /** Fraction of slices that move during a burst. */
    density: 0.45,
    /** Colour-channel separation during a burst, in UV. */
    split: 0.018,
    /** Fraction of slices that black out entirely during a burst. */
    dropout: 0.1,
  },
  /**
   * The sun's glow reaches the frame three ways: a halo around the disc, a
   * wash across the sky, and a tint the horizon fog picks up. Each has its own
   * radius so you can spread one without dragging the others along.
   */
  sunGlow: {
    /**
     * How far the halo bleeds outward from the disc's edge, measured in sun
     * radii. This is the main knob — the quad it draws on resizes itself to
     * suit, so the glow is never clipped.
     */
    radius: 1.1,
    /** Halo brightness at the edge of the disc. */
    strength: 0.18,
    /** Angular radius of the wash thrown across the sky, in degrees. */
    skyRadius: 18,
    /** Brightness of that wash. */
    skyStrength: 0.35,
    /** Angular radius of the tint the horizon fog picks up, in degrees. */
    fogRadius: 40,
    /** Brightness of that tint. */
    fogStrength: 0.2,
  },
  /**
   * Planar reflection. The scene is re-rendered each frame from a camera
   * mirrored through the water plane, then sampled back by screen position.
   */
  reflection: {
    /** Mirror pass resolution as a fraction of the canvas. */
    scale: 0.5,
    /** Peak reflectivity, reached at grazing angles. */
    strength: 0.8,
    /** How far wave normals bend the reflected image, in screen units. */
    distort: 0.04,
  },
  /**
   * Procedural wireframe mountains, the alternative ground to the water. The
   * mesh is a lattice on the track's grid cell, so its lines meet the track's
   * and both scroll together.
   */
  mountains: {
    /** Flat valley floor either side of the centre line before slopes begin. */
    valley: 2.4,
    /** Distance over which the slopes climb from the valley to full height. */
    ramp: 2.5,
    /** Peak height. */
    height: 1.1,
    /** Rough width of a single peak. Bigger gives broader, gentler ranges. */
    scale: 2.2,
    /** Lattice extent. Keep these multiples of `track.cell`. */
    halfWidth: 40,
    near: 3.2,
    far: -160,
    /** Sits just below the track so the valley floor never z-fights with it. */
    floor: -0.01,
    lineWidth: 0.022,
    glowWidth: 0.12,
  },
  fog: {
    near: 3,
    far: 40,
    /** >1 keeps the near field clear and crushes the far field. */
    power: 0.8,
  },
  stars: {
    count: 500,
    /**
     * Distance of the star sphere. Must stay well beyond the water's far edge
     * — anything near the camera scatters points into the scene itself.
     */
    radius: 300,
  },
};

/**
 * The sky and fog glows fall off as `pow(cos angle, n)`. This turns an angular
 * radius in degrees into the `n` that puts half brightness exactly there, so
 * the config can talk in degrees instead of magic exponents.
 */
export function glowFalloff(degrees: number): number {
  const clamped = Math.min(Math.max(degrees, 0.5), 89);
  return Math.LN2 / -Math.log(Math.cos((clamped * Math.PI) / 180));
}

export const PALETTE = {
  fog: "#6f6fd8",
  sunGlow: "#ffb8d2",

  skyHorizon: "#ff6f8e",
  skyMid: "#8a2c9e",
  skyZenith: "#2a0b57",

  waterDeep: "#120838",
  waterShallow: "#35186e",

  neonA: "#3fd6ff",
  neonB: "#b35cff",

  sunTop: "#ffe27a",
  sunBottom: "#ff3f93",

  trackBase: "#120a35",
  trackLineA: "#3fd6ff",
  trackLineB: "#8f63ff",

  mountainBase: "#1c0c45",
  mountainLine: "#8aa0ff",

  star: "#ffe9ff",
} as const;

export type VaporwaveScene = typeof SCENE;
export type VaporwavePalette = Record<keyof typeof PALETTE, string>;

/** Every tunable value in the scene: distances and timings, plus colours. */
export type VaporwaveConfig = {
  scene: VaporwaveScene;
  palette: VaporwavePalette;
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

/** Any subset of the config. Tuples such as positions are replaced whole. */
export type VaporwaveConfigOverrides = {
  scene?: DeepPartial<VaporwaveScene>;
  palette?: Partial<VaporwavePalette>;
};

export const DEFAULT_CONFIG: VaporwaveConfig = {
  scene: SCENE,
  palette: PALETTE,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Untouched branches are returned as-is rather than copied, so a component can
 * depend on its own section and ignore edits made elsewhere.
 */
function merge<T>(base: T, overrides: unknown): T {
  if (!isPlainObject(overrides)) return base;

  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    const current = out[key];
    out[key] =
      isPlainObject(current) && isPlainObject(value)
        ? merge(current, value)
        : value;
  }
  return out as T;
}

/** Layers `overrides` on top of `base`, which defaults to the stock scene. */
export function resolveConfig(
  overrides?: VaporwaveConfigOverrides,
  base: VaporwaveConfig = DEFAULT_CONFIG,
): VaporwaveConfig {
  if (!overrides) return base;
  return {
    scene: merge(base.scene, overrides.scene),
    palette: merge(base.palette, overrides.palette),
  };
}
