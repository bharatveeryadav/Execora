"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantSubscription = getTenantSubscription;
exports.activateSubscription = activateSubscription;
exports.cancelSubscription = cancelSubscription;
async function getTenantSubscription(_tenantId) {
    return null;
}
async function activateSubscription(tenantId, plan) {
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    return { tenantId, plan, status: "active", currentPeriodStart: now, currentPeriodEnd: end, cancelAtPeriodEnd: false };
}
async function cancelSubscription(_tenantId, _atPeriodEnd = true) {
    return true;
}
//# sourceMappingURL=index.js.map