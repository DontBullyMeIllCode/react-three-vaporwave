import ReactThreeTestRenderer from "@react-three/test-renderer";
import { useThree, type RootState } from "@react-three/fiber";
import { useLayoutEffect, type ReactNode } from "react";
import * as THREE from "three";
import { vi } from "vitest";

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

const mounted = new Set<Renderer>();

/** Unmounts everything `renderScene` mounted. Registered in `setup.ts`. */
export async function cleanup() {
  for (const renderer of mounted) await renderer.unmount();
  mounted.clear();
}

/**
 * Mounts `element` in a headless R3F root and returns handles for poking at it.
 * The root state is read lazily, so it reflects cameras made default later.
 */
export async function renderScene(element: ReactNode) {
  const handle: { get?: () => RootState } = {};

  function Capture() {
    const get = useThree((state) => state.get);
    useLayoutEffect(() => {
      handle.get = get;
    }, [get]);
    return null;
  }

  const wrap = (node: ReactNode) => (
    <>
      <Capture />
      {node}
    </>
  );

  const renderer = await ReactThreeTestRenderer.create(wrap(element));
  mounted.add(renderer);

  const state = () => {
    if (!handle.get) throw new Error("R3F state not captured");
    return handle.get();
  };

  return {
    renderer,
    scene: renderer.scene.instance as THREE.Scene,
    state,
    update: (node: ReactNode) => renderer.update(wrap(node)),
    /**
     * Runs frames with the clock pinned at `elapsed` seconds. The test renderer
     * never advances the clock itself, which keeps time-based maths exact.
     */
    advance: async (elapsed: number, frames = 1) => {
      state().clock.elapsedTime = elapsed;
      await renderer.advanceFrames(frames, 1 / 60);
    },
  };
}

/** Every shader material in the scene graph, meshes and points alike. */
export function shaderMaterials(root: THREE.Object3D) {
  const out: THREE.ShaderMaterial[] = [];
  root.traverse((object) => {
    const material = (object as THREE.Mesh).material;
    if (material instanceof THREE.ShaderMaterial) out.push(material);
  });
  return out;
}

/**
 * The shader material that owns `uniform` — the pieces are told apart by a
 * uniform only they use, e.g. `uValley` for the mountains.
 */
export function findMaterial(root: THREE.Object3D, uniform: string) {
  return shaderMaterials(root).find((material) => uniform in material.uniforms);
}

export function getMaterial(root: THREE.Object3D, uniform: string) {
  const material = findMaterial(root, uniform);
  if (!material) throw new Error(`No material with uniform ${uniform}`);
  return material;
}

/** The mesh or points object drawn with `material`. */
export function objectFor(root: THREE.Object3D, material: THREE.Material) {
  let found: THREE.Mesh | THREE.Points | undefined;
  root.traverse((object) => {
    if ((object as THREE.Mesh).material === material) {
      found = object as THREE.Mesh | THREE.Points;
    }
  });
  if (!found) throw new Error("No object uses that material");
  return found;
}

/** Names of every `uniform` declared in a GLSL source. */
export function declaredUniforms(source: string) {
  return [...source.matchAll(/uniform\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]);
}

/** Hex of a colour string as three.js would store it, for comparisons. */
export function hex(color: string | THREE.Color) {
  return (typeof color === "string" ? new THREE.Color(color) : color).getHex();
}

/**
 * The test renderer's mock WebGL can't bind render targets, so the water's
 * mirror pass would throw. Stubbing the two calls lets its frame logic run.
 */
export function stubRenderPasses(state: RootState) {
  return {
    setRenderTarget: vi
      .spyOn(state.gl, "setRenderTarget")
      .mockImplementation(() => {}),
    render: vi.spyOn(state.gl, "render").mockImplementation(() => {}),
  };
}
