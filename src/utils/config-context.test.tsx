import { useLayoutEffect } from "react";
import { describe, expect, it } from "vitest";

import { renderScene } from "../test/render";
import {
  DEFAULT_CONFIG,
  type VaporwaveConfig,
  type VaporwaveConfigOverrides,
} from "./config";
import { useVaporwaveConfig, VaporwaveConfigProvider } from "./config-context";

/** Records every config value the hook hands out. */
function createProbe() {
  const seen: VaporwaveConfig[] = [];
  function Probe() {
    const config = useVaporwaveConfig();
    useLayoutEffect(() => {
      seen.push(config);
    });
    return null;
  }
  return { Probe, seen, latest: () => seen[seen.length - 1] };
}

describe("useVaporwaveConfig", () => {
  it("falls back to the defaults with no provider", async () => {
    const { Probe, latest } = createProbe();
    await renderScene(<Probe />);
    expect(latest()).toBe(DEFAULT_CONFIG);
  });

  it("applies a provider's overrides", async () => {
    const { Probe, latest } = createProbe();
    await renderScene(
      <VaporwaveConfigProvider config={{ scene: { fog: { near: 11 } } }}>
        <Probe />
      </VaporwaveConfigProvider>,
    );
    expect(latest().scene.fog.near).toBe(11);
    expect(latest().scene.fog.far).toBe(DEFAULT_CONFIG.scene.fog.far);
  });

  it("layers nested providers, inner winning on conflicts", async () => {
    const { Probe, latest } = createProbe();
    await renderScene(
      <VaporwaveConfigProvider
        config={{ scene: { fog: { near: 1, far: 50 } } }}
      >
        <VaporwaveConfigProvider config={{ scene: { fog: { near: 2 } } }}>
          <Probe />
        </VaporwaveConfigProvider>
      </VaporwaveConfigProvider>,
    );
    expect(latest().scene.fog.near).toBe(2);
    expect(latest().scene.fog.far).toBe(50);
  });

  it("keeps the same config object across re-renders with the same overrides", async () => {
    const { Probe, seen } = createProbe();
    const overrides: VaporwaveConfigOverrides = {
      scene: { fog: { near: 3 } },
    };
    // Fresh elements each time, so React re-renders rather than bailing out.
    const tree = () => (
      <VaporwaveConfigProvider config={overrides}>
        <Probe />
      </VaporwaveConfigProvider>
    );

    const view = await renderScene(tree());
    await view.update(tree());

    expect(seen.length).toBeGreaterThan(1);
    expect(seen[seen.length - 1]).toBe(seen[0]);
  });

  it("hands out a new config when the overrides change", async () => {
    const { Probe, latest } = createProbe();
    const view = await renderScene(
      <VaporwaveConfigProvider config={{ scene: { fog: { near: 3 } } }}>
        <Probe />
      </VaporwaveConfigProvider>,
    );
    await view.update(
      <VaporwaveConfigProvider config={{ scene: { fog: { near: 4 } } }}>
        <Probe />
      </VaporwaveConfigProvider>,
    );
    expect(latest().scene.fog.near).toBe(4);
  });
});
