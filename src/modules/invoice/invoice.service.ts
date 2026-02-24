
import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { SYSTEM_TENANT_ID } from '../../infrastructure/bootstrap';
import { InvoiceItemInput } from '../../types';
import { Decimal } from '@prisma/client/runtime/library';
import { invoiceOperations } from '../../infrastructure/metrics';
import { gstService, type SupplyType } from '../gst/gst.service';

/**
 * Generate a GST-compliant sequential invoice number per financial year.
 * Format: "2024-25/INV/0001"  (Rule 46, CGST Rules 2017)
 * Uses an atomic upsert on `invoice_counters` — safe under concurrent requests.
 * Must be called INSIDE a Prisma transaction to avoid sequence gaps on rollback.
 */
async function generateInvoiceNo(tx: any): Promise<string> {
  const now   = new Date();
  const month = now.getMonth() + 1;           // 1–12
  const year  = now.getFullYear();
  const fyStart = month >= 4 ? year : year - 1;
  const fy = `${fyStart}-${String(fyStart + 1).slice(-2)}`; // e.g. "2024-25"

  // Atomic increment: insert row for this FY on first invoice, else increment
  const result = await tx.$queryRaw<Array<{ last_seq: number }>>`
    INSERT INTO invoice_counters (fy, last_seq)
    VALUES (${fy}, 1)
    ON CONFLICT (fy) DO UPDATE
      SET last_seq = invoice_counters.last_seq + 1
    RETURNING last_seq
  `;

  const seq = Number(result[0].last_seq);
  return `${fy}/INV/${String(seq).padStart(4, '0')}`;
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
      select: { id: true, name: true, price: true, stock: true, unit: true,
                hsnCode: true, gstRate: true, cess: true, isGstExempt: true },
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
   * Preview invoice — resolves products (auto-creates unknowns at ₹0), optionally
   * calculates GST per line item, and returns fully priced items WITHOUT committing to the DB.
   * The caller should store the result in Redis and wait for user confirmation.
   *
   * @param withGst  — Default FALSE. Pass true only when user explicitly requests GST billing.
   * @param supplyType — Only relevant when withGst=true. Determines CGST+SGST vs IGST split.
   */
  async previewInvoice(
    customerId: string,
    items: InvoiceItemInput[],
    withGst: boolean = false,
    supplyType: SupplyType = 'INTRASTATE'
  ): Promise<{
    resolvedItems: Array<{
      productId: string; productName: string; unit: string; hsnCode: string | null;
      quantity: number; unitPrice: number; gstRate: number; cessRate: number;
      isGstExempt: boolean; cgst: number; sgst: number; igst: number; cess: number;
      subtotal: number; totalTax: number; total: number; autoCreated: boolean;
    }>;
    subtotal: number;
    totalCgst: number; totalSgst: number; totalIgst: number;
    totalCess: number; totalTax: number; grandTotal: number;
    autoCreatedProducts: string[];
  }> {
    if (!customerId?.trim()) throw new Error('Customer ID is required');
    if (!Array.isArray(items) || items.length === 0) throw new Error('No items provided');

    const resolvedItems: Array<{
      productId: string; productName: string; unit: string; hsnCode: string | null;
      quantity: number; unitPrice: number; gstRate: number; cessRate: number;
      isGstExempt: boolean; cgst: number; sgst: number; igst: number; cess: number;
      subtotal: number; totalTax: number; total: number; autoCreated: boolean;
    }> = [];
    const autoCreatedProducts: string[] = [];

    // Run inside a transaction so auto-created products are committed atomically
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (!item.productName?.trim()) continue;
        const { product, autoCreated } = await this.findOrCreateProduct(tx, item.productName);
        if (autoCreated) autoCreatedProducts.push(product.name);

        const unitPrice   = parseFloat(product.price.toString());
        const gstRate     = parseFloat((product.gstRate ?? 0).toString());
        const cessRate    = parseFloat((product.cess    ?? 0).toString());
        const isGstExempt = product.isGstExempt ?? false;
        const hsnCode     = product.hsnCode ?? null;

        // Calculate GST only when explicitly requested; otherwise zero out all tax fields
        const subtotal = Math.round(unitPrice * item.quantity * 100) / 100;
        let cgst = 0, sgst = 0, igst = 0, cess = 0, totalTax = 0;

        if (withGst) {
          const gstLine = gstService.calculateLineItem(
            { productName: product.name, hsnCode, quantity: item.quantity,
              unitPrice, gstRate, cessRate, isGstExempt },
            supplyType
          );
          cgst     = gstLine.cgst;
          sgst     = gstLine.sgst;
          igst     = gstLine.igst;
          cess     = gstLine.cess;
          totalTax = gstLine.totalTax;
        }

        resolvedItems.push({
          productId:   product.id,
          productName: product.name,
          unit:        product.unit,
          hsnCode,
          quantity:    item.quantity,
          unitPrice,
          gstRate,
          cessRate,
          isGstExempt,
          cgst,
          sgst,
          igst,
          cess,
          subtotal,
          totalTax,
          total: Math.round((subtotal + totalTax) * 100) / 100,
          autoCreated,
        });
      }
    });

    const totals = withGst
      ? gstService.calculateInvoiceTotals(resolvedItems.map((i) => ({ ...i, isGstExempt: i.isGstExempt })))
      : {
          subtotal:   resolvedItems.reduce((s, i) => Math.round((s + i.subtotal) * 100) / 100, 0),
          totalCgst:  0, totalSgst: 0, totalIgst: 0, totalCess: 0, totalTax: 0,
          grandTotal: resolvedItems.reduce((s, i) => Math.round((s + i.total) * 100) / 100, 0),
          supplyType: 'INTRASTATE' as SupplyType,
        };

    return { resolvedItems, ...totals, autoCreatedProducts };
  }

  /**
   * Confirm invoice — creates the DB record from already-resolved items (with GST).
   * Call this after the user confirms the preview returned by previewInvoice().
   */
  async confirmInvoice(
    customerId: string,
    resolvedItems: Array<{
      productId: string; productName: string; unit: string; hsnCode?: string | null;
      quantity: number; unitPrice: number; gstRate?: number; cessRate?: number;
      isGstExempt?: boolean; cgst?: number; sgst?: number; igst?: number; cess?: number;
      subtotal?: number; totalTax?: number; total: number;
    }>,
    notes?: string
  ) {
    // Re-calculate totals from resolved items (source of truth)
    const subtotal   = resolvedItems.reduce((s, i) => s + (i.subtotal ?? i.total), 0);
    const totalCgst  = resolvedItems.reduce((s, i) => s + (i.cgst  ?? 0), 0);
    const totalSgst  = resolvedItems.reduce((s, i) => s + (i.sgst  ?? 0), 0);
    const totalIgst  = resolvedItems.reduce((s, i) => s + (i.igst  ?? 0), 0);
    const totalCess  = resolvedItems.reduce((s, i) => s + (i.cess  ?? 0), 0);
    const totalTax   = totalCgst + totalSgst + totalIgst + totalCess;
    const grandTotal = subtotal + totalTax;

    try {
      return await prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.create({
          data: {
            tenantId:  SYSTEM_TENANT_ID,
            invoiceNo: await generateInvoiceNo(tx),
            customerId,
            subtotal:  new Decimal(subtotal),
            tax:       new Decimal(totalTax),
            cgst:      new Decimal(totalCgst),
            sgst:      new Decimal(totalSgst),
            igst:      new Decimal(totalIgst),
            cess:      new Decimal(totalCess),
            total:     new Decimal(grandTotal),
            status:    'pending',
            notes,
            items: {
              create: resolvedItems.map((i) => ({
                productId:   i.productId,
                productName: i.productName,
                unit:        i.unit,
                hsnCode:     i.hsnCode  ?? null,
                gstRate:     new Decimal(i.gstRate  ?? 0),
                cgst:        new Decimal(i.cgst     ?? 0),
                sgst:        new Decimal(i.sgst     ?? 0),
                igst:        new Decimal(i.igst     ?? 0),
                cess:        new Decimal(i.cess     ?? 0),
                quantity:    new Decimal(i.quantity),
                unitPrice:   new Decimal(i.unitPrice),
                subtotal:    new Decimal(i.subtotal ?? i.total),
                total:       new Decimal(i.total),
              })),
            },
          },
          include: { items: { include: { product: true } }, customer: true },
        });

        for (const i of resolvedItems) {
          await tx.product.update({
            where: { id: i.productId },
            data:  { stock: { decrement: i.quantity } },
          });
        }

        // Customer balance tracks grand total (tax-inclusive amount owed)
        await tx.customer.update({
          where: { id: customerId },
          data: {
            balance:        { increment: grandTotal },
            totalPurchases: { increment: grandTotal },
            lastVisit:      new Date(),
            visitCount:     { increment: 1 },
          },
        });

        logger.info(
          { invoiceId: invoice.id, customerId, subtotal, totalTax, grandTotal,
            itemCount: resolvedItems.length, tenantId: SYSTEM_TENANT_ID },
          'Invoice confirmed and created'
        );
        invoiceOperations.inc({ operation: 'create', status: 'success', tenantId: SYSTEM_TENANT_ID });
        return invoice;
      });
    } catch (error) {
      logger.error({ error, customerId, tenantId: SYSTEM_TENANT_ID }, 'Invoice confirm failed');
      invoiceOperations.inc({ operation: 'create', status: 'error', tenantId: SYSTEM_TENANT_ID });
      throw error;
    }
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
            invoiceNo: await generateInvoiceNo(tx),
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
   * Persist the MinIO object key (and presigned URL) on an invoice record.
   * Called after the PDF is uploaded so the URL can be regenerated any time.
   */
  async savePdfUrl(invoiceId: string, pdfObjectKey: string, pdfUrl: string): Promise<void> {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data:  { pdfObjectKey, pdfUrl },
    });
    logger.info({ invoiceId, pdfObjectKey }, 'Invoice PDF URL saved to DB');
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
