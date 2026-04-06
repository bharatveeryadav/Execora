"use strict";
/**
 * Finance domain — payment recording and ledger queries.
 *
 * Direct Prisma calls, flat async functions, no class wrappers.
 * Auto-applies payments to oldest unpaid invoices (khata-style settlement).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordPayment = recordPayment;
exports.recordMixedPayment = recordMixedPayment;
exports.addCredit = addCredit;
exports.reversePayment = reversePayment;
exports.getCustomerLedger = getCustomerLedger;
exports.getLedgerSummary = getLedgerSummary;
exports.getRecentTransactions = getRecentTransactions;
const infrastructure_1 = require("@execora/infrastructure");
const library_1 = require("@prisma/client/runtime/library");
// ─── Internal helpers ─────────────────────────────────────────────────────────
const METHOD_MAP = {
    cash: "cash",
    upi: "upi",
    card: "card",
    other: "bank",
    bank: "bank",
    mixed: "mixed",
};
function generatePaymentNo() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `PAY-${date}-${rand}`;
}
/** Auto-settle oldest unpaid invoices with the given remaining amount (mutates tx). */
async function settleInvoices(tx, customerId, amount) {
    const { tenantId } = infrastructure_1.tenantContext.get();
    const pending = await tx.invoice.findMany({
        where: { customerId, tenantId, status: { in: ["pending", "partial"] } },
        orderBy: { invoiceDate: "asc" },
        select: { id: true, total: true, paidAmount: true },
    });
    let remaining = amount;
    for (const inv of pending) {
        if (remaining <= 0)
            break;
        const invTotal = parseFloat(String(inv.total));
        const invPaid = parseFloat(String(inv.paidAmount ?? 0));
        const invDue = Math.round((invTotal - invPaid) * 100) / 100;
        if (invDue <= 0)
            continue;
        if (remaining >= invDue) {
            await tx.invoice.update({
                where: { id: inv.id },
                data: {
                    status: "paid",
                    paidAmount: new library_1.Decimal(invTotal),
                    paidAt: new Date(),
                },
            });
            remaining = Math.round((remaining - invDue) * 100) / 100;
        }
        else {
            await tx.invoice.update({
                where: { id: inv.id },
                data: {
                    status: "partial",
                    paidAmount: new library_1.Decimal(invPaid + remaining),
                },
            });
            remaining = 0;
        }
    }
}
// ─── Commands ─────────────────────────────────────────────────────────────────
async function recordPayment(customerId, amount, paymentMode, notes, reference, receivedAt) {
    if (!customerId?.trim())
        throw new Error("Customer ID is required");
    if (typeof amount !== "number" || amount <= 0 || !isFinite(amount))
        throw new Error("Payment amount must be a positive number");
    try {
        const method = METHOD_MAP[paymentMode] ?? "bank";
        const { tenantId } = infrastructure_1.tenantContext.get();
        return await infrastructure_1.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
                data: {
                    paymentNo: generatePaymentNo(),
                    tenantId,
                    customerId,
                    amount: new library_1.Decimal(amount),
                    method,
                    status: "completed",
                    notes: notes ?? null,
                    reference: reference ?? null,
                    receivedAt: receivedAt ?? new Date(),
                },
                include: { customer: true },
            });
            await tx.customer.update({
                where: { id: customerId },
                data: {
                    balance: { decrement: amount },
                    totalPayments: { increment: amount },
                    lastPaymentAmount: new library_1.Decimal(amount),
                    lastPaymentDate: receivedAt ?? new Date(),
                },
            });
            await settleInvoices(tx, customerId, amount);
            infrastructure_1.logger.info({ customerId, amount, paymentMode }, "Payment recorded");
            infrastructure_1.paymentProcessing.inc({ status: "success" });
            infrastructure_1.paymentAmount.observe({ customer_id: customerId }, amount);
            return payment;
        });
    }
    catch (error) {
        infrastructure_1.paymentProcessing.inc({ status: "error" });
        throw error;
    }
}
async function recordMixedPayment(customerId, splits, notes, reference, receivedAt) {
    if (!customerId?.trim())
        throw new Error("Customer ID is required");
    if (!Array.isArray(splits) || splits.length === 0)
        throw new Error("At least one payment split is required");
    const totalAmount = splits.reduce((s, p) => s + p.amount, 0);
    if (totalAmount <= 0)
        throw new Error("Total payment amount must be positive");
    try {
        const { tenantId } = infrastructure_1.tenantContext.get();
        return await infrastructure_1.prisma.$transaction(async (tx) => {
            const payments = [];
            for (const split of splits) {
                const method = METHOD_MAP[split.method] ?? "bank";
                const payment = await tx.payment.create({
                    data: {
                        paymentNo: generatePaymentNo(),
                        tenantId,
                        customerId,
                        amount: new library_1.Decimal(split.amount),
                        method,
                        status: "completed",
                        notes: notes ?? null,
                        reference: reference ?? null,
                        receivedAt: receivedAt ?? new Date(),
                    },
                });
                payments.push(payment);
            }
            await tx.customer.update({
                where: { id: customerId },
                data: {
                    balance: { decrement: totalAmount },
                    totalPayments: { increment: totalAmount },
                    lastPaymentAmount: new library_1.Decimal(totalAmount),
                    lastPaymentDate: receivedAt ?? new Date(),
                },
            });
            await settleInvoices(tx, customerId, totalAmount);
            infrastructure_1.logger.info({ customerId, totalAmount, splits: splits.length }, "Mixed payment recorded");
            infrastructure_1.paymentProcessing.inc({ status: "success" });
            infrastructure_1.paymentAmount.observe({ customer_id: customerId }, totalAmount);
            return { payments, totalAmount };
        });
    }
    catch (error) {
        infrastructure_1.paymentProcessing.inc({ status: "error" });
        throw error;
    }
}
async function addCredit(customerId, amount, description) {
    if (!customerId?.trim())
        throw new Error("Customer ID is required");
    if (typeof amount !== "number" || amount <= 0)
        throw new Error("Amount must be positive");
    if (!description?.trim())
        throw new Error("Description is required");
    const customer = await infrastructure_1.prisma.customer.update({
        where: { id: customerId },
        data: {
            balance: { increment: amount },
            totalPurchases: { increment: amount },
        },
    });
    infrastructure_1.logger.info({ customerId, amount, description }, "Credit added");
    return customer;
}
async function reversePayment(invoiceId, amount) {
    if (!invoiceId?.trim())
        throw new Error("Invoice ID is required");
    if (typeof amount !== "number" || amount <= 0)
        throw new Error("Amount must be positive");
    return infrastructure_1.prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.findFirst({
            where: { id: invoiceId, tenantId: infrastructure_1.tenantContext.get().tenantId },
            include: { customer: true },
        });
        if (!invoice)
            throw new Error("Invoice not found");
        if (!invoice.customerId)
            throw new Error("Invoice has no customer");
        const paid = parseFloat(String(invoice.paidAmount ?? 0));
        if (amount > paid)
            throw new Error(`Cannot reverse more than paid amount (${paid})`);
        const newPaid = Math.round((paid - amount) * 100) / 100;
        const invTotal = parseFloat(String(invoice.total));
        const newStatus = newPaid <= 0 ? "pending" : newPaid >= invTotal ? "paid" : "partial";
        await tx.invoice.update({
            where: { id: invoiceId },
            data: {
                paidAmount: new library_1.Decimal(newPaid),
                status: newStatus,
                ...(newPaid <= 0 && { paidAt: null }),
            },
        });
        await tx.customer.update({
            where: { id: invoice.customerId },
            data: {
                balance: { increment: amount },
                totalPayments: { decrement: amount },
            },
        });
        await tx.payment.create({
            data: {
                paymentNo: `REV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                tenantId: infrastructure_1.tenantContext.get().tenantId,
                customerId: invoice.customerId,
                invoiceId,
                amount: new library_1.Decimal(amount),
                method: "bank",
                status: "refunded",
                notes: `Reversal of payment on invoice ${invoice.invoiceNo ?? invoiceId}`,
            },
        });
        infrastructure_1.logger.info({ invoiceId, amount, customerId: invoice.customerId }, "Payment reversed");
        return { ok: true, newPaid, newStatus };
    });
}
// ─── Queries ──────────────────────────────────────────────────────────────────
async function getCustomerLedger(customerId, limit = 50) {
    return infrastructure_1.prisma.payment.findMany({
        where: { tenantId: infrastructure_1.tenantContext.get().tenantId, customerId },
        orderBy: { receivedAt: "desc" },
        take: limit,
        include: { customer: { select: { name: true, phone: true } } },
    });
}
async function getLedgerSummary(startDate, endDate) {
    const payments = await infrastructure_1.prisma.payment.findMany({
        where: {
            tenantId: infrastructure_1.tenantContext.get().tenantId,
            receivedAt: { gte: startDate, lte: endDate },
            status: "completed",
        },
        select: { amount: true, method: true },
    });
    let totalCredits = 0;
    let cashPayments = 0;
    let upiPayments = 0;
    for (const p of payments) {
        const amt = parseFloat(String(p.amount));
        totalCredits += amt;
        if (p.method === "cash")
            cashPayments += amt;
        if (p.method === "upi")
            upiPayments += amt;
    }
    return {
        totalDebits: 0,
        totalCredits,
        netBalance: -totalCredits,
        cashPayments,
        upiPayments,
        entryCount: payments.length,
    };
}
async function getRecentTransactions(limit = 20) {
    return infrastructure_1.prisma.payment.findMany({
        where: { tenantId: infrastructure_1.tenantContext.get().tenantId },
        take: limit,
        orderBy: { receivedAt: "desc" },
        include: { customer: { select: { name: true, phone: true } } },
    });
}
//# sourceMappingURL=payment.js.map