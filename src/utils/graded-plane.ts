import * as THREE from "three";

/**
 * Values from `from` to `to` whose gaps grow geometrically, so samples bunch up
 * at the `from` end. `growth` is the ratio between the last gap and the first.
 */
function geometricSpan(
  from: number,
  to: number,
  steps: number,
  growth: number,
): number[] {
  const ratio = Math.pow(growth, 1 / Math.max(steps - 1, 1));

  let sum = 0;
  for (let i = 0; i < steps; i++) sum += Math.pow(ratio, i);

  const first = (to - from) / sum;
  const out = [from];
  let cursor = from;
  for (let i = 0; i < steps; i++) {
    cursor += first * Math.pow(ratio, i);
    out.push(cursor);
  }
  return out;
}

/** Ascending coordinates dense at `anchor`, thinning out toward both ends. */
function gradedAxis(
  anchor: number,
  min: number,
  max: number,
  steps: number,
  growth: number,
): number[] {
  const belowSteps = Math.max(
    Math.round((steps * (anchor - min)) / (max - min)),
    2,
  );
  const aboveSteps = Math.max(steps - belowSteps, 2);

  const below = geometricSpan(anchor, min, belowSteps, growth)
    .slice(1)
    .reverse();
  const above = geometricSpan(anchor, max, aboveSteps, growth).slice(1);

  return [...below, anchor, ...above];
}

/**
 * A flat grid lying in the XZ plane (y = 0) whose vertices crowd around
 * `anchor`, giving fine wave detail near the camera and cheap, coarse geometry
 * out in the fog where nobody can tell.
 */
export function createGradedPlane({
  halfWidth,
  zNear,
  zFar,
  anchorZ,
  cols,
  rows,
  growth = 400,
}: {
  halfWidth: number;
  zNear: number;
  zFar: number;
  anchorZ: number;
  cols: number;
  rows: number;
  growth?: number;
}): THREE.BufferGeometry {
  const xs = gradedAxis(0, -halfWidth, halfWidth, cols, growth);
  const zs = gradedAxis(anchorZ, zFar, zNear, rows, growth);

  const nx = xs.length;
  const nz = zs.length;

  const positions = new Float32Array(nx * nz * 3);
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const o = (iz * nx + ix) * 3;
      positions[o] = xs[ix];
      positions[o + 1] = 0;
      positions[o + 2] = zs[iz];
    }
  }

  const quads = (nx - 1) * (nz - 1);
  const indices = new Uint32Array(quads * 6);
  let w = 0;
  for (let iz = 0; iz < nz - 1; iz++) {
    for (let ix = 0; ix < nx - 1; ix++) {
      const a = iz * nx + ix;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      indices[w++] = a;
      indices[w++] = c;
      indices[w++] = b;
      indices[w++] = b;
      indices[w++] = c;
      indices[w++] = d;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}
