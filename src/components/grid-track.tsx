import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { glowFalloff } from "../utils/config";
import { useVaporwaveConfig } from "../utils/config-context";
import { trackFragmentShader, trackVertexShader } from "../shaders/track";

/**
 * The neon causeway running to the horizon. One quad — the grid is procedural
 * and scrolls in shader space, so it stays crisp at every distance and loops
 * without a seam.
 */
export default function GridTrack() {
  const { scene, palette } = useVaporwaveConfig();
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { track } = scene;
  const depth = track.near - track.far;
  const centerZ = (track.near + track.far) / 2;

  // Built once; the config is written into it below whenever it changes.
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCamPos: { value: new THREE.Vector3() },
      uSunPos: { value: new THREE.Vector3() },
      uBase: { value: new THREE.Color() },
      uLineA: { value: new THREE.Color() },
      uLineB: { value: new THREE.Color() },
      uSunGlow: { value: new THREE.Color() },
      uFogColor: { value: new THREE.Color() },
      uFogNear: { value: 0 },
      uFogFar: { value: 0 },
      uFogPow: { value: 0 },
      uFogGlowExp: { value: 0 },
      uFogGlowStrength: { value: 0 },
      uSpeed: { value: 0 },
      uCell: { value: 0 },
      uLineWidth: { value: 0 },
      uGlowWidth: { value: 0 },
      uHalfWidth: { value: 0 },
      uRail: { value: 0 },
    }),
    [],
  );

  // Layout effect so the values land before the next frame is drawn.
  useLayoutEffect(() => {
    const u = materialRef.current?.uniforms;
    if (!u) return;

    u.uSunPos.value.set(...scene.sun.position);
    u.uBase.value.set(palette.trackBase);
    u.uLineA.value.set(palette.trackLineA);
    u.uLineB.value.set(palette.trackLineB);
    u.uSunGlow.value.set(palette.sunGlow);
    u.uFogColor.value.set(palette.fog);
    u.uFogNear.value = scene.fog.near;
    u.uFogFar.value = scene.fog.far;
    u.uFogPow.value = scene.fog.power;
    u.uFogGlowExp.value = glowFalloff(scene.sunGlow.fogRadius);
    u.uFogGlowStrength.value = scene.sunGlow.fogStrength;
    u.uSpeed.value = scene.track.speed;
    u.uCell.value = scene.track.cell;
    u.uLineWidth.value = scene.track.lineWidth;
    u.uGlowWidth.value = scene.track.glowWidth;
    u.uHalfWidth.value = scene.track.halfWidth;
    u.uRail.value = scene.track.rail;
  }, [scene, palette]);

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;

    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uCamPos.value.copy(state.camera.position);
  });

  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[0, 0, centerZ]}
      frustumCulled={false}
    >
      <planeGeometry args={[track.halfWidth * 2, depth]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={trackVertexShader}
        fragmentShader={trackFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
