"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueImpersonationToken = issueImpersonationToken;
exports.triggerPasswordReset = triggerPasswordReset;
async function issueImpersonationToken(_tenantId, _adminId, _durationMinutes = 30) {
    return {
        token: "",
        tenantId: _tenantId,
        expiresAt: new Date(Date.now() + _durationMinutes * 60_000),
        issuedBy: _adminId,
    };
}
async function triggerPasswordReset(_userId) {
    return false;
}
//# sourceMappingURL=index.js.map