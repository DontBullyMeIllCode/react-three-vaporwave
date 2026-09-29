import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { getMaterial, hex, objectFor, renderScene } from "../test/render";
import { DEFAULT_CONFIG, type VaporwaveConfigOverrides } from "../utils/config";
import { VaporwaveConfigProvider } from "../utils/config-context";
import Sun from "./sun";

const { scene, palette } = DEFAULT_CONFIG;

const withConfig = (config: VaporwaveConfigOverrides) => (
  <VaporwaveConfigProvider config={config}>
    <Sun />
  </VaporwaveConfigProvider>
);

const parts = (root: THREE.Object3D) => {
  const disc = getMaterial(root, "uBands");
  const halo = getMaterial(root, "uExtent");
  return {
    disc,
    halo,
    discMesh: objectFor(root, disc) as THREE.Mesh<THREE.PlaneGeometry>,
    haloMesh: objectFor(root, halo) as THREE.Mesh<THREE.PlaneGeometry>,
  };
};

describe("Sun", () => {
  it("sits at the configured position", async () => {
    const view = await renderScene(<Sun />);
    const { discMesh } = parts(view.scene);
    expect(discMesh.parent!.position.toArray()).toEqual(scene.sun.position);
  });

  it("sizes the disc from its radius and the halo to fit its glow", async () => {
    const view = await renderScene(<Sun />);
    const { discMesh, haloMesh, halo } = parts(view.scene);
    const size = scene.sun.radius * 2;
    const extent = Math.max(3.5, 1 + scene.sunGlow.radius * 4);

    expect(discMesh.geometry.parameters.width).toBe(size);
    expect(haloMesh.geometry.parameters.width).toBe(size * extent);
    expect(halo.uniforms.uExtent.value).toBe(extent);
  });

  it("grows the halo quad instead of clipping a wide glow", async () => {
    const view = await renderScene(
      withConfig({ scene: { sunGlow: { radius: 3 } } }),
    );
    const { haloMesh } = parts(view.scene);
    expect(haloMesh.geometry.parameters.width).toBe(scene.sun.radius * 2 * 13);
  });

  it("layers the halo behind the disc", async () => {
    const view = await renderScene(<Sun />);
    const { discMesh, haloMesh } = parts(view.scene);
    expect(haloMesh.position.z).toBeLessThan(discMesh.position.z);
  });

  it("feeds colours, bands and glitch settings into the disc", async () => {
    const view = await renderScene(
      withConfig({ scene: { glitch: { enabled: true } } }),
    );
    const u = parts(view.scene).disc.uniforms;

    expect(hex(u.uTop.value)).toBe(hex(palette.sunTop));
    expect(hex(u.uBottom.value)).toBe(hex(palette.sunBottom));
    expect(u.uBands.value).toBe(scene.sun.bands);
    expect(u.uEmission.value).toBe(scene.sun.emission);
    expect(u.uGlitchChance.value).toBe(scene.glitch.chance);
    expect(u.uGlitchRate.value).toBe(scene.glitch.rate);
    expect(u.uGlitchSlices.value).toBe(scene.glitch.slices);
  });

  it("switches the glitch off by zeroing its chance", async () => {
    const view = await renderScene(
      withConfig({ scene: { glitch: { enabled: true, chance: 0.8 } } }),
    );
    expect(parts(view.scene).disc.uniforms.uGlitchChance.value).toBe(0.8);

    await view.update(
      withConfig({ scene: { glitch: { enabled: false, chance: 0.8 } } }),
    );
    expect(parts(view.scene).disc.uniforms.uGlitchChance.value).toBe(0);
  });

  it("feeds the halo its colour and strength", async () => {
    const view = await renderScene(<Sun />);
    const u = parts(view.scene).halo.uniforms;
    expect(hex(u.uColor.value)).toBe(hex(palette.sunGlow));
    expect(u.uStrength.value).toBe(scene.sunGlow.strength);
    expect(u.uRadius.value).toBe(scene.sunGlow.radius);
  });

  it("advances the band scroll with the clock", async () => {
    const view = await renderScene(<Sun />);
    await view.advance(6);
    expect(parts(view.scene).disc.uniforms.uTime.value).toBe(6);
  });
});
