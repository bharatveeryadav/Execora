/**
 * Customer Account Statement
 *
 * A chronological history of all financial events for one customer over a
 * date range: invoices raised, payments received, and credit notes issued.
 * Each row carries a running balance (positive = customer still owes money).
 *
 * GET /api/v1/customers/:id/statement?from=&to=
 */
import { prisma } from "@execora/core";
import type {
  AccountStatement,
  StatementEntry,
  StatementEntryType,
} from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toN(d: unknown): number {
  return round2(Number(d ?? 0));
}

/**
 * Generate a customer account statement.
 *
 * Opening balance is computed from all invoices and payments before `from`
 * (invoices increase the balance; payments, credit notes decrease it).
 *
 * @param tenantId   Tenant scope
 * @param customerId Target customer
 * @param from       Statement period start (inclusive)
 * @param to         Statement period end (inclusive)
 */
export async function getAccountStatement(
  tenantId: string,
  customerId: string,
  from: Date,
  to: Date,
): Promise<AccountStatement> {
  // ── Resolve the customer ──────────────────────────────────────────────────
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: { id: true, name: true, phone: true, gstin: true },
  });

  if (!customer) {
    throw new Error(`Customer ${customerId} not found`);
  }

  const toEndOfDay = new Date(to);
  toEndOfDay.setUTCHours(23, 59, 59, 999);

  // ── Compute opening balance (transactions strictly before `from`) ─────────
  const [invBefore, payBefore, cnBefore] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        tenantId,
        customerId,
        invoiceDate: { lt: from },
        status: { not: "cancelled" },
      },
      _sum: { total: true },
    }),
    prisma.payment.aggregate({
      where: {
        tenantId,
        customerId,
        status: "completed",
        receivedAt: { lt: from },
      },
      _sum: { amount: true },
    }),
    prisma.creditNote.aggregate({
      where: {
        tenantId,
        customerId,
        status: "issued",
        issuedAt: { lt: from },
      },
      _sum: { total: true },
    }),
  ]);

  const openingBalance = round2(
    toN(invBefore._sum.total) -
      toN(payBefore._sum.amount) -
      toN(cnBefore._sum.total),
  );

  // ── Fetch events in the statement period ──────────────────────────────────
  const [invoices, payments, creditNotes] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        tenantId,
        customerId,
        invoiceDate: { gte: from, lte: toEndOfDay },
        status: { not: "cancelled" },
      },
      select: {
        id: true,
        invoiceNo: true,
        invoiceDate: true,
        total: true,
        status: true,
      },
      orderBy: { invoiceDate: "asc" },
    }),
    prisma.payment.findMany({
      where: {
        tenantId,
        customerId,
        status: "completed",
        receivedAt: { gte: from, lte: toEndOfDay },
      },
      select: {
        id: true,
        paymentNo: true,
        receivedAt: true,
        amount: true,
        method: true,
      },
      orderBy: { receivedAt: "asc" },
    }),
    prisma.creditNote.findMany({
      where: {
        tenantId,
        customerId,
        status: "issued",
        issuedAt: { gte: from, lte: toEndOfDay },
      },
      select: {
        id: true,
        creditNoteNo: true,
        issuedAt: true,
        createdAt: true,
        total: true,
        reason: true,
      },
      orderBy: { issuedAt: "asc" },
    }),
  ]);

  // ── Build a unified event list ────────────────────────────────────────────
  type RawEvent = {
    id: string;
    at: Date;
    type: StatementEntryType;
    description: string;
    debit: number;
    credit: number;
    reference?: string;
  };

  const raw: RawEvent[] = [];

  for (const inv of invoices) {
    raw.push({
      id: inv.id,
      at: inv.invoiceDate,
      type: "invoice",
      description: `Invoice raised`,
      debit: toN(inv.total),
      credit: 0,
      reference: inv.invoiceNo,
    });
  }

  for (const pay of payments) {
    raw.push({
      id: pay.id,
      at: pay.receivedAt,
      type: "payment",
      description: `Payment received (${pay.method})`,
      debit: 0,
      credit: toN(pay.amount),
      reference: pay.paymentNo,
    });
  }

  for (const cn of creditNotes) {
    raw.push({
      id: cn.id,
      at: cn.issuedAt ?? cn.createdAt,
      type: "credit_note",
      description: `Credit note (${cn.reason.replace(/_/g, " ")})`,
      debit: 0,
      credit: toN(cn.total),
      reference: cn.creditNoteNo,
    });
  }

  raw.sort((a, b) => a.at.getTime() - b.at.getTime());

  let balance = openingBalance;
  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalCreditNotes = 0;

  const entries: StatementEntry[] = raw.map((ev) => {
    balance = round2(balance + ev.debit - ev.credit);
    if (ev.type === "invoice") totalInvoiced = round2(totalInvoiced + ev.debit);
    if (ev.type === "payment") totalPaid = round2(totalPaid + ev.credit);
    if (ev.type === "credit_note")
      totalCreditNotes = round2(totalCreditNotes + ev.credit);
    return {
      id: ev.id,
      date: ev.at.toISOString(),
      type: ev.type,
      description: ev.description,
      debit: ev.debit,
      credit: ev.credit,
      balance,
      reference: ev.reference,
    };
  });

  return {
    customerId: customer.id,
    customerName: customer.name,
    phone: customer.phone ?? undefined,
    gstin: customer.gstin ?? undefined,
    from: from.toISOString(),
    to: toEndOfDay.toISOString(),
    openingBalance,
    closingBalance: balance,
    entries,
    totalInvoiced,
    totalPaid,
    totalCreditNotes,
  };
}
