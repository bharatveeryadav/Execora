"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPurchaseOrders = listPurchaseOrders;
exports.getPurchaseOrderById = getPurchaseOrderById;
exports.createPurchaseOrder = createPurchaseOrder;
exports.updatePurchaseOrder = updatePurchaseOrder;
exports.receivePurchaseOrder = receivePurchaseOrder;
exports.cancelPurchaseOrder = cancelPurchaseOrder;
const infrastructure_1 = require("@execora/infrastructure");
const library_1 = require("@prisma/client/runtime/library");
// ─── Helpers ──────────────────────────────────────────────────────────────────
async function generatePoNo(tenantId) {
    const now = new Date();
    const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyLabel = `${fy}-${String(fy + 1).slice(2)}`;
    const last = await infrastructure_1.prisma.purchaseOrder.findFirst({
        where: { tenantId, poNo: { startsWith: `PO/${fyLabel}/` } },
        orderBy: { createdAt: "desc" },
        select: { poNo: true },
    });
    let seq = 1;
    if (last) {
        const parts = last.poNo.split("/");
        seq = parseInt(parts[parts.length - 1], 10) + 1;
    }
    return `PO/${fyLabel}/${seq}`;
}
const PO_INCLUDE = {
    supplier: { select: { id: true, name: true, phone: true } },
    items: {
        include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
        },
    },
};
// ─── Queries ──────────────────────────────────────────────────────────────────
async function listPurchaseOrders(tenantId, opts = {}) {
    const where = { tenantId };
    if (opts.status)
        where.status = opts.status;
    if (opts.supplierId)
        where.supplierId = opts.supplierId;
    return infrastructure_1.prisma.purchaseOrder.findMany({
        where,
        take: Math.min(opts.limit ?? 50, 100),
        orderBy: { orderDate: "desc" },
        include: PO_INCLUDE,
    });
}
async function getPurchaseOrderById(tenantId, id) {
    return infrastructure_1.prisma.purchaseOrder.findFirst({
        where: { id, tenantId },
        include: PO_INCLUDE,
    });
}
// ─── Commands ─────────────────────────────────────────────────────────────────
async function createPurchaseOrder(tenantId, userId, input) {
    const { supplierId, expectedDate, notes, status = "pending", items } = input;
    let subtotal = 0;
    const itemData = items.map((it) => {
        const total = it.quantity * it.unitPrice;
        subtotal += total;
        return {
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: new library_1.Decimal(it.unitPrice),
            total: new library_1.Decimal(total),
            batchNo: it.batchNo?.trim() || null,
            expiryDate: it.expiryDate ? new Date(it.expiryDate) : null,
        };
    });
    const poNo = await generatePoNo(tenantId);
    return infrastructure_1.prisma.purchaseOrder.create({
        data: {
            tenantId,
            poNo,
            supplierId: supplierId?.trim() || null,
            expectedDate: expectedDate ? new Date(expectedDate) : null,
            subtotal: new library_1.Decimal(subtotal),
            tax: new library_1.Decimal(0),
            total: new library_1.Decimal(subtotal),
            status,
            notes: notes?.trim() || null,
            createdBy: userId,
            items: { create: itemData },
        },
        include: PO_INCLUDE,
    });
}
async function updatePurchaseOrder(tenantId, id, input) {
    const existing = await infrastructure_1.prisma.purchaseOrder.findFirst({
        where: { id, tenantId },
        include: { items: true },
    });
    if (!existing)
        return null;
    if (existing.status === "received" || existing.status === "cancelled") {
        throw new Error("Cannot edit received or cancelled PO");
    }
    const updates = {};
    if (input.supplierId !== undefined) {
        updates.supplier = input.supplierId
            ? { connect: { id: input.supplierId } }
            : { disconnect: true };
    }
    if (input.expectedDate !== undefined)
        updates.expectedDate = input.expectedDate
            ? new Date(input.expectedDate)
            : null;
    if (input.notes !== undefined)
        updates.notes = input.notes?.trim() || null;
    if (input.status !== undefined)
        updates.status = input.status;
    if (input.items && input.items.length > 0) {
        let subtotal = 0;
        const itemData = input.items.map((it) => {
            const total = it.quantity * it.unitPrice;
            subtotal += total;
            return {
                productId: it.productId,
                quantity: it.quantity,
                unitPrice: new library_1.Decimal(it.unitPrice),
                total: new library_1.Decimal(total),
                batchNo: it.batchNo?.trim() || null,
                expiryDate: it.expiryDate ? new Date(it.expiryDate) : null,
            };
        });
        updates.subtotal = new library_1.Decimal(subtotal);
        updates.tax = new library_1.Decimal(0);
        updates.total = new library_1.Decimal(subtotal);
        updates.items = { deleteMany: {}, create: itemData };
    }
    return infrastructure_1.prisma.purchaseOrder.update({
        where: { id },
        data: updates,
        include: PO_INCLUDE,
    });
}
async function receivePurchaseOrder(tenantId, id, receipts) {
    const po = await infrastructure_1.prisma.purchaseOrder.findFirst({
        where: { id, tenantId },
        include: { items: { include: { product: true } } },
    });
    if (!po)
        return null;
    if (po.status === "cancelled")
        throw new Error("Cannot receive cancelled PO");
    await infrastructure_1.prisma.$transaction(async (tx) => {
        for (const r of receipts) {
            const item = po.items.find((i) => i.id === r.itemId);
            if (!item)
                continue;
            const qty = Math.min(r.receivedQty, item.quantity - item.receivedQuantity);
            if (qty <= 0)
                continue;
            await tx.purchaseOrderItem.update({
                where: { id: r.itemId },
                data: { receivedQuantity: { increment: qty } },
            });
            await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: qty } },
            });
            if (r.batchNo?.trim() || r.expiryDate) {
                const batchNo = r.batchNo?.trim() || `B-${Date.now()}`;
                const expiryDate = r.expiryDate
                    ? new Date(r.expiryDate)
                    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
                try {
                    await tx.productBatch.upsert({
                        where: {
                            tenantId_productId_batchNo: {
                                tenantId,
                                productId: item.productId,
                                batchNo,
                            },
                        },
                        create: {
                            tenantId,
                            productId: item.productId,
                            batchNo,
                            expiryDate,
                            quantity: qty,
                            initialQuantity: qty,
                            purchasePrice: item.unitPrice,
                            purchaseDate: new Date(),
                            supplierId: po.supplierId,
                        },
                        update: { quantity: { increment: qty } },
                    });
                }
                catch {
                    // Batch upsert failed — stock already updated, continue
                }
            }
        }
        const updated = await tx.purchaseOrder.findUnique({
            where: { id: po.id },
            include: { items: true },
        });
        if (!updated)
            return;
        const allReceived = updated.items.every((i) => i.receivedQuantity >= i.quantity);
        const anyReceived = updated.items.some((i) => i.receivedQuantity > 0);
        const newStatus = allReceived
            ? "received"
            : anyReceived
                ? "partial"
                : updated.status;
        await tx.purchaseOrder.update({
            where: { id: po.id },
            data: {
                status: newStatus,
                ...(allReceived && { receivedDate: new Date() }),
            },
        });
    });
    return infrastructure_1.prisma.purchaseOrder.findFirst({
        where: { id, tenantId },
        include: PO_INCLUDE,
    });
}
async function cancelPurchaseOrder(tenantId, id) {
    const po = await infrastructure_1.prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po)
        return null;
    if (po.status === "received")
        throw new Error("Cannot cancel fully received PO");
    await infrastructure_1.prisma.purchaseOrder.update({
        where: { id },
        data: { status: "cancelled" },
    });
    return infrastructure_1.prisma.purchaseOrder.findFirst({
        where: { id, tenantId },
        include: PO_INCLUDE,
    });
}
//# sourceMappingURL=purchase-order.js.map