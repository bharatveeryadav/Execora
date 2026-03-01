/**
 * Payment intent handlers.
 * Covers: RECORD_PAYMENT, ADD_CREDIT
 */
import { customerService } from '../../customer/customer.service';
import { ledgerService } from '../../ledger/ledger.service';
import { resolveCustomer } from './shared';
import type { ExecutionResult } from '../../../types';

// ── RECORD_PAYMENT ───────────────────────────────────────────────────────────

export async function executeRecordPayment(
  entities: Record<string, any>,
  conversationId?: string,
): Promise<ExecutionResult> {
  const amount = Number(entities.amount);
  const mode   = entities.mode || 'cash';

  if (!isFinite(amount) || amount <= 0) {
    return { success: false, message: 'Payment amount not provided', error: 'MISSING_AMOUNT' };
  }

  const resolution = await resolveCustomer(entities, conversationId);
  if (resolution.multiple) {
    return { success: false, message: 'Multiple customers found. Please specify customer name with landmark.', error: 'MULTIPLE_CUSTOMERS', data: { customers: (resolution.candidates || []).slice(0, 3) } };
  }
  if (!resolution.customer) {
    return { success: false, message: `Customer '${resolution.query || 'specified'}' not found`, error: 'CUSTOMER_NOT_FOUND' };
  }

  const customer = resolution.customer;
  await ledgerService.recordPayment(customer.id, amount, mode);
  customerService.invalidateBalanceCache(customer.id);

  const balance = conversationId
    ? await customerService.getBalanceFast(customer.id, conversationId)
    : await customerService.getBalance(customer.id);

  return {
    success: true,
    message: `${customer.name} se ${amount} payment mil gya. Baki ${balance} reh gye hai.`,
    data: { customer: customer.name, amountPaid: amount, paymentMode: mode, remainingBalance: balance },
  };
}

// ── ADD_CREDIT ───────────────────────────────────────────────────────────────

export async function executeAddCredit(
  entities: Record<string, any>,
  conversationId?: string,
): Promise<ExecutionResult> {
  const amount      = Number(entities.amount);
  const description = entities.description;

  if (!isFinite(amount) || amount <= 0) {
    return { success: false, message: 'Credit amount not provided', error: 'MISSING_AMOUNT' };
  }

  const resolution = await resolveCustomer(entities, conversationId);
  if (resolution.multiple) {
    return { success: false, message: 'Multiple customers found. Please specify customer name with landmark.', error: 'MULTIPLE_CUSTOMERS', data: { customers: (resolution.candidates || []).slice(0, 3) } };
  }
  if (!resolution.customer) {
    return { success: false, message: `Customer '${resolution.query || 'specified'}' not found`, error: 'CUSTOMER_NOT_FOUND' };
  }

  const customer = resolution.customer;
  await ledgerService.addCredit(customer.id, amount, description || 'Credit added');
  customerService.invalidateBalanceCache(customer.id);

  const balance = conversationId
    ? await customerService.getBalanceFast(customer.id, conversationId)
    : await customerService.getBalance(customer.id);

  return {
    success: true,
    message: `${customer.name} ko ${amount} add kar diya. Total balance ab ₹${balance} hai.`,
    data: { customer: customer.name, amountAdded: amount, totalBalance: balance },
  };
}
