import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { getMaterial, hex, objectFor, renderScene } from "../test/render";
import { DEFAULT_CONFIG, glowFalloff } from "../utils/config";
import { VaporwaveConfigProvider } from "../utils/config-context";
import GridTrack from "./grid-track";

const { scene, palette } = DEFAULT_CONFIG;

const track = (root: THREE.Object3D) => {
  const material = getMaterial(root, "uSpeed");
  return {
    material,
    uniforms: material.uniforms,
    mesh: objectFor(root, material) as THREE.Mesh<THREE.PlaneGeometry>,
  };
};

describe("GridTrack", () => {
  it("covers the configured strip, lying flat", async () => {
    const view = await renderScene(<GridTrack />);
    const { mesh } = track(view.scene);

    expect(mesh.geometry.parameters.width).toBe(scene.track.halfWidth * 2);
    expect(mesh.geometry.parameters.height).toBe(
      scene.track.near - scene.track.far,
    );
    expect(mesh.position.z).toBe((scene.track.near + scene.track.far) / 2);
    expect(mesh.rotation.x).toBeCloseTo(-Math.PI / 2);
  });

  it("feeds the config into its shader", async () => {
    const view = await renderScene(<GridTrack />);
    const { uniforms: u } = track(view.scene);

    expect(u.uSpeed.value).toBe(scene.track.speed);
    expect(u.uCell.value).toBe(scene.track.cell);
    expect(u.uLineWidth.value).toBe(scene.track.lineWidth);
    expect(u.uGlowWidth.value).toBe(scene.track.glowWidth);
    expect(u.uHalfWidth.value).toBe(scene.track.halfWidth);
    expect(u.uRail.value).toBe(scene.track.rail);
    expect(u.uFogNear.value).toBe(scene.fog.near);
    expect(u.uFogGlowExp.value).toBe(glowFalloff(scene.sunGlow.fogRadius));
    expect(u.uSunPos.value.toArray()).toEqual(scene.sun.position);
    expect(hex(u.uBase.value)).toBe(hex(palette.trackBase));
    expect(hex(u.uLineA.value)).toBe(hex(palette.trackLineA));
    expect(hex(u.uLineB.value)).toBe(hex(palette.trackLineB));
  });

  it("picks up config changes without rebuilding its material", async () => {
    // Same tree shape both times, so React updates rather than remounting.
    const view = await renderScene(
      <VaporwaveConfigProvider config={{}}>
        <GridTrack />
      </VaporwaveConfigProvider>,
    );
    const before = track(view.scene).material;

    await view.update(
      <VaporwaveConfigProvider
        config={{
          scene: { track: { speed: -1.5, rail: 2 } },
          palette: { trackLineA: "#00ff00" },
        }}
      >
        <GridTrack />
      </VaporwaveConfigProvider>,
    );
    const after = track(view.scene);

    expect(after.material).toBe(before);
    expect(after.uniforms.uSpeed.value).toBe(-1.5);
    expect(after.uniforms.uRail.value).toBe(2);
    expect(hex(after.uniforms.uLineA.value)).toBe(hex("#00ff00"));
  });

  it("resizes when the strip's extents change", async () => {
    const view = await renderScene(<GridTrack />);
    await view.update(
      <VaporwaveConfigProvider config={{ scene: { track: { halfWidth: 1 } } }}>
        <GridTrack />
      </VaporwaveConfigProvider>,
    );
    expect(track(view.scene).mesh.geometry.parameters.width).toBe(2);
  });

  it("tracks time and the camera each frame", async () => {
    const view = await renderScene(<GridTrack />);
    view.state().camera.position.set(0.3, 0.4, 2);
    await view.advance(12.5);

    const { uniforms: u } = track(view.scene);
    expect(u.uTime.value).toBe(12.5);
    expect(u.uCamPos.value.toArray()).toEqual([0.3, 0.4, 2]);
  });
});
