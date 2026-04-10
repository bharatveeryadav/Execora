"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPurchaseReturn = createPurchaseReturn;
exports.listPurchaseReturns = listPurchaseReturns;
async function createPurchaseReturn(input) {
    const totalAmount = input.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    return {
        ...input,
        id: `PR-${Date.now()}`,
        debitNoteNo: `DN-${Date.now()}`,
        totalAmount,
        status: "pending",
        createdAt: new Date(),
    };
}
async function listPurchaseReturns(_tenantId, _vendorId) {
    return [];
}
//# sourceMappingURL=purchase-return.js.map