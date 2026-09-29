import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { findMaterial, hex, renderScene } from "../test/render";
import { DEFAULT_CONFIG } from "../utils/config";
import { VaporwaveConfigProvider } from "../utils/config-context";
import { LinearVaporwave } from "./LinearVaporwave";

const { scene, palette } = DEFAULT_CONFIG;

/** Which pieces are mounted, told apart by a uniform unique to each. */
function pieces(root: THREE.Object3D) {
  return {
    sky: !!findMaterial(root, "uZenith"),
    stars: !!findMaterial(root, "uPixelRatio"),
    sun: !!findMaterial(root, "uBands"),
    water: !!findMaterial(root, "uAmp"),
    mountains: !!findMaterial(root, "uValley"),
    gridTrack: !!findMaterial(root, "uSpeed"),
  };
}

describe("LinearVaporwave", () => {
  it("renders every piece with mountains as the default ground", async () => {
    const view = await renderScene(<LinearVaporwave />);
    expect(pieces(view.scene)).toEqual({
      sky: true,
      stars: true,
      sun: true,
      water: false,
      mountains: true,
      gridTrack: true,
    });
  });

  it.each([
    ["water", { water: true, mountains: false }],
    ["mountains", { water: false, mountains: true }],
    ["none", { water: false, mountains: false }],
  ] as const)("renders the %s ground", async (ground, expected) => {
    const view = await renderScene(<LinearVaporwave ground={ground} />);
    expect(pieces(view.scene)).toMatchObject(expected);
  });

  it.each(["sky", "stars", "sun", "gridTrack"] as const)(
    "leaves out the %s when switched off",
    async (layer) => {
      const view = await renderScene(
        <LinearVaporwave {...{ [layer]: false }} />,
      );
      const mounted = pieces(view.scene);
      expect(mounted[layer]).toBe(false);
      // Everything else stays.
      for (const other of ["sky", "stars", "sun", "gridTrack"] as const) {
        if (other !== layer) expect(mounted[other]).toBe(true);
      }
    },
  );

  it("renders children inside the scene", async () => {
    const view = await renderScene(
      <LinearVaporwave>
        <mesh name="extra" />
      </LinearVaporwave>,
    );
    expect(view.scene.getObjectByName("extra")).toBeDefined();
  });

  it("passes the config prop to every piece", async () => {
    const view = await renderScene(
      <LinearVaporwave
        config={{
          scene: { track: { speed: 2 }, mountains: { height: 4 } },
          palette: { skyZenith: "#101010" },
        }}
      />,
    );
    expect(findMaterial(view.scene, "uSpeed")!.uniforms.uSpeed.value).toBe(2);
    expect(findMaterial(view.scene, "uValley")!.uniforms.uHeight.value).toBe(4);
    expect(
      hex(findMaterial(view.scene, "uZenith")!.uniforms.uZenith.value),
    ).toBe(hex("#101010"));
  });

  it("layers its config prop over a provider above it", async () => {
    const view = await renderScene(
      <VaporwaveConfigProvider
        config={{ scene: { track: { speed: 1, cell: 0.5 } } }}
      >
        <LinearVaporwave config={{ scene: { track: { speed: 3 } } }} />
      </VaporwaveConfigProvider>,
    );
    const u = findMaterial(view.scene, "uSpeed")!.uniforms;
    expect(u.uSpeed.value).toBe(3);
    expect(u.uCell.value).toBe(0.5);
  });

  it("clears to the zenith colour", async () => {
    const view = await renderScene(
      <LinearVaporwave config={{ palette: { skyZenith: "#223344" } }} />,
    );
    expect(view.scene.background).toBeInstanceOf(THREE.Color);
    expect(hex(view.scene.background as THREE.Color)).toBe(hex("#223344"));
  });

  it("makes its own camera the default, set up from the config", async () => {
    const view = await renderScene(<LinearVaporwave />);
    const camera = view.state().camera as THREE.PerspectiveCamera;

    expect(camera.fov).toBe(scene.camera.fov);
    expect(camera.near).toBe(scene.camera.near);
    expect(camera.far).toBe(scene.camera.far);
    expect(camera.rotation.x).toBeCloseTo(scene.camera.tiltX);
    expect(camera.position.toArray()).toEqual(scene.camera.position);
  });

  it("drifts the camera slightly around its base position", async () => {
    const view = await renderScene(<LinearVaporwave />);
    await view.advance(2);
    const camera = view.state().camera;
    const [x, y, z] = scene.camera.position;

    expect(camera.position.x).toBeCloseTo(x + Math.sin(2 * 0.21) * 0.035);
    expect(camera.position.y).toBeCloseTo(y + Math.sin(2 * 0.33) * 0.012);
    expect(camera.position.z).toBe(z);
    expect(camera.rotation.z).toBeCloseTo(Math.sin(2 * 0.17) * 0.008);
  });

  it("uses the default palette when no config is given", async () => {
    const view = await renderScene(<LinearVaporwave />);
    expect(hex(view.scene.background as THREE.Color)).toBe(
      hex(palette.skyZenith),
    );
  });
});
