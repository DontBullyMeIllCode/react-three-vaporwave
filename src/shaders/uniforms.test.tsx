import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import GridTrack from "../components/grid-track";
import Mountains from "../components/mountains";
import { Sky, Stars } from "../components/sky";
import Sun from "../components/sun";
import Water from "../components/water";
import { declaredUniforms, renderScene, shaderMaterials } from "../test/render";

/**
 * GLSL silently reads 0 from a uniform nobody sets, so a missing or misspelt
 * uniform shows up only as a subtly wrong picture. This pins the contract:
 * every uniform a shader declares is supplied by its component, with a value.
 */
const PIECES: [string, ReactNode][] = [
  ["GridTrack", <GridTrack />],
  ["Mountains", <Mountains />],
  [
    "Sky + Stars",
    <>
      <Sky />
      <Stars />
    </>,
  ],
  ["Sun", <Sun />],
  ["Water", <Water />],
];

describe.each(PIECES)("%s shaders", (_, element) => {
  it("receive every uniform they declare", async () => {
    const view = await renderScene(element);
    const materials = shaderMaterials(view.scene);
    expect(materials.length).toBeGreaterThan(0);

    for (const material of materials) {
      const declared = new Set([
        ...declaredUniforms(material.vertexShader),
        ...declaredUniforms(material.fragmentShader),
      ]);
      for (const name of declared) {
        expect(material.uniforms, `missing ${name}`).toHaveProperty(name);
      }
    }
  });

  it("start with finite values once the config is applied", async () => {
    const view = await renderScene(element);
    for (const material of shaderMaterials(view.scene)) {
      for (const [name, uniform] of Object.entries(material.uniforms)) {
        if (typeof uniform.value === "number") {
          expect(Number.isFinite(uniform.value), name).toBe(true);
        }
      }
    }
  });
});
