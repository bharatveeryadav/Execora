"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsageSnapshot = getUsageSnapshot;
exports.incrementUsageCounter = incrementUsageCounter;
async function getUsageSnapshot(tenantId, month) {
    const m = month ?? new Date().toISOString().slice(0, 7);
    return { tenantId, month: m, invoicesCreated: 0, apiCallsMade: 0, storageUsedMb: 0, activeUsers: 0 };
}
async function incrementUsageCounter(_tenantId, _counter, _by = 1) { }
//# sourceMappingURL=index.js.map