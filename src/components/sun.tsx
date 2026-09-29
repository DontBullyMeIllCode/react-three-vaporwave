import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { useVaporwaveConfig } from "../utils/config-context";
import {
  haloFragmentShader,
  sunFragmentShader,
  sunVertexShader,
} from "../shaders/sun";

/**
 * The banded gradient sun. By default it rests on the horizon, so the bands
 * thickening toward its base dissolve into the haze where it meets the ground.
 */
export default function Sun() {
  const { scene, palette } = useVaporwaveConfig();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const haloRef = useRef<THREE.ShaderMaterial>(null);

  const size = scene.sun.radius * 2;

  /**
   * Half-width of the halo quad, in sun radii. Four e-folding distances puts the
   * glow at ~2% of peak by the edge, so widening `sunGlow.radius` grows the quad
   * to match instead of clipping the halo into a square.
   */
  const glowExtent = Math.max(3.5, 1 + scene.sunGlow.radius * 4);

  // Built once; the config is written into them below whenever it changes.
  const sunUniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color() },
      uBottom: { value: new THREE.Color() },
      uBands: { value: 0 },
      uEmission: { value: 0 },
      uTime: { value: 0 },
      uGlitchRate: { value: 0 },
      uGlitchChance: { value: 0 },
      uGlitchDuration: { value: 0 },
      uGlitchSlices: { value: 0 },
      uGlitchAmount: { value: 0 },
      uGlitchDensity: { value: 0 },
      uGlitchSplit: { value: 0 },
      uGlitchDropout: { value: 0 },
    }),
    [],
  );

  const haloUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color() },
      uStrength: { value: 0 },
      uExtent: { value: 0 },
      uRadius: { value: 0 },
    }),
    [],
  );

  // Layout effect so the values land before the next frame is drawn.
  useLayoutEffect(() => {
    const u = materialRef.current?.uniforms;
    const h = haloRef.current?.uniforms;
    if (!u || !h) return;

    const { sun, glitch, sunGlow } = scene;
    u.uTop.value.set(palette.sunTop);
    u.uBottom.value.set(palette.sunBottom);
    u.uBands.value = sun.bands;
    u.uEmission.value = sun.emission;
    u.uGlitchRate.value = glitch.rate;
    // A zero chance means no slot ever fires, which leaves the disc untouched.
    u.uGlitchChance.value = glitch.enabled ? glitch.chance : 0;
    u.uGlitchDuration.value = glitch.duration;
    u.uGlitchSlices.value = glitch.slices;
    u.uGlitchAmount.value = glitch.amount;
    u.uGlitchDensity.value = glitch.density;
    u.uGlitchSplit.value = glitch.split;
    u.uGlitchDropout.value = glitch.dropout;

    h.uColor.value.set(palette.sunGlow);
    h.uStrength.value = sunGlow.strength;
    h.uExtent.value = glowExtent;
    h.uRadius.value = sunGlow.radius;
  }, [scene, palette, glowExtent]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <group position={scene.sun.position}>
      <mesh position={[0, 0, -0.5]}>
        <planeGeometry args={[size * glowExtent, size * glowExtent]} />
        <shaderMaterial
          ref={haloRef}
          vertexShader={sunVertexShader}
          fragmentShader={haloFragmentShader}
          uniforms={haloUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh>
        <planeGeometry args={[size, size]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={sunVertexShader}
          fragmentShader={sunFragmentShader}
          uniforms={sunUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
