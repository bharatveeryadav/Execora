
import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { SYSTEM_TENANT_ID } from '../../infrastructure/bootstrap';
import { InvoiceItemInput } from '../../types';
import { Decimal } from '@prisma/client/runtime/library';
import { invoiceOperations } from '../../infrastructure/metrics';

function generateInvoiceNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `INV-${date}-${rand}`;
}

class InvoiceService {
  /**
   * Find a product by name using a two-pass strategy:
   * 1) Exact case-insensitive contains match (fast).
   * 2) Fuzzy fallback — normalise both strings, pick best overlap.
   * This handles spoken/transliterated names ("cheeni" → "Cheeni", "aata" → "Atta").
   */
  /**
   * Find a product by name (two-pass: exact contains, then fuzzy).
   * If still not found, auto-creates the product with price=0 so invoices never block.
   * Returns { product, autoCreated } so callers can warn the shopkeeper.
   */
  private async findOrCreateProduct(
    tx: any,
    productName: string
  ): Promise<{ product: any; autoCreated: boolean }> {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

    // Pass 1: exact case-insensitive contains
    const exact = await tx.product.findFirst({
      where: {
        tenantId: SYSTEM_TENANT_ID,
        name: { contains: productName, mode: 'insensitive' },
        isActive: true,
      },
    });
    if (exact) return { product: exact, autoCreated: false };

    // Pass 2: fuzzy — best character-overlap across all active products
    const allProducts = await tx.product.findMany({
      where: { tenantId: SYSTEM_TENANT_ID, isActive: true },
      select: { id: true, name: true, price: true, stock: true, unit: true },
    });

    const q = norm(productName);
    let bestProduct: (typeof allProducts)[0] | null = null;
    let bestScore = 0;

    if (q.length > 0) {
      for (const p of allProducts) {
        const n = norm(p.name);
        if (n.length === 0) continue;
        const overlap = q.includes(n) || n.includes(q) ? Math.min(q.length, n.length) : 0;
        const score = overlap / Math.max(q.length, n.length);
        if (score > bestScore) { bestScore = score; bestProduct = p; }
      }
    }

    if (bestProduct && bestScore >= 0.5) {
      return { product: bestProduct, autoCreated: false };
    }

    // Pass 3: auto-create with price=0, stock=9999 so the invoice always succeeds.
    // Shopkeeper should update the price later via the product catalog.
    const created = await tx.product.create({
      data: {
        tenantId: SYSTEM_TENANT_ID,
        name: productName,
        category: 'General',
        price: new Decimal(0),
        unit: 'piece',
        stock: 9999,
        isActive: true,
      },
    });

    logger.warn(
      { productName, productId: created.id, tenantId: SYSTEM_TENANT_ID },
      'Product auto-created during invoice (price=0) — update price in catalog'
    );

    return { product: created, autoCreated: true };
  }

  /**
   * Create invoice with atomic transaction.
   * Finds products by name, checks stock, creates invoice + items, updates stock + customer balance.
   */
  async createInvoice(
    customerId: string,
    items: InvoiceItemInput[],
    notes?: string
  ) {
    try {
      if (!customerId?.trim()) throw new Error('Customer ID is required');
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Invoice must contain at least one item');
      }
      for (const item of items) {
        if (!item.productName?.trim()) {
          throw new Error('Each item must have a valid product name');
        }
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new Error(`Item quantity must be a positive integer (got: ${item.quantity})`);
        }
      }

      return await prisma.$transaction(async (tx) => {
        let subtotal = 0;

        const resolvedItems: Array<{
          productId: string;
          productName: string;
          unit: string;
          quantity: number;
          unitPrice: number;
          subtotal: number;
          total: number;
        }> = [];

        const autoCreatedProducts: string[] = [];

        for (const item of items) {
          const { product, autoCreated } = await this.findOrCreateProduct(tx, item.productName);

          if (autoCreated) autoCreatedProducts.push(product.name);

          // Skip stock check for auto-created products (they have stock=9999)
          if (!autoCreated && product.stock < item.quantity) {
            throw new Error(
              `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
            );
          }

          const unitPrice = parseFloat(product.price.toString());
          const itemTotal = unitPrice * item.quantity;
          subtotal += itemTotal;

          resolvedItems.push({
            productId: product.id,
            productName: product.name,
            unit: product.unit,
            quantity: item.quantity,
            unitPrice,
            subtotal: itemTotal,
            total: itemTotal,
          });
        }

        // Create invoice
        const invoice = await tx.invoice.create({
          data: {
            tenantId: SYSTEM_TENANT_ID,
            invoiceNo: generateInvoiceNo(),
            customerId,
            subtotal: new Decimal(subtotal),
            total: new Decimal(subtotal),
            status: 'pending',
            notes,
            items: {
              create: resolvedItems.map((i) => ({
                productId: i.productId,
                productName: i.productName,
                unit: i.unit,
                quantity: new Decimal(i.quantity),
                unitPrice: new Decimal(i.unitPrice),
                subtotal: new Decimal(i.subtotal),
                total: new Decimal(i.total),
              })),
            },
          },
          include: {
            items: { include: { product: true } },
            customer: true,
          },
        });

        // Deduct stock
        for (const i of resolvedItems) {
          await tx.product.update({
            where: { id: i.productId },
            data: { stock: { decrement: i.quantity } },
          });
        }

        // Update customer balance (add to what they owe)
        await tx.customer.update({
          where: { id: customerId },
          data: {
            balance: { increment: subtotal },
            totalPurchases: { increment: subtotal },
            lastVisit: new Date(),
            visitCount: { increment: 1 },
          },
        });

        logger.info(
          { invoiceId: invoice.id, customerId, total: subtotal, itemCount: items.length, autoCreatedProducts, tenantId: SYSTEM_TENANT_ID },
          'Invoice created'
        );
        invoiceOperations.inc({ operation: 'create', status: 'success', tenantId: SYSTEM_TENANT_ID });

        return { invoice, autoCreatedProducts };
      });

      // ...existing code...
    } catch (error) {
      logger.error({ error, customerId, items, tenantId: SYSTEM_TENANT_ID }, 'Invoice creation failed');
      invoiceOperations.inc({ operation: 'create', status: 'error', tenantId: SYSTEM_TENANT_ID });
      throw error;
    }
  }

  /**
   * Cancel invoice — reverses stock and customer balance.
   */
  async cancelInvoice(invoiceId: string) {
    try {
      return await prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
          include: { items: true },
        });

        if (!invoice) throw new Error('Invoice not found');
        if (invoice.status === 'cancelled') throw new Error('Invoice already cancelled');

        // Restore stock
        for (const item of invoice.items) {
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: Number(item.quantity) } },
            });
          }
        }

        // Reduce customer balance
        if (invoice.customerId) {
          const total = parseFloat(invoice.total.toString());
          await tx.customer.update({
            where: { id: invoice.customerId },
            data: {
              balance: { decrement: total },
              totalPurchases: { decrement: total },
            },
          });
        }

        const cancelled = await tx.invoice.update({
          where: { id: invoiceId },
          data: { status: 'cancelled', updatedAt: new Date() },
          include: { items: { include: { product: true } } },
        });

        logger.info({ invoiceId, tenantId: SYSTEM_TENANT_ID }, 'Invoice cancelled');
        return cancelled;
      });
    } catch (error) {
      logger.error({ error, invoiceId, tenantId: SYSTEM_TENANT_ID }, 'Invoice cancellation failed');
      throw error;
    }
  }

  /**
   * Get recent invoices.
   */
  async getRecentInvoices(limit: number = 10) {
    return await prisma.invoice.findMany({
      where: { tenantId: SYSTEM_TENANT_ID },
      take: limit,
      orderBy: { invoiceDate: 'desc' },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
  }

  /**
   * Get all invoices for a customer.
   */
  async getCustomerInvoices(customerId: string, limit: number = 10) {
    return await prisma.invoice.findMany({
      where: { customerId, tenantId: SYSTEM_TENANT_ID },
      take: limit,
      orderBy: { invoiceDate: 'desc' },
      include: { items: { include: { product: true } } },
    });
  }

  /**
   * Get the most recent non-cancelled invoice for a customer.
   */
  async getLastInvoice(customerId: string) {
    return await prisma.invoice.findFirst({
      where: { customerId, status: { not: 'cancelled' } },
      orderBy: { invoiceDate: 'desc' },
      include: { items: { include: { product: true } } },
    });
  }

  /**
   * Daily sales summary.
   */
  async getDailySummary(date: Date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId: SYSTEM_TENANT_ID,
        invoiceDate: { gte: startOfDay, lte: endOfDay },
        status: { not: 'cancelled' },
      },
      select: { total: true },
    });

    const totalSales = invoices.reduce(
      (sum, inv) => sum + parseFloat(inv.total.toString()),
      0
    );

    const payments = await prisma.payment.findMany({
      where: {
        tenantId: SYSTEM_TENANT_ID,
        receivedAt: { gte: startOfDay, lte: endOfDay },
        status: 'completed',
      },
      select: { amount: true, method: true },
    });

    const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    const cashPayments = payments.filter((p) => p.method === 'cash').reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    const upiPayments = payments.filter((p) => p.method === 'upi').reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

    return {
      date,
      invoiceCount: invoices.length,
      totalSales,
      totalPayments,
      cashPayments,
      upiPayments,
      // pendingAmount = how much is still owed from today's sales.
      // Can't be negative — negative means extra cash collected (old debts cleared).
      pendingAmount: Math.max(0, totalSales - totalPayments),
      extraPayments: Math.max(0, totalPayments - totalSales), // old debts cleared today
    };
  }
}

export const invoiceService = new InvoiceService();
