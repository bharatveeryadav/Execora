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
    async recordPayment(customerId, amount, paymentMode, notes) {
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
                        receivedAt: new Date(),
                    },
                    include: { customer: true },
                });
                await tx.customer.update({
                    where: { id: customerId },
                    data: {
                        balance: { decrement: amount },
                        totalPayments: { increment: amount },
                        lastPaymentAmount: new library_1.Decimal(amount),
                        lastPaymentDate: new Date(),
                    },
                });
                infrastructure_2.logger.info({ customerId, amount, paymentMode }, 'Payment recorded');
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
            where: { customerId },
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