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
                    category: 'general',
                    price: new library_1.Decimal(data.price),
                    stock: data.stock,
                    unit: data.unit || 'piece',
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
     * Search products by name
     */
    async searchProducts(query) {
        return await infrastructure_1.prisma.product.findMany({
            where: {
                name: {
                    contains: query,
                    mode: 'insensitive',
                },
            },
            take: 10,
        });
    }
    /**
     * Get product by ID
     */
    async getProductById(id) {
        return await infrastructure_1.prisma.product.findUnique({
            where: { id },
        });
    }
    /**
     * Update product stock
     */
    async updateStock(productId, quantity, operation) {
        try {
            const product = await infrastructure_1.prisma.product.update({
                where: { id: productId },
                data: {
                    stock: operation === 'add'
                        ? { increment: quantity }
                        : { decrement: quantity },
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
     * Get low stock products
     */
    async getLowStockProducts(threshold = 5) {
        return await infrastructure_1.prisma.product.findMany({
            where: {
                stock: {
                    lte: threshold,
                },
            },
            orderBy: { stock: 'asc' },
        });
    }
    /**
     * Get all products
     */
    async getAllProducts() {
        return await infrastructure_1.prisma.product.findMany({
            orderBy: { name: 'asc' },
        });
    }
    /**
     * Update product price
     */
    async updatePrice(productId, newPrice) {
        return await infrastructure_1.prisma.product.update({
            where: { id: productId },
            data: {
                price: new library_1.Decimal(newPrice),
            },
        });
    }
    /**
     * Get product stock
     */
    async getStock(productName) {
        const product = await infrastructure_1.prisma.product.findFirst({
            where: {
                name: {
                    contains: productName,
                    mode: 'insensitive',
                },
            },
            select: { stock: true },
        });
        return product?.stock || 0;
    }
}
exports.productService = new ProductService();
//# sourceMappingURL=product.service.js.map