import type { ModuleManifest } from "../../lib/moduleTypes";

export const expensesManifest: ModuleManifest = {
  name: "expenses",
  version: "1.0.0",
  tier: "starter",
  featureFlag: "expenses",
  dependencies: [],
  // No tabConfig — accessible via MoreTab
};
