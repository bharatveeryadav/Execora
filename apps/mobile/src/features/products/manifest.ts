import type { ModuleManifest } from "../../lib/moduleTypes";

export const productsManifest: ModuleManifest = {
  name: "products",
  version: "1.0.0",
  tier: "free",
  featureFlag: "products",
  dependencies: [],
  tabConfig: {
    icon: "cube-outline",
    label: "Items",
    order: 2,
  },
};
