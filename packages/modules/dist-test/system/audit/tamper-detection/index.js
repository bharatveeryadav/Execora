"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendAuditEntry = appendAuditEntry;
exports.verifyChainIntegrity = verifyChainIntegrity;
exports.listAuditChain = listAuditChain;
async function appendAuditEntry(_tenantId, _entityType, _entityId, _payload) {
    throw new Error("Not implemented");
}
async function verifyChainIntegrity(_tenantId, _entityType) {
    return { valid: true };
}
async function listAuditChain(_tenantId, _entityType, _entityId) {
    return [];
}
//# sourceMappingURL=index.js.map