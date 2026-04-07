/**
 * Outstanding Receivables Report
 *
 * Lists every pending or partially-paid invoice with the exact amount still
 * owed and how many days it has been outstanding.
 *
 * GET /api/v1/reports/outstanding?customerId=&maxAgeDays=
 */
import { prisma } from "@execora/core";
import type {
  OutstandingReceivablesReport,
  OutstandingInvoiceRow,
} from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toN(d: unknown): number {
  return round2(Number(d ?? 0));
}

function dayDiff(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * Generate the outstanding receivables report.
 *
 * @param tenantId    Tenant scope
 * @param customerId  Optional — filter to a single customer
 * @param asOf        Reference date (defaults to now)
 * @param maxAgeDays  Optional upper limit on invoice age (e.g. 365)
 */
export async function getOutstandingReceivables(
  tenantId: string,
  opts: {
    customerId?: string;
    asOf?: Date;
    maxAgeDays?: number;
  } = {},
): Promise<OutstandingReceivablesReport> {
  const asOf = opts.asOf ?? new Date();

  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      ...(opts.customerId ? { customerId: opts.customerId } : {}),
      status: { in: ["pending", "partial"] },
    },
    select: {
      id: true,
      invoiceNo: true,
      invoiceDate: true,
      total: true,
      paidAmount: true,
      status: true,
      customer: {
        select: { id: true, name: true, phone: true },
      },
    },
    orderBy: { invoiceDate: "asc" },
  });

  const rows: OutstandingInvoiceRow[] = [];
  const seenCustomers = new Set<string>();

  for (const inv of invoices) {
    const dueAmount = round2(toN(inv.total) - toN(inv.paidAmount));
    if (dueAmount <= 0) continue;

    const ageDays = dayDiff(inv.invoiceDate, asOf);
    if (opts.maxAgeDays !== undefined && ageDays > opts.maxAgeDays) continue;

    seenCustomers.add(inv.customer?.id ?? "unknown");

    rows.push({
      invoiceId: inv.id,
      invoiceNo: inv.invoiceNo,
      customerId: inv.customer?.id ?? "",
      customerName: inv.customer?.name ?? "Unknown",
      phone: inv.customer?.phone ?? undefined,
      invoiceDate: inv.invoiceDate.toISOString(),
      dueAmount,
      ageDays,
      status: inv.status,
    });
  }

  // Sort: oldest first
  rows.sort((a, b) => a.ageDays - b.ageDays);

  const totalOutstanding = round2(rows.reduce((s, r) => s + r.dueAmount, 0));

  return {
    asOf: asOf.toISOString(),
    totalOutstanding,
    invoiceCount: rows.length,
    customerCount: seenCustomers.size,
    invoices: rows,
  };
}
