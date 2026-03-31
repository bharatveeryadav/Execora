import type { ModuleManifest } from "../../lib/moduleTypes";

export const accountingManifest: ModuleManifest = {
  name: "accounting",
  version: "1.0.0",
  tier: "starter",
  featureFlag: "accounting",
  dependencies: [],
  // No tabConfig — accessible via MoreTab
};
