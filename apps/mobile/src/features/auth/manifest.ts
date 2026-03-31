import type { ModuleManifest } from "../../lib/moduleTypes";

export const authManifest: ModuleManifest = {
  name: "auth",
  version: "1.0.0",
  tier: "free",
  featureFlag: "auth",
  dependencies: [],
  // No tabConfig — auth screens live outside the main tab navigator
};
