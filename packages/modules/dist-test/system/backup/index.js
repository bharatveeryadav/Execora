"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerBackup = triggerBackup;
exports.listBackups = listBackups;
async function triggerBackup(tenantId, type = "full") {
    return { id: `BK-${Date.now()}`, tenantId, type, status: "pending", startedAt: new Date() };
}
async function listBackups(_tenantId) {
    return [];
}
//# sourceMappingURL=index.js.map