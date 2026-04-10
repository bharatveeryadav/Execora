"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFeatureAccess = validateFeatureAccess;
exports.validateBulkFeatures = validateBulkFeatures;
async function validateFeatureAccess(_tenantId, _feature) {
    return { feature: _feature, allowed: false };
}
async function validateBulkFeatures(_tenantId, _features) {
    return [];
}
//# sourceMappingURL=index.js.map