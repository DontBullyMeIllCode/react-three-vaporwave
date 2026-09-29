import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { getMaterial, hex, objectFor, renderScene } from "../test/render";
import { DEFAULT_CONFIG, glowFalloff } from "../utils/config";
import { VaporwaveConfigProvider } from "../utils/config-context";
import { Sky, Stars } from "./sky";

const { scene, palette } = DEFAULT_CONFIG;

describe("Sky", () => {
  const sky = async () => {
    const view = await renderScene(<Sky />);
    return { view, u: getMaterial(view.scene, "uZenith").uniforms };
  };

  it("paints the palette's gradient", async () => {
    const { u } = await sky();
    expect(hex(u.uZenith.value)).toBe(hex(palette.skyZenith));
    expect(hex(u.uMid.value)).toBe(hex(palette.skyMid));
    expect(hex(u.uHorizon.value)).toBe(hex(palette.skyHorizon));
    expect(hex(u.uSunGlow.value)).toBe(hex(palette.sunGlow));
  });

  it("aims its glow from the camera at the sun", async () => {
    const { u } = await sky();
    const expected = new THREE.Vector3(...scene.sun.position)
      .sub(new THREE.Vector3(...scene.camera.position))
      .normalize();

    expect(u.uSunDir.value.length()).toBeCloseTo(1);
    expect(u.uSunDir.value.distanceTo(expected)).toBeCloseTo(0);
  });

  it("brackets the sun's disc with a soft edge", async () => {
    const { u } = await sky();
    // Inner edge is the smaller angle, so the larger cosine.
    expect(u.uSunCosInner.value).toBeGreaterThan(u.uSunCosOuter.value);
    expect(u.uSunCosOuter.value).toBeGreaterThan(0);
  });

  it("sizes the wash and its core from the config", async () => {
    const { u } = await sky();
    expect(u.uGlowExp.value).toBe(glowFalloff(scene.sunGlow.skyRadius));
    expect(u.uGlowCoreExp.value).toBe(glowFalloff(scene.sunGlow.skyRadius / 3));
    expect(u.uGlowStrength.value).toBe(scene.sunGlow.skyStrength);
  });

  it("follows the sun when it moves", async () => {
    const view = await renderScene(
      <VaporwaveConfigProvider config={{}}>
        <Sky />
      </VaporwaveConfigProvider>,
    );
    await view.update(
      <VaporwaveConfigProvider
        config={{ scene: { sun: { position: [50, 0, 1.1] } } }}
      >
        <Sky />
      </VaporwaveConfigProvider>,
    );
    const dir = getMaterial(view.scene, "uZenith").uniforms.uSunDir.value;
    expect(dir.x).toBeGreaterThan(0.99);
  });

  it("draws behind everything else", async () => {
    const view = await renderScene(<Sky />);
    const material = getMaterial(view.scene, "uZenith");
    const mesh = objectFor(view.scene, material);
    expect(mesh.renderOrder).toBeLessThan(0);
    expect(material.depthTest).toBe(false);
    expect(material.depthWrite).toBe(false);
  });
});

describe("Stars", () => {
  const positions = (root: THREE.Object3D) => {
    const material = getMaterial(root, "uPixelRatio");
    const points = objectFor(root, material) as THREE.Points;
    return points.geometry.attributes.position;
  };

  it("scatters the configured number of stars on the sky sphere", async () => {
    const view = await renderScene(<Stars />);
    const pos = positions(view.scene);
    const point = new THREE.Vector3();

    expect(pos.count).toBe(scene.stars.count);
    for (let i = 0; i < pos.count; i++) {
      point.fromBufferAttribute(pos, i);
      expect(point.length()).toBeCloseTo(scene.stars.radius, 3);
      expect(point.y).toBeGreaterThanOrEqual(0);
    }
  });

  it("deals the same sky every time", async () => {
    const first = await renderScene(<Stars />);
    const a = Array.from(positions(first.scene).array);
    const second = await renderScene(<Stars />);
    const b = Array.from(positions(second.scene).array);
    expect(b).toEqual(a);
  });

  it("gives every star a size and twinkle phase", async () => {
    const view = await renderScene(<Stars />);
    const material = getMaterial(view.scene, "uPixelRatio");
    const geometry = (objectFor(view.scene, material) as THREE.Points).geometry;
    expect(geometry.attributes.aSize.count).toBe(scene.stars.count);
    expect(geometry.attributes.aPhase.count).toBe(scene.stars.count);
  });

  it("re-scatters when the count changes", async () => {
    const view = await renderScene(
      <VaporwaveConfigProvider config={{}}>
        <Stars />
      </VaporwaveConfigProvider>,
    );
    await view.update(
      <VaporwaveConfigProvider config={{ scene: { stars: { count: 10 } } }}>
        <Stars />
      </VaporwaveConfigProvider>,
    );
    expect(positions(view.scene).count).toBe(10);
  });

  it("uses the palette colour, the device pixel ratio and the clock", async () => {
    const view = await renderScene(<Stars />);
    await view.advance(3);
    const u = getMaterial(view.scene, "uPixelRatio").uniforms;

    expect(hex(u.uColor.value)).toBe(hex(palette.star));
    expect(u.uPixelRatio.value).toBe(view.state().viewport.dpr);
    expect(u.uTime.value).toBe(3);
  });
});
