import { FastifyInstance, FastifyRequest } from "fastify";
import { productService, invoiceService } from "@execora/modules";
import { broadcaster } from "../../ws/broadcaster";
import { prisma } from "@execora/infrastructure";

export async function productRoutes(fastify: FastifyInstance) {
  fastify.get("/api/v1/products", async () => {
    const products = await productService.getAllProducts();
    return { products };
  });

  fastify.get("/api/v1/products/low-stock", async () => {
    const products = await productService.getLowStockProducts();
    return { products };
  });

  // ── GET /api/v1/products/expiring?days=30 ────────────────────────────────────
  fastify.get(
    "/api/v1/products/expiring",
    async (request: FastifyRequest<{ Querystring: { days?: string } }>) => {
      const days = Math.min(
        parseInt(String(request.query.days ?? 30), 10) || 30,
        365,
      );
      const batches = await productService.getExpiringBatches(days);
      return { batches };
    },
  );

  // ── GET /api/v1/products/expiry-page?filter=30d ──────────────────────────────
  fastify.get(
    "/api/v1/products/expiry-page",
    async (
      request: FastifyRequest<{
        Querystring: { filter?: string };
      }>,
    ) => {
      const filter = (
        ["expired", "7d", "30d", "90d", "all"].includes(
          request.query.filter ?? "",
        )
          ? request.query.filter
          : "30d"
      ) as "expired" | "7d" | "30d" | "90d" | "all";
      return productService.getExpiryPage(filter);
    },
  );

  // ── PATCH /api/v1/products/batches/:id/write-off ─────────────────────────────
  fastify.patch<{ Params: { id: string } }>(
    "/api/v1/products/batches/:id/write-off",
    async (request, reply) => {
      try {
        const result = await productService.writeOffBatch(request.params.id);
        return result;
      } catch (err: any) {
        return reply.code(404).send({ error: err.message });
      }
    },
  );

  // ── GET /api/v1/products/barcode/:barcode — look up product by barcode/EAN ──
  fastify.get<{ Params: { barcode: string } }>(
    "/api/v1/products/barcode/:barcode",
    async (request, reply) => {
      const { barcode } = request.params;
      const tenantId = request.user!.tenantId;
      const product = await prisma.product.findFirst({
        where: {
          tenantId,
          OR: [{ barcode }, { sku: barcode }],
          isActive: true,
        },
      });
      if (!product)
        return reply
          .code(404)
          .send({ error: "Product not found for this barcode" });
      return { product };
    },
  );

  // ── GET /api/v1/products/search?q=term&limit=8 ────────────────────────────────
  // Prefix matches run first (index-friendly), then any remaining contains matches.
  fastify.get<{ Querystring: { q?: string; limit?: string } }>(
    "/api/v1/products/search",
    async (request, reply) => {
      const q = (request.query.q ?? "").trim();
      const limit = Math.min(
        parseInt(String(request.query.limit ?? 8), 10) || 8,
        20,
      );
      if (!q) return { products: [] };
      const tenantId = request.user!.tenantId;

      // Run startsWith (fast prefix scan) and contains in parallel
      const base = { tenantId, isActive: true as const };
      const [prefixRows, containsRows] = await Promise.all([
        prisma.product.findMany({
          where: {
            ...base,
            OR: [
              { name: { startsWith: q, mode: "insensitive" } },
              { sku: { startsWith: q, mode: "insensitive" } },
            ],
          },
          orderBy: { name: "asc" },
          take: limit,
        }),
        prisma.product.findMany({
          where: {
            ...base,
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
            ],
          },
          orderBy: { name: "asc" },
          take: limit,
        }),
      ]);

      // Merge: prefix first, then any extra contains-only hits
      const seen = new Set(prefixRows.map((p) => p.id));
      const extras = containsRows.filter((p) => !seen.has(p.id));
      const products = [...prefixRows, ...extras].slice(0, limit);

      // Cache at browser level — same query within 10 s is free
      void reply.header("Cache-Control", "private, max-age=10");
      return { products };
    },
  );

  // ── GET /api/v1/products/top-selling?limit=5&days=30 ─────────────────────────
  fastify.get(
    "/api/v1/products/top-selling",
    async (
      request: FastifyRequest<{
        Querystring: { limit?: string; days?: string };
      }>,
    ) => {
      const limit = Math.min(
        parseInt(String(request.query.limit ?? 5), 10) || 5,
        20,
      );
      const days = Math.min(
        parseInt(String(request.query.days ?? 30), 10) || 30,
        365,
      );
      const products = await invoiceService.getTopSelling(limit, days);
      return { products };
    },
  );

  fastify.post(
    "/api/v1/products",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "price", "stock"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 255 },
            description: { type: "string", maxLength: 1000 },
            price: { type: "number", minimum: 0 },
            stock: { type: "integer", minimum: 0 },
            unit: { type: "string", maxLength: 50 },
            category: { type: "string", maxLength: 100 },
            barcode: { type: "string", maxLength: 100 },
            sku: { type: "string", maxLength: 100 },
            wholesalePrice: { type: "number", minimum: 0 },
            priceTier2: { type: "number", minimum: 0 },
            priceTier3: { type: "number", minimum: 0 },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          price: number;
          stock: number;
          description?: string;
          unit?: string;
          category?: string;
          barcode?: string;
          sku?: string;
          wholesalePrice?: number;
          priceTier2?: number;
          priceTier3?: number;
        };
      }>,
      reply,
    ) => {
      const product = await productService.createProduct(request.body);
      return reply.code(201).send({ product });
    },
  );

  // ── PUT /api/v1/products/:id — update product fields ────────────────────────
  fastify.put<{
    Params: { id: string };
    Body: {
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
    };
  }>(
    "/api/v1/products/:id",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1, maxLength: 255 },
            description: { type: "string", maxLength: 1000 },
            price: { type: "number", minimum: 0 },
            stock: { type: "integer", minimum: 0 },
            unit: { type: "string", maxLength: 50 },
            category: { type: "string", maxLength: 100 },
            barcode: { type: "string", maxLength: 100 },
            sku: { type: "string", maxLength: 100 },
            minStock: { type: "integer", minimum: 0 },
            wholesalePrice: { type: "number", minimum: 0 },
            priceTier2: { type: "number", minimum: 0 },
            priceTier3: { type: "number", minimum: 0 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const product = await productService.updateProduct(
        request.params.id,
        request.body,
      );
      if (!product) return reply.code(404).send({ error: "Product not found" });
      const tid = request.user!.tenantId;
      if (tid)
        broadcaster.send(tid, "product:updated", { productId: product.id });
      return { product };
    },
  );

  // ── PATCH /api/v1/products/:id/stock — adjust stock ─────────────────────────
  fastify.patch<{
    Params: { id: string };
    Body: { quantity: number; operation: "add" | "subtract"; reason?: string };
  }>(
    "/api/v1/products/:id/stock",
    {
      schema: {
        body: {
          type: "object",
          required: ["quantity", "operation"],
          properties: {
            quantity: { type: "integer", minimum: 1 },
            operation: { type: "string", enum: ["add", "subtract"] },
            reason: { type: "string", maxLength: 500 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const product = await productService.updateStock(
        request.params.id,
        request.body.quantity,
        request.body.operation,
      );
      const tid = request.user!.tenantId;
      if (tid)
        broadcaster.send(tid, "stock:updated", {
          productId: product.id,
          stock: product.stock,
        });
      return { product };
    },
  );
}
