"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productService = void 0;
const infrastructure_1 = require("@execora/infrastructure");
const infrastructure_2 = require("@execora/infrastructure");
const infrastructure_3 = require("@execora/infrastructure");
const library_1 = require("@prisma/client/runtime/library");
class ProductService {
    /**
     * Create new product
     */
    async createProduct(data) {
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
            const product = await infrastructure_1.prisma.product.create({
                data: {
                    tenantId: infrastructure_3.tenantContext.get().tenantId,
                    name: data.name,
                    description: data.description,
                    category: data.category || 'general',
                    price: new library_1.Decimal(data.price),
                    stock: data.stock,
                    unit: data.unit || 'piece',
                    barcode: data.barcode || null,
                    sku: data.sku || null,
                    wholesalePrice: data.wholesalePrice != null ? new library_1.Decimal(data.wholesalePrice) : null,
                    priceTier2: data.priceTier2 != null ? new library_1.Decimal(data.priceTier2) : null,
                    priceTier3: data.priceTier3 != null ? new library_1.Decimal(data.priceTier3) : null,
                },
            });
            infrastructure_2.logger.info({ productId: product.id, name: product.name }, 'Product created');
            return product;
        }
        catch (error) {
            infrastructure_2.logger.error({ error, data }, 'Product creation failed');
            throw error;
        }
    }
    /**
     * Search products by name — scoped to current tenant
     */
    async searchProducts(query) {
        const { tenantId } = infrastructure_3.tenantContext.get();
        return await infrastructure_1.prisma.product.findMany({
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
    async getProductById(id) {
        const { tenantId } = infrastructure_3.tenantContext.get();
        return await infrastructure_1.prisma.product.findFirst({
            where: { id, tenantId },
        });
    }
    /**
     * Update product stock — scoped to current tenant
     */
    async updateStock(productId, quantity, operation) {
        const { tenantId } = infrastructure_3.tenantContext.get();
        try {
            if (operation === 'subtract') {
                const current = await infrastructure_1.prisma.product.findFirst({
                    where: { id: productId, tenantId },
                    select: { stock: true, name: true },
                });
                if (!current)
                    throw new Error('Product not found');
                if (current.stock < quantity) {
                    throw new Error(`Insufficient stock: only ${current.stock} available for "${current.name}"`);
                }
            }
            const product = await infrastructure_1.prisma.product.update({
                where: { id: productId },
                data: {
                    stock: operation === 'add' ? { increment: quantity } : { decrement: quantity },
                },
            });
            infrastructure_2.logger.info({ productId, quantity, operation }, 'Stock updated');
            return product;
        }
        catch (error) {
            infrastructure_2.logger.error({ error, productId, quantity }, 'Stock update failed');
            throw error;
        }
    }
    /**
     * Get low stock products for the current tenant.
     * A product is considered low-stock when its stock is at or below its minStock threshold.
     */
    async getLowStockProducts() {
        const { tenantId } = infrastructure_3.tenantContext.get();
        // Use a raw query so we can compare stock against the per-product minStock column
        const products = await infrastructure_1.prisma.$queryRaw `
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
        return await infrastructure_1.prisma.product.findMany({
            where: { tenantId: infrastructure_3.tenantContext.get().tenantId, isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    /**
     * Get products with pagination (Sprint 27).
     */
    async getProductsPaginated(page = 1, limit = 50) {
        const tenantId = infrastructure_3.tenantContext.get().tenantId;
        const skip = Math.max(0, (page - 1) * limit);
        const take = Math.min(Math.max(1, limit), 500);
        const [products, total] = await Promise.all([
            infrastructure_1.prisma.product.findMany({
                where: { tenantId, isActive: true },
                orderBy: { name: 'asc' },
                skip,
                take,
            }),
            infrastructure_1.prisma.product.count({ where: { tenantId, isActive: true } }),
        ]);
        return {
            products,
            total,
            page,
            limit: take,
            hasMore: skip + products.length < total,
        };
    }
    /**
     * Update product price — scoped to current tenant
     */
    async updatePrice(productId, newPrice) {
        const { tenantId } = infrastructure_3.tenantContext.get();
        const existing = await infrastructure_1.prisma.product.findFirst({ where: { id: productId, tenantId } });
        if (!existing)
            throw new Error('Product not found');
        return await infrastructure_1.prisma.product.update({
            where: { id: productId },
            data: {
                price: new library_1.Decimal(newPrice),
            },
        });
    }
    /**
     * Update product fields (name, price, stock, unit, category, description).
     * Only updates fields that are explicitly provided.
     * Scoped to current tenant — silently no-ops if product belongs to another tenant.
     */
    async updateProduct(productId, data) {
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.price !== undefined)
            updateData.price = new library_1.Decimal(data.price);
        if (data.stock !== undefined)
            updateData.stock = data.stock;
        if (data.unit !== undefined)
            updateData.unit = data.unit;
        if (data.category !== undefined)
            updateData.category = data.category;
        if (data.description !== undefined)
            updateData.description = data.description;
        if (data.barcode !== undefined)
            updateData.barcode = data.barcode || null;
        if (data.sku !== undefined)
            updateData.sku = data.sku || null;
        if (data.minStock !== undefined)
            updateData.minStock = data.minStock;
        if (data.wholesalePrice !== undefined)
            updateData.wholesalePrice = data.wholesalePrice != null ? new library_1.Decimal(data.wholesalePrice) : null;
        if (data.priceTier2 !== undefined)
            updateData.priceTier2 = data.priceTier2 != null ? new library_1.Decimal(data.priceTier2) : null;
        if (data.priceTier3 !== undefined)
            updateData.priceTier3 = data.priceTier3 != null ? new library_1.Decimal(data.priceTier3) : null;
        if (data.isFeatured !== undefined)
            updateData.isFeatured = data.isFeatured;
        if (data.gstRate !== undefined)
            updateData.gstRate = new library_1.Decimal(data.gstRate);
        if (data.hsnCode !== undefined)
            updateData.hsnCode = data.hsnCode || null;
        if (data.cost !== undefined)
            updateData.cost = data.cost != null ? new library_1.Decimal(data.cost) : null;
        if (data.mrp !== undefined)
            updateData.mrp = data.mrp != null ? new library_1.Decimal(data.mrp) : null;
        const { tenantId } = infrastructure_3.tenantContext.get();
        const existing = await infrastructure_1.prisma.product.findFirst({ where: { id: productId, tenantId } });
        if (!existing)
            throw new Error('Product not found');
        const product = await infrastructure_1.prisma.product.update({
            where: { id: productId },
            data: updateData,
        });
        infrastructure_2.logger.info({ productId, fields: Object.keys(updateData) }, 'Product updated');
        return product;
    }
    /**
     * Get product stock — scoped to current tenant
     */
    async getStock(productName) {
        const { tenantId } = infrastructure_3.tenantContext.get();
        const product = await infrastructure_1.prisma.product.findFirst({
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
        return infrastructure_1.prisma.productBatch.findMany({
            where: {
                tenantId: infrastructure_3.tenantContext.get().tenantId,
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
    async getExpiryPage(filter = '30d') {
        const { tenantId } = infrastructure_3.tenantContext.get();
        const now = new Date();
        const days = (n) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);
        let where = { tenantId };
        if (filter === 'expired') {
            where.expiryDate = { lt: now };
        }
        else if (filter === '7d') {
            where.expiryDate = { gte: now, lte: days(7) };
            where.quantity = { gt: 0 };
        }
        else if (filter === '30d') {
            where.expiryDate = { gte: now, lte: days(30) };
            where.quantity = { gt: 0 };
        }
        else if (filter === '90d') {
            where.expiryDate = { gte: now, lte: days(90) };
            where.quantity = { gt: 0 };
        }
        else {
            // all — still only show batches with stock
            where.quantity = { gt: 0 };
        }
        const batches = await infrastructure_1.prisma.productBatch.findMany({
            where,
            include: {
                product: { select: { name: true, unit: true, category: true } },
            },
            orderBy: { expiryDate: 'asc' },
        });
        // Summary stats (always computed across all batches)
        const all = await infrastructure_1.prisma.productBatch.findMany({
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
    async writeOffBatch(batchId) {
        const { tenantId } = infrastructure_3.tenantContext.get();
        const batch = await infrastructure_1.prisma.productBatch.findFirst({ where: { id: batchId, tenantId } });
        if (!batch)
            throw new Error('Batch not found');
        await infrastructure_1.prisma.productBatch.update({
            where: { id: batchId },
            data: { quantity: 0, status: 'written_off' },
        });
        // Log stock movement
        const productData = await infrastructure_1.prisma.product.findUnique({
            where: { id: batch.productId },
            select: { stock: true },
        });
        const prevStock = productData?.stock ?? 0;
        await infrastructure_1.prisma.stockMovement
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
exports.productService = new ProductService();
//# sourceMappingURL=product.service.js.map