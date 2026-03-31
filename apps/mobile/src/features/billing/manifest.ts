import type { ModuleManifest } from "../../lib/moduleTypes";

export const billingManifest: ModuleManifest = {
  name: "billing",
  version: "1.0.0",
  tier: "free",
  featureFlag: "billing",
  dependencies: ["customers", "products"],
  tabConfig: {
    icon: "receipt-outline",
    label: "Bills",
    order: 3,
    badgeKey: "pendingInvoices",
  },
};
