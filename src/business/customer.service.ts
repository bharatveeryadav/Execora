import { prisma } from '../lib/database';
import { logger } from '../lib/logger';
import { CustomerSearchResult } from '../types';
import { Decimal } from '@prisma/client/runtime/library';

class CustomerService {
  /**
   * Search customer by name, nickname, landmark, or phone
   */
  async searchCustomer(query: string): Promise<CustomerSearchResult[]> {
    try {
      // Search by exact phone match first
      if (/^\+?\d{10,15}$/.test(query.replace(/[\s-]/g, ''))) {
        const byPhone = await prisma.customer.findMany({
          where: {
            phone: {
              contains: query.replace(/[\s-]/g, ''),
            },
          },
          take: 5,
        });

        if (byPhone.length > 0) {
          return byPhone.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            nickname: c.nickname,
            landmark: c.landmark,
            balance: parseFloat(c.balance.toString()),
            matchScore: 1.0,
          }));
        }
      }

      // Search by name, nickname, landmark using ILIKE
      const searchLower = query.toLowerCase();
      const customers = await prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: searchLower, mode: 'insensitive' } },
            { nickname: { contains: searchLower, mode: 'insensitive' } },
            { landmark: { contains: searchLower, mode: 'insensitive' } },
            { notes: { contains: searchLower, mode: 'insensitive' } },
          ],
        },
        take: 10,
      });

      // Calculate match scores
      const results: CustomerSearchResult[] = customers.map((c) => {
        let score = 0;

        // Exact name match
        if (c.name.toLowerCase() === searchLower) score += 1.0;
        else if (c.name.toLowerCase().includes(searchLower)) score += 0.7;

        // Nickname match
        if (c.nickname?.toLowerCase() === searchLower) score += 0.9;
        else if (c.nickname?.toLowerCase().includes(searchLower)) score += 0.6;

        // Landmark match
        if (c.landmark?.toLowerCase().includes(searchLower)) score += 0.5;

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          nickname: c.nickname,
          landmark: c.landmark,
          balance: parseFloat(c.balance.toString()),
          matchScore: Math.min(score, 1.0),
        };
      });

      // Sort by match score
      return results.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      logger.error({ error, query }, 'Customer search failed');
      return [];
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(id: string) {
    return await prisma.customer.findUnique({
      where: { id },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        reminders: {
          where: { status: 'SCHEDULED' },
          orderBy: { sendAt: 'asc' },
        },
      },
    });
  }

  /**
   * Create new customer
   */
  async createCustomer(data: {
    name: string;
    phone?: string;
    nickname?: string;
    landmark?: string;
    notes?: string;
  }) {
    try {
      const customer = await prisma.customer.create({
        data: {
          name: data.name,
          phone: data.phone,
          nickname: data.nickname,
          landmark: data.landmark,
          notes: data.notes,
          balance: 0,
        },
      });

      logger.info({ customerId: customer.id, name: customer.name }, 'Customer created');
      return customer;
    } catch (error) {
      logger.error({ error, data }, 'Customer creation failed');
      throw error;
    }
  }

  /**
   * Update customer balance
   */
  async updateBalance(customerId: string, amount: number) {
    try {
      const customer = await prisma.customer.update({
        where: { id: customerId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      return customer;
    } catch (error) {
      logger.error({ error, customerId, amount }, 'Balance update failed');
      throw error;
    }
  }

  /**
   * Get customer balance
   */
  async getBalance(customerId: string): Promise<number> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { balance: true },
    });

    return customer ? parseFloat(customer.balance.toString()) : 0;
  }

  /**
   * Calculate balance from ledger entries
   */
  async calculateBalanceFromLedger(customerId: string): Promise<number> {
    const entries = await prisma.ledgerEntry.findMany({
      where: { customerId },
      select: { type: true, amount: true },
    });

    let balance = 0;
    for (const entry of entries) {
      const amount = parseFloat(entry.amount.toString());
      if (entry.type === 'DEBIT' || entry.type === 'OPENING_BALANCE') {
        balance += amount;
      } else if (entry.type === 'CREDIT') {
        balance -= amount;
      }
    }

    return balance;
  }

  /**
   * Sync balance with ledger
   */
  async syncBalance(customerId: string) {
    const calculatedBalance = await this.calculateBalanceFromLedger(customerId);
    
    await prisma.customer.update({
      where: { id: customerId },
      data: { balance: new Decimal(calculatedBalance) },
    });

    return calculatedBalance;
  }
}

export const customerService = new CustomerService();
