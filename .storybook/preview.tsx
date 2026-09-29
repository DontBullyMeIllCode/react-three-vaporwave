import type { Preview } from "@storybook/react-vite";
import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";

import { useVaporwaveControls } from "../dev/useVaporwaveControls";
import { VaporwaveConfigProvider } from "../src";

/**
 * Full-size R3F canvas with the leva config panel. The panel's values reach
 * every story through the provider, so stories never need to wire it up.
 */
function Stage({ children }: { children: ReactNode }) {
  const config = useVaporwaveControls();

  return (
    <div style={{ height: "100vh" }}>
      <Canvas>
        <VaporwaveConfigProvider config={config}>
          {children}
        </VaporwaveConfigProvider>
      </Canvas>
    </div>
  );
}

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <Stage>
        <Story />
      </Stage>
    ),
  ],
};

export default preview;
