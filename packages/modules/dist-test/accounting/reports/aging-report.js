"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgingReport = getAgingReport;
/**
 * Accounts Receivable Aging Report
 *
 * Buckets all pending / partially-paid invoices by how many calendar days
 * they have been outstanding.
 *
 * Buckets:
 *   0 – 30 days   → current
 *   31 – 60 days  → overdue-30
 *   61 – 90 days  → overdue-60
 *   91+ days      → overdue-90 (write-off risk)
 *
 * GET /api/v1/reports/aging
 */
const core_1 = require("@execora/core");
const BUCKETS = [
    { label: "0–30 days", minDays: 0, maxDays: 30 },
    { label: "31–60 days", minDays: 31, maxDays: 60 },
    { label: "61–90 days", minDays: 61, maxDays: 90 },
    { label: "91+ days", minDays: 91, maxDays: Infinity },
];
function dayDiff(from, to) {
    return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}
function round2(n) {
    return Math.round(n * 100) / 100;
}
function toN(d) {
    return round2(Number(d ?? 0));
}
/**
 * Generate the accounts-receivable aging report for a tenant.
 *
 * @param tenantId  Tenant to scope query to
 * @param asOf      Reference date (defaults to now)
 */
async function getAgingReport(tenantId, asOf = new Date()) {
    // All invoices that still have money outstanding
    const invoices = await core_1.prisma.invoice.findMany({
        where: {
            tenantId,
            status: { in: ["pending", "partial"] },
        },
        select: {
            id: true,
            invoiceDate: true,
            total: true,
            paidAmount: true,
            status: true,
            customer: {
                select: {
                    id: true,
                    name: true,
                    phone: true,
                },
            },
        },
        orderBy: { invoiceDate: "asc" },
    });
    // Accumulate per-customer rows
    const customerMap = new Map();
    const bucketTotals = [0, 0, 0, 0];
    for (const inv of invoices) {
        const due = round2(toN(inv.total) - toN(inv.paidAmount));
        if (due <= 0)
            continue;
        const ageDays = dayDiff(inv.invoiceDate, asOf);
        const bi = ageDays <= 30 ? 0 : ageDays <= 60 ? 1 : ageDays <= 90 ? 2 : 3;
        bucketTotals[bi] += due;
        const cid = inv.customer?.id ?? "unknown";
        let row = customerMap.get(cid);
        if (!row) {
            row = {
                customerId: cid,
                customerName: inv.customer?.name ?? "Unknown",
                phone: inv.customer?.phone ?? undefined,
                invoiceCount: 0,
                totalDue: 0,
                oldestInvoice: inv.invoiceDate.toISOString(),
                bucket0to30: 0,
                bucket31to60: 0,
                bucket61to90: 0,
                bucket91plus: 0,
            };
            customerMap.set(cid, row);
        }
        row.invoiceCount++;
        row.totalDue = round2(row.totalDue + due);
        // Track oldest invoice date
        if (inv.invoiceDate.getTime() < new Date(row.oldestInvoice).getTime()) {
            row.oldestInvoice = inv.invoiceDate.toISOString();
        }
        // Assign to bucket field
        if (bi === 0)
            row.bucket0to30 = round2(row.bucket0to30 + due);
        if (bi === 1)
            row.bucket31to60 = round2(row.bucket31to60 + due);
        if (bi === 2)
            row.bucket61to90 = round2(row.bucket61to90 + due);
        if (bi === 3)
            row.bucket91plus = round2(row.bucket91plus + due);
    }
    const customers = [...customerMap.values()].sort((a, b) => b.totalDue - a.totalDue);
    const totalOutstanding = round2(bucketTotals.reduce((s, v) => s + v, 0));
    const buckets = BUCKETS.map((b, i) => ({
        label: b.label,
        minDays: b.minDays,
        maxDays: b.maxDays,
        count: customers.filter((c) => {
            if (i === 0)
                return c.bucket0to30 > 0;
            if (i === 1)
                return c.bucket31to60 > 0;
            if (i === 2)
                return c.bucket61to90 > 0;
            return c.bucket91plus > 0;
        }).length,
        amount: round2(bucketTotals[i]),
    }));
    return {
        asOf: asOf.toISOString(),
        totalOutstanding,
        customerCount: customers.length,
        buckets,
        customers,
    };
}
//# sourceMappingURL=aging-report.js.map