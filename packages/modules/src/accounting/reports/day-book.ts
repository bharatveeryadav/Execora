/**
 * Day Book (Daily Journal)
 *
 * A chronological log of every financial event on a given calendar day:
 * invoices raised, payments received, credit notes issued, and expenses /
 * purchases recorded.  Includes opening / closing cash balance.
 *
 * GET /api/v1/reports/day-book?date=YYYY-MM-DD
 *
 * Cash balance perspective (kirana / retail):
 *   Credit (in)  — payment received, invoice (revenue)
 *   Debit  (out) — expense / purchase, credit note, payment refund
 *
 * Opening balance is derived from net cash (payments – expenses) up to
 * midnight before the requested date.
 */
import { prisma } from "@execora/core";
import type { DayBookReport, DayBookEntry, DayBookEntryType } from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toN(d: unknown): number {
  return round2(Number(d ?? 0));
}

/** Midnight (00:00:00 UTC) of `date` */
function dayStart(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Midnight (00:00:00 UTC) of the day after `date` */
function dayEnd(date: Date): Date {
  const d = dayStart(date);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/**
 * Generate the day book for a single calendar day.
 *
 * @param tenantId  Tenant scope
 * @param date      The day to generate the book for (time part is ignored)
 */
export async function getDayBook(
  tenantId: string,
  date: Date,
): Promise<DayBookReport> {
  const start = dayStart(date);
  const end = dayEnd(date);

  // ── Compute opening cash balance ──────────────────────────────────────────
  // Opening = total payments received before today minus total expenses before today
  const [paysBefore, expsBefore] = await Promise.all([
    prisma.payment.aggregate({
      where: { tenantId, status: "completed", receivedAt: { lt: start } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        tenantId,
        type: { in: ["expense", "purchase"] },
        date: { lt: start },
      },
      _sum: { amount: true },
    }),
  ]);

  const openingBalance = round2(
    toN(paysBefore._sum.amount) - toN(expsBefore._sum.amount),
  );

  // ── Fetch today's transactions ────────────────────────────────────────────
  const [invoices, payments, creditNotes, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceDate: { gte: start, lt: end },
        status: { not: "cancelled" },
      },
      select: {
        id: true,
        invoiceNo: true,
        invoiceDate: true,
        total: true,
        customer: { select: { name: true } },
      },
      orderBy: { invoiceDate: "asc" },
    }),
    prisma.payment.findMany({
      where: {
        tenantId,
        status: "completed",
        receivedAt: { gte: start, lt: end },
      },
      select: {
        id: true,
        paymentNo: true,
        receivedAt: true,
        amount: true,
        method: true,
        customer: { select: { name: true } },
      },
      orderBy: { receivedAt: "asc" },
    }),
    prisma.creditNote.findMany({
      where: {
        tenantId,
        status: "issued",
        issuedAt: { gte: start, lt: end },
      },
      select: {
        id: true,
        creditNoteNo: true,
        issuedAt: true,
        total: true,
        customer: { select: { name: true } },
      },
      orderBy: { issuedAt: "asc" },
    }),
    prisma.expense.findMany({
      where: {
        tenantId,
        date: { gte: start, lt: end },
      },
      select: {
        id: true,
        category: true,
        date: true,
        amount: true,
        type: true,
        note: true,
        supplier: true,
      },
      orderBy: { date: "asc" },
    }),
  ]);

  // ── Build raw event list ──────────────────────────────────────────────────
  type RawEvent = {
    id: string;
    at: Date;
    type: DayBookEntryType;
    description: string;
    party?: string;
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
      party: inv.customer?.name,
      debit: 0,
      credit: toN(inv.total),
      reference: inv.invoiceNo,
    });
  }

  for (const pay of payments) {
    raw.push({
      id: pay.id,
      at: pay.receivedAt,
      type: "payment",
      description: `Payment received (${pay.method})`,
      party: pay.customer?.name,
      debit: 0,
      credit: toN(pay.amount),
      reference: pay.paymentNo,
    });
  }

  for (const cn of creditNotes) {
    raw.push({
      id: cn.id,
      at: cn.issuedAt ?? start,
      type: "credit_note",
      description: `Credit note issued`,
      party: cn.customer?.name,
      debit: toN(cn.total),
      credit: 0,
      reference: cn.creditNoteNo,
    });
  }

  for (const exp of expenses) {
    const isIncome = exp.type === "income";
    raw.push({
      id: exp.id,
      at: exp.date,
      type: exp.type === "purchase" ? "purchase" : "expense",
      description: exp.note ?? exp.category,
      party: exp.supplier ?? undefined,
      debit: isIncome ? 0 : toN(exp.amount),
      credit: isIncome ? toN(exp.amount) : 0,
      reference: undefined,
    });
  }

  // Sort chronologically
  raw.sort((a, b) => a.at.getTime() - b.at.getTime());

  // Compute running balance
  let runningBalance = openingBalance;
  let totalCredits = 0;
  let totalDebits = 0;

  const entries: DayBookEntry[] = raw.map((ev) => {
    runningBalance = round2(runningBalance + ev.credit - ev.debit);
    totalCredits = round2(totalCredits + ev.credit);
    totalDebits = round2(totalDebits + ev.debit);
    return {
      id: ev.id,
      date: ev.at.toISOString(),
      type: ev.type,
      description: ev.description,
      party: ev.party,
      debit: ev.debit,
      credit: ev.credit,
      balance: runningBalance,
      reference: ev.reference,
    };
  });

  return {
    date: start.toISOString().slice(0, 10),
    openingBalance,
    closingBalance: runningBalance,
    totalDebits,
    totalCredits,
    entries,
  };
}
