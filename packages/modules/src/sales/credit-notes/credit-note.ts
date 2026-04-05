import { prisma } from "@execora/infrastructure";
import { Prisma } from "@prisma/client";
import type {
  CreateCreditNoteInput,
  ListCreditNotesInput,
  CreditNoteRecord,
} from "./types";

// ─── Internal helper ──────────────────────────────────────────────────────────

async function generateCreditNoteNo(tenantId: string): Promise<string> {
  const now = new Date();
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyLabel = `${fy}-${String(fy + 1).slice(2)}`;
  const last = await prisma.creditNote.findFirst({
    where: { tenantId, creditNoteNo: { startsWith: `CN/${fyLabel}/` } },
    orderBy: { createdAt: "desc" },
    select: { creditNoteNo: true },
  });
  let seq = 1;
  if (last) {
    const parts = last.creditNoteNo.split("/");
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `CN/${fyLabel}/${seq}`;
}

const CN_INCLUDE = {
  customer: { select: { id: true, name: true, phone: true } },
  invoice: { select: { id: true, invoiceNo: true } },
  items: true,
} as const;

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listCreditNotes(
  tenantId: string,
  opts: ListCreditNotesInput = {},
): Promise<CreditNoteRecord[]> {
  const where: Prisma.CreditNoteWhereInput = { tenantId, deletedAt: null };
  if (opts.customerId) where.customerId = opts.customerId;
  if (opts.invoiceId) where.invoiceId = opts.invoiceId;
  if (opts.status) where.status = opts.status as any;
  return prisma.creditNote.findMany({
    where,
    take: Math.min(opts.limit ?? 20, 100),
    orderBy: { createdAt: "desc" },
    include: CN_INCLUDE,
  }) as Promise<CreditNoteRecord[]>;
}

export async function getCreditNoteById(
  tenantId: string,
  id: string,
): Promise<CreditNoteRecord | null> {
  return prisma.creditNote.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      customer: true,
      invoice: { select: { id: true, invoiceNo: true, invoiceDate: true } },
      items: {
        include: { product: { select: { id: true, name: true, sku: true } } },
      },
    },
  }) as Promise<CreditNoteRecord | null>;
}

// ─── Commands ─────────────────────────────────────────────────────────────────

export async function createCreditNote(
  tenantId: string,
  userId: string,
  body: CreateCreditNoteInput,
): Promise<CreditNoteRecord> {
  if (body.invoiceId) {
    const inv = await prisma.invoice.findFirst({
      where: { id: body.invoiceId, tenantId },
    });
    if (!inv) throw new Error("Invoice not found");
  }
  if (body.customerId) {
    const cust = await prisma.customer.findFirst({
      where: { id: body.customerId, tenantId },
    });
    if (!cust) throw new Error("Customer not found");
  }

  const lineItems = body.items.map((item) => {
    const gstRate = item.gstRate ?? 0;
    const discountAmt =
      item.unitPrice * item.quantity * ((item.discount ?? 0) / 100);
    const subtotal = item.unitPrice * item.quantity - discountAmt;
    const taxAmt = subtotal * (gstRate / 100);
    const total = subtotal + taxAmt;
    const isIgst =
      body.placeOfSupply && body.buyerGstin
        ? body.buyerGstin.slice(0, 2) !== body.placeOfSupply.slice(0, 2)
        : false;
    return {
      productId: item.productId,
      productName: item.productName,
      quantity: new Prisma.Decimal(item.quantity),
      unit: item.unit ?? "pcs",
      unitPrice: new Prisma.Decimal(item.unitPrice),
      discount: new Prisma.Decimal(discountAmt),
      subtotal: new Prisma.Decimal(subtotal),
      tax: new Prisma.Decimal(taxAmt),
      cgst: isIgst ? new Prisma.Decimal(0) : new Prisma.Decimal(taxAmt / 2),
      sgst: isIgst ? new Prisma.Decimal(0) : new Prisma.Decimal(taxAmt / 2),
      igst: isIgst ? new Prisma.Decimal(taxAmt) : new Prisma.Decimal(0),
      total: new Prisma.Decimal(total),
      hsnCode: item.hsnCode,
      gstRate: new Prisma.Decimal(gstRate),
    };
  });

  const subtotal = lineItems.reduce((s, i) => s + Number(i.subtotal), 0);
  const tax = lineItems.reduce((s, i) => s + Number(i.tax), 0);
  const cgst = lineItems.reduce((s, i) => s + Number(i.cgst), 0);
  const sgst = lineItems.reduce((s, i) => s + Number(i.sgst), 0);
  const igst = lineItems.reduce((s, i) => s + Number(i.igst), 0);
  const total = subtotal + tax;
  const creditNoteNo = await generateCreditNoteNo(tenantId);

  const cn = await prisma.creditNote.create({
    data: {
      tenantId,
      creditNoteNo,
      invoiceId: body.invoiceId,
      customerId: body.customerId,
      reason: (body.reason ?? "goods_returned") as any,
      reasonNote: body.reasonNote,
      notes: body.notes,
      placeOfSupply: body.placeOfSupply,
      buyerGstin: body.buyerGstin,
      reverseCharge: body.reverseCharge ?? false,
      status: "draft",
      subtotal: new Prisma.Decimal(subtotal),
      tax: new Prisma.Decimal(tax),
      cgst: new Prisma.Decimal(cgst),
      sgst: new Prisma.Decimal(sgst),
      igst: new Prisma.Decimal(igst),
      total: new Prisma.Decimal(total),
      createdBy: userId,
      items: { create: lineItems },
    },
    include: { items: true, customer: { select: { id: true, name: true } } },
  });
  return cn as CreditNoteRecord;
}

export async function issueCreditNote(
  tenantId: string,
  id: string,
): Promise<CreditNoteRecord> {
  const cn = await prisma.creditNote.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!cn) throw new Error("Credit note not found");
  if (cn.status !== "draft")
    throw new Error(`Cannot issue a credit note in status: ${cn.status}`);
  return prisma.creditNote.update({
    where: { id: cn.id },
    data: { status: "issued", issuedAt: new Date() },
  }) as Promise<CreditNoteRecord>;
}

export async function cancelCreditNote(
  tenantId: string,
  id: string,
  reason?: string,
): Promise<CreditNoteRecord> {
  const cn = await prisma.creditNote.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!cn) throw new Error("Credit note not found");
  if (cn.status === "cancelled") throw new Error("Already cancelled");
  return prisma.creditNote.update({
    where: { id: cn.id },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledReason: reason,
    },
  }) as Promise<CreditNoteRecord>;
}

/** Soft-delete a draft credit note. Throws if not found or already issued. */
export async function deleteCreditNote(
  tenantId: string,
  id: string,
): Promise<void> {
  const cn = await prisma.creditNote.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!cn) throw new Error("Credit note not found");
  if (cn.status === "issued")
    throw new Error("Cannot delete an issued credit note — cancel it first");
  await prisma.creditNote.update({
    where: { id: cn.id },
    data: { deletedAt: new Date() },
  });
}

// ─── Type re-exports ──────────────────────────────────────────────────────────

export type {
  CreateCreditNoteInput,
  CreateCreditNoteItemInput,
  ListCreditNotesInput,
  CreditNoteRecord,
} from "./types";
