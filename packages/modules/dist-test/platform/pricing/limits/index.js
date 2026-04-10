"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlanLimits = getPlanLimits;
exports.checkLimitExceeded = checkLimitExceeded;
async function getPlanLimits(_planId) {
    return {
        maxUsers: 0,
        maxInvoicesPerMonth: 0,
        maxStorageMb: 0,
        maxProducts: 0,
        maxBranches: 0,
    };
}
async function checkLimitExceeded(_tenantId, _resource) {
    return false;
}
//# sourceMappingURL=index.js.map