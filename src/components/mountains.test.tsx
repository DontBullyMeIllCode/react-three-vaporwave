import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import { getMaterial, hex, objectFor, renderScene } from "../test/render";
import { DEFAULT_CONFIG, type VaporwaveConfigOverrides } from "../utils/config";
import { VaporwaveConfigProvider } from "../utils/config-context";
import Mountains from "./mountains";

const { scene, palette } = DEFAULT_CONFIG;

const mountains = (root: THREE.Object3D) => {
  const material = getMaterial(root, "uValley");
  return {
    material,
    uniforms: material.uniforms,
    mesh: objectFor(root, material) as THREE.Mesh,
  };
};

const withConfig = (config: VaporwaveConfigOverrides) => (
  <VaporwaveConfigProvider config={config}>
    <Mountains />
  </VaporwaveConfigProvider>
);

function extents(mesh: THREE.Mesh) {
  mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox!;
}

describe("Mountains", () => {
  it("builds a flat lattice on the track's cell size", async () => {
    const view = await renderScene(<Mountains />);
    const { mesh } = mountains(view.scene);
    const { halfWidth, near, far } = scene.mountains;
    const cell = scene.track.cell;

    const cols = Math.round((halfWidth * 2) / cell) + 1;
    const rows = Math.round((near - far) / cell) + 1;
    expect(mesh.geometry.attributes.position.count).toBe(cols * rows);

    const box = extents(mesh);
    expect(box.min.x).toBeCloseTo(-halfWidth, 4);
    expect(box.max.x).toBeCloseTo(halfWidth, 4);
    expect(box.min.z).toBeCloseTo(far, 4);
    expect(box.max.z).toBeCloseTo(near, 4);
    // Heights are applied in the vertex shader, not baked into the geometry.
    expect(box.min.y).toBeCloseTo(0, 9);
    expect(box.max.y).toBeCloseTo(0, 9);
  });

  it("feeds the config into its shader", async () => {
    const view = await renderScene(<Mountains />);
    const { uniforms: u } = mountains(view.scene);

    expect(u.uCell.value).toBe(scene.track.cell);
    expect(u.uValley.value).toBe(scene.mountains.valley);
    expect(u.uRamp.value).toBe(scene.mountains.ramp);
    expect(u.uHeight.value).toBe(scene.mountains.height);
    expect(u.uScale.value).toBe(scene.mountains.scale);
    expect(u.uFloor.value).toBe(scene.mountains.floor);
    expect(u.uLineWidth.value).toBe(scene.mountains.lineWidth);
    expect(hex(u.uLine.value)).toBe(hex(palette.mountainLine));
    expect(hex(u.uBase.value)).toBe(hex(palette.mountainBase));
  });

  it("snaps its extents to whole cells so lines meet the track's", async () => {
    const view = await renderScene(
      withConfig({
        scene: { mountains: { halfWidth: 10.1, near: 3.3, far: -8.15 } },
      }),
    );
    const box = extents(mountains(view.scene).mesh);

    // cell 0.4: 10.1 → 10, 3.3 → 3.2, -8.15 → -8.
    const cell = scene.track.cell;
    expect(box.max.x).toBeCloseTo(Math.round(10.1 / cell) * cell, 4);
    expect(box.max.z).toBeCloseTo(Math.round(3.3 / cell) * cell, 4);
    expect(box.min.z).toBeCloseTo(Math.round(-8.15 / cell) * cell, 4);
  });

  it("keeps at least one row when far is not beyond near", async () => {
    const view = await renderScene(
      withConfig({ scene: { mountains: { near: 2, far: 2 } } }),
    );
    const box = extents(mountains(view.scene).mesh);
    expect(box.max.z - box.min.z).toBeCloseTo(scene.track.cell, 4);
  });

  it("rebuilds and disposes the lattice when its extents change", async () => {
    const view = await renderScene(withConfig({}));
    const old = mountains(view.scene).mesh.geometry;
    const dispose = vi.spyOn(old, "dispose");

    await view.update(withConfig({ scene: { mountains: { halfWidth: 4 } } }));

    expect(mountains(view.scene).mesh.geometry).not.toBe(old);
    expect(dispose).toHaveBeenCalled();
  });

  it("keeps the lattice when only shader values change", async () => {
    // Same tree shape both times, so React updates rather than remounting.
    const view = await renderScene(withConfig({}));
    const geometry = mountains(view.scene).mesh.geometry;

    await view.update(withConfig({ scene: { mountains: { height: 9 } } }));

    expect(mountains(view.scene).mesh.geometry).toBe(geometry);
    expect(mountains(view.scene).uniforms.uHeight.value).toBe(9);
  });

  describe("scrolling", () => {
    // cell and speed of 0.5 keep the maths exact in binary floating point.
    const config = { scene: { track: { cell: 0.5, speed: 0.5 } } };

    it("splits the distance travelled into whole rows plus a remainder", async () => {
      const view = await renderScene(withConfig(config));
      await view.advance(7.5); // travel 3.75 = 7 rows + 0.25

      const { uniforms: u } = mountains(view.scene);
      expect(u.uRowOffset.value).toBe(3.5);
      expect(u.uScroll.value).toBe(0.25);
    });

    it("stays in step with the track grid", async () => {
      const view = await renderScene(<Mountains />);

      for (const t of [0, 0.37, 4.2, 63.9]) {
        await view.advance(t);
        const { uniforms: u } = mountains(view.scene);
        const travel = t * scene.track.speed;

        // Shown position minus travel must land back on the lattice row.
        expect(u.uScroll.value + u.uRowOffset.value).toBeCloseTo(travel, 6);
        expect(u.uScroll.value).toBeGreaterThanOrEqual(0);
        expect(u.uScroll.value).toBeLessThan(scene.track.cell);
      }
    });

    it("wraps the row count by whole rows on long runs", async () => {
      const view = await renderScene(withConfig(config));
      await view.advance(65538.5); // 65538 rows wraps to 2

      const { uniforms: u } = mountains(view.scene);
      expect(u.uRowOffset.value).toBe(1);
      expect(u.uScroll.value).toBe(0.25);
    });

    it("scrolls backward with a negative speed", async () => {
      const view = await renderScene(
        withConfig({ scene: { track: { cell: 0.5, speed: -0.5 } } }),
      );
      await view.advance(1.5); // travel -0.75 = -2 rows + 0.25

      const { uniforms: u } = mountains(view.scene);
      expect(u.uRowOffset.value).toBe(-1);
      expect(u.uScroll.value).toBe(0.25);
    });

    it("tracks the camera", async () => {
      const view = await renderScene(<Mountains />);
      view.state().camera.position.set(1, 2, 3);
      await view.advance(0);
      expect(mountains(view.scene).uniforms.uCamPos.value.toArray()).toEqual([
        1, 2, 3,
      ]);
    });
  });
});
