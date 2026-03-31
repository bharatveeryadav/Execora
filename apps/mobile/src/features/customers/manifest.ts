import type { ModuleManifest } from "../../lib/moduleTypes";

export const customersManifest: ModuleManifest = {
  name: "customers",
  version: "1.0.0",
  tier: "free",
  featureFlag: "customers",
  dependencies: [],
  // No tabConfig — customers are managed within the parties tab
};
