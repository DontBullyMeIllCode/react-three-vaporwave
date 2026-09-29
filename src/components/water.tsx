import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import * as THREE from "three";

import { glowFalloff } from "../utils/config";
import { useVaporwaveConfig } from "../utils/config-context";
import { createGradedPlane } from "../utils/graded-plane";
import { waterFragmentShader, waterVertexShader } from "../shaders/water";

/**
 * The sea either side of the track. A single static mesh — all wave motion
 * lives in the vertex shader, so there is nothing to wrap around or pop.
 *
 * Reflections are a planar mirror pass: once a frame the scene is re-rendered
 * from a camera mirrored through the water plane, and the shader samples that
 * image back by screen position.
 */
export default function Water() {
  const { scene, palette } = useVaporwaveConfig();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const size = useThree((state) => state.size);
  const dpr = useThree((state) => state.viewport.dpr);

  // Half resolution is plenty: the wave normals scatter the image anyway, and
  // this is a whole extra pass over the scene.
  const reflectionTarget = useFBO(
    Math.max(1, Math.floor(size.width * dpr * scene.reflection.scale)),
    Math.max(1, Math.floor(size.height * dpr * scene.reflection.scale)),
  );

  const mirrorCamera = useMemo(() => new THREE.PerspectiveCamera(), []);
  const scratch = useMemo(
    () => ({
      forward: new THREE.Vector3(),
      up: new THREE.Vector3(),
      target: new THREE.Vector3(),
    }),
    [],
  );

  const { halfWidth, near, far, cols, rows, level: waterY } = scene.water;
  const anchorZ = scene.camera.position[2];

  const geometry = useMemo(
    () =>
      createGradedPlane({
        halfWidth,
        zNear: near,
        zFar: far,
        anchorZ,
        cols,
        rows,
      }),
    [halfWidth, near, far, anchorZ, cols, rows],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Built once; the config is written into it below whenever it changes.
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0 },
      uWaterLevel: { value: 0 },
      uTrackHalfWidth: { value: 0 },
      uTrackFalloff: { value: 0 },
      uCamXZ: { value: new THREE.Vector2() },
      uCamPos: { value: new THREE.Vector3() },
      uSunPos: { value: new THREE.Vector3() },
      uDeep: { value: new THREE.Color() },
      uShallow: { value: new THREE.Color() },
      uNeonA: { value: new THREE.Color() },
      uNeonB: { value: new THREE.Color() },
      uSunColor: { value: new THREE.Color() },
      uSunGlow: { value: new THREE.Color() },
      uTrackColor: { value: new THREE.Color() },
      uFogColor: { value: new THREE.Color() },
      uFogNear: { value: 0 },
      uFogFar: { value: 0 },
      uFogPow: { value: 0 },
      uFogGlowExp: { value: 0 },
      uFogGlowStrength: { value: 0 },
      uReflection: { value: null as THREE.Texture | null },
      uReflectionStrength: { value: 0 },
      uReflectionDistort: { value: 0 },
    }),
    [],
  );

  // Layout effect so the values land before the next frame is drawn.
  useLayoutEffect(() => {
    const u = materialRef.current?.uniforms;
    if (!u) return;

    u.uAmp.value = scene.water.amp;
    u.uWaterLevel.value = scene.water.level;
    u.uTrackHalfWidth.value = scene.track.halfWidth;
    u.uTrackFalloff.value = scene.water.falloff;
    u.uSunPos.value.set(...scene.sun.position);
    u.uDeep.value.set(palette.waterDeep);
    u.uShallow.value.set(palette.waterShallow);
    u.uNeonA.value.set(palette.neonA);
    u.uNeonB.value.set(palette.neonB);
    u.uSunColor.value.set(palette.sunBottom);
    u.uSunGlow.value.set(palette.sunGlow);
    u.uTrackColor.value.set(palette.trackLineA);
    u.uFogColor.value.set(palette.fog);
    u.uFogNear.value = scene.fog.near;
    u.uFogFar.value = scene.fog.far;
    u.uFogPow.value = scene.fog.power;
    u.uFogGlowExp.value = glowFalloff(scene.sunGlow.fogRadius);
    u.uFogGlowStrength.value = scene.sunGlow.fogStrength;
    u.uReflectionStrength.value = scene.reflection.strength;
    u.uReflectionDistort.value = scene.reflection.distort;
  }, [scene, palette]);

  useFrame((state) => {
    const material = materialRef.current;
    const mesh = meshRef.current;
    if (!material || !mesh) return;

    const { gl, scene, camera, clock } = state;
    const { position } = camera;

    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uCamPos.value.copy(position);
    material.uniforms.uCamXZ.value.set(position.x, position.z);

    // Mirror the camera through the water plane. This is built as a real
    // look-at camera rather than a negative-scale matrix on purpose: scaling by
    // -1 flips handedness, which reverses triangle winding and makes every
    // front-facing material in the scene cull itself in the reflection.
    const { forward, up, target } = scratch;

    camera.getWorldDirection(forward);
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);

    mirrorCamera.position.set(position.x, 2 * waterY - position.y, position.z);
    target.set(
      mirrorCamera.position.x + forward.x,
      mirrorCamera.position.y - forward.y,
      mirrorCamera.position.z + forward.z,
    );
    mirrorCamera.up.set(up.x, -up.y, up.z);
    mirrorCamera.lookAt(target);

    // Same projection as the real camera, so screen coordinates line up between
    // the two images and the shader can sample by screen position.
    const source = camera as THREE.PerspectiveCamera;
    mirrorCamera.projectionMatrix.copy(source.projectionMatrix);
    mirrorCamera.projectionMatrixInverse.copy(source.projectionMatrixInverse);
    mirrorCamera.updateMatrixWorld();

    // The sea must not appear in its own reflection.
    mesh.visible = false;
    gl.setRenderTarget(reflectionTarget);
    gl.render(scene, mirrorCamera);
    gl.setRenderTarget(null);
    mesh.visible = true;

    material.uniforms.uReflection.value = reflectionTarget.texture;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
