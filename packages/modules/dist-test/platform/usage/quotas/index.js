"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuotaStatus = getQuotaStatus;
exports.getAllQuotas = getAllQuotas;
exports.incrementQuota = incrementQuota;
async function getQuotaStatus(_tenantId, _resource) {
    return {
        resource: _resource,
        used: 0,
        limit: 0,
        percentUsed: 0,
        blocked: false,
    };
}
async function getAllQuotas(_tenantId) {
    return [];
}
async function incrementQuota(_tenantId, _resource, _amount = 1) { }
//# sourceMappingURL=index.js.map