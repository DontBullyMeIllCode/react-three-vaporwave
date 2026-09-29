import { Canvas } from "@react-three/fiber";
import { useControls } from "leva";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  LinearVaporwave,
  type VaporwaveGround,
} from "@dontbullymeillcode/react-three-vaporwave";

import { useVaporwaveControls } from "../dev/useVaporwaveControls";

function App() {
  const layers = useControls("Layers", {
    ground: {
      value: "mountains" as VaporwaveGround,
      options: ["water", "mountains", "none"] as VaporwaveGround[],
    },
    sky: true,
    stars: true,
    sun: true,
    gridTrack: true,
  });
  const config = useVaporwaveControls();

  return (
    <Canvas>
      <LinearVaporwave {...layers} config={config} />
    </Canvas>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
