import { prisma } from '@execora/infrastructure';
import { logger } from '@execora/infrastructure';
import { tenantContext } from '@execora/infrastructure';
import { Decimal } from '@prisma/client/runtime/library';
import { paymentProcessing, paymentAmount } from '@execora/infrastructure';

// Map old payment mode strings to the PaymentMethod enum
const methodMap: Record<string, 'cash' | 'upi' | 'card' | 'bank' | 'credit' | 'mixed'> = {
	cash: 'cash',
	upi: 'upi',
	card: 'card',
	other: 'bank',
	bank: 'bank',
	mixed: 'mixed',
};

function generatePaymentNo(): string {
	const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
	const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
	return `PAY-${date}-${rand}`;
}

class LedgerService {
	/**
	 * Record a payment received from customer (reduces their balance).
	 */
	async recordPayment(
		customerId: string,
		amount: number,
		paymentMode: 'cash' | 'upi' | 'card' | 'other',
		notes?: string,
		reference?: string,
		receivedAt?: Date
	) {
		try {
			if (!customerId?.trim()) throw new Error('Customer ID is required');
			if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
				throw new Error('Payment amount must be a positive number');
			}
			const validModes = ['cash', 'upi', 'card', 'other'];
			if (!validModes.includes(paymentMode)) {
				throw new Error(`Payment mode must be one of: ${validModes.join(', ')}`);
			}

			const method = methodMap[paymentMode] ?? 'bank';

			return await prisma.$transaction(async (tx) => {
				const payment = await tx.payment.create({
					data: {
						paymentNo: generatePaymentNo(),
						tenantId: tenantContext.get().tenantId,
						customerId,
						amount: new Decimal(amount),
						method,
						status: 'completed',
						notes,
						reference: reference || null,
						receivedAt: receivedAt ?? new Date(),
					},
					include: { customer: true },
				});

				await tx.customer.update({
					where: { id: customerId },
					data: {
						balance: { decrement: amount },
						totalPayments: { increment: amount },
						lastPaymentAmount: new Decimal(amount),
						lastPaymentDate: receivedAt ?? new Date(),
					},
				});

				// Auto-apply payment to oldest unpaid invoices (khata-style settlement).
				// Marks each invoice as 'paid' or 'partial' as the payment is consumed.
				const pendingInvoices = await tx.invoice.findMany({
					where: {
						customerId,
						tenantId: tenantContext.get().tenantId,
						status: { in: ['pending', 'partial'] },
					},
					orderBy: { invoiceDate: 'asc' },
					select: { id: true, total: true, paidAmount: true },
				});

				let remaining = amount;
				for (const inv of pendingInvoices) {
					if (remaining <= 0) break;
					const invTotal = parseFloat(inv.total.toString());
					const invPaid = parseFloat((inv.paidAmount ?? 0).toString());
					const invDue = Math.round((invTotal - invPaid) * 100) / 100;
					if (invDue <= 0) continue;

					if (remaining >= invDue) {
						await tx.invoice.update({
							where: { id: inv.id },
							data: { status: 'paid', paidAmount: new Decimal(invTotal), paidAt: new Date() },
						});
						remaining = Math.round((remaining - invDue) * 100) / 100;
					} else {
						await tx.invoice.update({
							where: { id: inv.id },
							data: { status: 'partial', paidAmount: new Decimal(invPaid + remaining) },
						});
						remaining = 0;
					}
				}

				logger.info({ customerId, amount, paymentMode, reference, receivedAt }, 'Payment recorded');
				paymentProcessing.inc({ status: 'success' });
				paymentAmount.observe({ customer_id: customerId }, amount);

				return payment;
			});
		} catch (error) {
			logger.error({ error, customerId, amount }, 'Payment recording failed');
			paymentProcessing.inc({ status: 'error' });
			throw error;
		}
	}

	/**
	 * Record a split (mixed) payment — e.g. ₹500 cash + ₹300 UPI.
	 * Each split is recorded as a separate Payment row but settled together in one atomic transaction.
	 */
	async recordMixedPayment(
		customerId: string,
		splits: Array<{ amount: number; method: 'cash' | 'upi' | 'card' | 'other' }>,
		notes?: string,
		reference?: string,
		receivedAt?: Date
	) {
		try {
			if (!customerId?.trim()) throw new Error('Customer ID is required');
			if (!Array.isArray(splits) || splits.length === 0)
				throw new Error('At least one payment split is required');

			const totalAmount = splits.reduce((s, p) => s + p.amount, 0);
			if (totalAmount <= 0) throw new Error('Total payment amount must be positive');

			for (const split of splits) {
				if (typeof split.amount !== 'number' || split.amount <= 0 || !isFinite(split.amount)) {
					throw new Error('Each split amount must be a positive number');
				}
				const validModes = ['cash', 'upi', 'card', 'other'];
				if (!validModes.includes(split.method)) {
					throw new Error(`Payment mode must be one of: ${validModes.join(', ')}`);
				}
			}

			return await prisma.$transaction(async (tx) => {
				const payments = [];
				for (const split of splits) {
					const method = methodMap[split.method] ?? 'bank';
					const payNo = generatePaymentNo();
					const payment = await tx.payment.create({
						data: {
							paymentNo: payNo,
							tenantId: tenantContext.get().tenantId,
							customerId,
							amount: new Decimal(split.amount),
							method,
							status: 'completed',
							notes,
							reference: reference || null,
							receivedAt: receivedAt ?? new Date(),
						},
					});
					payments.push(payment);
				}

				await tx.customer.update({
					where: { id: customerId },
					data: {
						balance: { decrement: totalAmount },
						totalPayments: { increment: totalAmount },
						lastPaymentAmount: new Decimal(totalAmount),
						lastPaymentDate: receivedAt ?? new Date(),
					},
				});

				// Auto-apply to oldest unpaid invoices (khata-style)
				const pendingInvoices = await tx.invoice.findMany({
					where: {
						customerId,
						tenantId: tenantContext.get().tenantId,
						status: { in: ['pending', 'partial'] },
					},
					orderBy: { invoiceDate: 'asc' },
					select: { id: true, total: true, paidAmount: true },
				});

				let remaining = totalAmount;
				for (const inv of pendingInvoices) {
					if (remaining <= 0) break;
					const invTotal = parseFloat(inv.total.toString());
					const invPaid = parseFloat((inv.paidAmount ?? 0).toString());
					const invDue = Math.round((invTotal - invPaid) * 100) / 100;
					if (invDue <= 0) continue;

					if (remaining >= invDue) {
						await tx.invoice.update({
							where: { id: inv.id },
							data: { status: 'paid', paidAmount: new Decimal(invTotal), paidAt: new Date() },
						});
						remaining = Math.round((remaining - invDue) * 100) / 100;
					} else {
						await tx.invoice.update({
							where: { id: inv.id },
							data: { status: 'partial', paidAmount: new Decimal(invPaid + remaining) },
						});
						remaining = 0;
					}
				}

				logger.info({ customerId, totalAmount, splits, notes }, 'Mixed payment recorded');
				paymentProcessing.inc({ status: 'success' });
				paymentAmount.observe({ customer_id: customerId }, totalAmount);

				return { payments, totalAmount };
			});
		} catch (error) {
			logger.error({ error, customerId, splits }, 'Mixed payment recording failed');
			paymentProcessing.inc({ status: 'error' });
			throw error;
		}
	}

	/**
	 * Manually add a debit to a customer account (they owe more).
	 * No Payment record — just adjust the balance directly.
	 */
	async addCredit(customerId: string, amount: number, description: string) {
		try {
			if (!customerId?.trim()) throw new Error('Customer ID is required');
			if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
				throw new Error('Amount must be a positive number');
			}
			if (!description?.trim()) throw new Error('Description is required');

			const customer = await prisma.customer.update({
				where: { id: customerId },
				data: {
					balance: { increment: amount },
					totalPurchases: { increment: amount },
				},
				include: { invoices: false },
			});

			logger.info({ customerId, amount, description }, 'Manual debit added');
			return customer;
		} catch (error) {
			logger.error({ error, customerId, amount }, 'Add credit failed');
			throw error;
		}
	}

	/**
	 * Set opening balance for a customer.
	 */
	async setOpeningBalance(customerId: string, amount: number) {
		try {
			if (!customerId?.trim()) throw new Error('Customer ID is required');
			if (typeof amount !== 'number' || amount < 0 || !isFinite(amount)) {
				throw new Error('Opening balance must be a non-negative number');
			}

			const customer = await prisma.customer.update({
				where: { id: customerId },
				data: { balance: new Decimal(amount) },
			});

			logger.info({ customerId, amount }, 'Opening balance set');
			return customer;
		} catch (error) {
			logger.error({ error, customerId, amount }, 'Set opening balance failed');
			throw error;
		}
	}

	/**
	 * Get payments received from a customer (replaces ledger query).
	 */
	async getCustomerLedger(customerId: string, limit: number = 50) {
		return await prisma.payment.findMany({
			where: { tenantId: tenantContext.get().tenantId, customerId },
			orderBy: { receivedAt: 'desc' },
			take: limit,
			include: {
				customer: { select: { name: true, phone: true } },
			},
		});
	}

	/**
	 * Summarise payments for a date range.
	 */
	async getLedgerSummary(startDate: Date, endDate: Date) {
		const payments = await prisma.payment.findMany({
			where: {
				tenantId: tenantContext.get().tenantId,
				receivedAt: { gte: startDate, lte: endDate },
				status: 'completed',
			},
			select: { amount: true, method: true },
		});

		let totalCredits = 0;
		let cashPayments = 0;
		let upiPayments = 0;

		for (const p of payments) {
			const amt = parseFloat(p.amount.toString());
			totalCredits += amt;
			if (p.method === 'cash') cashPayments += amt;
			if (p.method === 'upi') upiPayments += amt;
		}

		return {
			totalDebits: 0, // Debits come from invoices now
			totalCredits,
			netBalance: -totalCredits,
			cashPayments,
			upiPayments,
			entryCount: payments.length,
		};
	}

	/**
	 * Get most recent payments across all customers.
	 */
	async getRecentTransactions(limit: number = 20) {
		return await prisma.payment.findMany({
			where: { tenantId: tenantContext.get().tenantId },
			take: limit,
			orderBy: { receivedAt: 'desc' },
			include: {
				customer: { select: { name: true, phone: true } },
			},
		});
	}
}

export const ledgerService = new LedgerService();
