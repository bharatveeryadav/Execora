import { prisma } from '@execora/infrastructure';
import { Prisma } from '@prisma/client';
import type { CreateDraftInput, UpdateDraftInput, ListDraftsInput } from './types';

// ─── private: execute the real DB write for a confirmed draft ────────────────

async function executeDraft(draft: {
	id: string;
	type: string;
	data: unknown;
	tenantId: string;
}): Promise<unknown> {
	const data = draft.data as Record<string, unknown>;
	const tid = draft.tenantId;

	switch (draft.type) {
		case 'purchase_entry': {
			const expense = await prisma.expense.create({
				data: {
					tenantId: tid,
					type: 'purchase',
					category: (data.category as string) ?? 'Purchases',
					amount: new Prisma.Decimal((data.amount as number) ?? 0),
					itemName: (data.itemName as string) ?? null,
					supplier: (data.supplier as string) ?? null,
					quantity: data.quantity != null ? new Prisma.Decimal(data.quantity as number) : null,
					unit: (data.unit as string) ?? null,
					ratePerUnit: data.ratePerUnit != null ? new Prisma.Decimal(data.ratePerUnit as number) : null,
					note: (data.note as string) ?? null,
					batchNo: (data.batchNo as string) ?? null,
					expiryDate: data.expiryDate ? new Date(data.expiryDate as string) : null,
					date: data.date ? new Date(data.date as string) : new Date(),
				},
			});
			return { expense };
		}

		case 'product': {
			const product = await prisma.product.create({
				data: {
					tenantId: tid,
					name: data.name as string,
					category: (data.category as string) ?? 'General',
					subCategory: (data.subCategory as string) ?? null,
					price: new Prisma.Decimal((data.price as number) ?? 0),
					mrp: data.mrp != null ? new Prisma.Decimal(data.mrp as number) : null,
					cost: data.cost != null ? new Prisma.Decimal(data.cost as number) : null,
					wholesalePrice: data.wholesalePrice != null ? new Prisma.Decimal(data.wholesalePrice as number) : null,
					priceTier2: data.priceTier2 != null ? new Prisma.Decimal(data.priceTier2 as number) : null,
					priceTier3: data.priceTier3 != null ? new Prisma.Decimal(data.priceTier3 as number) : null,
					unit: (data.unit as string) ?? 'pcs',
					sku: (data.sku as string) ?? null,
					barcode: (data.barcode as string) ?? null,
					stock: (data.stock as number) ?? 0,
					minStock: (data.minStock as number) ?? 5,
					description: (data.description as string) ?? null,
					hsnCode: (data.hsnCode as string) ?? null,
					gstRate: data.gstRate != null ? new Prisma.Decimal(data.gstRate as number) : new Prisma.Decimal(0),
					imageUrl: (data.imageUrl as string) ?? null,
					preferredSupplier: (data.preferredSupplier as string) ?? null,
				},
			});
			return { product };
		}

		case 'stock_adjustment': {
			const { productId, qty, direction } = data as {
				productId: string;
				qty: number;
				direction: 'in' | 'out';
			};
			const delta = direction === 'out' ? -Math.abs(qty) : Math.abs(qty);
			const product = await prisma.product.update({
				where: { id: productId },
				data: { stock: { increment: delta } },
			});
			return { product };
		}

		default:
			throw new Error(`Unknown draft type: ${draft.type}`);
	}
}

// ─── public module functions ─────────────────────────────────────────────────

export async function createDraft(tenantId: string, userId: string, input: CreateDraftInput) {
	return prisma.draft.create({
		data: {
			tenantId,
			type: input.type,
			title: input.title ?? null,
			data: input.data as Prisma.InputJsonValue,
			notes: input.notes ?? null,
			createdBy: userId,
		},
	});
}

export async function listDrafts(tenantId: string, opts: ListDraftsInput) {
	const { type, status = 'pending', limit = 100 } = opts;
	const drafts = await prisma.draft.findMany({
		where: {
			tenantId,
			...(type ? { type } : {}),
			status,
		},
		orderBy: { createdAt: 'desc' },
		take: Math.min(limit, 200),
	});
	return { drafts, count: drafts.length };
}

export async function getDraft(tenantId: string, id: string) {
	return prisma.draft.findFirst({ where: { id, tenantId } });
}

export async function updateDraft(tenantId: string, id: string, patch: UpdateDraftInput) {
	const existing = await prisma.draft.findFirst({ where: { id, tenantId } });
	if (!existing) throw new Error('Draft not found');
	if (existing.status !== 'pending') throw new Error(`Draft is already ${existing.status}`);
	return prisma.draft.update({
		where: { id: existing.id },
		data: {
			...(patch.data !== undefined ? { data: patch.data as Prisma.InputJsonValue } : {}),
			...(patch.title !== undefined ? { title: patch.title } : {}),
			...(patch.notes !== undefined ? { notes: patch.notes } : {}),
		},
	});
}

/** Executes the deferred DB write and marks the draft as confirmed. */
export async function confirmDraft(tenantId: string, id: string) {
	const existing = await prisma.draft.findFirst({ where: { id, tenantId } });
	if (!existing) throw new Error('Draft not found');
	if (existing.status !== 'pending') throw new Error(`Draft is already ${existing.status}`);
	const result = await executeDraft({
		id: existing.id,
		type: existing.type,
		data: existing.data,
		tenantId,
	});
	const draft = await prisma.draft.update({
		where: { id: existing.id },
		data: { status: 'confirmed', confirmedAt: new Date() },
	});
	return { draft, result };
}

export async function discardDraft(tenantId: string, id: string) {
	const existing = await prisma.draft.findFirst({ where: { id, tenantId } });
	if (!existing) throw new Error('Draft not found');
	return prisma.draft.update({
		where: { id: existing.id },
		data: { status: 'discarded', discardedAt: new Date() },
	});
}
