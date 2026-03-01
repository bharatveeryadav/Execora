/**
 * Shared helpers used across all intent handlers.
 * Kept here so handlers stay focused on business logic only.
 */
import { logger } from '@execora/infrastructure';
import { conversationMemory } from '../conversation';
import { customerService } from '../../customer/customer.service';
import { invoiceService } from '../../invoice/invoice.service';
import { emailService } from '@execora/infrastructure';
import { generateInvoicePdf } from '@execora/infrastructure';
import { minioClient } from '@execora/infrastructure';
import type { CustomerSearchResult, ExecutionResult } from '@execora/types';

// ── Numeric helpers ──────────────────────────────────────────────────────────

export function toNum(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const n = typeof value === 'number' ? value : parseFloat(String((value as any).toString?.() ?? value));
  return Number.isFinite(n) ? n : fallback;
}

// ── Customer resolution ──────────────────────────────────────────────────────

export interface CustomerResolution {
  customer: CustomerSearchResult | null;
  multiple: boolean;
  candidates?: CustomerSearchResult[];
  query?: string;
}

/**
 * Multi-stage customer resolution used by every intent handler that needs a customer.
 *
 * Stage 1: In-memory cache (sub-ms, lives for the process lifetime)
 * Stage 2: Redis fallback (survives process restart within the same conversation)
 * Stage 3: DB search with ranking
 *
 * Sets the resolved customer as active so pronoun references ("uska", "iska")
 * work correctly in subsequent turns.
 */
export async function resolveCustomer(
  entities: Record<string, any>,
  conversationId?: string,
): Promise<CustomerResolution> {
  const rawQuery = entities?.customer || entities?.name;
  const needsActive = entities?.customerRef === 'active' || !rawQuery;

  if (needsActive && conversationId) {
    const active = await customerService.getActiveCustomer(conversationId);
    if (active) return { customer: active, multiple: false };

    const memActive = await conversationMemory.getActiveCustomer(conversationId);
    if (memActive) {
      const fallback = await customerService.getActiveCustomerById(memActive.id, conversationId);
      if (fallback) {
        customerService.setActiveCustomer(conversationId, fallback.id);
        return { customer: fallback, multiple: false };
      }
    }
  }

  if (!rawQuery) return { customer: null, multiple: false };

  const candidates = conversationId
    ? await customerService.searchCustomerRanked(rawQuery, conversationId)
    : await customerService.searchCustomer(rawQuery);

  if (candidates.length === 0) return { customer: null, multiple: false, query: rawQuery };

  if (candidates.length > 1 && candidates[0].matchScore < 0.85) {
    return { customer: null, multiple: true, candidates, query: rawQuery };
  }

  if (conversationId) {
    customerService.setActiveCustomer(conversationId, candidates[0].id);
    await conversationMemory.setActiveCustomer(conversationId, candidates[0].id, candidates[0].name);
  }

  return { customer: candidates[0], multiple: false, query: rawQuery };
}

// ── Formatting ───────────────────────────────────────────────────────────────

/**
 * Build a TTS-friendly item summary.
 * Format: "4 kg Cheeni ₹180, 6 kg Aata ₹240"
 * Auto-created products are flagged with ⚠️ naya so the shopkeeper notices ₹0 price.
 */
export function formatItemsSummary(items: Array<Record<string, any>>): string {
  return items
    .map((i) => {
      const unit    = i.unit ? ` ${i.unit}` : '';
      const newFlag = i.autoCreated ? ' ⚠️ naya' : '';
      return `${i.quantity}${unit} ${i.productName} ₹${i.total}${newFlag}`;
    })
    .join(', ');
}

// ── PDF + email ──────────────────────────────────────────────────────────────

/**
 * Generate invoice PDF, upload to MinIO, and persist the URL.
 * Non-fatal at every stage: failures here never block the invoice flow.
 */
export async function buildAndStoreInvoicePdf(
  invoice: Record<string, any>,
  customerName: string,
  resolvedItems: Array<Record<string, any>>,
  shopName: string,
): Promise<{ pdfBuffer?: Buffer; pdfUrl?: string; pdfObjectKey?: string }> {
  // Stage 1: Generate PDF
  let pdfBuffer: Buffer;
  try {
    const subtotal   = resolvedItems.reduce((s, i) => s + toNum(i.subtotal, toNum(i.total)), 0);
    const totalCgst  = resolvedItems.reduce((s, i) => s + toNum(i.cgst), 0);
    const totalSgst  = resolvedItems.reduce((s, i) => s + toNum(i.sgst), 0);
    const totalIgst  = resolvedItems.reduce((s, i) => s + toNum(i.igst), 0);
    const totalCess  = resolvedItems.reduce((s, i) => s + toNum(i.cess), 0);
    const totalTax   = totalCgst + totalSgst + totalIgst + totalCess;
    const grandTotal = parseFloat(invoice.total.toString());

    pdfBuffer = await generateInvoicePdf({
      invoiceNo:    invoice.invoiceNo || invoice.id,
      invoiceId:    invoice.id,
      invoiceDate:  invoice.createdAt ? new Date(invoice.createdAt) : new Date(),
      customerName: customerName || invoice?.customer?.name || 'Customer',
      shopName,
      supplyType: totalIgst > 0 ? 'INTERSTATE' : 'INTRASTATE',
      items: resolvedItems.map((i) => ({
        productName: i.productName,
        hsnCode:     i.hsnCode ?? null,
        quantity:    toNum(i.quantity),
        unit:        i.unit || 'unit',
        unitPrice:   toNum(i.unitPrice),
        subtotal:    toNum(i.subtotal, toNum(i.total)),
        gstRate:     toNum(i.gstRate),
        cgst:        toNum(i.cgst),
        sgst:        toNum(i.sgst),
        igst:        toNum(i.igst),
        cess:        toNum(i.cess),
        totalTax:    toNum(i.totalTax),
        total:       toNum(i.total),
      })),
      subtotal, totalCgst, totalSgst, totalIgst, totalCess, totalTax, grandTotal,
      notes: invoice.notes || undefined,
    });
  } catch (err) {
    logger.error({ err, invoiceId: invoice?.id }, 'Invoice PDF generation failed');
    return {};
  }

  // Stage 2: Upload to MinIO (non-fatal)
  try {
    const objectKey = `invoices/${invoice.tenantId || 'system'}/${invoice.id}.pdf`;
    await minioClient.uploadFile(objectKey, pdfBuffer, { contentType: 'application/pdf' });
    const pdfUrl = await minioClient.getPresignedUrl(objectKey, 7 * 24 * 60 * 60);
    await invoiceService.savePdfUrl(invoice.id, objectKey, pdfUrl);
    return { pdfBuffer, pdfUrl, pdfObjectKey: objectKey };
  } catch (err) {
    logger.error({ err, invoiceId: invoice?.id }, 'MinIO upload failed — email will still carry PDF attachment');
    return { pdfBuffer };
  }
}

/**
 * Fire invoice email (if customer has email) or park it for the next PROVIDE_EMAIL turn.
 * Called from both CREATE_INVOICE (autoSend) and CONFIRM_INVOICE paths.
 */
export async function sendConfirmedInvoiceEmail(
  invoice:       Record<string, any>,
  customerId:    string,
  customerEmail: string | null,
  customerName:  string,
  resolvedItems: Array<Record<string, any>>,
  conversationId?: string,
): Promise<ExecutionResult> {
  const total      = parseFloat(invoice.total.toString());
  const invoiceRef = (invoice as any).invoiceNo || invoice.id.slice(-6);
  const shopName   = process.env.SHOP_NAME || 'Execora Shop';
  const { pdfBuffer, pdfUrl, pdfObjectKey } = await buildAndStoreInvoicePdf(invoice, customerName, resolvedItems, shopName);
  const emailItems = resolvedItems.map((i) => ({
    product: i.productName, quantity: i.quantity, price: i.unitPrice, total: i.total,
  }));

  if (customerEmail) {
    emailService.sendInvoiceEmail(
      customerEmail, customerName, invoice.id, emailItems, total, shopName, pdfBuffer, pdfUrl, invoiceRef,
    ).catch((err) => logger.error({ err, invoiceId: invoice.id }, 'Failed to send invoice email'));

    return {
      success: true,
      message: `✅ ${customerName} ka bill confirm ho gaya! Invoice #${invoiceRef}. Total ₹${total}. Email ${customerEmail} par bhej diya.`,
      data: { invoiceId: invoice.id, invoiceNo: invoiceRef, total, customerName },
    };
  }

  // Park for PROVIDE_EMAIL turn
  const pendingEmailPayload = {
    customerId, customerName,
    invoiceId: invoice.id, invoiceNo: invoiceRef,
    items: emailItems, total,
    pdfUrl: pdfUrl || null,
    pdfObjectKey: pdfObjectKey || null,
  };
  if (conversationId) {
    await conversationMemory.setContext(conversationId, 'pendingInvoiceEmail', pendingEmailPayload);
  }
  await conversationMemory.setShopPendingEmail(pendingEmailPayload);

  return {
    success: true,
    message: `✅ ${customerName} ka bill confirm ho gaya! Invoice #${invoiceRef}. Total ₹${total}. Email bhejne ke liye address batao.`,
    data: { invoiceId: invoice.id, invoiceNo: invoiceRef, total, customerName, awaitingEmail: true },
  };
}
