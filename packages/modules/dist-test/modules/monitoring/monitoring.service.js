"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringService = void 0;
const infrastructure_1 = require("@execora/infrastructure");
const library_1 = require("@prisma/client/runtime/library");
const crypto_1 = require("crypto");
class MonitoringService {
    /**
     * Persist a monitoring event. Fire-and-forget — never throws so it cannot
     * break the primary transaction that called it.
     */
    async recordEvent(input) {
        try {
            // Get config to check if monitoring is enabled for this tenant.
            // If no config row exists, default to enabled.
            const config = await infrastructure_1.prisma.monitoringConfig.findUnique({
                where: { tenantId: input.tenantId },
                select: { enabled: true, alertDiscountAbove: true, alertCancelAbove: true, alertBillAbove: true },
            });
            if (config && !config.enabled)
                return;
            // Auto-upgrade severity based on config thresholds
            let severity = input.severity ?? 'info';
            if (input.amount != null && config) {
                const amt = input.amount;
                const cancelAbove = parseFloat(config.alertCancelAbove.toString());
                const billAbove = config.alertBillAbove ? parseFloat(config.alertBillAbove.toString()) : null;
                if (input.eventType === 'bill.cancelled' && amt >= cancelAbove)
                    severity = 'alert';
                if (input.eventType === 'bill.created' && billAbove && amt >= billAbove)
                    severity = 'warning';
            }
            await infrastructure_1.prisma.monitoringEvent.create({
                data: {
                    tenantId: input.tenantId,
                    userId: input.userId,
                    eventType: input.eventType,
                    entityType: input.entityType,
                    entityId: input.entityId,
                    amount: input.amount != null ? new library_1.Decimal(input.amount) : undefined,
                    description: input.description,
                    meta: (input.meta ?? {}),
                    severity,
                },
            });
        }
        catch (err) {
            // Swallow — monitoring must never break billing
            console.error('[MonitoringService] recordEvent failed silently', err);
        }
    }
    async getEvents(tenantId, opts = {}) {
        const where = { tenantId };
        if (opts.eventType)
            where.eventType = opts.eventType;
        if (opts.severity)
            where.severity = opts.severity;
        if (opts.userId)
            where.userId = opts.userId;
        if (opts.unreadOnly)
            where.isRead = false;
        if (opts.from || opts.to) {
            where.createdAt = {};
            if (opts.from)
                where.createdAt.gte = opts.from;
            if (opts.to)
                where.createdAt.lte = opts.to;
        }
        const [events, total] = await Promise.all([
            infrastructure_1.prisma.monitoringEvent.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: opts.limit ?? 50,
                skip: opts.offset ?? 0,
                include: {
                    user: { select: { id: true, name: true, role: true } },
                },
            }),
            infrastructure_1.prisma.monitoringEvent.count({ where }),
        ]);
        return { events, total };
    }
    async getUnreadAlertCount(tenantId) {
        return infrastructure_1.prisma.monitoringEvent.count({
            where: { tenantId, isRead: false, severity: { in: ['warning', 'alert'] } },
        });
    }
    async markAllRead(tenantId) {
        await infrastructure_1.prisma.monitoringEvent.updateMany({
            where: { tenantId, isRead: false },
            data: { isRead: true },
        });
    }
    async markRead(tenantId, id) {
        await infrastructure_1.prisma.monitoringEvent.updateMany({
            where: { id, tenantId },
            data: { isRead: true },
        });
    }
    async getStats(tenantId, from, to) {
        const events = await infrastructure_1.prisma.monitoringEvent.findMany({
            where: { tenantId, createdAt: { gte: from, lte: to } },
            select: { eventType: true, severity: true, userId: true, amount: true, createdAt: true },
        });
        // Aggregate counts by eventType
        const byType = {};
        for (const e of events) {
            byType[e.eventType] = (byType[e.eventType] ?? 0) + 1;
        }
        // Kirana metrics
        let totalBillAmount = 0;
        let billCount = 0;
        const hourlyBills = {};
        for (const e of events) {
            if (e.eventType === 'bill.created') {
                billCount++;
                if (e.amount)
                    totalBillAmount += parseFloat(e.amount.toString());
                const hour = new Date(e.createdAt).getHours();
                hourlyBills[hour] = (hourlyBills[hour] ?? 0) + 1;
            }
        }
        const footfall = byType['person.detected'] ?? 0;
        const avgBillAmount = billCount > 0 ? Math.round(totalBillAmount / billCount) : 0;
        const conversionRate = footfall > 0 ? Math.round((billCount / footfall) * 100) : null;
        // Peak hour (hour with most bills)
        let peakHour = null;
        let peakCount = 0;
        for (const [h, c] of Object.entries(hourlyBills)) {
            if (c > peakCount) {
                peakCount = c;
                peakHour = parseInt(h);
            }
        }
        // Per-employee summary
        const byEmployee = {};
        for (const e of events) {
            if (!e.userId)
                continue;
            if (!byEmployee[e.userId])
                byEmployee[e.userId] = { bills: 0, payments: 0, cancellations: 0, totalAmount: 0 };
            const emp = byEmployee[e.userId];
            if (e.eventType === 'bill.created')
                emp.bills++;
            if (e.eventType === 'payment.recorded')
                emp.payments++;
            if (e.eventType === 'bill.cancelled')
                emp.cancellations++;
            if (e.amount)
                emp.totalAmount += parseFloat(e.amount.toString());
        }
        return {
            byType, byEmployee, total: events.length,
            totalBillAmount: Math.round(totalBillAmount),
            avgBillAmount,
            footfall,
            conversionRate,
            hourlyBills,
            peakHour,
        };
    }
    /**
     * Record end-of-day cash reconciliation.
     * Stored as a monitoring event (eventType: cash.reconciliation) so no schema change needed.
     */
    async recordCashReconciliation(tenantId, userId, date, actual, expected, note) {
        const discrepancy = actual - expected;
        const severity = Math.abs(discrepancy) > 500 ? 'alert' : Math.abs(discrepancy) > 100 ? 'warning' : 'info';
        await this.recordEvent({
            tenantId,
            userId,
            eventType: 'cash.reconciliation',
            entityType: 'daily',
            entityId: date,
            amount: discrepancy,
            description: discrepancy === 0
                ? `EOD cash balanced — ₹${actual.toLocaleString('en-IN')}`
                : `EOD cash ${discrepancy > 0 ? 'surplus' : 'short'} ₹${Math.abs(discrepancy).toLocaleString('en-IN')} (expected ₹${expected.toLocaleString('en-IN')}, actual ₹${actual.toLocaleString('en-IN')})`,
            meta: { expected, actual, discrepancy, note: note ?? '' },
            severity,
        });
    }
    /**
     * Get the latest cash reconciliation record for a given date.
     */
    async getCashReconciliation(tenantId, date) {
        return infrastructure_1.prisma.monitoringEvent.findFirst({
            where: { tenantId, eventType: 'cash.reconciliation', entityId: date },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getConfig(tenantId) {
        return infrastructure_1.prisma.monitoringConfig.findUnique({ where: { tenantId } });
    }
    /**
     * Store a JPEG snapshot to MinIO and attach it to the most recent matching
     * MonitoringEvent for this entity, or create a new snap-only event.
     */
    async storeSnap(tenantId, userId, imageBuffer, opts) {
        const date = new Date().toISOString().slice(0, 10);
        const snapKey = `monitoring-snaps/${tenantId}/${date}/${(0, crypto_1.randomUUID)()}.jpg`;
        await infrastructure_1.minioClient.uploadFile(snapKey, imageBuffer, { contentType: 'image/jpeg' });
        // Try to attach to existing event for this entity (created in last 60 s)
        const since = new Date(Date.now() - 60_000);
        const existing = await infrastructure_1.prisma.monitoringEvent.findFirst({
            where: {
                tenantId,
                entityId: opts.entityId,
                eventType: opts.eventType,
                createdAt: { gte: since },
                snapKey: null,
            },
            orderBy: { createdAt: 'desc' },
        });
        if (existing) {
            await infrastructure_1.prisma.monitoringEvent.update({
                where: { id: existing.id },
                data: { snapKey },
            });
            return { snapKey, eventId: existing.id };
        }
        // No matching event — create a snap-only event
        const event = await infrastructure_1.prisma.monitoringEvent.create({
            data: {
                tenantId,
                userId,
                eventType: opts.eventType,
                entityType: opts.entityType,
                entityId: opts.entityId,
                description: opts.description ?? `Snapshot captured`,
                snapKey,
                severity: 'info',
            },
        });
        return { snapKey, eventId: event.id };
    }
    async getSnapPresignedUrl(tenantId, snapKey) {
        // Validate the key belongs to this tenant
        if (!snapKey.startsWith(`monitoring-snaps/${tenantId}/`)) {
            throw new Error('Forbidden');
        }
        return infrastructure_1.minioClient.getPresignedUrl(snapKey, 900); // 15 min TTL
    }
    async upsertConfig(tenantId, data) {
        const toDecimal = (v) => v != null ? new library_1.Decimal(v) : undefined;
        return infrastructure_1.prisma.monitoringConfig.upsert({
            where: { tenantId },
            create: {
                tenantId,
                ...data,
                alertDiscountAbove: data.alertDiscountAbove != null ? new library_1.Decimal(data.alertDiscountAbove) : new library_1.Decimal(20),
                alertCancelAbove: data.alertCancelAbove != null ? new library_1.Decimal(data.alertCancelAbove) : new library_1.Decimal(2000),
                alertBillAbove: toDecimal(data.alertBillAbove),
            },
            update: {
                ...data,
                alertDiscountAbove: toDecimal(data.alertDiscountAbove),
                alertCancelAbove: toDecimal(data.alertCancelAbove),
                alertBillAbove: toDecimal(data.alertBillAbove),
            },
        });
    }
}
exports.monitoringService = new MonitoringService();
//# sourceMappingURL=monitoring.service.js.map