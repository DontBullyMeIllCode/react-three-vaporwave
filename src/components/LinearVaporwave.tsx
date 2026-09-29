import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

import type { VaporwaveConfigOverrides } from "../utils/config";
import {
  useVaporwaveConfig,
  VaporwaveConfigProvider,
} from "../utils/config-context";
import GridTrack from "./grid-track";
import Mountains from "./mountains";
import { Sky, Stars } from "./sky";
import Sun from "./sun";
import Water from "./water";

export type VaporwaveGround = "mountains" | "water" | "none";

export type LinearVaporwaveProps = {
  children?: React.ReactNode;
  /** Render the gradient sky dome. Defaults to `true`. */
  sky?: boolean;
  /** Render the star field. Defaults to `true`. */
  stars?: boolean;
  /** Render the banded sun and its halo. Defaults to `true`. */
  sun?: boolean;
  /**
   * What lies either side of the track: the reflective sea, wireframe
   * mountains, or nothing. Defaults to `"water"`.
   */
  ground?: VaporwaveGround;
  /** Render the neon grid causeway. Defaults to `true`. */
  gridTrack?: boolean;
  /**
   * Overrides for any scene value or colour, layered on top of the defaults
   * (and any `VaporwaveConfigProvider` above). Anything left out keeps its
   * default.
   */
  config?: VaporwaveConfigOverrides;
};

/** Barely-there drift so the shot never feels locked off. */
function CameraDrift() {
  const { camera: config } = useVaporwaveConfig().scene;
  const [baseX, baseY, baseZ] = config.position;
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useFrame((state) => {
    const camera = cameraRef.current;
    if (!camera) return;

    const t = state.clock.elapsedTime;
    camera.position.x = baseX + Math.sin(t * 0.21) * 0.035;
    camera.position.y = baseY + Math.sin(t * 0.33) * 0.012;
    camera.rotation.z = Math.sin(t * 0.17) * 0.008;
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={[baseX, baseY, baseZ]}
      rotation={[config.tiltX, 0, 0]}
      fov={config.fov}
      near={config.near}
      far={config.far}
    />
  );
}

export function LinearVaporwave({
  children,
  sky = true,
  stars = true,
  sun = true,
  ground = "mountains",
  gridTrack = true,
  config,
}: LinearVaporwaveProps) {
  return (
    <VaporwaveConfigProvider config={config}>
      <Background />

      <CameraDrift />

      {sky && <Sky />}
      {stars && <Stars />}
      {sun && <Sun />}
      {children}
      {ground === "water" && <Water />}
      {ground === "mountains" && <Mountains />}
      {gridTrack && <GridTrack />}
    </VaporwaveConfigProvider>
  );
}

/** Clears to the zenith colour so any gap below the sky still matches it. */
function Background() {
  const { palette } = useVaporwaveConfig();
  return <color attach="background" args={[palette.skyZenith]} />;
}
