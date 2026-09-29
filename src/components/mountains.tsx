import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { glowFalloff } from "../utils/config";
import { useVaporwaveConfig } from "../utils/config-context";
import {
  mountainsFragmentShader,
  mountainsVertexShader,
} from "../shaders/mountains";

/**
 * Keeps the lattice row count small so the noise is sampled at modest
 * coordinates however long the scene runs. Wrapping by whole rows keeps the
 * lines aligned with the track; the terrain simply repeats every few hours.
 */
const ROW_WRAP = 65536;

/** Rounds to the nearest whole cell so lattice lines meet the track's. */
function snap(value: number, cell: number) {
  return Math.round(value / cell) * cell;
}

/**
 * Wireframe mountain ranges either side of the track, the alternative ground
 * to the water. A single static mesh: heights come from noise in the vertex
 * shader and the terrain scrolls in lock-step with the track grid.
 */
export default function Mountains() {
  const { scene, palette } = useVaporwaveConfig();
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const cell = scene.track.cell;
  const halfWidth = Math.max(snap(scene.mountains.halfWidth, cell), cell);
  const near = snap(scene.mountains.near, cell);
  const far = Math.min(snap(scene.mountains.far, cell), near - cell);

  // A regular lattice on the track's cell size. It has to be regular (unlike
  // the water's graded plane) so every vertex can hand its height to the next.
  const geometry = useMemo(() => {
    const depth = near - far;
    const plane = new THREE.PlaneGeometry(
      halfWidth * 2,
      depth,
      Math.round((halfWidth * 2) / cell),
      Math.round(depth / cell),
    );
    plane.rotateX(-Math.PI / 2);
    plane.translate(0, 0, (near + far) / 2);
    return plane;
  }, [halfWidth, near, far, cell]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Built once; the config is written into it below whenever it changes.
  const uniforms = useMemo(
    () => ({
      uScroll: { value: 0 },
      uRowOffset: { value: 0 },
      uCell: { value: 0 },
      uValley: { value: 0 },
      uRamp: { value: 0 },
      uHeight: { value: 0 },
      uScale: { value: 1 },
      uFloor: { value: 0 },
      uCamPos: { value: new THREE.Vector3() },
      uSunPos: { value: new THREE.Vector3() },
      uBase: { value: new THREE.Color() },
      uLine: { value: new THREE.Color() },
      uSunGlow: { value: new THREE.Color() },
      uFogColor: { value: new THREE.Color() },
      uFogNear: { value: 0 },
      uFogFar: { value: 0 },
      uFogPow: { value: 0 },
      uFogGlowExp: { value: 0 },
      uFogGlowStrength: { value: 0 },
      uLineWidth: { value: 0 },
      uGlowWidth: { value: 0 },
    }),
    [],
  );

  // Layout effect so the values land before the next frame is drawn.
  useLayoutEffect(() => {
    const u = materialRef.current?.uniforms;
    if (!u) return;

    const { mountains } = scene;
    u.uCell.value = scene.track.cell;
    u.uValley.value = mountains.valley;
    u.uRamp.value = mountains.ramp;
    u.uHeight.value = mountains.height;
    u.uScale.value = mountains.scale;
    u.uFloor.value = mountains.floor;
    u.uSunPos.value.set(...scene.sun.position);
    u.uBase.value.set(palette.mountainBase);
    u.uLine.value.set(palette.mountainLine);
    u.uSunGlow.value.set(palette.sunGlow);
    u.uFogColor.value.set(palette.fog);
    u.uFogNear.value = scene.fog.near;
    u.uFogFar.value = scene.fog.far;
    u.uFogPow.value = scene.fog.power;
    u.uFogGlowExp.value = glowFalloff(scene.sunGlow.fogRadius);
    u.uFogGlowStrength.value = scene.sunGlow.fogStrength;
    u.uLineWidth.value = mountains.lineWidth;
    u.uGlowWidth.value = mountains.glowWidth;
  }, [scene, palette]);

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;

    // Split the distance travelled into whole rows and the remainder. Done here
    // in double precision so the shader only ever sees small numbers.
    const travel = state.clock.elapsedTime * scene.track.speed;
    const rows = Math.floor(travel / cell);

    material.uniforms.uScroll.value = travel - rows * cell;
    material.uniforms.uRowOffset.value = (rows % ROW_WRAP) * cell;
    material.uniforms.uCamPos.value.copy(state.camera.position);
  });

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={mountainsVertexShader}
        fragmentShader={mountainsFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
