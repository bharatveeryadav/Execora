"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_ENTITLEMENTS = void 0;
exports.getEntitlementsForPlan = getEntitlementsForPlan;
exports.PLAN_ENTITLEMENTS = {
    free: { plan: "free", maxUsers: 1, maxInvoicesPerMonth: 50, maxProductCatalogSize: 100, storageGb: 1, voiceAssistant: false, apiAccess: false, advancedReports: false, multiWarehouse: false, ecommerceSyncPlatforms: 0 },
    starter: { plan: "starter", maxUsers: 3, maxInvoicesPerMonth: 500, maxProductCatalogSize: 1000, storageGb: 5, voiceAssistant: true, apiAccess: false, advancedReports: false, multiWarehouse: false, ecommerceSyncPlatforms: 0 },
    growth: { plan: "growth", maxUsers: 10, maxInvoicesPerMonth: 5000, maxProductCatalogSize: 10000, storageGb: 20, voiceAssistant: true, apiAccess: true, advancedReports: true, multiWarehouse: true, ecommerceSyncPlatforms: 2 },
    enterprise: { plan: "enterprise", maxUsers: 999, maxInvoicesPerMonth: 999999, maxProductCatalogSize: 999999, storageGb: 200, voiceAssistant: true, apiAccess: true, advancedReports: true, multiWarehouse: true, ecommerceSyncPlatforms: 10 },
};
function getEntitlementsForPlan(plan) {
    return exports.PLAN_ENTITLEMENTS[plan] ?? exports.PLAN_ENTITLEMENTS["free"];
}
//# sourceMappingURL=index.js.map