import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { glowFalloff } from "../utils/config";
import { useVaporwaveConfig } from "../utils/config-context";
import {
  skyFragmentShader,
  skyVertexShader,
  starFragmentShader,
  starVertexShader,
} from "../shaders/sky";

const SKY_Z = -500;

/** Vertical gradient backdrop with a glow bloom around the sun's direction. */
export function Sky() {
  const { scene, palette } = useVaporwaveConfig();
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Built once; the config is written into it below whenever it changes.
  const uniforms = useMemo(
    () => ({
      uZenith: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSunGlow: { value: new THREE.Color() },
      uGlowExp: { value: 0 },
      uGlowCoreExp: { value: 0 },
      uGlowStrength: { value: 0 },
      uSunCosInner: { value: 0 },
      uSunCosOuter: { value: 0 },
      uSunDir: { value: new THREE.Vector3() },
    }),
    [],
  );

  // Layout effect so the values land before the next frame is drawn.
  useLayoutEffect(() => {
    const u = materialRef.current?.uniforms;
    if (!u) return;

    const sunPos = new THREE.Vector3(...scene.sun.position);
    const camPos = new THREE.Vector3(...scene.camera.position);

    // Angular radius the sun's disc covers from the camera, in radians.
    const sunAngularRadius = Math.atan(
      scene.sun.radius / sunPos.distanceTo(camPos),
    );

    u.uZenith.value.set(palette.skyZenith);
    u.uMid.value.set(palette.skyMid);
    u.uHorizon.value.set(palette.skyHorizon);
    u.uSunGlow.value.set(palette.sunGlow);
    u.uGlowExp.value = glowFalloff(scene.sunGlow.skyRadius);
    // The core sits at a third of the wash's radius.
    u.uGlowCoreExp.value = glowFalloff(scene.sunGlow.skyRadius / 3);
    u.uGlowStrength.value = scene.sunGlow.skyStrength;
    u.uSunCosInner.value = Math.cos(sunAngularRadius * 0.92);
    u.uSunCosOuter.value = Math.cos(sunAngularRadius * 1.08);
    u.uSunDir.value.copy(sunPos).sub(camPos).normalize();
  }, [scene, palette]);

  return (
    <mesh position={[0, 0, SKY_Z]} renderOrder={-1000} frustumCulled={false}>
      <planeGeometry args={[4000, 2000]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={skyVertexShader}
        fragmentShader={skyFragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * The star field is seeded rather than random.
 *
 * `Math.random()` is an impure call, and a render that reads it cannot be
 * replayed — React is free to re-run this component, and every re-run would
 * deal a different sky. A fixed seed makes the arrangement a pure function of
 * the constants below, so the stars stay put and the same sky renders on the
 * server as in the browser.
 */
const STAR_SEED = 0x5eed;

/** mulberry32 — small, fast, and good enough for scattering points. */
function createRandom(seed: number) {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Twinkling points across the upper hemisphere. Anything that lands below the
 * horizon is occluded by the sea, so we only seed the top half.
 */
export function Stars() {
  const { scene, palette } = useVaporwaveConfig();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const dpr = useThree((state) => state.viewport.dpr);

  const { count, radius } = scene.stars;

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const random = createRandom(STAR_SEED);

    for (let i = 0; i < count; i++) {
      const theta = random() * Math.PI * 2;
      // Bias toward the horizon, where the eye actually spends its time.
      const y = Math.pow(random(), 1.8);
      const planar = Math.sqrt(1 - y * y);

      positions[i * 3] = Math.cos(theta) * planar * radius;
      positions[i * 3 + 1] = y * radius;
      positions[i * 3 + 2] = Math.sin(theta) * planar * radius;

      sizes[i] = 0.7 + Math.pow(random(), 3) * 3.2;
      phases[i] = random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    return geo;
  }, [count, radius]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Built once; the config is written into it below whenever it changes.
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uColor: { value: new THREE.Color() },
    }),
    [],
  );

  // Layout effect so the values land before the next frame is drawn.
  useLayoutEffect(() => {
    const u = materialRef.current?.uniforms;
    if (!u) return;

    u.uPixelRatio.value = dpr;
    u.uColor.value.set(palette.star);
  }, [dpr, palette]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
