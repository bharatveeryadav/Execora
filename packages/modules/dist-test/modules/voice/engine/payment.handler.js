"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRecordPayment = executeRecordPayment;
exports.executeAddCredit = executeAddCredit;
/**
 * Payment intent handlers.
 * Covers: RECORD_PAYMENT, ADD_CREDIT
 */
const customer_service_1 = require("../../customer/customer.service");
const ledger_service_1 = require("../../ledger/ledger.service");
const shared_1 = require("./shared");
// ── RECORD_PAYMENT ───────────────────────────────────────────────────────────
async function executeRecordPayment(entities, conversationId) {
    const amount = Number(entities.amount);
    const mode = entities.mode || 'cash';
    if (!isFinite(amount) || amount <= 0) {
        return { success: false, message: 'Payment amount not provided', error: 'MISSING_AMOUNT' };
    }
    const resolution = await (0, shared_1.resolveCustomer)(entities, conversationId);
    if (resolution.multiple) {
        return { success: false, message: 'Multiple customers found. Please specify customer name with landmark.', error: 'MULTIPLE_CUSTOMERS', data: { customers: (resolution.candidates || []).slice(0, 3) } };
    }
    if (!resolution.customer) {
        return { success: false, message: `Customer '${resolution.query || 'specified'}' not found`, error: 'CUSTOMER_NOT_FOUND' };
    }
    const customer = resolution.customer;
    await ledger_service_1.ledgerService.recordPayment(customer.id, amount, mode);
    customer_service_1.customerService.invalidateBalanceCache(customer.id);
    const balance = conversationId
        ? await customer_service_1.customerService.getBalanceFast(customer.id, conversationId)
        : await customer_service_1.customerService.getBalance(customer.id);
    return {
        success: true,
        message: `${customer.name} se ${amount} payment mil gya. Baki ${balance} reh gye hai.`,
        data: { customer: customer.name, amountPaid: amount, paymentMode: mode, remainingBalance: balance },
    };
}
// ── ADD_CREDIT ───────────────────────────────────────────────────────────────
async function executeAddCredit(entities, conversationId) {
    const amount = Number(entities.amount);
    const description = entities.description;
    if (!isFinite(amount) || amount <= 0) {
        return { success: false, message: 'Credit amount not provided', error: 'MISSING_AMOUNT' };
    }
    const resolution = await (0, shared_1.resolveCustomer)(entities, conversationId);
    if (resolution.multiple) {
        return { success: false, message: 'Multiple customers found. Please specify customer name with landmark.', error: 'MULTIPLE_CUSTOMERS', data: { customers: (resolution.candidates || []).slice(0, 3) } };
    }
    if (!resolution.customer) {
        return { success: false, message: `Customer '${resolution.query || 'specified'}' not found`, error: 'CUSTOMER_NOT_FOUND' };
    }
    const customer = resolution.customer;
    await ledger_service_1.ledgerService.addCredit(customer.id, amount, description || 'Credit added');
    customer_service_1.customerService.invalidateBalanceCache(customer.id);
    const balance = conversationId
        ? await customer_service_1.customerService.getBalanceFast(customer.id, conversationId)
        : await customer_service_1.customerService.getBalance(customer.id);
    return {
        success: true,
        message: `${customer.name} ko ${amount} add kar diya. Total balance ab ₹${balance} hai.`,
        data: { customer: customer.name, amountAdded: amount, totalBalance: balance },
    };
}
//# sourceMappingURL=payment.handler.js.map