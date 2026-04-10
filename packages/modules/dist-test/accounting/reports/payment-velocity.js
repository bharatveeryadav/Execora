"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentVelocityReport = getPaymentVelocityReport;
/**
 * Payment Velocity Report
 *
 * Analyses how quickly customers pay their invoices.  For each customer,
 * computes average days-to-pay (invoice date → payment received date) as
 * well as collection rate.  Helps identify slow payers and credit risk.
 *
 * GET /api/v1/reports/payment-velocity?from=&to=
 */
const core_1 = require("@execora/core");
function dayDiff(from, to) {
    return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}
function round2(n) {
    return Math.round(n * 100) / 100;
}
function toN(d) {
    return round2(Number(d ?? 0));
}
/**
 * Generate the payment velocity report.
 *
 * For each customer that had invoices in the date range:
 * - counts total invoices vs paid invoices
 * - averages calendar-days from invoiceDate to the first related payment's
 *   receivedAt (uses invoice.paidAt if no direct payment link)
 * - derives collectionRate = paidCount / invoiceCount × 100
 *
 * @param tenantId  Tenant scope
 * @param from      Start of analysis window (inclusive)
 * @param to        End of analysis window (inclusive)
 */
async function getPaymentVelocityReport(tenantId, from, to) {
    // Fetch all invoices in the period with their linked payments
    const invoices = await core_1.prisma.invoice.findMany({
        where: {
            tenantId,
            invoiceDate: { gte: from, lte: to },
            status: { not: "cancelled" },
        },
        select: {
            id: true,
            invoiceDate: true,
            total: true,
            paidAmount: true,
            status: true,
            paidAt: true,
            customer: {
                select: { id: true, name: true, phone: true },
            },
            payments: {
                where: { status: "completed" },
                select: { receivedAt: true, amount: true },
                orderBy: { receivedAt: "asc" },
                take: 1,
            },
        },
    });
    const customerMap = new Map();
    for (const inv of invoices) {
        const cid = inv.customer?.id ?? "unknown";
        let acc = customerMap.get(cid);
        if (!acc) {
            acc = {
                customerId: cid,
                customerName: inv.customer?.name ?? "Unknown",
                phone: inv.customer?.phone ?? undefined,
                invoiceCount: 0,
                paidCount: 0,
                pendingCount: 0,
                totalRevenue: 0,
                totalCollected: 0,
                daysSumPaid: 0,
                paidWithKnownDate: 0,
            };
            customerMap.set(cid, acc);
        }
        acc.invoiceCount++;
        acc.totalRevenue = round2(acc.totalRevenue + toN(inv.total));
        const isPaid = inv.status === "paid";
        if (isPaid) {
            acc.paidCount++;
            acc.totalCollected = round2(acc.totalCollected + toN(inv.paidAmount));
            // Determine payment date: firstPayment.receivedAt → paidAt → not counted
            const payDate = inv.payments[0]?.receivedAt ?? inv.paidAt ?? null;
            if (payDate) {
                acc.daysSumPaid += dayDiff(inv.invoiceDate, payDate);
                acc.paidWithKnownDate++;
            }
        }
        else {
            acc.pendingCount++;
            acc.totalCollected = round2(acc.totalCollected + toN(inv.paidAmount));
        }
    }
    const rows = [...customerMap.values()].map((acc) => ({
        customerId: acc.customerId,
        customerName: acc.customerName,
        phone: acc.phone,
        avgDaysToPay: acc.paidWithKnownDate > 0
            ? round2(acc.daysSumPaid / acc.paidWithKnownDate)
            : 0,
        invoiceCount: acc.invoiceCount,
        paidCount: acc.paidCount,
        pendingCount: acc.pendingCount,
        totalRevenue: acc.totalRevenue,
        totalCollected: acc.totalCollected,
        collectionRate: acc.invoiceCount > 0
            ? round2((acc.paidCount / acc.invoiceCount) * 100)
            : 0,
    }));
    // Sort: worst collection rate first
    rows.sort((a, b) => a.collectionRate - b.collectionRate);
    // Overall average (across invoices with known pay date)
    let totalDays = 0;
    let totalDenom = 0;
    for (const acc of customerMap.values()) {
        totalDays += acc.daysSumPaid;
        totalDenom += acc.paidWithKnownDate;
    }
    const avgDaysToPay = totalDenom > 0 ? round2(totalDays / totalDenom) : 0;
    return {
        from: from.toISOString(),
        to: to.toISOString(),
        avgDaysToPay,
        customers: rows,
    };
}
//# sourceMappingURL=payment-velocity.js.map