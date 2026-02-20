import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { Decimal } from '@prisma/client/runtime/library';
import { paymentProcessing, paymentAmount } from '../../infrastructure/metrics';

class LedgerService {
  /**
   * Record payment (credit entry)
   */
  async recordPayment(
    customerId: string,
    amount: number,
    paymentMode: 'cash' | 'upi' | 'card' | 'other',
    notes?: string
  ) {
    try {
      if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
        throw new Error('Customer ID is required');
      }
      if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
        throw new Error('Payment amount must be a positive number');
      }
      const validPaymentModes = ['cash', 'upi', 'card', 'other'];
      if (!validPaymentModes.includes(paymentMode)) {
        throw new Error(`Payment mode must be one of: ${validPaymentModes.join(', ')}`);
      }

      return await prisma.$transaction(async (tx) => {
        // 1. Create ledger credit entry
        const entry = await tx.ledgerEntry.create({
          data: {
            customerId,
            type: 'CREDIT',
            amount: new Decimal(amount),
            description: notes || `Payment received via ${paymentMode}`,
            paymentMode,
          },
          include: {
            customer: true,
          },
        });

        // 2. Update customer balance
        await tx.customer.update({
          where: { id: customerId },
          data: {
            balance: {
              decrement: amount,
            },
          },
        });

        logger.info(
          {
            customerId,
            amount,
            paymentMode,
          },
          'Payment recorded'
        );

        // Track payment metrics
        paymentProcessing.inc({ status: 'success' });
        paymentAmount.observe({ customer_id: customerId }, amount);

        return entry;
      });
    } catch (error) {
      logger.error({ error, customerId, amount }, 'Payment recording failed');

      // Track payment failure
      paymentProcessing.inc({ status: 'error' });

      throw error;
    }
  }

  /**
   * Add credit/debt to customer account
   */
  async addCredit(customerId: string, amount: number, description: string) {
    try {
      if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
        throw new Error('Customer ID is required');
      }
      if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
        throw new Error('Amount must be a positive number');
      }
      if (!description || typeof description !== 'string' || !description.trim()) {
        throw new Error('Description is required');
      }

      return await prisma.$transaction(async (tx) => {
        // 1. Create ledger debit entry
        const entry = await tx.ledgerEntry.create({
          data: {
            customerId,
            type: 'DEBIT',
            amount: new Decimal(amount),
            description,
          },
          include: {
            customer: true,
          },
        });

        // 2. Update customer balance
        await tx.customer.update({
          where: { id: customerId },
          data: {
            balance: {
              increment: amount,
            },
          },
        });

        logger.info({ customerId, amount, description }, 'Credit added');

        return entry;
      });
    } catch (error) {
      logger.error({ error, customerId, amount }, 'Add credit failed');
      throw error;
    }
  }

  /**
   * Set opening balance
   */
  async setOpeningBalance(customerId: string, amount: number) {
    try {
      if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
        throw new Error('Customer ID is required');
      }
      if (typeof amount !== 'number' || amount < 0 || !isFinite(amount)) {
        throw new Error('Opening balance must be a non-negative number');
      }

      return await prisma.$transaction(async (tx) => {
        // Check if opening balance already exists
        const existing = await tx.ledgerEntry.findFirst({
          where: {
            customerId,
            type: 'OPENING_BALANCE',
          },
        });

        if (existing) {
          throw new Error('Opening balance already set for this customer');
        }

        // 1. Create opening balance entry
        const entry = await tx.ledgerEntry.create({
          data: {
            customerId,
            type: 'OPENING_BALANCE',
            amount: new Decimal(amount),
            description: 'Opening balance',
          },
          include: {
            customer: true,
          },
        });

        // 2. Update customer balance
        await tx.customer.update({
          where: { id: customerId },
          data: {
            balance: new Decimal(amount),
          },
        });

        logger.info({ customerId, amount }, 'Opening balance set');

        return entry;
      });
    } catch (error) {
      logger.error({ error, customerId, amount }, 'Set opening balance failed');
      throw error;
    }
  }

  /**
   * Get customer ledger entries
   */
  async getCustomerLedger(customerId: string, limit: number = 50) {
    return await prisma.ledgerEntry.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * Get ledger summary for date range
   */
  async getLedgerSummary(startDate: Date, endDate: Date) {
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        type: true,
        amount: true,
        paymentMode: true,
      },
    });

    let totalDebits = 0;
    let totalCredits = 0;
    let cashPayments = 0;
    let upiPayments = 0;

    for (const entry of entries) {
      const amount = parseFloat(entry.amount.toString());

      if (entry.type === 'DEBIT' || entry.type === 'OPENING_BALANCE') {
        totalDebits += amount;
      } else if (entry.type === 'CREDIT') {
        totalCredits += amount;

        if (entry.paymentMode === 'cash') {
          cashPayments += amount;
        } else if (entry.paymentMode === 'upi') {
          upiPayments += amount;
        }
      }
    }

    return {
      totalDebits,
      totalCredits,
      netBalance: totalDebits - totalCredits,
      cashPayments,
      upiPayments,
      entryCount: entries.length,
    };
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(limit: number = 20) {
    return await prisma.ledgerEntry.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });
  }
}

export const ledgerService = new LedgerService();
