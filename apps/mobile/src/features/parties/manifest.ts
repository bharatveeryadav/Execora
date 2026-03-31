import type { ModuleManifest } from "../../lib/moduleTypes";

export const partiesManifest: ModuleManifest = {
  name: "parties",
  version: "1.0.0",
  tier: "free",
  featureFlag: "parties",
  dependencies: ["customers"],
  tabConfig: {
    icon: "people-outline",
    label: "Parties",
    order: 4,
  },
};
