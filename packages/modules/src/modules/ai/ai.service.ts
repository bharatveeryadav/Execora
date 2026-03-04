/**
 * AiService — Sprint 2 AI Differentiators
 *
 * Three purely-DB-driven AI features (no external LLM needed):
 *  1. getReplenishmentSuggestions — stock velocity → reorder suggestions
 *  2. checkInvoiceAnomaly        — z-score vs customer history
 *  3. schedulePredictiveReminders — smart scheduling based on payment patterns
 *
 * OCR (purchase_bill + product_catalog) is handled by the BullMQ OCR worker
 * in packages/infrastructure/src/workers.ts.
 */

import { prisma, logger, tenantContext } from '@execora/infrastructure';
import {
	replenishmentSuggestionsTotal,
	anomalyDetectionsTotal,
	predictiveRemindersScheduled,
} from '@execora/infrastructure';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReplenishmentSuggestion {
	productId: string;
	productName: string;
	currentStock: number;
	minStock: number;
	suggestedOrderQty: number;
	urgency: 'critical' | 'high' | 'normal';
	/** Units sold in the last 30 days */
	velocity30d: number;
	preferredSupplier: string | null;
}

export interface AnomalyResult {
	isAnomaly: boolean;
	severity: 'none' | 'low' | 'medium' | 'high';
	message: string;
	expectedRange: { min: number; max: number };
}

export interface PredictiveReminderResult {
	scheduled: number;
	skipped: number;
}

// ── Raw query row shapes ───────────────────────────────────────────────────────

interface LowStockRow {
	id: string;
	name: string;
	stock: number;
	min_stock: number;
	preferred_supplier: string | null;
}

interface VelocityRow {
	product_id: string;
	sold_qty: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

class AiService {
	// ── 1. Stock Replenishment Suggestions ─────────────────────────────────────
	/**
	 * Returns products where stock ≤ minStock with a suggested reorder quantity
	 * computed from 30-day sales velocity. Sorted by urgency (critical first).
	 */
	async getReplenishmentSuggestions(): Promise<ReplenishmentSuggestion[]> {
		const { tenantId } = tenantContext.get();
		const log = logger.child({ op: 'ai.replenishment', tenantId });

		// Products at-or-below their configured minimum stock level
		const lowStockProducts = await prisma.$queryRaw<LowStockRow[]>`
      SELECT id, name, stock, min_stock, preferred_supplier
      FROM   products
      WHERE  tenant_id = ${tenantId}
        AND  is_active = true
        AND  stock <= min_stock
      ORDER  BY stock ASC
      LIMIT  60
    `;

		if (lowStockProducts.length === 0) {
			log.info('No low-stock products found');
			return [];
		}

		// Sales velocity: units sold in last 30 days per product
		const productIds = lowStockProducts.map((p) => p.id);
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

		const velocityRows = await prisma.$queryRaw<VelocityRow[]>`
      SELECT ii.product_id::text AS product_id,
             COALESCE(SUM(ii.quantity::numeric), 0)::int AS sold_qty
      FROM   invoice_items ii
      INNER  JOIN invoices i ON i.id = ii.invoice_id
      WHERE  ii.product_id::text = ANY(${productIds})
        AND  i.created_at >= ${thirtyDaysAgo}
        AND  i.deleted_at IS NULL
      GROUP  BY ii.product_id
    `;

		const velocityMap = new Map(velocityRows.map((r) => [r.product_id, Number(r.sold_qty)]));

		const suggestions: ReplenishmentSuggestion[] = lowStockProducts.map((p) => {
			// Prisma $queryRaw returns PostgreSQL int4/int8 as BigInt — coerce to Number
			const stock = Number(p.stock);
			const minStock = Number(p.min_stock);
			const velocity = velocityMap.get(p.id) ?? 0;
			// Buffer = 30-day demand × 1.5 safety factor, minimum 2× min_stock, minimum 10 units
			const suggested = Math.ceil(Math.max(velocity * 1.5, minStock * 2, 10));
			const urgency: ReplenishmentSuggestion['urgency'] =
				stock === 0 ? 'critical' : stock <= Math.floor(minStock / 2) ? 'high' : 'normal';

			return {
				productId: p.id,
				productName: p.name,
				currentStock: stock,
				minStock: minStock,
				suggestedOrderQty: suggested,
				urgency,
				velocity30d: velocity,
				preferredSupplier: p.preferred_supplier,
			};
		});

		replenishmentSuggestionsTotal.inc({ tenantId });
		log.info({ count: suggestions.length }, 'Replenishment suggestions computed');
		return suggestions;
	}

	// ── 2. Invoice Anomaly Detection ────────────────────────────────────────────
	/**
	 * Compares a proposed invoice total against the customer's last 10 invoices.
	 * Uses a 3σ z-score rule: |z| > 2 → anomaly.
	 * Requires at least 3 prior invoices; returns isAnomaly=false otherwise.
	 */
	async checkInvoiceAnomaly(customerId: string, proposedTotal: number): Promise<AnomalyResult> {
		const { tenantId } = tenantContext.get();
		const log = logger.child({ op: 'ai.anomaly', tenantId, customerId, proposedTotal });

		const recentInvoices = await prisma.invoice.findMany({
			where: { tenantId, customerId, status: { notIn: ['cancelled'] }, deletedAt: null },
			orderBy: { createdAt: 'desc' },
			take: 12,
			select: { total: true },
		});

		if (recentInvoices.length < 3) {
			anomalyDetectionsTotal.inc({ is_anomaly: 'false', severity: 'none', tenantId });
			return {
				isAnomaly: false,
				severity: 'none',
				message: '',
				expectedRange: { min: 0, max: 999_999 },
			};
		}

		const totals = recentInvoices.map((i) => Number(i.total));
		const n = totals.length;
		const avg = totals.reduce((a, b) => a + b, 0) / n;
		const stdDev = Math.sqrt(totals.reduce((a, b) => a + (b - avg) ** 2, 0) / n);

		const safeStdDev = stdDev > 1 ? stdDev : avg * 0.5 || 50;
		const zScore = Math.abs(proposedTotal - avg) / safeStdDev;
		const isAnomaly = zScore > 2;

		const severity: AnomalyResult['severity'] =
			zScore > 4 ? 'high' : zScore > 3 ? 'medium' : zScore > 2 ? 'low' : 'none';

		const minRange = Math.max(0, Math.round(avg - 2 * safeStdDev));
		const maxRange = Math.round(avg + 2 * safeStdDev);

		if (!isAnomaly) {
			anomalyDetectionsTotal.inc({ is_anomaly: 'false', severity: 'none', tenantId });
			return { isAnomaly: false, severity: 'none', message: '', expectedRange: { min: minRange, max: maxRange } };
		}

		const direction = proposedTotal > avg ? 'higher' : 'lower';
		const avgFmt = Math.round(avg).toLocaleString('en-IN');
		const billFmt = Math.round(proposedTotal).toLocaleString('en-IN');
		const message = `This bill (₹${billFmt}) is unusually ${direction} than this customer's average order of ₹${avgFmt}.`;

		anomalyDetectionsTotal.inc({ is_anomaly: 'true', severity, tenantId });
		log.warn({ zScore: zScore.toFixed(2), avg: Math.round(avg), severity }, 'Invoice anomaly detected');
		return { isAnomaly: true, severity, message, expectedRange: { min: minRange, max: maxRange } };
	}

	// ── 3. Predictive Payment Reminders ────────────────────────────────────────
	/**
	 * Scans invoices due in the next 7 days (or already overdue) and schedules
	 * intelligent reminders. Known late-payers (averagePaymentDays > 25) get an
	 * extra day of lead time. Skips invoices that already have a pending/sent reminder.
	 */
	async schedulePredictiveReminders(): Promise<PredictiveReminderResult> {
		const { tenantId } = tenantContext.get();
		const log = logger.child({ op: 'ai.predictive_reminders', tenantId });

		const now = new Date();
		const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

		const pendingInvoices = await prisma.invoice.findMany({
			where: {
				tenantId,
				status: { in: ['pending', 'partial'] },
				deletedAt: null,
				dueDate: { lte: sevenDaysOut },
				customerId: { not: null },
			},
			include: {
				customer: {
					select: { id: true, name: true, phone: true, averagePaymentDays: true, balance: true },
				},
			},
			take: 200,
		});

		log.info({ count: pendingInvoices.length }, 'Pending invoices found for predictive reminders');

		let scheduled = 0;
		let skipped = 0;

		for (const invoice of pendingInvoices) {
			if (!invoice.customer || !invoice.dueDate) {
				skipped++;
				continue;
			}

			// Skip if a non-cancelled reminder already exists for this invoice
			const existing = await prisma.reminder.findFirst({
				where: { tenantId, invoiceId: invoice.id, status: { in: ['pending', 'sent'] } },
			});
			if (existing) {
				skipped++;
				continue;
			}

			const dueDate = new Date(invoice.dueDate);
			const oneDayBefore = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
			const isLatePayer = (invoice.customer.averagePaymentDays ?? 0) > 25;
			const leadTime = isLatePayer ? 48 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
			const scheduledAt = new Date(dueDate.getTime() - leadTime);
			const finalTime = scheduledAt < now ? now : scheduledAt;

			const balance = Number(invoice.total) - Number(invoice.paidAmount);
			const balFmt = Math.round(balance).toLocaleString('en-IN');

			await prisma.reminder.create({
				data: {
					tenantId,
					customerId: invoice.customer.id,
					invoiceId: invoice.id,
					reminderType: 'payment_due',
					priority: isLatePayer ? 'high' : 'normal',
					scheduledTime: finalTime,
					customMessage: `Payment due for ${invoice.invoiceNo}: ₹${balFmt} pending.`,
					channels: ['whatsapp'],
					status: 'pending',
					createdBy: 'ai_engine',
				},
			});

			scheduled++;
		}

		predictiveRemindersScheduled.inc({ tenantId }, scheduled);
		log.info({ scheduled, skipped }, 'Predictive reminders scheduled');
		return { scheduled, skipped };
	}
}

export const aiService = new AiService();
