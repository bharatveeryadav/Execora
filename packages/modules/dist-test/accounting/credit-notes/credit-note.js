"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCreditNotes = listCreditNotes;
exports.getCreditNoteById = getCreditNoteById;
exports.createCreditNote = createCreditNote;
exports.issueCreditNote = issueCreditNote;
exports.cancelCreditNote = cancelCreditNote;
exports.deleteCreditNote = deleteCreditNote;
const core_1 = require("@execora/core");
const client_1 = require("@prisma/client");
// ─── Internal helper ──────────────────────────────────────────────────────────
async function generateCreditNoteNo(tenantId) {
    const now = new Date();
    const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyLabel = `${fy}-${String(fy + 1).slice(2)}`;
    const last = await core_1.prisma.creditNote.findFirst({
        where: { tenantId, creditNoteNo: { startsWith: `CN/${fyLabel}/` } },
        orderBy: { createdAt: "desc" },
        select: { creditNoteNo: true },
    });
    let seq = 1;
    if (last) {
        const parts = last.creditNoteNo.split("/");
        seq = parseInt(parts[parts.length - 1], 10) + 1;
    }
    return `CN/${fyLabel}/${seq}`;
}
const CN_INCLUDE = {
    customer: { select: { id: true, name: true, phone: true } },
    invoice: { select: { id: true, invoiceNo: true } },
    items: true,
};
// ─── Queries ──────────────────────────────────────────────────────────────────
async function listCreditNotes(tenantId, opts = {}) {
    const where = { tenantId, deletedAt: null };
    if (opts.customerId)
        where.customerId = opts.customerId;
    if (opts.invoiceId)
        where.invoiceId = opts.invoiceId;
    if (opts.status)
        where.status = opts.status;
    return core_1.prisma.creditNote.findMany({
        where,
        take: Math.min(opts.limit ?? 20, 100),
        orderBy: { createdAt: "desc" },
        include: CN_INCLUDE,
    });
}
async function getCreditNoteById(tenantId, id) {
    return core_1.prisma.creditNote.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: {
            customer: true,
            invoice: { select: { id: true, invoiceNo: true, invoiceDate: true } },
            items: {
                include: { product: { select: { id: true, name: true, sku: true } } },
            },
        },
    });
}
// ─── Commands ─────────────────────────────────────────────────────────────────
async function createCreditNote(tenantId, userId, body) {
    if (body.invoiceId) {
        const inv = await core_1.prisma.invoice.findFirst({
            where: { id: body.invoiceId, tenantId },
        });
        if (!inv)
            throw new Error("Invoice not found");
    }
    if (body.customerId) {
        const cust = await core_1.prisma.customer.findFirst({
            where: { id: body.customerId, tenantId },
        });
        if (!cust)
            throw new Error("Customer not found");
    }
    const lineItems = body.items.map((item) => {
        const gstRate = item.gstRate ?? 0;
        const discountAmt = item.unitPrice * item.quantity * ((item.discount ?? 0) / 100);
        const subtotal = item.unitPrice * item.quantity - discountAmt;
        const taxAmt = subtotal * (gstRate / 100);
        const total = subtotal + taxAmt;
        const isIgst = body.placeOfSupply && body.buyerGstin
            ? body.buyerGstin.slice(0, 2) !== body.placeOfSupply.slice(0, 2)
            : false;
        return {
            productId: item.productId,
            productName: item.productName,
            quantity: new client_1.Prisma.Decimal(item.quantity),
            unit: item.unit ?? "pcs",
            unitPrice: new client_1.Prisma.Decimal(item.unitPrice),
            discount: new client_1.Prisma.Decimal(discountAmt),
            subtotal: new client_1.Prisma.Decimal(subtotal),
            tax: new client_1.Prisma.Decimal(taxAmt),
            cgst: isIgst ? new client_1.Prisma.Decimal(0) : new client_1.Prisma.Decimal(taxAmt / 2),
            sgst: isIgst ? new client_1.Prisma.Decimal(0) : new client_1.Prisma.Decimal(taxAmt / 2),
            igst: isIgst ? new client_1.Prisma.Decimal(taxAmt) : new client_1.Prisma.Decimal(0),
            total: new client_1.Prisma.Decimal(total),
            hsnCode: item.hsnCode,
            gstRate: new client_1.Prisma.Decimal(gstRate),
        };
    });
    const subtotal = lineItems.reduce((s, i) => s + Number(i.subtotal), 0);
    const tax = lineItems.reduce((s, i) => s + Number(i.tax), 0);
    const cgst = lineItems.reduce((s, i) => s + Number(i.cgst), 0);
    const sgst = lineItems.reduce((s, i) => s + Number(i.sgst), 0);
    const igst = lineItems.reduce((s, i) => s + Number(i.igst), 0);
    const total = subtotal + tax;
    const creditNoteNo = await generateCreditNoteNo(tenantId);
    const cn = await core_1.prisma.creditNote.create({
        data: {
            tenantId,
            creditNoteNo,
            invoiceId: body.invoiceId,
            customerId: body.customerId,
            reason: (body.reason ?? "goods_returned"),
            reasonNote: body.reasonNote,
            notes: body.notes,
            placeOfSupply: body.placeOfSupply,
            buyerGstin: body.buyerGstin,
            reverseCharge: body.reverseCharge ?? false,
            status: "draft",
            subtotal: new client_1.Prisma.Decimal(subtotal),
            tax: new client_1.Prisma.Decimal(tax),
            cgst: new client_1.Prisma.Decimal(cgst),
            sgst: new client_1.Prisma.Decimal(sgst),
            igst: new client_1.Prisma.Decimal(igst),
            total: new client_1.Prisma.Decimal(total),
            createdBy: userId,
            items: { create: lineItems },
        },
        include: { items: true, customer: { select: { id: true, name: true } } },
    });
    return cn;
}
async function issueCreditNote(tenantId, id) {
    const cn = await core_1.prisma.creditNote.findFirst({
        where: { id, tenantId, deletedAt: null },
    });
    if (!cn)
        throw new Error("Credit note not found");
    if (cn.status !== "draft")
        throw new Error(`Cannot issue a credit note in status: ${cn.status}`);
    return core_1.prisma.creditNote.update({
        where: { id: cn.id },
        data: { status: "issued", issuedAt: new Date() },
    });
}
async function cancelCreditNote(tenantId, id, reason) {
    const cn = await core_1.prisma.creditNote.findFirst({
        where: { id, tenantId, deletedAt: null },
    });
    if (!cn)
        throw new Error("Credit note not found");
    if (cn.status === "cancelled")
        throw new Error("Already cancelled");
    return core_1.prisma.creditNote.update({
        where: { id: cn.id },
        data: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelledReason: reason,
        },
    });
}
/** Soft-delete a draft credit note. Throws if not found or already issued. */
async function deleteCreditNote(tenantId, id) {
    const cn = await core_1.prisma.creditNote.findFirst({
        where: { id, tenantId, deletedAt: null },
    });
    if (!cn)
        throw new Error("Credit note not found");
    if (cn.status === "issued")
        throw new Error("Cannot delete an issued credit note — cancel it first");
    await core_1.prisma.creditNote.update({
        where: { id: cn.id },
        data: { deletedAt: new Date() },
    });
}
//# sourceMappingURL=credit-note.js.map