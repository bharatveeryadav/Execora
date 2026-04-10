"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsageDashboard = getUsageDashboard;
async function getUsageDashboard(_tenantId) {
    return {
        tenantId: _tenantId,
        planName: "",
        billingPeriod: "",
        resources: [],
    };
}
//# sourceMappingURL=index.js.map