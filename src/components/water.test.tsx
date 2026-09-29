import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  getMaterial,
  hex,
  objectFor,
  renderScene,
  stubRenderPasses,
} from "../test/render";
import { DEFAULT_CONFIG } from "../utils/config";
import { VaporwaveConfigProvider } from "../utils/config-context";
import { createGradedPlane } from "../utils/graded-plane";
import Water from "./water";

const { scene, palette } = DEFAULT_CONFIG;

const water = (root: THREE.Object3D) => {
  const material = getMaterial(root, "uAmp");
  return {
    material,
    uniforms: material.uniforms,
    mesh: objectFor(root, material) as THREE.Mesh,
  };
};

describe("Water", () => {
  it("uses a graded plane matching the config", async () => {
    const view = await renderScene(<Water />);
    const expected = createGradedPlane({
      halfWidth: scene.water.halfWidth,
      zNear: scene.water.near,
      zFar: scene.water.far,
      anchorZ: scene.camera.position[2],
      cols: scene.water.cols,
      rows: scene.water.rows,
    });

    expect(water(view.scene).mesh.geometry.attributes.position.count).toBe(
      expected.attributes.position.count,
    );
  });

  it("feeds the config into its shader", async () => {
    const view = await renderScene(<Water />);
    const { uniforms: u } = water(view.scene);

    expect(u.uAmp.value).toBe(scene.water.amp);
    expect(u.uWaterLevel.value).toBe(scene.water.level);
    expect(u.uTrackHalfWidth.value).toBe(scene.track.halfWidth);
    expect(u.uTrackFalloff.value).toBe(scene.water.falloff);
    expect(u.uReflectionStrength.value).toBe(scene.reflection.strength);
    expect(u.uReflectionDistort.value).toBe(scene.reflection.distort);
    expect(hex(u.uDeep.value)).toBe(hex(palette.waterDeep));
    expect(hex(u.uShallow.value)).toBe(hex(palette.waterShallow));
    expect(hex(u.uSunColor.value)).toBe(hex(palette.sunBottom));
    expect(hex(u.uTrackColor.value)).toBe(hex(palette.trackLineA));
  });

  it("picks up config changes live", async () => {
    const view = await renderScene(
      <VaporwaveConfigProvider config={{}}>
        <Water />
      </VaporwaveConfigProvider>,
    );
    const material = water(view.scene).material;
    await view.update(
      <VaporwaveConfigProvider
        config={{
          scene: { water: { amp: 0.3 } },
          palette: { waterDeep: "#ff0000" },
        }}
      >
        <Water />
      </VaporwaveConfigProvider>,
    );
    const { uniforms: u } = water(view.scene);
    expect(water(view.scene).material).toBe(material);
    expect(u.uAmp.value).toBe(0.3);
    expect(hex(u.uDeep.value)).toBe(hex("#ff0000"));
  });

  describe("reflection pass", () => {
    it("renders the scene from a camera mirrored through the water", async () => {
      const view = await renderScene(<Water />);
      const passes = stubRenderPasses(view.state());
      const camera = view.state().camera;
      camera.position.set(0.2, 0.5, 2);
      camera.updateMatrixWorld();

      await view.advance(1);

      const call = passes.render.mock.calls.find(([, cam]) => cam !== camera);
      expect(call).toBeDefined();
      const mirror = call![1] as THREE.PerspectiveCamera;

      expect(mirror.position.x).toBeCloseTo(0.2);
      expect(mirror.position.y).toBeCloseTo(2 * scene.water.level - 0.5);
      expect(mirror.position.z).toBeCloseTo(2);
      expect(mirror.projectionMatrix.equals(camera.projectionMatrix)).toBe(
        true,
      );
    });

    it("hides the sea during its own reflection and restores it after", async () => {
      const view = await renderScene(<Water />);
      const passes = stubRenderPasses(view.state());
      const { mesh } = water(view.scene);

      const visibleDuringPass: boolean[] = [];
      passes.render.mockImplementation(() => {
        visibleDuringPass.push(mesh.visible);
      });

      await view.advance(1);

      expect(visibleDuringPass[0]).toBe(false);
      expect(mesh.visible).toBe(true);
    });

    it("draws into its own target, then hands the result to the shader", async () => {
      const view = await renderScene(<Water />);
      const passes = stubRenderPasses(view.state());

      await view.advance(1);

      const [first, second] = passes.setRenderTarget.mock.calls;
      const target = first[0] as THREE.WebGLRenderTarget;
      expect(target).toBeInstanceOf(THREE.WebGLRenderTarget);
      expect(second[0]).toBeNull();
      expect(water(view.scene).uniforms.uReflection.value).toBe(target.texture);
    });

    it("updates time and camera uniforms each frame", async () => {
      const view = await renderScene(<Water />);
      stubRenderPasses(view.state());
      view.state().camera.position.set(0.5, 1, 3);

      await view.advance(4);

      const { uniforms: u } = water(view.scene);
      expect(u.uTime.value).toBe(4);
      expect(u.uCamPos.value.toArray()).toEqual([0.5, 1, 3]);
      expect(u.uCamXZ.value.toArray()).toEqual([0.5, 3]);
    });
  });
});
