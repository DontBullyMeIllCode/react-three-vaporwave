import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  DEFAULT_CONFIG,
  resolveConfig,
  type VaporwaveConfig,
  type VaporwaveConfigOverrides,
} from "./config";

const VaporwaveConfigContext = createContext<VaporwaveConfig>(DEFAULT_CONFIG);

/**
 * Supplies config to every vaporwave piece below it. Overrides layer on top of
 * any provider further up, so providers can be nested to tweak a subtree.
 */
export function VaporwaveConfigProvider({
  config,
  children,
}: {
  config?: VaporwaveConfigOverrides;
  children?: ReactNode;
}) {
  const parent = useContext(VaporwaveConfigContext);
  const value = useMemo(() => resolveConfig(config, parent), [config, parent]);

  return (
    <VaporwaveConfigContext.Provider value={value}>
      {children}
    </VaporwaveConfigContext.Provider>
  );
}

/** The resolved config in effect here — the stock scene if nothing overrides it. */
export function useVaporwaveConfig(): VaporwaveConfig {
  return useContext(VaporwaveConfigContext);
}
