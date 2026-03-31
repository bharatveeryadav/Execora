import type { ModuleManifest } from "../../lib/moduleTypes";

export const syncManifest: ModuleManifest = {
  name: "sync",
  version: "1.0.0",
  tier: "business",
  featureFlag: "voice_sync",
  dependencies: ["billing"],
  // No tabConfig — accessible via MoreTab
};
