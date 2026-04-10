"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransferRequest = createTransferRequest;
async function createTransferRequest(input) {
    return { ...input, id: `TR-${Date.now()}`, requestedAt: new Date() };
}
//# sourceMappingURL=transfer-request.js.map