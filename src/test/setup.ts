import { afterEach, vi } from "vitest";

import { cleanup } from "./render";

afterEach(async () => {
  await cleanup();
  vi.restoreAllMocks();
});
