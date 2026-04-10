"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOfflineQueue = getOfflineQueue;
exports.enqueueOfflineOp = enqueueOfflineOp;
exports.replayOfflineQueue = replayOfflineQueue;
async function getOfflineQueue(_tenantId) {
    return [];
}
async function enqueueOfflineOp(_tenantId, _operation, _payload) {
    throw new Error("Not implemented");
}
async function replayOfflineQueue(_tenantId) {
    return { replayed: 0, failed: 0 };
}
//# sourceMappingURL=index.js.map