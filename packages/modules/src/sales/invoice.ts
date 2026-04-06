/**
 * Sales domain — invoice business operations.
 *
 * Direct Prisma calls, flat async functions, no class wrappers.
 * Covers the full invoice lifecycle: create, preview/confirm (voice-flow),
 * proforma conversion, update, cancel, PDF dispatch, and reporting.
 *
 * Old class singleton (invoiceService) is preserved in modules/invoice/invoice.service.ts
 * for the voice engine which imports it via relative paths.
 */

import {
  prisma,
  logger,
  tenantContext,
  emailService,
  generateInvoicePdf,
  minioClient,
  whatsappService,
  invoiceOperations,
} from "@execora/core";
import { InvoiceItemInput } from "@execora/types";
import { Decimal } from "@prisma/client/runtime/library";
import { gstService, type SupplyType } from "../modules/gst/gst.service";
import { monitoringService } from "../modules/monitoring/monitoring.service";
import type { InvoiceOptions } from "../modules/invoice/invoice.service";

export type { InvoiceOptions };

// ─── Private helpers ──────────────────────────────────────────────────────────

async function generateInvoiceNo(tx: any): Promise<string> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const fyStart = month >= 4 ? year : year - 1;
  const fy = `${fyStart}-${String(fyStart + 1).slice(-2)}`;
  const tenantId = tenantContext.get().tenantId;

  const result = await tx.$queryRaw<Array<{ last_seq: number }>>`
    INSERT INTO invoice_counters (fy, "tenantId", last_seq)
    VALUES (${fy}, ${tenantId}, 1)
    ON CONFLICT (fy, "tenantId") DO UPDATE
      SET last_seq = invoice_counters.last_seq + 1
    RETURNING last_seq
  `;

  const seq = Number(result[0].last_seq);
  return `${fy}/INV/${String(seq).padStart(4, "0")}`;
}

async function findOrCreateProduct(
  tx: any,
  productName: string,
): Promise<{ product: any; autoCreated: boolean }> {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();

  const exact = await tx.product.findFirst({
    where: {
      tenantId: tenantContext.get().tenantId,
      name: { contains: productName, mode: "insensitive" },
      isActive: true,
    },
  });
  if (exact) return { product: exact, autoCreated: false };

  const allProducts = await tx.product.findMany({
    where: { tenantId: tenantContext.get().tenantId, isActive: true },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      unit: true,
      hsnCode: true,
      gstRate: true,
      cess: true,
      isGstExempt: true,
    },
  });

  const q = norm(productName);
  let bestProduct: (typeof allProducts)[0] | null = null;
  let bestScore = 0;

  if (q.length > 0) {
    for (const p of allProducts) {
      const n = norm(p.name);
      if (n.length === 0) continue;
      const overlap =
        q.includes(n) || n.includes(q) ? Math.min(q.length, n.length) : 0;
      const score = overlap / Math.max(q.length, n.length);
      if (score > bestScore) {
        bestScore = score;
        bestProduct = p;
      }
    }
  }

  if (bestProduct && bestScore >= 0.5)
    return { product: bestProduct, autoCreated: false };

  const created = await tx.product.create({
    data: {
      tenantId: tenantContext.get().tenantId,
      name: productName,
      category: "General",
      price: new Decimal(0),
      unit: "piece",
      stock: 9999,
      isActive: true,
    },
  });

  logger.warn(
    {
      productName,
      productId: created.id,
      tenantId: tenantContext.get().tenantId,
    },
    "Product auto-created during invoice (price=0) — update price in catalog",
  );

  return { product: created, autoCreated: true };
}

function computeDiscount(
  subtotal: number,
  opts: InvoiceOptions,
): { discountAmt: number; discountType: string } {
  if (opts.discountAmount && opts.discountAmount > 0) {
    return {
      discountAmt: Math.min(opts.discountAmount, subtotal),
      discountType: "flat",
    };
  }
  if (opts.discountPercent && opts.discountPercent > 0) {
    const amt = Math.round(subtotal * (opts.discountPercent / 100) * 100) / 100;
    return { discountAmt: Math.min(amt, subtotal), discountType: "percent" };
  }
  return { discountAmt: 0, discountType: "none" };
}

// ─── Commands ─────────────────────────────────────────────────────────────────

/**
 * Preview invoice — resolves products, optionally calculates GST per line,
 * and returns fully priced items WITHOUT committing to DB.
 * Used by voice engine and proforma quoting.
 */
export async function previewInvoice(
  customerId: string,
  items: InvoiceItemInput[],
  withGst: boolean = false,
  supplyType: SupplyType = "INTRASTATE",
  discountPercent?: number,
) {
  if (!customerId?.trim()) throw new Error("Customer ID is required");
  if (!Array.isArray(items) || items.length === 0)
    throw new Error("No items provided");

  type ResolvedItem = {
    productId: string;
    productName: string;
    unit: string;
    hsnCode: string | null;
    quantity: number;
    unitPrice: number;
    gstRate: number;
    cessRate: number;
    isGstExempt: boolean;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    subtotal: number;
    totalTax: number;
    total: number;
    autoCreated: boolean;
  };

  const resolvedItems: ResolvedItem[] = [];
  const autoCreatedProducts: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      if (!item.productName?.trim()) continue;
      const { product, autoCreated } = await findOrCreateProduct(
        tx,
        item.productName,
      );
      if (autoCreated) autoCreatedProducts.push(product.name);

      const rawUnitPrice =
        item.unitPrice !== undefined && item.unitPrice > 0
          ? item.unitPrice
          : parseFloat(product.price.toString());
      const lineDisc = item.lineDiscountPercent ?? 0;
      const unitPrice =
        lineDisc > 0
          ? Math.round(rawUnitPrice * (1 - lineDisc / 100) * 10000) / 10000
          : rawUnitPrice;
      const gstRate = parseFloat((product.gstRate ?? 0).toString());
      const cessRate = parseFloat((product.cess ?? 0).toString());
      const isGstExempt = product.isGstExempt ?? false;
      const hsnCode = product.hsnCode ?? null;
      const subtotal = Math.round(unitPrice * item.quantity * 100) / 100;
      let cgst = 0,
        sgst = 0,
        igst = 0,
        cess = 0,
        totalTax = 0;

      if (withGst) {
        const gstLine = gstService.calculateLineItem(
          {
            productName: product.name,
            hsnCode,
            quantity: item.quantity,
            unitPrice,
            gstRate,
            cessRate,
            isGstExempt,
          },
          supplyType,
        );
        cgst = gstLine.cgst;
        sgst = gstLine.sgst;
        igst = gstLine.igst;
        cess = gstLine.cess;
        totalTax = gstLine.totalTax;
      }

      resolvedItems.push({
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        hsnCode,
        quantity: item.quantity,
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
    ? gstService.calculateInvoiceTotals(
        resolvedItems.map((i) => ({ ...i, isGstExempt: i.isGstExempt })),
      )
    : {
        subtotal: resolvedItems.reduce(
          (s, i) => Math.round((s + i.subtotal) * 100) / 100,
          0,
        ),
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 0,
        totalCess: 0,
        totalTax: 0,
        grandTotal: resolvedItems.reduce(
          (s, i) => Math.round((s + i.total) * 100) / 100,
          0,
        ),
        supplyType: "INTRASTATE" as SupplyType,
      };

  const { discountAmt, discountType } = computeDiscount(totals.subtotal, {
    discountPercent,
  });
  const grandTotal = Math.round((totals.grandTotal - discountAmt) * 100) / 100;

  return {
    resolvedItems,
    ...totals,
    grandTotal,
    discountAmt,
    discountType,
    autoCreatedProducts,
  };
}

/**
 * Confirm invoice — creates DB record from already-resolved items (post-preview).
 * Call after user confirms the preview in voice or UI flow.
 */
export async function confirmInvoice(
  customerId: string,
  resolvedItems: Array<{
    productId: string;
    productName: string;
    unit: string;
    hsnCode?: string | null;
    quantity: number;
    unitPrice: number;
    gstRate?: number;
    cessRate?: number;
    isGstExempt?: boolean;
    cgst?: number;
    sgst?: number;
    igst?: number;
    cess?: number;
    subtotal?: number;
    totalTax?: number;
    total: number;
  }>,
  notes?: string,
  opts: InvoiceOptions = {},
) {
  const subtotal = resolvedItems.reduce(
    (s, i) => s + (i.subtotal ?? i.total),
    0,
  );
  const totalCgst = resolvedItems.reduce((s, i) => s + (i.cgst ?? 0), 0);
  const totalSgst = resolvedItems.reduce((s, i) => s + (i.sgst ?? 0), 0);
  const totalIgst = resolvedItems.reduce((s, i) => s + (i.igst ?? 0), 0);
  const totalCess = resolvedItems.reduce((s, i) => s + (i.cess ?? 0), 0);
  const totalTax = totalCgst + totalSgst + totalIgst + totalCess;
  const { discountAmt, discountType } = computeDiscount(subtotal, opts);
  const grandTotal =
    Math.round((subtotal + totalTax - discountAmt) * 100) / 100;

  try {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          tenantId: tenantContext.get().tenantId,
          invoiceNo: await generateInvoiceNo(tx),
          customerId,
          subtotal: new Decimal(subtotal),
          tax: new Decimal(totalTax),
          cgst: new Decimal(totalCgst),
          sgst: new Decimal(totalSgst),
          igst: new Decimal(totalIgst),
          cess: new Decimal(totalCess),
          discount: new Decimal(discountAmt),
          discountType: discountType !== "none" ? discountType : null,
          total: new Decimal(grandTotal),
          status: "pending",
          buyerGstin: opts.buyerGstin ?? null,
          placeOfSupply: opts.placeOfSupply ?? null,
          recipientAddress: opts.recipientAddress ?? null,
          reverseCharge: opts.reverseCharge ?? false,
          notes,
          items: {
            create: resolvedItems.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              unit: i.unit,
              hsnCode: i.hsnCode ?? null,
              gstRate: new Decimal(i.gstRate ?? 0),
              cgst: new Decimal(i.cgst ?? 0),
              sgst: new Decimal(i.sgst ?? 0),
              igst: new Decimal(i.igst ?? 0),
              cess: new Decimal(i.cess ?? 0),
              quantity: new Decimal(i.quantity),
              unitPrice: new Decimal(i.unitPrice),
              subtotal: new Decimal(i.subtotal ?? i.total),
              total: new Decimal(i.total),
            })),
          },
        },
        include: { items: { include: { product: true } }, customer: true },
      });

      for (const i of resolvedItems) {
        await tx.product.update({
          where: { id: i.productId },
          data: { stock: { decrement: i.quantity } },
        });
      }

      let finalStatus = "pending";
      let paidAmount = 0;
      if (opts.initialPayment && opts.initialPayment.amount > 0) {
        const paid = Math.min(opts.initialPayment.amount, grandTotal);
        paidAmount = paid;
        finalStatus = paid >= grandTotal ? "paid" : "partial";
        const payNo = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const methodMap: Record<string, string> = {
          cash: "cash",
          upi: "upi",
          card: "card",
          other: "bank",
        };
        await tx.payment.create({
          data: {
            paymentNo: payNo,
            tenantId: tenantContext.get().tenantId,
            customerId,
            invoiceId: invoice.id,
            amount: new Decimal(paid),
            method: (methodMap[opts.initialPayment.method] as any) ?? "cash",
            status: "completed",
            receivedAt: new Date(),
          },
        });
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: new Decimal(paidAmount),
            status: finalStatus as any,
            paidAt: finalStatus === "paid" ? new Date() : null,
          },
        });
      }

      await tx.customer.update({
        where: { id: customerId },
        data: {
          balance: { increment: grandTotal - paidAmount },
          totalPurchases: { increment: grandTotal },
          lastVisit: new Date(),
          visitCount: { increment: 1 },
        },
      });

      logger.info(
        {
          invoiceId: invoice.id,
          customerId,
          subtotal,
          discountAmt,
          totalTax,
          grandTotal,
          itemCount: resolvedItems.length,
          tenantId: tenantContext.get().tenantId,
        },
        "Invoice confirmed and created",
      );
      invoiceOperations.inc({
        operation: "create",
        status: "success",
        tenantId: tenantContext.get().tenantId,
      });
      return invoice;
    });
  } catch (error) {
    logger.error(
      { error, customerId, tenantId: tenantContext.get().tenantId },
      "Invoice confirm failed",
    );
    invoiceOperations.inc({
      operation: "create",
      status: "error",
      tenantId: tenantContext.get().tenantId,
    });
    throw error;
  }
}

/**
 * Create invoice with atomic transaction — used by REST API (Form/Dashboard mode).
 */
export async function createInvoice(
  customerId: string,
  items: InvoiceItemInput[],
  notes?: string,
  opts: InvoiceOptions & { isProforma?: boolean } = {},
) {
  try {
    if (!customerId?.trim()) throw new Error("Customer ID is required");
    if (!Array.isArray(items) || items.length === 0)
      throw new Error("Invoice must contain at least one item");
    for (const item of items) {
      if (!item.productName?.trim())
        throw new Error("Each item must have a valid product name");
      if (!Number.isInteger(item.quantity) || item.quantity <= 0)
        throw new Error(
          `Item quantity must be a positive integer (got: ${item.quantity})`,
        );
    }

    const supplyType: SupplyType = opts.supplyType ?? "INTRASTATE";
    const withGst = opts.withGst ?? false;

    return await prisma
      .$transaction(async (tx) => {
        const resolvedItems: Array<{
          productId: string;
          productName: string;
          unit: string;
          quantity: number;
          unitPrice: number;
          subtotal: number;
          total: number;
          cgst: number;
          sgst: number;
          igst: number;
          cess: number;
          gstRate: number;
          hsnCode: string | null;
        }> = [];
        const autoCreatedProducts: string[] = [];

        for (const item of items) {
          const { product, autoCreated } = await findOrCreateProduct(
            tx,
            item.productName,
          );
          if (autoCreated) autoCreatedProducts.push(product.name);

          const rawUnitPrice =
            item.unitPrice != null && item.unitPrice > 0
              ? item.unitPrice
              : parseFloat(product.price.toString());
          const lineDiscPct = item.lineDiscountPercent ?? 0;
          const unitPrice =
            lineDiscPct > 0
              ? Math.round(rawUnitPrice * (1 - lineDiscPct / 100) * 10000) /
                10000
              : rawUnitPrice;
          const itemSubtotal =
            Math.round(unitPrice * item.quantity * 100) / 100;

          let cgst = 0,
            sgst = 0,
            igst = 0,
            cess = 0,
            gstRate = 0;
          if (withGst) {
            const gstLine = gstService.calculateLineItem(
              {
                productName: product.name,
                hsnCode: product.hsnCode ?? null,
                quantity: item.quantity,
                unitPrice,
                gstRate: parseFloat((product.gstRate ?? 0).toString()),
                cessRate: parseFloat((product.cess ?? 0).toString()),
                isGstExempt: product.isGstExempt ?? false,
              },
              supplyType,
            );
            cgst = gstLine.cgst;
            sgst = gstLine.sgst;
            igst = gstLine.igst;
            cess = gstLine.cess;
            gstRate = parseFloat((product.gstRate ?? 0).toString());
          }

          resolvedItems.push({
            productId: product.id,
            productName: product.name,
            unit: product.unit,
            hsnCode: product.hsnCode ?? null,
            quantity: item.quantity,
            unitPrice,
            subtotal: itemSubtotal,
            total:
              Math.round((itemSubtotal + cgst + sgst + igst + cess) * 100) /
              100,
            cgst,
            sgst,
            igst,
            cess,
            gstRate,
          });
        }

        const subtotal = resolvedItems.reduce((s, i) => s + i.subtotal, 0);
        const totalCgst = resolvedItems.reduce((s, i) => s + i.cgst, 0);
        const totalSgst = resolvedItems.reduce((s, i) => s + i.sgst, 0);
        const totalIgst = resolvedItems.reduce((s, i) => s + i.igst, 0);
        const totalCess = resolvedItems.reduce((s, i) => s + i.cess, 0);
        const totalTax = totalCgst + totalSgst + totalIgst + totalCess;
        const { discountAmt, discountType } = computeDiscount(subtotal, opts);
        const grandTotal =
          Math.round((subtotal + totalTax - discountAmt) * 100) / 100;
        const isProforma = opts.isProforma ?? false;

        if (!isProforma && !opts.overrideCreditLimit) {
          const cust = await tx.customer.findUnique({
            where: { id: customerId },
            select: { creditLimit: true, balance: true, name: true },
          });
          const limitVal = cust?.creditLimit
            ? parseFloat(cust.creditLimit.toString())
            : 0;
          if (cust && limitVal > 0) {
            const currentBalance = parseFloat(cust.balance?.toString() ?? "0");
            if (currentBalance + grandTotal > limitVal) {
              const err = new Error(
                `CREDIT_LIMIT_EXCEEDED:${cust.name}|limit=${limitVal}|balance=${currentBalance}|invoice=${grandTotal}`,
              );
              (err as any).code = "CREDIT_LIMIT_EXCEEDED";
              throw err;
            }
          }
        }

        const invoice = await tx.invoice.create({
          data: {
            tenantId: tenantContext.get().tenantId,
            invoiceNo: await generateInvoiceNo(tx),
            customerId,
            subtotal: new Decimal(subtotal),
            tax: new Decimal(totalTax),
            cgst: new Decimal(totalCgst),
            sgst: new Decimal(totalSgst),
            igst: new Decimal(totalIgst),
            cess: new Decimal(totalCess),
            discount: new Decimal(discountAmt),
            discountType: discountType !== "none" ? discountType : null,
            total: new Decimal(grandTotal),
            status: isProforma ? "proforma" : "pending",
            buyerGstin: opts.buyerGstin ?? null,
            placeOfSupply: opts.placeOfSupply ?? null,
            recipientAddress: opts.recipientAddress ?? null,
            reverseCharge: opts.reverseCharge ?? false,
            notes,
            tags: opts.tags ?? [],
            items: {
              create: resolvedItems.map((i) => ({
                productId: i.productId,
                productName: i.productName,
                unit: i.unit,
                hsnCode: i.hsnCode,
                gstRate: new Decimal(i.gstRate),
                cgst: new Decimal(i.cgst),
                sgst: new Decimal(i.sgst),
                igst: new Decimal(i.igst),
                cess: new Decimal(i.cess),
                quantity: new Decimal(i.quantity),
                unitPrice: new Decimal(i.unitPrice),
                subtotal: new Decimal(i.subtotal),
                total: new Decimal(i.total),
              })),
            },
          },
          include: { items: { include: { product: true } }, customer: true },
        });

        if (!isProforma) {
          for (const i of resolvedItems) {
            await tx.product.update({
              where: { id: i.productId },
              data: { stock: { decrement: i.quantity } },
            });
          }
        }

        let finalStatus: string = isProforma ? "proforma" : "pending";
        let paidAmount = 0;
        if (
          !isProforma &&
          opts.initialPayment &&
          opts.initialPayment.amount > 0
        ) {
          const paid = Math.min(opts.initialPayment.amount, grandTotal);
          paidAmount = paid;
          finalStatus = paid >= grandTotal ? "paid" : "partial";
          const methodMap: Record<string, string> = {
            cash: "cash",
            upi: "upi",
            card: "card",
            other: "bank",
          };
          const payNo = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
          await tx.payment.create({
            data: {
              paymentNo: payNo,
              tenantId: tenantContext.get().tenantId,
              customerId,
              invoiceId: invoice.id,
              amount: new Decimal(paid),
              method: (methodMap[opts.initialPayment.method] as any) ?? "cash",
              status: "completed",
              receivedAt: new Date(),
            },
          });
          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              paidAmount: new Decimal(paidAmount),
              status: finalStatus as any,
              paidAt: finalStatus === "paid" ? new Date() : null,
            },
          });
        }

        if (!isProforma) {
          const balanceIncrement = grandTotal - paidAmount;
          await tx.customer.update({
            where: { id: customerId },
            data: {
              balance: { increment: balanceIncrement },
              totalPurchases: { increment: grandTotal },
              lastVisit: new Date(),
              visitCount: { increment: 1 },
            },
          });
        }

        logger.info(
          {
            invoiceId: invoice.id,
            customerId,
            subtotal,
            discountAmt,
            totalTax,
            grandTotal,
            isProforma,
            itemCount: items.length,
            autoCreatedProducts,
            tenantId: tenantContext.get().tenantId,
          },
          isProforma ? "Proforma invoice created" : "Invoice created",
        );
        invoiceOperations.inc({
          operation: "create",
          status: "success",
          tenantId: tenantContext.get().tenantId,
        });

        return { invoice, autoCreatedProducts };
      })
      .then(async (result) => {
        if (!opts.isProforma) {
          const { tenantId, userId } = tenantContext.get();
          const customerName = (result.invoice as any).customer?.name;
          const total = parseFloat(result.invoice.total.toString());
          const disc = parseFloat(result.invoice.discount?.toString() ?? "0");
          void monitoringService.recordEvent({
            tenantId,
            userId,
            eventType: "bill.created",
            entityType: "invoice",
            entityId: result.invoice.id,
            amount: total,
            description: `Bill ${result.invoice.invoiceNo} ₹${total} created${customerName ? ` for ${customerName}` : ""}`,
            meta: {
              invoiceNo: result.invoice.invoiceNo,
              customerName: customerName ?? null,
              itemCount: items.length,
              discountAmt: disc,
              autoCreated: result.autoCreatedProducts,
            },
          });
        }
        return result;
      });
  } catch (error) {
    logger.error(
      { error, customerId, items, tenantId: tenantContext.get().tenantId },
      "Invoice creation failed",
    );
    invoiceOperations.inc({
      operation: "create",
      status: "error",
      tenantId: tenantContext.get().tenantId,
    });
    throw error;
  }
}

/**
 * Convert proforma → actual invoice.
 * Deducts stock and updates customer balance.
 */
export async function convertProformaToInvoice(
  invoiceId: string,
  initialPayment?: {
    amount: number;
    method: "cash" | "upi" | "card" | "other";
  },
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status !== "proforma")
      throw new Error("Only proforma invoices can be converted");

    const stockItems = invoice.items.filter((i) => i.productId != null);
    if (stockItems.length > 0) {
      const qtyMap = new Map<string, number>();
      for (const i of stockItems)
        qtyMap.set(
          i.productId!,
          (qtyMap.get(i.productId!) ?? 0) + Number(i.quantity),
        );
      await Promise.all(
        Array.from(qtyMap.entries()).map(([productId, qty]) =>
          tx.product.update({
            where: { id: productId },
            data: { stock: { decrement: qty } },
          }),
        ),
      );
    }

    const grandTotal = parseFloat(invoice.total.toString());
    let finalStatus = "pending";
    let paidAmount = 0;

    if (initialPayment && initialPayment.amount > 0) {
      paidAmount = Math.min(initialPayment.amount, grandTotal);
      finalStatus = paidAmount >= grandTotal ? "paid" : "partial";
      const methodMap: Record<string, string> = {
        cash: "cash",
        upi: "upi",
        card: "card",
        other: "bank",
      };
      const payNo = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      await tx.payment.create({
        data: {
          paymentNo: payNo,
          tenantId: tenantContext.get().tenantId,
          customerId: invoice.customerId!,
          invoiceId: invoice.id,
          amount: new Decimal(paidAmount),
          method: (methodMap[initialPayment.method] as any) ?? "cash",
          status: "completed",
          receivedAt: new Date(),
        },
      });
    }

    if (invoice.customerId) {
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: {
          balance: { increment: grandTotal - paidAmount },
          totalPurchases: { increment: grandTotal },
          lastVisit: new Date(),
          visitCount: { increment: 1 },
        },
      });
    }

    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: finalStatus as any,
        paidAmount: new Decimal(paidAmount),
        paidAt: finalStatus === "paid" ? new Date() : null,
        updatedAt: new Date(),
      },
      include: { items: { include: { product: true } }, customer: true },
    });
  });
}

/**
 * Update a pending/draft invoice — re-resolves items, restores then re-deducts stock.
 */
export async function updateInvoice(
  invoiceId: string,
  changes: {
    items?: InvoiceItemInput[];
    notes?: string;
    opts?: InvoiceOptions;
  },
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });
    if (!existing) throw new Error("Invoice not found");
    if (!["pending", "draft"].includes(existing.status))
      throw new Error(
        `Cannot edit invoice with status '${existing.status}'. Only pending/draft invoices are editable.`,
      );

    const opts: InvoiceOptions = changes.opts ?? {};
    const supplyType: SupplyType = opts.supplyType ?? "INTRASTATE";
    const withGst = opts.withGst ?? false;

    // Restore old stock
    for (const item of existing.items) {
      if (item.productId)
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: Number(item.quantity) } },
        });
    }

    const oldTotal = parseFloat(existing.total.toString());
    const oldPaid = parseFloat(existing.paidAmount?.toString() ?? "0");
    if (existing.customerId) {
      await tx.customer.update({
        where: { id: existing.customerId },
        data: {
          balance: { decrement: oldTotal - oldPaid },
          totalPurchases: { decrement: oldTotal },
        },
      });
    }

    await tx.invoiceItem.deleteMany({ where: { invoiceId } });

    const resolvedItems: Array<{
      productId: string;
      productName: string;
      unit: string;
      hsnCode: string | null;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      total: number;
      cgst: number;
      sgst: number;
      igst: number;
      cess: number;
      gstRate: number;
    }> = [];

    const itemsToProcess =
      changes.items ??
      existing.items.map((i) => ({
        productName: i.productName,
        quantity: Number(i.quantity),
      }));

    for (const item of itemsToProcess) {
      const { product } = await findOrCreateProduct(tx, item.productName);
      const rawUP = parseFloat(product.price.toString());
      const suppliedPrice = (item as { unitPrice?: number }).unitPrice;
      const basePrice =
        suppliedPrice != null && suppliedPrice > 0 ? suppliedPrice : rawUP;
      const lineDiscUpdate =
        (item as { lineDiscountPercent?: number }).lineDiscountPercent ?? 0;
      const unitPrice =
        lineDiscUpdate > 0
          ? Math.round(basePrice * (1 - lineDiscUpdate / 100) * 10000) / 10000
          : basePrice;
      const itemSubtotal = Math.round(unitPrice * item.quantity * 100) / 100;

      let cgst = 0,
        sgst = 0,
        igst = 0,
        cess = 0,
        gstRate = 0;
      if (withGst) {
        const gstLine = gstService.calculateLineItem(
          {
            productName: product.name,
            hsnCode: product.hsnCode ?? null,
            quantity: item.quantity,
            unitPrice,
            gstRate: parseFloat((product.gstRate ?? 0).toString()),
            cessRate: parseFloat((product.cess ?? 0).toString()),
            isGstExempt: product.isGstExempt ?? false,
          },
          supplyType,
        );
        cgst = gstLine.cgst;
        sgst = gstLine.sgst;
        igst = gstLine.igst;
        cess = gstLine.cess;
        gstRate = parseFloat((product.gstRate ?? 0).toString());
      }

      resolvedItems.push({
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        hsnCode: product.hsnCode ?? null,
        quantity: item.quantity,
        unitPrice,
        subtotal: itemSubtotal,
        total:
          Math.round((itemSubtotal + cgst + sgst + igst + cess) * 100) / 100,
        cgst,
        sgst,
        igst,
        cess,
        gstRate,
      });
    }

    const subtotal = resolvedItems.reduce((s, i) => s + i.subtotal, 0);
    const totalCgst = resolvedItems.reduce((s, i) => s + i.cgst, 0);
    const totalSgst = resolvedItems.reduce((s, i) => s + i.sgst, 0);
    const totalIgst = resolvedItems.reduce((s, i) => s + i.igst, 0);
    const totalCess = resolvedItems.reduce((s, i) => s + i.cess, 0);
    const totalTax = totalCgst + totalSgst + totalIgst + totalCess;
    const { discountAmt, discountType } = computeDiscount(subtotal, opts);
    const grandTotal =
      Math.round((subtotal + totalTax - discountAmt) * 100) / 100;

    for (const i of resolvedItems) {
      await tx.product.update({
        where: { id: i.productId },
        data: { stock: { decrement: i.quantity } },
      });
    }

    if (existing.customerId) {
      await tx.customer.update({
        where: { id: existing.customerId },
        data: {
          balance: { increment: grandTotal - oldPaid },
          totalPurchases: { increment: grandTotal },
        },
      });
    }

    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        subtotal: new Decimal(subtotal),
        tax: new Decimal(totalTax),
        cgst: new Decimal(totalCgst),
        sgst: new Decimal(totalSgst),
        igst: new Decimal(totalIgst),
        cess: new Decimal(totalCess),
        discount: new Decimal(discountAmt),
        discountType: discountType !== "none" ? discountType : null,
        total: new Decimal(grandTotal),
        buyerGstin:
          opts.buyerGstin !== undefined ? opts.buyerGstin : existing.buyerGstin,
        placeOfSupply:
          opts.placeOfSupply !== undefined
            ? opts.placeOfSupply
            : existing.placeOfSupply,
        notes: changes.notes !== undefined ? changes.notes : existing.notes,
        updatedAt: new Date(),
        items: {
          create: resolvedItems.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            unit: i.unit,
            hsnCode: i.hsnCode,
            gstRate: new Decimal(i.gstRate),
            cgst: new Decimal(i.cgst),
            sgst: new Decimal(i.sgst),
            igst: new Decimal(i.igst),
            cess: new Decimal(i.cess),
            quantity: new Decimal(i.quantity),
            unitPrice: new Decimal(i.unitPrice),
            subtotal: new Decimal(i.subtotal),
            total: new Decimal(i.total),
          })),
        },
      },
      include: { items: { include: { product: true } }, customer: true },
    });
  });
}

/**
 * Cancel invoice — reverses stock and customer balance.
 */
export async function cancelInvoice(invoiceId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { items: true },
      });
      if (!invoice) throw new Error("Invoice not found");
      if (invoice.status === "cancelled")
        throw new Error("Invoice already cancelled");

      if (invoice.status !== "proforma") {
        const restoreItems = invoice.items.filter((i) => i.productId != null);
        if (restoreItems.length > 0) {
          const qtyMap = new Map<string, number>();
          for (const i of restoreItems)
            qtyMap.set(
              i.productId!,
              (qtyMap.get(i.productId!) ?? 0) + Number(i.quantity),
            );
          await Promise.all(
            Array.from(qtyMap.entries()).map(([productId, qty]) =>
              tx.product.update({
                where: { id: productId },
                data: { stock: { increment: qty } },
              }),
            ),
          );
        }
      }

      if (invoice.customerId && invoice.status !== "proforma") {
        const total = parseFloat(invoice.total.toString());
        const paid = parseFloat((invoice.paidAmount ?? 0).toString());
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: {
            balance: { decrement: total - paid },
            totalPurchases: { decrement: total },
          },
        });
      }

      const cancelled = await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: "cancelled", updatedAt: new Date() },
        include: { items: { include: { product: true } } },
      });

      logger.info(
        { invoiceId, tenantId: tenantContext.get().tenantId },
        "Invoice cancelled",
      );
      return cancelled;
    });
  } catch (error) {
    logger.error(
      { error, invoiceId, tenantId: tenantContext.get().tenantId },
      "Invoice cancellation failed",
    );
    throw error;
  }
}

/**
 * Persist the MinIO object key (and presigned URL) on an invoice record.
 */
export async function savePdfUrl(
  invoiceId: string,
  pdfObjectKey: string,
  pdfUrl: string,
): Promise<void> {
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { pdfObjectKey, pdfUrl },
  });
  logger.info({ invoiceId, pdfObjectKey }, "Invoice PDF URL saved to DB");
}

/**
 * Generate invoice PDF, upload to MinIO, and send via email / WhatsApp.
 * Non-fatal — never blocks the invoice flow. Call fire-and-forget.
 */
export async function dispatchInvoicePdfEmail(
  invoiceId: string,
): Promise<void> {
  const log = logger.child({ invoiceId, fn: "dispatchInvoicePdfEmail" });
  const start = Date.now();
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId },
      include: { customer: true, items: true },
    });
    if (!invoice) {
      log.warn("Invoice not found — skipping PDF dispatch");
      return;
    }

    const tenant = await prisma.tenant.findFirst({
      where: { id: invoice.tenantId },
      select: {
        name: true,
        legalName: true,
        settings: true,
        gstin: true,
        logoUrl: true,
      },
    });
    const settings = (tenant?.settings as Record<string, string> | null) ?? {};
    const shopName =
      settings.shopName ||
      tenant?.legalName ||
      process.env.SHOP_NAME ||
      tenant?.name ||
      "Execora Shop";
    const upiVpa = settings.upiVpa || undefined;
    const shopAddressParts = [
      settings.address,
      settings.city,
      settings.state,
      settings.pincode,
    ].filter(Boolean);
    const shopAddress =
      shopAddressParts.length > 0 ? shopAddressParts.join(", ") : undefined;
    const shopPhone = settings.phone || undefined;
    const shopGstin = tenant?.gstin || undefined;
    const bankName = settings.bankName || undefined;
    const bankAccountNo = settings.bankAccountNo || undefined;
    const bankIfsc = settings.bankIfsc || undefined;
    const bankAccountHolder = settings.bankAccountHolder || undefined;
    const termsAndConditions = settings.termsAndConditions || undefined;
    const roundOff = settings.roundOff === "true";
    const compositionScheme = settings.compositionScheme === "true";
    const invoiceTemplate = (settings.invoiceTemplate as string) || "classic";

    const TEMPLATE_COLORS: Record<string, string> = {
      classic: "#374151",
      modern: "#1e40af",
      vyapari: "#c2410c",
      thermal: "#111827",
      ecom: "#ff9900",
      flipkart: "#2874f0",
      minimal: "#6d28d9",
    };
    const accentColor = TEMPLATE_COLORS[invoiceTemplate] ?? "#374151";

    let logoBuffer: Buffer | undefined;
    const logoObjectKey = settings.logoObjectKey as string | undefined;
    if (logoObjectKey) {
      try {
        logoBuffer = await minioClient.getFile(logoObjectKey);
      } catch {
        /* non-fatal */
      }
    } else if (tenant?.logoUrl) {
      try {
        const res = await fetch(tenant.logoUrl);
        if (res.ok) logoBuffer = Buffer.from(await res.arrayBuffer());
      } catch {
        /* non-fatal */
      }
    }

    const invRecipient = (invoice as any).recipientAddress;
    const cust = invoice.customer as {
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      pincode?: string;
    } | null;
    const customerAddress =
      invRecipient ||
      (cust
        ? [
            cust.addressLine1,
            cust.addressLine2,
            cust.city,
            cust.state,
            cust.pincode,
          ]
            .filter(Boolean)
            .join(", ") || undefined
        : undefined);

    const autoSendEmail = settings.autoSendEmail !== "false";
    const autoSendWhatsApp = settings.autoSendWhatsApp !== "false";

    const pdfItems = invoice.items.map((i) => ({
      productName: i.productName,
      hsnCode: i.hsnCode ?? null,
      quantity: parseFloat(i.quantity.toString()),
      unit: i.unit,
      unitPrice: parseFloat(i.unitPrice.toString()),
      subtotal: parseFloat(i.subtotal.toString()),
      gstRate: parseFloat((i.gstRate ?? 0).toString()),
      cgst: parseFloat((i.cgst ?? 0).toString()),
      sgst: parseFloat((i.sgst ?? 0).toString()),
      igst: parseFloat((i.igst ?? 0).toString()),
      cess: parseFloat((i.cess ?? 0).toString()),
      totalTax: parseFloat((i.tax ?? 0).toString()),
      total: parseFloat(i.total.toString()),
    }));

    const subtotal = pdfItems.reduce((s, i) => s + i.subtotal, 0);
    const totalCgst = pdfItems.reduce((s, i) => s + (i.cgst ?? 0), 0);
    const totalSgst = pdfItems.reduce((s, i) => s + (i.sgst ?? 0), 0);
    const totalIgst = pdfItems.reduce((s, i) => s + (i.igst ?? 0), 0);
    const totalCess = pdfItems.reduce((s, i) => s + (i.cess ?? 0), 0);
    const totalTax = totalCgst + totalSgst + totalIgst + totalCess;
    const grandTotal = parseFloat(invoice.total.toString());

    let pdfBuffer: Buffer;
    try {
      const rawTotal =
        subtotal - parseFloat((invoice.discount ?? 0).toString()) + totalTax;
      const roundOffAmount = roundOff
        ? Math.round(rawTotal) - rawTotal
        : undefined;
      const discountAmount =
        parseFloat((invoice.discount ?? 0).toString()) || undefined;

      pdfBuffer = await generateInvoicePdf({
        invoiceNo: invoice.invoiceNo || invoice.id,
        invoiceId: invoice.id,
        invoiceDate: invoice.invoiceDate ?? invoice.createdAt,
        customerName: invoice.customer?.name || "Customer",
        customerGstin: (invoice as any).buyerGstin || undefined,
        customerAddress,
        shopName,
        shopAddress,
        shopPhone,
        shopGstin,
        supplyType: totalIgst > 0 ? "INTERSTATE" : "INTRASTATE",
        placeOfSupply: (invoice as any).placeOfSupply || undefined,
        reverseCharge: (invoice as any).reverseCharge || false,
        compositionScheme,
        template: invoiceTemplate,
        accentColor,
        logoBuffer,
        items: pdfItems,
        subtotal,
        discountAmount,
        roundOffAmount,
        totalCgst,
        totalSgst,
        totalIgst,
        totalCess,
        totalTax,
        grandTotal,
        notes: invoice.notes || undefined,
        upiVpa,
        bankName,
        bankAccountNo,
        bankIfsc,
        bankAccountHolder,
        termsAndConditions,
        tags: (invoice as { tags?: string[] }).tags ?? [],
      });
    } catch (err) {
      log.error({ err }, "PDF generation failed — skipping email");
      return;
    }

    let pdfUrl: string | undefined;
    try {
      const objectKey = `invoices/${invoice.tenantId}/${invoice.id}.pdf`;
      await minioClient.uploadFile(objectKey, pdfBuffer, {
        contentType: "application/pdf",
      });
      pdfUrl = await minioClient.getPresignedUrl(objectKey, 7 * 24 * 60 * 60);
      await savePdfUrl(invoice.id, objectKey, pdfUrl);
    } catch (err) {
      log.warn({ err }, "MinIO upload failed — will still attach PDF to email");
    }

    const customerEmail = invoice.customer?.email;
    const customerPhone = invoice.customer?.phone;
    if (!customerEmail && !customerPhone) {
      log.info(
        "Customer has no email or phone — PDF generated but delivery skipped",
      );
      return;
    }
    if (!autoSendEmail && !autoSendWhatsApp) {
      log.info(
        { invoiceId: invoice.id },
        "Auto-delivery disabled for both channels — PDF generated, skipping send",
      );
      return;
    }

    const emailItems = invoice.items.map((i) => ({
      product: i.productName,
      quantity: parseFloat(i.quantity.toString()),
      price: parseFloat(i.unitPrice.toString()),
      total: parseFloat(i.total.toString()),
    }));
    const invoiceRef =
      (invoice as any).invoiceNo || invoice.id.slice(-8).toUpperCase();

    const sendEmailIfEnabled = async () => {
      if (!customerEmail || !autoSendEmail) return false;
      try {
        await emailService.sendInvoiceEmail(
          customerEmail,
          invoice.customer!.name,
          invoice.id,
          emailItems,
          grandTotal,
          shopName,
          pdfBuffer,
          pdfUrl,
          invoiceRef,
        );
        log.info(
          { customerEmail, durationMs: Date.now() - start },
          "invoice.pdf.email.sent",
        );
        return true;
      } catch (err) {
        log.error({ err, customerEmail }, "invoice.pdf.email.failed");
        return false;
      }
    };

    const tryWhatsApp =
      customerPhone &&
      pdfUrl &&
      autoSendWhatsApp &&
      whatsappService.isConfigured();
    if (tryWhatsApp && customerPhone && pdfUrl) {
      const invoiceCaption = `${shopName} — Invoice ${invoiceRef}\n₹${grandTotal.toFixed(2)} | Please find your invoice attached.`;
      let waDelivered = false;
      try {
        const waResult = await whatsappService.sendDocumentMessage(
          customerPhone,
          pdfUrl,
          invoiceCaption,
          `invoice-${invoiceRef}.pdf`,
        );
        waDelivered = waResult.success;
        log.info(
          {
            customerPhone,
            success: waResult.success,
            durationMs: Date.now() - start,
          },
          "invoice.pdf.whatsapp.sent",
        );
      } catch (err) {
        log.error({ err, customerPhone }, "invoice.pdf.whatsapp.failed");
      }
      if (!waDelivered && customerEmail && autoSendEmail) {
        log.info(
          { customerPhone, customerEmail },
          "invoice.pdf.whatsapp.fallback — sending via email",
        );
        await sendEmailIfEnabled();
      }
    } else if (customerEmail && autoSendEmail) {
      await sendEmailIfEnabled();
    } else if (customerEmail && !autoSendEmail) {
      log.info(
        { customerEmail },
        "invoice.email.skipped — autoSendEmail disabled",
      );
    }
  } catch (err) {
    log.error({ err }, "dispatchInvoicePdfEmail: unexpected error");
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getInvoiceById(invoiceId: string) {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId: tenantContext.get().tenantId },
    include: { customer: true, items: { include: { product: true } } },
  });
}

export async function getRecentInvoices(limit = 10) {
  return prisma.invoice.findMany({
    where: { tenantId: tenantContext.get().tenantId },
    take: limit,
    orderBy: { invoiceDate: "desc" },
    include: { customer: true, items: { include: { product: true } } },
  });
}

export async function getCustomerInvoices(customerId: string, limit = 10) {
  return prisma.invoice.findMany({
    where: { customerId, tenantId: tenantContext.get().tenantId },
    take: limit,
    orderBy: { invoiceDate: "desc" },
    include: { items: { include: { product: true } } },
  });
}

export async function getLastInvoice(customerId: string) {
  return prisma.invoice.findFirst({
    where: { customerId, status: { not: "cancelled" } },
    orderBy: { invoiceDate: "desc" },
    include: { items: { include: { product: true } } },
  });
}

export async function getLastOrder(customerId: string) {
  return prisma.invoice.findFirst({
    where: {
      tenantId: tenantContext.get().tenantId,
      customerId,
      status: { notIn: ["cancelled"] },
    },
    orderBy: { invoiceDate: "desc" },
    include: {
      items: { select: { productName: true, quantity: true, unitPrice: true } },
    },
  });
}

export async function getTopSelling(limit = 5, days = 30) {
  const { tenantId } = tenantContext.get();
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.$queryRaw<
    Array<{
      product_id: string;
      product_name: string;
      unit: string;
      category: string;
      price: string;
      stock: number;
      sold_qty: string;
    }>
  >`
    SELECT
      ii.product_id, ii.product_name,
      COALESCE(p.unit, 'piece') AS unit,
      COALESCE(p.category, 'General') AS category,
      COALESCE(p.price::text, '0') AS price,
      COALESCE(p.stock, 0) AS stock,
      SUM(ii.quantity)::text AS sold_qty
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    LEFT JOIN products p ON ii.product_id = p.id
    WHERE i.tenant_id = ${tenantId}
      AND i.invoice_date >= ${since}
      AND i.status != 'cancelled'
      AND ii.product_id IS NOT NULL
    GROUP BY ii.product_id, ii.product_name, p.unit, p.category, p.price, p.stock
    ORDER BY sold_qty DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    productId: r.product_id,
    productName: r.product_name,
    unit: r.unit,
    category: r.category,
    price: r.price,
    stock: Number(r.stock),
    soldQty: Math.round(parseFloat(r.sold_qty ?? "0")),
  }));
}

export async function getSummaryRange(from: Date, to: Date) {
  const toEnd = new Date(to);
  toEnd.setHours(23, 59, 59, 999);

  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId: tenantContext.get().tenantId,
      invoiceDate: { gte: from, lte: toEnd },
      status: { notIn: ["cancelled", "proforma"] },
    },
    select: { total: true },
  });
  const totalSales = invoices.reduce(
    (sum, inv) => sum + parseFloat(inv.total.toString()),
    0,
  );

  const payments = await prisma.payment.findMany({
    where: {
      tenantId: tenantContext.get().tenantId,
      receivedAt: { gte: from, lte: toEnd },
      status: "completed",
    },
    select: { amount: true, method: true },
  });
  const totalPayments = payments.reduce(
    (sum, p) => sum + parseFloat(p.amount.toString()),
    0,
  );
  const cashPayments = payments
    .filter((p) => p.method === "cash")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
  const upiPayments = payments
    .filter((p) => p.method === "upi")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  return {
    from: from.toISOString(),
    to: toEnd.toISOString(),
    invoiceCount: invoices.length,
    totalSales,
    totalPayments,
    cashPayments,
    upiPayments,
    pendingAmount: Math.max(0, totalSales - totalPayments),
    extraPayments: Math.max(0, totalPayments - totalSales),
  };
}

export async function getDailySummary(date: Date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId: tenantContext.get().tenantId,
      invoiceDate: { gte: startOfDay, lte: endOfDay },
      status: { notIn: ["cancelled", "proforma"] },
    },
    select: { total: true },
  });
  const totalSales = invoices.reduce(
    (sum, inv) => sum + parseFloat(inv.total.toString()),
    0,
  );

  const payments = await prisma.payment.findMany({
    where: {
      tenantId: tenantContext.get().tenantId,
      receivedAt: { gte: startOfDay, lte: endOfDay },
      status: "completed",
    },
    select: { amount: true, method: true },
  });
  const totalPayments = payments.reduce(
    (sum, p) => sum + parseFloat(p.amount.toString()),
    0,
  );
  const cashPayments = payments
    .filter((p) => p.method === "cash")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
  const upiPayments = payments
    .filter((p) => p.method === "upi")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  return {
    date,
    invoiceCount: invoices.length,
    totalSales,
    totalPayments,
    cashPayments,
    upiPayments,
    pendingAmount: Math.max(0, totalSales - totalPayments),
    extraPayments: Math.max(0, totalPayments - totalSales),
  };
}
