import { prisma } from '../lib/database';
import { logger } from '../lib/logger';
import { InvoiceItemInput } from '../types';
import { Decimal } from '@prisma/client/runtime/library';
import { invoiceOperations } from '../lib/metrics';

class InvoiceService {
  /**
   * Create invoice with atomic transaction
   */
  async createInvoice(
    customerId: string,
    items: InvoiceItemInput[],
    notes?: string
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Resolve products and calculate total
        let total = 0;
        const invoiceItems: Array<{
          productId: string;
          quantity: number;
          price: number;
          total: number;
        }> = [];

        for (const item of items) {
          // Find product by name (case insensitive)
          const product = await tx.product.findFirst({
            where: {
              name: {
                contains: item.productName,
                mode: 'insensitive',
              },
            },
          });

          if (!product) {
            throw new Error(`Product not found: ${item.productName}`);
          }

          // Check stock
          if (product.stock < item.quantity) {
            throw new Error(
              `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
            );
          }

          const itemTotal = parseFloat(product.price.toString()) * item.quantity;
          total += itemTotal;

          invoiceItems.push({
            productId: product.id,
            quantity: item.quantity,
            price: parseFloat(product.price.toString()),
            total: itemTotal,
          });
        }

        // 2. Create invoice
        const invoice = await tx.invoice.create({
          data: {
            customerId,
            total: new Decimal(total),
            status: 'CONFIRMED',
            notes,
            items: {
              create: invoiceItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: new Decimal(item.price),
                total: new Decimal(item.total),
              })),
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            customer: true,
          },
        });

        // 3. Create ledger entry (debit)
        await tx.ledgerEntry.create({
          data: {
            customerId,
            type: 'DEBIT',
            amount: new Decimal(total),
            description: `Invoice #${invoice.id.substring(0, 8)}`,
            reference: invoice.id,
          },
        });

        // 4. Update product stock
        for (const item of invoiceItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }

        // 5. Update customer balance
        await tx.customer.update({
          where: { id: customerId },
          data: {
            balance: {
              increment: total,
            },
          },
        });

        logger.info(
          {
            invoiceId: invoice.id,
            customerId,
            total,
            itemCount: items.length,
          },
          'Invoice created successfully'
        );

        // Track invoice operation
        invoiceOperations.inc({ operation: 'create', status: 'success' });

        return invoice;
      });
    } catch (error) {
      logger.error({ error, customerId, items }, 'Invoice creation failed');

      // Track invoice operation failure
      invoiceOperations.inc({ operation: 'create', status: 'error' });

      throw error;
    }
  }

  /**
   * Cancel invoice (reverse all operations)
   */
  async cancelInvoice(invoiceId: string) {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Get invoice with items
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
          include: {
            items: true,
          },
        });

        if (!invoice) {
          throw new Error('Invoice not found');
        }

        if (invoice.status === 'CANCELLED') {
          throw new Error('Invoice already cancelled');
        }

        // 2. Create reversal ledger entry (credit)
        await tx.ledgerEntry.create({
          data: {
            customerId: invoice.customerId,
            type: 'CREDIT',
            amount: invoice.total,
            description: `Invoice #${invoice.id.substring(0, 8)} cancelled`,
            reference: invoice.id,
          },
        });

        // 3. Restore product stock
        for (const item of invoice.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }

        // 4. Update customer balance
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: {
            balance: {
              decrement: parseFloat(invoice.total.toString()),
            },
          },
        });

        // 5. Mark invoice as cancelled
        const cancelledInvoice = await tx.invoice.update({
          where: { id: invoiceId },
          data: { status: 'CANCELLED' },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        logger.info({ invoiceId }, 'Invoice cancelled successfully');

        return cancelledInvoice;
      });
    } catch (error) {
      logger.error({ error, invoiceId }, 'Invoice cancellation failed');
      throw error;
    }
  }

  /**
   * Get recent invoices
   */
  async getRecentInvoices(limit: number = 10) {
    return await prisma.invoice.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Get customer invoices
   */
  async getCustomerInvoices(customerId: string, limit: number = 10) {
    return await prisma.invoice.findMany({
      where: { customerId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Get last invoice for customer
   */
  async getLastInvoice(customerId: string) {
    return await prisma.invoice.findFirst({
      where: {
        customerId,
        status: { not: 'CANCELLED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Get daily sales summary
   */
  async getDailySummary(date: Date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'CONFIRMED',
      },
      select: {
        total: true,
      },
    });

    const totalSales = invoices.reduce(
      (sum, inv) => sum + parseFloat(inv.total.toString()),
      0
    );

    const payments = await prisma.ledgerEntry.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        type: 'CREDIT',
        paymentMode: {
          not: null,
        },
      },
      select: {
        amount: true,
        paymentMode: true,
      },
    });

    const totalPayments = payments.reduce(
      (sum, p) => sum + parseFloat(p.amount.toString()),
      0
    );

    const cashPayments = payments
      .filter((p) => p.paymentMode?.toLowerCase() === 'cash')
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

    const upiPayments = payments
      .filter((p) => p.paymentMode?.toLowerCase() === 'upi')
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

    return {
      date,
      invoiceCount: invoices.length,
      totalSales,
      totalPayments,
      cashPayments,
      upiPayments,
      pendingAmount: totalSales - totalPayments,
    };
  }
}

export const invoiceService = new InvoiceService();
