"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledgerService = void 0;
const infrastructure_1 = require("@execora/infrastructure");
const infrastructure_2 = require("@execora/infrastructure");
const infrastructure_3 = require("@execora/infrastructure");
const library_1 = require("@prisma/client/runtime/library");
const infrastructure_4 = require("@execora/infrastructure");
// Map old payment mode strings to the PaymentMethod enum
const methodMap = {
    cash: 'cash',
    upi: 'upi',
    card: 'card',
    other: 'bank',
    bank: 'bank',
    mixed: 'mixed',
};
function generatePaymentNo() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `PAY-${date}-${rand}`;
}
class LedgerService {
    /**
     * Record a payment received from customer (reduces their balance).
     */
    async recordPayment(customerId, amount, paymentMode, notes, reference, receivedAt) {
        try {
            if (!customerId?.trim())
                throw new Error('Customer ID is required');
            if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
                throw new Error('Payment amount must be a positive number');
            }
            const validModes = ['cash', 'upi', 'card', 'other'];
            if (!validModes.includes(paymentMode)) {
                throw new Error(`Payment mode must be one of: ${validModes.join(', ')}`);
            }
            const method = methodMap[paymentMode] ?? 'bank';
            return await infrastructure_1.prisma.$transaction(async (tx) => {
                const payment = await tx.payment.create({
                    data: {
                        paymentNo: generatePaymentNo(),
                        tenantId: infrastructure_3.tenantContext.get().tenantId,
                        customerId,
                        amount: new library_1.Decimal(amount),
                        method,
                        status: 'completed',
                        notes,
                        reference: reference || null,
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
                // Auto-apply payment to oldest unpaid invoices (khata-style settlement).
                // Marks each invoice as 'paid' or 'partial' as the payment is consumed.
                const pendingInvoices = await tx.invoice.findMany({
                    where: {
                        customerId,
                        tenantId: infrastructure_3.tenantContext.get().tenantId,
                        status: { in: ['pending', 'partial'] },
                    },
                    orderBy: { invoiceDate: 'asc' },
                    select: { id: true, total: true, paidAmount: true },
                });
                let remaining = amount;
                for (const inv of pendingInvoices) {
                    if (remaining <= 0)
                        break;
                    const invTotal = parseFloat(inv.total.toString());
                    const invPaid = parseFloat((inv.paidAmount ?? 0).toString());
                    const invDue = Math.round((invTotal - invPaid) * 100) / 100;
                    if (invDue <= 0)
                        continue;
                    if (remaining >= invDue) {
                        await tx.invoice.update({
                            where: { id: inv.id },
                            data: { status: 'paid', paidAmount: new library_1.Decimal(invTotal), paidAt: new Date() },
                        });
                        remaining = Math.round((remaining - invDue) * 100) / 100;
                    }
                    else {
                        await tx.invoice.update({
                            where: { id: inv.id },
                            data: { status: 'partial', paidAmount: new library_1.Decimal(invPaid + remaining) },
                        });
                        remaining = 0;
                    }
                }
                infrastructure_2.logger.info({ customerId, amount, paymentMode, reference, receivedAt }, 'Payment recorded');
                infrastructure_4.paymentProcessing.inc({ status: 'success' });
                infrastructure_4.paymentAmount.observe({ customer_id: customerId }, amount);
                return payment;
            });
        }
        catch (error) {
            infrastructure_2.logger.error({ error, customerId, amount }, 'Payment recording failed');
            infrastructure_4.paymentProcessing.inc({ status: 'error' });
            throw error;
        }
    }
    /**
     * Record a split (mixed) payment — e.g. ₹500 cash + ₹300 UPI.
     * Each split is recorded as a separate Payment row but settled together in one atomic transaction.
     */
    async recordMixedPayment(customerId, splits, notes, reference, receivedAt) {
        try {
            if (!customerId?.trim())
                throw new Error('Customer ID is required');
            if (!Array.isArray(splits) || splits.length === 0)
                throw new Error('At least one payment split is required');
            const totalAmount = splits.reduce((s, p) => s + p.amount, 0);
            if (totalAmount <= 0)
                throw new Error('Total payment amount must be positive');
            for (const split of splits) {
                if (typeof split.amount !== 'number' || split.amount <= 0 || !isFinite(split.amount)) {
                    throw new Error('Each split amount must be a positive number');
                }
                const validModes = ['cash', 'upi', 'card', 'other'];
                if (!validModes.includes(split.method)) {
                    throw new Error(`Payment mode must be one of: ${validModes.join(', ')}`);
                }
            }
            return await infrastructure_1.prisma.$transaction(async (tx) => {
                const payments = [];
                for (const split of splits) {
                    const method = methodMap[split.method] ?? 'bank';
                    const payNo = generatePaymentNo();
                    const payment = await tx.payment.create({
                        data: {
                            paymentNo: payNo,
                            tenantId: infrastructure_3.tenantContext.get().tenantId,
                            customerId,
                            amount: new library_1.Decimal(split.amount),
                            method,
                            status: 'completed',
                            notes,
                            reference: reference || null,
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
                // Auto-apply to oldest unpaid invoices (khata-style)
                const pendingInvoices = await tx.invoice.findMany({
                    where: {
                        customerId,
                        tenantId: infrastructure_3.tenantContext.get().tenantId,
                        status: { in: ['pending', 'partial'] },
                    },
                    orderBy: { invoiceDate: 'asc' },
                    select: { id: true, total: true, paidAmount: true },
                });
                let remaining = totalAmount;
                for (const inv of pendingInvoices) {
                    if (remaining <= 0)
                        break;
                    const invTotal = parseFloat(inv.total.toString());
                    const invPaid = parseFloat((inv.paidAmount ?? 0).toString());
                    const invDue = Math.round((invTotal - invPaid) * 100) / 100;
                    if (invDue <= 0)
                        continue;
                    if (remaining >= invDue) {
                        await tx.invoice.update({
                            where: { id: inv.id },
                            data: { status: 'paid', paidAmount: new library_1.Decimal(invTotal), paidAt: new Date() },
                        });
                        remaining = Math.round((remaining - invDue) * 100) / 100;
                    }
                    else {
                        await tx.invoice.update({
                            where: { id: inv.id },
                            data: { status: 'partial', paidAmount: new library_1.Decimal(invPaid + remaining) },
                        });
                        remaining = 0;
                    }
                }
                infrastructure_2.logger.info({ customerId, totalAmount, splits, notes }, 'Mixed payment recorded');
                infrastructure_4.paymentProcessing.inc({ status: 'success' });
                infrastructure_4.paymentAmount.observe({ customer_id: customerId }, totalAmount);
                return { payments, totalAmount };
            });
        }
        catch (error) {
            infrastructure_2.logger.error({ error, customerId, splits }, 'Mixed payment recording failed');
            infrastructure_4.paymentProcessing.inc({ status: 'error' });
            throw error;
        }
    }
    /**
     * Manually add a debit to a customer account (they owe more).
     * No Payment record — just adjust the balance directly.
     */
    async addCredit(customerId, amount, description) {
        try {
            if (!customerId?.trim())
                throw new Error('Customer ID is required');
            if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
                throw new Error('Amount must be a positive number');
            }
            if (!description?.trim())
                throw new Error('Description is required');
            const customer = await infrastructure_1.prisma.customer.update({
                where: { id: customerId },
                data: {
                    balance: { increment: amount },
                    totalPurchases: { increment: amount },
                },
                include: { invoices: false },
            });
            infrastructure_2.logger.info({ customerId, amount, description }, 'Manual debit added');
            return customer;
        }
        catch (error) {
            infrastructure_2.logger.error({ error, customerId, amount }, 'Add credit failed');
            throw error;
        }
    }
    /**
     * Set opening balance for a customer.
     */
    async setOpeningBalance(customerId, amount) {
        try {
            if (!customerId?.trim())
                throw new Error('Customer ID is required');
            if (typeof amount !== 'number' || amount < 0 || !isFinite(amount)) {
                throw new Error('Opening balance must be a non-negative number');
            }
            const customer = await infrastructure_1.prisma.customer.update({
                where: { id: customerId },
                data: { balance: new library_1.Decimal(amount) },
            });
            infrastructure_2.logger.info({ customerId, amount }, 'Opening balance set');
            return customer;
        }
        catch (error) {
            infrastructure_2.logger.error({ error, customerId, amount }, 'Set opening balance failed');
            throw error;
        }
    }
    /**
     * Get payments received from a customer (replaces ledger query).
     */
    async getCustomerLedger(customerId, limit = 50) {
        return await infrastructure_1.prisma.payment.findMany({
            where: { tenantId: infrastructure_3.tenantContext.get().tenantId, customerId },
            orderBy: { receivedAt: 'desc' },
            take: limit,
            include: {
                customer: { select: { name: true, phone: true } },
            },
        });
    }
    /**
     * Summarise payments for a date range.
     */
    async getLedgerSummary(startDate, endDate) {
        const payments = await infrastructure_1.prisma.payment.findMany({
            where: {
                tenantId: infrastructure_3.tenantContext.get().tenantId,
                receivedAt: { gte: startDate, lte: endDate },
                status: 'completed',
            },
            select: { amount: true, method: true },
        });
        let totalCredits = 0;
        let cashPayments = 0;
        let upiPayments = 0;
        for (const p of payments) {
            const amt = parseFloat(p.amount.toString());
            totalCredits += amt;
            if (p.method === 'cash')
                cashPayments += amt;
            if (p.method === 'upi')
                upiPayments += amt;
        }
        return {
            totalDebits: 0, // Debits come from invoices now
            totalCredits,
            netBalance: -totalCredits,
            cashPayments,
            upiPayments,
            entryCount: payments.length,
        };
    }
    /**
     * Reverse a payment applied to an invoice (owner/admin only).
     * Decrements invoice.paidAmount, increments customer.balance.
     */
    async reversePayment(invoiceId, amount) {
        if (!invoiceId?.trim())
            throw new Error('Invoice ID is required');
        if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
            throw new Error('Amount must be a positive number');
        }
        return await infrastructure_1.prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.findFirst({
                where: { id: invoiceId, tenantId: infrastructure_3.tenantContext.get().tenantId },
                include: { customer: true },
            });
            if (!invoice)
                throw new Error('Invoice not found');
            if (!invoice.customerId)
                throw new Error('Invoice has no customer');
            const paid = parseFloat((invoice.paidAmount ?? 0).toString());
            if (amount > paid) {
                throw new Error(`Cannot reverse more than paid amount (${paid})`);
            }
            const newPaid = Math.round((paid - amount) * 100) / 100;
            const invTotal = parseFloat(invoice.total.toString());
            const newStatus = newPaid <= 0 ? 'pending' : newPaid >= invTotal ? 'paid' : 'partial';
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
            // Audit: create refund payment record
            await tx.payment.create({
                data: {
                    paymentNo: `REV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    tenantId: infrastructure_3.tenantContext.get().tenantId,
                    customerId: invoice.customerId,
                    invoiceId,
                    amount: new library_1.Decimal(amount),
                    method: 'bank',
                    status: 'refunded',
                    notes: `Reversal of payment on invoice ${invoice.invoiceNo ?? invoiceId}`,
                },
            });
            infrastructure_2.logger.info({ invoiceId, amount, customerId: invoice.customerId }, 'Payment reversed');
            return { ok: true, newPaid, newStatus };
        });
    }
    /**
     * Get most recent payments across all customers.
     */
    async getRecentTransactions(limit = 20) {
        return await infrastructure_1.prisma.payment.findMany({
            where: { tenantId: infrastructure_3.tenantContext.get().tenantId },
            take: limit,
            orderBy: { receivedAt: 'desc' },
            include: {
                customer: { select: { name: true, phone: true } },
            },
        });
    }
}
exports.ledgerService = new LedgerService();
//# sourceMappingURL=ledger.service.js.map