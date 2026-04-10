"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantConfig = getTenantConfig;
exports.updateTenantConfig = updateTenantConfig;
async function getTenantConfig(_tenantId) {
    return null;
}
async function updateTenantConfig(tenantId, updates) {
    const defaults = { tenantId, businessName: "My Business", currency: "INR", locale: "en-IN", timezone: "Asia/Kolkata", financialYearStart: "april" };
    return { ...defaults, ...updates, tenantId };
}
//# sourceMappingURL=index.js.map