import type { ModuleManifest } from "../../lib/moduleTypes";

export const settingsManifest: ModuleManifest = {
  name: "settings",
  version: "1.0.0",
  tier: "free",
  featureFlag: "settings",
  dependencies: [],
  // No tabConfig — accessible via MoreTab (MoreTab itself is hardcoded)
};
