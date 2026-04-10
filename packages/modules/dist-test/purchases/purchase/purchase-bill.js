"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPurchaseBill = createPurchaseBill;
exports.listPurchaseBills = listPurchaseBills;
async function createPurchaseBill(input) {
    const subtotal = input.items.reduce((s, i) => s + i.total, 0);
    const gstTotal = input.items.reduce((s, i) => s + (i.total * ((i.gstRate ?? 0) / 100)), 0);
    return {
        ...input,
        id: `PB-${Date.now()}`,
        subtotal,
        gstTotal,
        total: subtotal + gstTotal,
        status: "pending",
        createdAt: new Date(),
    };
}
async function listPurchaseBills(_tenantId, _vendorId) {
    return [];
}
//# sourceMappingURL=purchase-bill.js.map