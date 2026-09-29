import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { createGradedPlane } from "./graded-plane";

const OPTIONS = {
  halfWidth: 10,
  zNear: 3,
  zFar: -20,
  anchorZ: 1,
  cols: 24,
  rows: 30,
};

/** Sorted unique values along one axis of the position attribute. */
function axis(geometry: THREE.BufferGeometry, index: 0 | 1 | 2) {
  const positions = geometry.attributes.position.array;
  const values = new Set<number>();
  for (let i = index; i < positions.length; i += 3) values.add(positions[i]);
  return [...values].sort((a, b) => a - b);
}

function gaps(values: number[]) {
  return values.slice(1).map((value, i) => value - values[i]);
}

describe("createGradedPlane", () => {
  const geometry = createGradedPlane(OPTIONS);
  const xs = axis(geometry, 0);
  const zs = axis(geometry, 2);

  it("spans exactly the requested extents", () => {
    expect(xs[0]).toBeCloseTo(-OPTIONS.halfWidth, 4);
    expect(xs[xs.length - 1]).toBeCloseTo(OPTIONS.halfWidth, 4);
    expect(zs[0]).toBeCloseTo(OPTIONS.zFar, 4);
    expect(zs[zs.length - 1]).toBeCloseTo(OPTIONS.zNear, 4);
  });

  it("lies flat at y = 0", () => {
    expect(axis(geometry, 1)).toEqual([0]);
  });

  it("puts a vertex row exactly on the anchor and the centre line", () => {
    expect(xs).toContain(0);
    expect(zs).toContain(OPTIONS.anchorZ);
  });

  it("packs vertices tightest at the anchor and spreads them outward", () => {
    const anchor = zs.indexOf(OPTIONS.anchorZ);
    const toward = gaps(zs.slice(0, anchor + 1)).reverse();
    const away = gaps(zs.slice(anchor));

    for (const side of [toward, away]) {
      for (let i = 1; i < side.length; i++) {
        expect(side[i]).toBeGreaterThanOrEqual(side[i - 1] - 1e-6);
      }
    }
  });

  it("indexes every quad as two in-range triangles", () => {
    const index = geometry.index!;
    const vertexCount = geometry.attributes.position.count;

    expect(vertexCount).toBe(xs.length * zs.length);
    expect(index.count).toBe((xs.length - 1) * (zs.length - 1) * 6);
    expect(Math.max(...index.array)).toBeLessThan(vertexCount);
  });

  it("faces upward so it is visible from the camera above", () => {
    const copy = geometry.clone();
    copy.computeVertexNormals();
    const normals = copy.attributes.normal;
    for (let i = 0; i < normals.count; i++) {
      expect(normals.getY(i)).toBeCloseTo(1, 5);
    }
  });

  it("has a bounding sphere ready for culling", () => {
    expect(geometry.boundingSphere).not.toBeNull();
  });

  it("stays valid at the smallest resolutions", () => {
    const tiny = createGradedPlane({ ...OPTIONS, cols: 1, rows: 1 });
    expect(tiny.attributes.position.count).toBeGreaterThanOrEqual(9);
    expect(tiny.index!.count % 6).toBe(0);
  });
});
