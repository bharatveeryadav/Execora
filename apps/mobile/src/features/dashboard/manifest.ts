import type { ModuleManifest } from "../../lib/moduleTypes";

export const dashboardManifest: ModuleManifest = {
  name: "dashboard",
  version: "1.0.0",
  tier: "free",
  featureFlag: "dashboard",
  dependencies: [],
  tabConfig: {
    icon: "home-outline",
    label: "Home",
    order: 1,
  },
};
