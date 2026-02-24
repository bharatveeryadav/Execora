import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { SYSTEM_TENANT_ID } from '../../infrastructure/bootstrap';
import { Decimal } from '@prisma/client/runtime/library';
import { paymentProcessing, paymentAmount } from '../../infrastructure/metrics';

// Map old payment mode strings to the PaymentMethod enum
const methodMap: Record<string, 'cash' | 'upi' | 'card' | 'bank' | 'credit' | 'mixed'> = {
  cash:  'cash',
  upi:   'upi',
  card:  'card',
  other: 'bank',
};

function generatePaymentNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PAY-${date}-${rand}`;
}

class LedgerService {
  /**
   * Record a payment received from customer (reduces their balance).
   */
  async recordPayment(
    customerId: string,
    amount: number,
    paymentMode: 'cash' | 'upi' | 'card' | 'other',
    notes?: string
  ) {
    try {
      if (!customerId?.trim()) throw new Error('Customer ID is required');
      if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
        throw new Error('Payment amount must be a positive number');
      }
      const validModes = ['cash', 'upi', 'card', 'other'];
      if (!validModes.includes(paymentMode)) {
        throw new Error(`Payment mode must be one of: ${validModes.join(', ')}`);
      }

      const method = methodMap[paymentMode] ?? 'bank';

      return await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            paymentNo:  generatePaymentNo(),
            tenantId:   SYSTEM_TENANT_ID,
            customerId,
            amount:     new Decimal(amount),
            method,
            status:     'completed',
            notes,
            receivedAt: new Date(),
          },
          include: { customer: true },
        });

        await tx.customer.update({
          where: { id: customerId },
          data: {
            balance:       { decrement: amount },
            totalPayments: { increment: amount },
            lastPaymentAmount: new Decimal(amount),
            lastPaymentDate:   new Date(),
          },
        });

        logger.info({ customerId, amount, paymentMode }, 'Payment recorded');
        paymentProcessing.inc({ status: 'success' });
        paymentAmount.observe({ customer_id: customerId }, amount);

        return payment;
      });
    } catch (error) {
      logger.error({ error, customerId, amount }, 'Payment recording failed');
      paymentProcessing.inc({ status: 'error' });
      throw error;
    }
  }

  /**
   * Manually add a debit to a customer account (they owe more).
   * No Payment record — just adjust the balance directly.
   */
  async addCredit(customerId: string, amount: number, description: string) {
    try {
      if (!customerId?.trim()) throw new Error('Customer ID is required');
      if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
        throw new Error('Amount must be a positive number');
      }
      if (!description?.trim()) throw new Error('Description is required');

      const customer = await prisma.customer.update({
        where: { id: customerId },
        data: {
          balance:        { increment: amount },
          totalPurchases: { increment: amount },
        },
        include: { invoices: false },
      });

      logger.info({ customerId, amount, description }, 'Manual debit added');
      return customer;
    } catch (error) {
      logger.error({ error, customerId, amount }, 'Add credit failed');
      throw error;
    }
  }

  /**
   * Set opening balance for a customer.
   */
  async setOpeningBalance(customerId: string, amount: number) {
    try {
      if (!customerId?.trim()) throw new Error('Customer ID is required');
      if (typeof amount !== 'number' || amount < 0 || !isFinite(amount)) {
        throw new Error('Opening balance must be a non-negative number');
      }

      const customer = await prisma.customer.update({
        where: { id: customerId },
        data: { balance: new Decimal(amount) },
      });

      logger.info({ customerId, amount }, 'Opening balance set');
      return customer;
    } catch (error) {
      logger.error({ error, customerId, amount }, 'Set opening balance failed');
      throw error;
    }
  }

  /**
   * Get payments received from a customer (replaces ledger query).
   */
  async getCustomerLedger(customerId: string, limit: number = 50) {
    return await prisma.payment.findMany({
      where:   { customerId },
      orderBy: { receivedAt: 'desc' },
      take:    limit,
      include: {
        customer: { select: { name: true, phone: true } },
      },
    });
  }

  /**
   * Summarise payments for a date range.
   */
  async getLedgerSummary(startDate: Date, endDate: Date) {
    const payments = await prisma.payment.findMany({
      where: {
        tenantId:   SYSTEM_TENANT_ID,
        receivedAt: { gte: startDate, lte: endDate },
        status:     'completed',
      },
      select: { amount: true, method: true },
    });

    let totalCredits  = 0;
    let cashPayments  = 0;
    let upiPayments   = 0;

    for (const p of payments) {
      const amt = parseFloat(p.amount.toString());
      totalCredits += amt;
      if (p.method === 'cash') cashPayments += amt;
      if (p.method === 'upi')  upiPayments  += amt;
    }

    return {
      totalDebits:  0, // Debits come from invoices now
      totalCredits,
      netBalance:   -totalCredits,
      cashPayments,
      upiPayments,
      entryCount:   payments.length,
    };
  }

  /**
   * Get most recent payments across all customers.
   */
  async getRecentTransactions(limit: number = 20) {
    return await prisma.payment.findMany({
      where:   { tenantId: SYSTEM_TENANT_ID },
      take:    limit,
      orderBy: { receivedAt: 'desc' },
      include: {
        customer: { select: { name: true, phone: true } },
      },
    });
  }
}

export const ledgerService = new LedgerService();
