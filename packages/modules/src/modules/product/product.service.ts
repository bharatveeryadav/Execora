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
          tenantId:    tenantContext.get().tenantId,
          name:        data.name,
          description: data.description,
          category:    'general',
          price:       new Decimal(data.price),
          stock:       data.stock,
          unit:        data.unit || 'piece',
        } as any,
      });

      logger.info({ productId: product.id, name: product.name }, 'Product created');
      return product;
    } catch (error) {
      logger.error({ error, data }, 'Product creation failed');
      throw error;
    }
  }

  /**
   * Search products by name
   */
  async searchProducts(query: string) {
    return await prisma.product.findMany({
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
  async getProductById(id: string) {
    return await prisma.product.findUnique({
      where: { id },
    });
  }

  /**
   * Update product stock
   */
  async updateStock(productId: string, quantity: number, operation: 'add' | 'subtract') {
    try {
      if (operation === 'subtract') {
        const current = await prisma.product.findUnique({
          where: { id: productId },
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
          stock:
            operation === 'add'
              ? { increment: quantity }
              : { decrement: quantity },
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
    const products = await prisma.$queryRaw<Array<{
      id: string; name: string; category: string; description: string | null;
      price: string; unit: string; stock: number; min_stock: number;
      is_active: boolean; created_at: Date; updated_at: Date;
    }>>`
      SELECT id, name, category, description, price::text, unit, stock, min_stock, is_active, created_at, updated_at
      FROM products
      WHERE tenant_id = ${tenantId}
        AND is_active = true
        AND stock <= min_stock
      ORDER BY stock ASC
    `;
    return products.map((p) => ({
      id: p.id, name: p.name, category: p.category, description: p.description,
      price: p.price, unit: p.unit, stock: p.stock, minStock: p.min_stock,
      isActive: p.is_active, createdAt: p.created_at, updatedAt: p.updated_at,
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
   * Update product price
   */
  async updatePrice(productId: string, newPrice: number) {
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
    }
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined)        updateData.name        = data.name;
    if (data.price !== undefined)       updateData.price       = new Decimal(data.price);
    if (data.stock !== undefined)       updateData.stock       = data.stock;
    if (data.unit !== undefined)        updateData.unit        = data.unit;
    if (data.category !== undefined)    updateData.category    = data.category;
    if (data.description !== undefined) updateData.description = data.description;

    const product = await prisma.product.update({
      where: { id: productId },
      data: updateData as any,
    });
    logger.info({ productId, fields: Object.keys(updateData) }, 'Product updated');
    return product;
  }

  /**
   * Get product stock
   */
  async getStock(productName: string): Promise<number> {
    const product = await prisma.product.findFirst({
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

export const productService = new ProductService();
