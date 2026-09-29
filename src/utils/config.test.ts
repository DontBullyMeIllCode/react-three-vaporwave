import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG, glowFalloff, resolveConfig } from "./config";

const { scene } = DEFAULT_CONFIG;

describe("resolveConfig", () => {
  it("returns the defaults untouched when there is nothing to override", () => {
    expect(resolveConfig()).toBe(DEFAULT_CONFIG);
    expect(resolveConfig(undefined)).toBe(DEFAULT_CONFIG);
  });

  it("overrides only the values given", () => {
    const result = resolveConfig({
      scene: { mountains: { height: 42 } },
      palette: { fog: "#123456" },
    });

    expect(result.scene.mountains.height).toBe(42);
    expect(result.scene.mountains.valley).toBe(scene.mountains.valley);
    expect(result.palette.fog).toBe("#123456");
    expect(result.palette.skyZenith).toBe(DEFAULT_CONFIG.palette.skyZenith);
  });

  it("keeps untouched sections referentially equal", () => {
    const result = resolveConfig({ scene: { fog: { near: 9 } } });

    // Components key effects off their section, so identity matters.
    expect(result.scene.track).toBe(scene.track);
    expect(result.scene.sun).toBe(scene.sun);
    expect(result.palette).toBe(DEFAULT_CONFIG.palette);
    expect(result.scene.fog).not.toBe(scene.fog);
  });

  it("replaces tuples whole instead of merging them index by index", () => {
    const result = resolveConfig({ scene: { sun: { position: [1, 2, 3] } } });
    expect(result.scene.sun.position).toEqual([1, 2, 3]);
  });

  it("ignores keys explicitly set to undefined", () => {
    const result = resolveConfig({ scene: { fog: { near: undefined } } });
    expect(result.scene.fog.near).toBe(scene.fog.near);
  });

  it("layers on top of a custom base", () => {
    const base = resolveConfig({ scene: { fog: { near: 7 } } });
    const result = resolveConfig({ scene: { fog: { far: 70 } } }, base);

    expect(result.scene.fog.near).toBe(7);
    expect(result.scene.fog.far).toBe(70);
  });

  it("never mutates the defaults", () => {
    const before = structuredClone(DEFAULT_CONFIG);
    resolveConfig({
      scene: { track: { speed: -9 }, camera: { position: [9, 9, 9] } },
      palette: { star: "#000000" },
    });
    expect(DEFAULT_CONFIG).toEqual(before);
  });
});

describe("glowFalloff", () => {
  it.each([5, 18, 30, 60])(
    "puts half brightness exactly at %i degrees",
    (degrees) => {
      const n = glowFalloff(degrees);
      const cos = Math.cos((degrees * Math.PI) / 180);
      expect(Math.pow(cos, n)).toBeCloseTo(0.5, 10);
    },
  );

  it("gives wider glows a gentler falloff", () => {
    expect(glowFalloff(10)).toBeGreaterThan(glowFalloff(20));
    expect(glowFalloff(20)).toBeGreaterThan(glowFalloff(40));
  });

  it("clamps to a usable range instead of returning Infinity or zero", () => {
    expect(glowFalloff(0)).toBe(glowFalloff(0.5));
    expect(glowFalloff(-10)).toBe(glowFalloff(0.5));
    expect(glowFalloff(90)).toBe(glowFalloff(89));
    expect(Number.isFinite(glowFalloff(0))).toBe(true);
  });
});

describe("default config", () => {
  const isWholeCells = (value: number) => {
    const cells = value / scene.track.cell;
    return Math.abs(cells - Math.round(cells)) < 1e-9;
  };

  it("keeps the mountain lattice on whole track cells", () => {
    expect(isWholeCells(scene.mountains.halfWidth)).toBe(true);
    expect(isWholeCells(scene.mountains.near)).toBe(true);
    expect(isWholeCells(scene.mountains.far)).toBe(true);
  });

  it("runs every strip from near to far", () => {
    expect(scene.track.near).toBeGreaterThan(scene.track.far);
    expect(scene.water.near).toBeGreaterThan(scene.water.far);
    expect(scene.mountains.near).toBeGreaterThan(scene.mountains.far);
    expect(scene.fog.far).toBeGreaterThan(scene.fog.near);
  });

  it("keeps the ground just under the track so neither z-fights", () => {
    expect(scene.water.level).toBeLessThan(0);
    expect(scene.mountains.floor).toBeLessThan(0);
  });

  it("uses valid colours throughout the palette", () => {
    for (const color of Object.values(DEFAULT_CONFIG.palette)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
