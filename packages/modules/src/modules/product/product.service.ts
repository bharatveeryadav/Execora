import { prisma } from '@execora/infrastructure';
import { logger } from '@execora/infrastructure';
import { tenantContext } from '@execora/infrastructure';
import { Decimal } from '@prisma/client/runtime/library';

class ProductService {
	/**
	 * Create new product
	 */
	async createProduct(data: {
		name: string;
		description?: string;
		price: number;
		stock: number;
		unit?: string;
		category?: string;
		barcode?: string;
		sku?: string;
		wholesalePrice?: number;
		priceTier2?: number;
		priceTier3?: number;
	}) {
		try {
			if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
				throw new Error('Product name is required and must be a non-empty string');
			}
			if (typeof data.price !== 'number' || data.price < 0 || !isFinite(data.price)) {
				throw new Error('Product price must be a non-negative number');
			}
			if (!Number.isInteger(data.stock) || data.stock < 0) {
				throw new Error('Product stock must be a non-negative integer');
			}

			const product = await prisma.product.create({
				data: {
					tenantId: tenantContext.get().tenantId,
					name: data.name,
					description: data.description,
					category: data.category || 'general',
					price: new Decimal(data.price),
					stock: data.stock,
					unit: data.unit || 'piece',
					barcode: data.barcode || null,
					sku: data.sku || null,
					wholesalePrice: data.wholesalePrice != null ? new Decimal(data.wholesalePrice) : null,
					priceTier2: data.priceTier2 != null ? new Decimal(data.priceTier2) : null,
					priceTier3: data.priceTier3 != null ? new Decimal(data.priceTier3) : null,
				},
			});

			logger.info({ productId: product.id, name: product.name }, 'Product created');
			return product;
		} catch (error) {
			logger.error({ error, data }, 'Product creation failed');
			throw error;
		}
	}

	/**
	 * Search products by name — scoped to current tenant
	 */
	async searchProducts(query: string) {
		const { tenantId } = tenantContext.get();
		return await prisma.product.findMany({
			where: {
				tenantId,
				isActive: true,
				name: {
					contains: query,
					mode: 'insensitive',
				},
			},
			take: 10,
		});
	}

	/**
	 * Get product by ID — scoped to current tenant to prevent cross-tenant reads
	 */
	async getProductById(id: string) {
		const { tenantId } = tenantContext.get();
		return await prisma.product.findFirst({
			where: { id, tenantId },
		});
	}

	/**
	 * Update product stock — scoped to current tenant
	 */
	async updateStock(productId: string, quantity: number, operation: 'add' | 'subtract') {
		const { tenantId } = tenantContext.get();
		try {
			if (operation === 'subtract') {
				const current = await prisma.product.findFirst({
					where: { id: productId, tenantId },
					select: { stock: true, name: true },
				});
				if (!current) throw new Error('Product not found');
				if (current.stock < quantity) {
					throw new Error(`Insufficient stock: only ${current.stock} available for "${current.name}"`);
				}
			}

			const product = await prisma.product.update({
				where: { id: productId },
				data: {
					stock: operation === 'add' ? { increment: quantity } : { decrement: quantity },
				},
			});

			logger.info({ productId, quantity, operation }, 'Stock updated');
			return product;
		} catch (error) {
			logger.error({ error, productId, quantity }, 'Stock update failed');
			throw error;
		}
	}

	/**
	 * Get low stock products for the current tenant.
	 * A product is considered low-stock when its stock is at or below its minStock threshold.
	 */
	async getLowStockProducts() {
		const { tenantId } = tenantContext.get();
		// Use a raw query so we can compare stock against the per-product minStock column
		const products = await prisma.$queryRaw<
			Array<{
				id: string;
				name: string;
				category: string;
				description: string | null;
				price: string;
				unit: string;
				stock: number;
				min_stock: number;
				is_active: boolean;
				created_at: Date;
				updated_at: Date;
			}>
		>`
      SELECT id, name, category, description, price::text, unit, stock, min_stock, is_active, created_at, updated_at
      FROM products
      WHERE tenant_id = ${tenantId}
        AND is_active = true
        AND stock <= min_stock
      ORDER BY stock ASC
    `;
		return products.map((p) => ({
			id: p.id,
			name: p.name,
			category: p.category,
			description: p.description,
			price: p.price,
			unit: p.unit,
			stock: p.stock,
			minStock: p.min_stock,
			isActive: p.is_active,
			createdAt: p.created_at,
			updatedAt: p.updated_at,
		}));
	}

	/**
	 * Get all active products for the current tenant.
	 */
	async getAllProducts() {
		return await prisma.product.findMany({
			where: { tenantId: tenantContext.get().tenantId, isActive: true },
			orderBy: { name: 'asc' },
		});
	}

	/**
	 * Update product price — scoped to current tenant
	 */
	async updatePrice(productId: string, newPrice: number) {
		const { tenantId } = tenantContext.get();
		const existing = await prisma.product.findFirst({ where: { id: productId, tenantId } });
		if (!existing) throw new Error('Product not found');
		return await prisma.product.update({
			where: { id: productId },
			data: {
				price: new Decimal(newPrice),
			},
		});
	}

	/**
	 * Update product fields (name, price, stock, unit, category, description).
	 * Only updates fields that are explicitly provided.
	 * Scoped to current tenant — silently no-ops if product belongs to another tenant.
	 */
	async updateProduct(
		productId: string,
		data: {
			name?: string;
			price?: number;
			stock?: number;
			unit?: string;
			category?: string;
			description?: string;
			barcode?: string;
			sku?: string;
			minStock?: number;
			wholesalePrice?: number;
			priceTier2?: number;
			priceTier3?: number;
		}
	) {
		const updateData: Record<string, unknown> = {};
		if (data.name !== undefined) updateData.name = data.name;
		if (data.price !== undefined) updateData.price = new Decimal(data.price);
		if (data.stock !== undefined) updateData.stock = data.stock;
		if (data.unit !== undefined) updateData.unit = data.unit;
		if (data.category !== undefined) updateData.category = data.category;
		if (data.description !== undefined) updateData.description = data.description;
		if (data.barcode !== undefined) updateData.barcode = data.barcode || null;
		if (data.sku !== undefined) updateData.sku = data.sku || null;
		if (data.minStock !== undefined) updateData.minStock = data.minStock;
		if (data.wholesalePrice !== undefined) updateData.wholesalePrice = data.wholesalePrice != null ? new Decimal(data.wholesalePrice) : null;
		if (data.priceTier2 !== undefined) updateData.priceTier2 = data.priceTier2 != null ? new Decimal(data.priceTier2) : null;
		if (data.priceTier3 !== undefined) updateData.priceTier3 = data.priceTier3 != null ? new Decimal(data.priceTier3) : null;

		const { tenantId } = tenantContext.get();
		const existing = await prisma.product.findFirst({ where: { id: productId, tenantId } });
		if (!existing) throw new Error('Product not found');
		const product = await prisma.product.update({
			where: { id: productId },
			data: updateData as Parameters<typeof prisma.product.update>[0]['data'],
		});
		logger.info({ productId, fields: Object.keys(updateData) }, 'Product updated');
		return product;
	}

	/**
	 * Get product stock — scoped to current tenant
	 */
	async getStock(productName: string): Promise<number> {
		const { tenantId } = tenantContext.get();
		const product = await prisma.product.findFirst({
			where: {
				tenantId,
				name: {
					contains: productName,
					mode: 'insensitive',
				},
			},
			select: { stock: true },
		});

		return product?.stock || 0;
	}

	/**
	 * Returns products with batches expiring within `days` days.
	 * Used for expiry alert widget on the dashboard.
	 */
	async getExpiringBatches(days = 30) {
		const now = new Date();
		const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
		return prisma.productBatch.findMany({
			where: {
				tenantId: tenantContext.get().tenantId,
				expiryDate: { gte: now, lte: future },
				quantity: { gt: 0 },
			},
			include: { product: { select: { name: true, unit: true } } },
			orderBy: { expiryDate: 'asc' },
			take: 20,
		});
	}

	/**
	 * Full expiry management page data.
	 * filter: 'expired' | '7d' | '30d' | '90d' | 'all'
	 */
	async getExpiryPage(filter: 'expired' | '7d' | '30d' | '90d' | 'all' = '30d') {
		const { tenantId } = tenantContext.get();
		const now = new Date();
		const days = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

		let where: Record<string, unknown> = { tenantId };

		if (filter === 'expired') {
			where.expiryDate = { lt: now };
		} else if (filter === '7d') {
			where.expiryDate = { gte: now, lte: days(7) };
			where.quantity = { gt: 0 };
		} else if (filter === '30d') {
			where.expiryDate = { gte: now, lte: days(30) };
			where.quantity = { gt: 0 };
		} else if (filter === '90d') {
			where.expiryDate = { gte: now, lte: days(90) };
			where.quantity = { gt: 0 };
		} else {
			// all — still only show batches with stock
			where.quantity = { gt: 0 };
		}

		const batches = await prisma.productBatch.findMany({
			where,
			include: {
				product: { select: { name: true, unit: true, category: true } },
			},
			orderBy: { expiryDate: 'asc' },
		});

		// Summary stats (always computed across all batches)
		const all = await prisma.productBatch.findMany({
			where: { tenantId },
			select: { expiryDate: true, quantity: true, purchasePrice: true },
		});
		const expiredCount = all.filter((b) => b.expiryDate < now && b.quantity > 0).length;
		const critical7 = all.filter((b) => b.expiryDate >= now && b.expiryDate <= days(7) && b.quantity > 0).length;
		const warning30 = all.filter((b) => b.expiryDate >= now && b.expiryDate <= days(30) && b.quantity > 0).length;
		const valueAtRisk = all
			.filter((b) => b.expiryDate <= days(30) && b.quantity > 0)
			.reduce((sum, b) => sum + b.quantity * Number(b.purchasePrice ?? 0), 0);

		return {
			batches,
			summary: { expiredCount, critical7, warning30, valueAtRisk },
		};
	}

	/**
	 * Write off a batch (mark qty = 0, status = written_off).
	 */
	async writeOffBatch(batchId: string) {
		const { tenantId } = tenantContext.get();
		const batch = await prisma.productBatch.findFirst({ where: { id: batchId, tenantId } });
		if (!batch) throw new Error('Batch not found');
		await prisma.productBatch.update({
			where: { id: batchId },
			data: { quantity: 0, status: 'written_off' },
		});
		// Log stock movement
		const productData = await prisma.product.findUnique({
			where: { id: batch.productId },
			select: { stock: true },
		});
		const prevStock = productData?.stock ?? 0;
		await prisma.stockMovement
			.create({
				data: {
					tenantId,
					productId: batch.productId,
					batchId: batch.id,
					type: 'expired',
					quantity: -batch.quantity,
					previousStock: prevStock,
					newStock: Math.max(0, prevStock - batch.quantity),
					notes: `Write-off: batch ${batch.batchNo} (expiry ${batch.expiryDate.toISOString().split('T')[0]})`,
				},
			})
			.catch(() => {
				/* stockMovement table may not exist yet */
			});
		return { ok: true, batchNo: batch.batchNo, qtyWrittenOff: batch.quantity };
	}
}

export const productService = new ProductService();
