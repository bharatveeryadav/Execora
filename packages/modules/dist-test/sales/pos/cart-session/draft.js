"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDraft = createDraft;
exports.listDrafts = listDrafts;
exports.getDraft = getDraft;
exports.updateDraft = updateDraft;
exports.confirmDraft = confirmDraft;
exports.discardDraft = discardDraft;
const core_1 = require("@execora/core");
const client_1 = require("@prisma/client");
// ─── private: execute the real DB write for a confirmed draft ────────────────
async function executeDraft(draft) {
    const data = draft.data;
    const tid = draft.tenantId;
    switch (draft.type) {
        case "purchase_entry": {
            const expense = await core_1.prisma.expense.create({
                data: {
                    tenantId: tid,
                    type: "purchase",
                    category: data.category ?? "Purchases",
                    amount: new client_1.Prisma.Decimal(data.amount ?? 0),
                    itemName: data.itemName ?? null,
                    supplier: data.supplier ?? null,
                    quantity: data.quantity != null
                        ? new client_1.Prisma.Decimal(data.quantity)
                        : null,
                    unit: data.unit ?? null,
                    ratePerUnit: data.ratePerUnit != null
                        ? new client_1.Prisma.Decimal(data.ratePerUnit)
                        : null,
                    note: data.note ?? null,
                    batchNo: data.batchNo ?? null,
                    expiryDate: data.expiryDate
                        ? new Date(data.expiryDate)
                        : null,
                    date: data.date ? new Date(data.date) : new Date(),
                },
            });
            return { expense };
        }
        case "product": {
            const product = await core_1.prisma.product.create({
                data: {
                    tenantId: tid,
                    name: data.name,
                    category: data.category ?? "General",
                    subCategory: data.subCategory ?? null,
                    price: new client_1.Prisma.Decimal(data.price ?? 0),
                    mrp: data.mrp != null ? new client_1.Prisma.Decimal(data.mrp) : null,
                    cost: data.cost != null ? new client_1.Prisma.Decimal(data.cost) : null,
                    wholesalePrice: data.wholesalePrice != null
                        ? new client_1.Prisma.Decimal(data.wholesalePrice)
                        : null,
                    priceTier2: data.priceTier2 != null
                        ? new client_1.Prisma.Decimal(data.priceTier2)
                        : null,
                    priceTier3: data.priceTier3 != null
                        ? new client_1.Prisma.Decimal(data.priceTier3)
                        : null,
                    unit: data.unit ?? "pcs",
                    sku: data.sku ?? null,
                    barcode: data.barcode ?? null,
                    stock: data.stock ?? 0,
                    minStock: data.minStock ?? 5,
                    description: data.description ?? null,
                    hsnCode: data.hsnCode ?? null,
                    gstRate: data.gstRate != null
                        ? new client_1.Prisma.Decimal(data.gstRate)
                        : new client_1.Prisma.Decimal(0),
                    imageUrl: data.imageUrl ?? null,
                    preferredSupplier: data.preferredSupplier ?? null,
                },
            });
            return { product };
        }
        case "stock_adjustment": {
            const { productId, qty, direction } = data;
            const delta = direction === "out" ? -Math.abs(qty) : Math.abs(qty);
            const product = await core_1.prisma.product.update({
                where: { id: productId },
                data: { stock: { increment: delta } },
            });
            return { product };
        }
        default:
            throw new Error(`Unknown draft type: ${draft.type}`);
    }
}
// ─── public module functions ─────────────────────────────────────────────────
async function createDraft(tenantId, userId, input) {
    return core_1.prisma.draft.create({
        data: {
            tenantId,
            type: input.type,
            title: input.title ?? null,
            data: input.data,
            notes: input.notes ?? null,
            createdBy: userId,
        },
    });
}
async function listDrafts(tenantId, opts) {
    const { type, status = "pending", limit = 100 } = opts;
    const drafts = await core_1.prisma.draft.findMany({
        where: {
            tenantId,
            ...(type ? { type } : {}),
            status,
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 200),
    });
    return { drafts, count: drafts.length };
}
async function getDraft(tenantId, id) {
    return core_1.prisma.draft.findFirst({ where: { id, tenantId } });
}
async function updateDraft(tenantId, id, patch) {
    const existing = await core_1.prisma.draft.findFirst({ where: { id, tenantId } });
    if (!existing)
        throw new Error("Draft not found");
    if (existing.status !== "pending")
        throw new Error(`Draft is already ${existing.status}`);
    return core_1.prisma.draft.update({
        where: { id: existing.id },
        data: {
            ...(patch.data !== undefined
                ? { data: patch.data }
                : {}),
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        },
    });
}
/** Executes the deferred DB write and marks the draft as confirmed. */
async function confirmDraft(tenantId, id) {
    const existing = await core_1.prisma.draft.findFirst({ where: { id, tenantId } });
    if (!existing)
        throw new Error("Draft not found");
    if (existing.status !== "pending")
        throw new Error(`Draft is already ${existing.status}`);
    const result = await executeDraft({
        id: existing.id,
        type: existing.type,
        data: existing.data,
        tenantId,
    });
    const draft = await core_1.prisma.draft.update({
        where: { id: existing.id },
        data: { status: "confirmed", confirmedAt: new Date() },
    });
    return { draft, result };
}
async function discardDraft(tenantId, id) {
    const existing = await core_1.prisma.draft.findFirst({ where: { id, tenantId } });
    if (!existing)
        throw new Error("Draft not found");
    return core_1.prisma.draft.update({
        where: { id: existing.id },
        data: { status: "discarded", discardedAt: new Date() },
    });
}
//# sourceMappingURL=draft.js.map