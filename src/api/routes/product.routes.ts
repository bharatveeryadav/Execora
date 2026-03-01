import { FastifyInstance, FastifyRequest } from 'fastify';
import { productService } from '../../modules/product/product.service';

export async function productRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/products', async () => {
    const products = await productService.getAllProducts();
    return { products };
  });

  fastify.get('/api/v1/products/low-stock', async () => {
    const products = await productService.getLowStockProducts();
    return { products };
  });

  fastify.post('/api/v1/products', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'price', 'stock'],
        properties: {
          name:        { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', maxLength: 1000 },
          price:       { type: 'number', minimum: 0 },
          stock:       { type: 'integer', minimum: 0 },
          unit:        { type: 'string', maxLength: 50 },
        },
        additionalProperties: false,
      },
    },
  }, async (request: FastifyRequest<{
    Body: { name: string; price: number; stock: number; description?: string; unit?: string };
  }>, reply) => {
    const product = await productService.createProduct(request.body);
    return reply.code(201).send({ product });
  });
}
