import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
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
          name: data.name,
          description: data.description,
          price: new Decimal(data.price),
          stock: data.stock,
          unit: data.unit || 'piece',
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
   * Get low stock products
   */
  async getLowStockProducts(threshold: number = 5) {
    return await prisma.product.findMany({
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
    return await prisma.product.findMany({
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
