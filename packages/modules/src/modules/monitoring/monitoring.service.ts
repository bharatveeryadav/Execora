import { prisma, minioClient } from '@execora/infrastructure';
import { Decimal } from '@prisma/client/runtime/library';
import { randomUUID } from 'crypto';

export interface RecordEventInput {
	tenantId: string;
	userId?: string;
	eventType: string;
	entityType: string;
	entityId: string;
	amount?: number;
	description: string;
	meta?: Record<string, unknown>;
	severity?: 'info' | 'warning' | 'alert';
}

class MonitoringService {
	/**
	 * Persist a monitoring event. Fire-and-forget — never throws so it cannot
	 * break the primary transaction that called it.
	 */
	async recordEvent(input: RecordEventInput): Promise<void> {
		try {
			// Get config to check if monitoring is enabled for this tenant.
			// If no config row exists, default to enabled.
			const config = await prisma.monitoringConfig.findUnique({
				where: { tenantId: input.tenantId },
				select: { enabled: true, alertDiscountAbove: true, alertCancelAbove: true, alertBillAbove: true },
			});

			if (config && !config.enabled) return;

			// Auto-upgrade severity based on config thresholds
			let severity = input.severity ?? 'info';
			if (input.amount != null && config) {
				const amt = input.amount;
				const cancelAbove = parseFloat(config.alertCancelAbove.toString());
				const billAbove   = config.alertBillAbove ? parseFloat(config.alertBillAbove.toString()) : null;

				if (input.eventType === 'bill.cancelled' && amt >= cancelAbove) severity = 'alert';
				if (input.eventType === 'bill.created' && billAbove && amt >= billAbove) severity = 'warning';
			}

			await prisma.monitoringEvent.create({
				data: {
					tenantId:   input.tenantId,
					userId:     input.userId,
					eventType:  input.eventType,
					entityType: input.entityType,
					entityId:   input.entityId,
					amount:     input.amount != null ? new Decimal(input.amount) : undefined,
					description: input.description,
					meta:       (input.meta ?? {}) as any,
					severity,
				},
			});
		} catch (err) {
			// Swallow — monitoring must never break billing
			console.error('[MonitoringService] recordEvent failed silently', err);
		}
	}

	async getEvents(
		tenantId: string,
		opts: {
			limit?: number;
			offset?: number;
			eventType?: string;
			severity?: string;
			userId?: string;
			from?: Date;
			to?: Date;
			unreadOnly?: boolean;
		} = {},
	) {
		const where: any = { tenantId };
		if (opts.eventType) where.eventType = opts.eventType;
		if (opts.severity)  where.severity  = opts.severity;
		if (opts.userId)    where.userId     = opts.userId;
		if (opts.unreadOnly) where.isRead    = false;
		if (opts.from || opts.to) {
			where.createdAt = {};
			if (opts.from) where.createdAt.gte = opts.from;
			if (opts.to)   where.createdAt.lte = opts.to;
		}

		const [events, total] = await Promise.all([
			prisma.monitoringEvent.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				take:   opts.limit  ?? 50,
				skip:   opts.offset ?? 0,
				include: {
					user: { select: { id: true, name: true, role: true } },
				},
			}),
			prisma.monitoringEvent.count({ where }),
		]);

		return { events, total };
	}

	async getUnreadAlertCount(tenantId: string): Promise<number> {
		return prisma.monitoringEvent.count({
			where: { tenantId, isRead: false, severity: { in: ['warning', 'alert'] } },
		});
	}

	async markAllRead(tenantId: string): Promise<void> {
		await prisma.monitoringEvent.updateMany({
			where: { tenantId, isRead: false },
			data:  { isRead: true },
		});
	}

	async markRead(tenantId: string, id: string): Promise<void> {
		await prisma.monitoringEvent.updateMany({
			where: { id, tenantId },
			data:  { isRead: true },
		});
	}

	async getStats(tenantId: string, from: Date, to: Date) {
		const events = await prisma.monitoringEvent.findMany({
			where: { tenantId, createdAt: { gte: from, lte: to } },
			select: { eventType: true, severity: true, userId: true, amount: true, createdAt: true },
		});

		// Aggregate counts by eventType
		const byType: Record<string, number> = {};
		for (const e of events) {
			byType[e.eventType] = (byType[e.eventType] ?? 0) + 1;
		}

		// Per-employee summary
		const byEmployee: Record<string, { bills: number; payments: number; cancellations: number; totalAmount: number }> = {};
		for (const e of events) {
			if (!e.userId) continue;
			if (!byEmployee[e.userId]) byEmployee[e.userId] = { bills: 0, payments: 0, cancellations: 0, totalAmount: 0 };
			const emp = byEmployee[e.userId];
			if (e.eventType === 'bill.created')    emp.bills++;
			if (e.eventType === 'payment.recorded') emp.payments++;
			if (e.eventType === 'bill.cancelled')  emp.cancellations++;
			if (e.amount) emp.totalAmount += parseFloat(e.amount.toString());
		}

		return { byType, byEmployee, total: events.length };
	}

	async getConfig(tenantId: string) {
		return prisma.monitoringConfig.findUnique({ where: { tenantId } });
	}

	/**
	 * Store a JPEG snapshot to MinIO and attach it to the most recent matching
	 * MonitoringEvent for this entity, or create a new snap-only event.
	 */
	async storeSnap(
		tenantId: string,
		userId: string | undefined,
		imageBuffer: Buffer,
		opts: {
			eventType: string;
			entityType: string;
			entityId: string;
			description?: string;
		},
	): Promise<{ snapKey: string; eventId: string }> {
		const date = new Date().toISOString().slice(0, 10);
		const snapKey = `monitoring-snaps/${tenantId}/${date}/${randomUUID()}.jpg`;

		await minioClient.uploadFile(snapKey, imageBuffer, { contentType: 'image/jpeg' });

		// Try to attach to existing event for this entity (created in last 60 s)
		const since = new Date(Date.now() - 60_000);
		const existing = await prisma.monitoringEvent.findFirst({
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
			await prisma.monitoringEvent.update({
				where: { id: existing.id },
				data: { snapKey },
			});
			return { snapKey, eventId: existing.id };
		}

		// No matching event — create a snap-only event
		const event = await prisma.monitoringEvent.create({
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

	async getSnapPresignedUrl(tenantId: string, snapKey: string): Promise<string> {
		// Validate the key belongs to this tenant
		if (!snapKey.startsWith(`monitoring-snaps/${tenantId}/`)) {
			throw new Error('Forbidden');
		}
		return minioClient.getPresignedUrl(snapKey, 900); // 15 min TTL
	}

	async upsertConfig(tenantId: string, data: Partial<{
		enabled: boolean;
		snapsOnBills: boolean;
		snapsOnPayments: boolean;
		alertDiscountAbove: number;
		alertCancelAbove: number;
		alertBillAbove: number | null;
		ownerPhoneAlert: boolean;
		cameraEnabled: boolean;
		cameraSource: string;
		ipCameraUrl: string | null;
		retentionDays: number;
	}>) {
		const toDecimal = (v: number | null | undefined) =>
			v != null ? new Decimal(v) : undefined;

		return prisma.monitoringConfig.upsert({
			where: { tenantId },
			create: {
				tenantId,
				...data,
				alertDiscountAbove: data.alertDiscountAbove != null ? new Decimal(data.alertDiscountAbove) : new Decimal(20),
				alertCancelAbove:   data.alertCancelAbove   != null ? new Decimal(data.alertCancelAbove)   : new Decimal(2000),
				alertBillAbove:     toDecimal(data.alertBillAbove),
			},
			update: {
				...data,
				alertDiscountAbove: toDecimal(data.alertDiscountAbove),
				alertCancelAbove:   toDecimal(data.alertCancelAbove),
				alertBillAbove:     toDecimal(data.alertBillAbove),
			},
		});
	}
}

export const monitoringService = new MonitoringService();
