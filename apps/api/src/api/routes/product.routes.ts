import { FastifyInstance, FastifyRequest } from "fastify";
import { productService, invoiceService } from "@execora/modules";
import { broadcaster } from "../../ws/broadcaster";
import { prisma, minioClient, logger } from "@execora/infrastructure";

export async function productRoutes(fastify: FastifyInstance) {
  // ── GET /api/v1/products — list products (paginated when page/limit provided) ─
  fastify.get(
    "/api/v1/products",
    async (request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>) => {
      const pageParam = request.query.page;
      const limitParam = request.query.limit;
      if (pageParam != null || limitParam != null) {
        const page = Math.max(1, parseInt(String(pageParam ?? 1), 10) || 1);
        const limit = Math.min(500, Math.max(1, parseInt(String(limitParam ?? 50), 10) || 50));
        const result = await productService.getProductsPaginated(page, limit);
        return result;
      }
      const products = await productService.getAllProducts();
      return { products };
    },
  );

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

  // ── POST /api/v1/products/import — bulk import from CSV ─────────────────────
  // CSV columns: name, sku, barcode, category, price, stock, unit, minStock
  fastify.post("/api/v1/products/import", async (request, reply) => {
    const data = await (request as any).file();
    if (!data)
      return reply.code(400).send({ error: "No file provided" });
    const contentType = (data.mimetype as string) || "";
    if (
      !contentType.includes("text/csv") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/vnd.ms-excel")
    ) {
      return reply
        .code(400)
        .send({ error: "File must be CSV (text/csv or .csv)" });
    }
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString("utf-8");
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2)
      return reply.code(400).send({ error: "CSV must have header + at least 1 row" });

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const nameIdx = header.findIndex((h) => h === "name" || h === "item" || h === "product");
    const priceIdx = header.findIndex((h) => h === "price" || h === "sale price" || h === "selling price");
    const stockIdx = header.findIndex((h) => h === "stock" || h === "quantity" || h === "qty");
    const skuIdx = header.findIndex((h) => h === "sku" || h === "code");
    const barcodeIdx = header.findIndex((h) => h === "barcode" || h === "ean");
    const categoryIdx = header.findIndex((h) => h === "category");
    const unitIdx = header.findIndex((h) => h === "unit");
    const minStockIdx = header.findIndex((h) => h === "minstock" || h === "min stock" || h === "reorder");

    if (nameIdx < 0 || priceIdx < 0)
      return reply.code(400).send({ error: "CSV must have 'name' and 'price' columns" });

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') inQuotes = !inQuotes;
        else if ((c === "," && !inQuotes) || c === "\t") {
          result.push(cur.trim());
          cur = "";
        } else cur += c;
      }
      result.push(cur.trim());
      return result;
    };

    let imported = 0;
    const errors: Array<{ row: number; message: string }> = [];
    const tenantId = request.user!.tenantId;

    for (let i = 1; i < lines.length && i <= 1001; i++) {
      const row = parseRow(lines[i]);
      const name = row[nameIdx]?.trim();
      const priceStr = row[priceIdx] ?? "0";
      const price = parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0;
      const stock = parseInt(String(row[stockIdx] ?? "0").replace(/\D/g, ""), 10) || 0;
      if (!name) {
        errors.push({ row: i + 1, message: "Missing name" });
        continue;
      }
      try {
        await prisma.product.create({
          data: {
            tenantId,
            name,
            price,
            stock,
            unit: (row[unitIdx] ?? "piece").trim() || "piece",
            category: (row[categoryIdx] ?? "general").trim() || "general",
            sku: row[skuIdx]?.trim() || null,
            barcode: row[barcodeIdx]?.trim() || null,
            minStock: minStockIdx >= 0 ? parseInt(String(row[minStockIdx] ?? "5").replace(/\D/g, ""), 10) || 5 : 5,
          },
        });
        imported++;
      } catch (err: any) {
        errors.push({ row: i + 1, message: err?.message ?? "Create failed" });
      }
    }

    logger.info({ tenantId, imported, errors: errors.length }, "Product import completed");
    broadcaster.send(tenantId, "product:updated", { productId: "import" });
    return reply.send({ imported, failed: errors.length, errors: errors.slice(0, 20) });
  });

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
      isFeatured?: boolean;
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
            isFeatured: { type: "boolean" },
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

  // ── POST /api/v1/products/:id/image — upload product image to MinIO ─────────
  // Multipart form. Stores at products/{tenantId}/{productId}/{timestamp}.{ext}
  fastify.post<{ Params: { id: string } }>(
    "/api/v1/products/:id/image",
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = request.user!.tenantId;
      const product = await prisma.product.findFirst({
        where: { id, tenantId },
        select: { id: true, imageUrl: true },
      });
      if (!product)
        return reply.code(404).send({ error: "Product not found" });

      const data = await (request as any).file();
      if (!data)
        return reply.code(400).send({ error: "No image file provided" });
      const mimeType = (data.mimetype as string) || "image/jpeg";
      if (!mimeType.startsWith("image/")) {
        return reply
          .code(400)
          .send({ error: "File must be an image (jpeg, png, webp)" });
      }
      const chunks: Buffer[] = [];
      let totalSize = 0;
      for await (const chunk of data.file) {
        totalSize += chunk.length;
        if (totalSize > 5 * 1024 * 1024) {
          return reply.code(413).send({ error: "Image too large (max 5 MB)" });
        }
        chunks.push(chunk);
      }
      const imageBuffer = Buffer.concat(chunks);
      const ext = mimeType.split("/")[1] ?? "jpg";
      const ts = Date.now();
      const imageKey = `products/${tenantId}/${id}/${ts}.${ext}`;
      await minioClient.uploadFile(imageKey, imageBuffer, {
        contentType: mimeType,
      });
      await prisma.product.update({
        where: { id },
        data: { imageUrl: imageKey },
      });
      logger.info({ productId: id, imageKey }, "Product image uploaded");
      broadcaster.send(tenantId, "product:updated", { productId: id });
      return reply.send({ imageUrl: imageKey });
    },
  );

  // ── GET /api/v1/products/image-urls?ids=id1,id2,... — batch presigned URLs ───
  // For list views: returns { [productId]: url } for up to 50 ids. Efficient for 100k+ catalogs.
  fastify.get<{ Querystring: { ids?: string } }>(
    "/api/v1/products/image-urls",
    async (request, reply) => {
      const idsParam = request.query.ids ?? "";
      const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50);
      if (ids.length === 0) return reply.send({});
      const tenantId = request.user!.tenantId;
      const products = await prisma.product.findMany({
        where: { id: { in: ids }, tenantId },
        select: { id: true, imageUrl: true },
      });
      const result: Record<string, string> = {};
      await Promise.all(
        products.map(async (p) => {
          const imageUrl = p.imageUrl;
          if (!imageUrl) return;
          if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
            result[p.id] = imageUrl;
            return;
          }
          result[p.id] = await minioClient.getPresignedUrl(imageUrl, 3600);
        }),
      );
      void reply.header("Cache-Control", "private, max-age=3500"); // ~1h minus buffer
      return reply.send(result);
    },
  );

  // ── GET /api/v1/products/:id/image-url — get presigned URL for product image ─
  // Returns { url } for display. If imageUrl is external (http), returns as-is.
  fastify.get<{ Params: { id: string } }>(
    "/api/v1/products/:id/image-url",
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = request.user!.tenantId;
      const product = await prisma.product.findFirst({
        where: { id, tenantId },
        select: { imageUrl: true },
      });
      if (!product)
        return reply.code(404).send({ error: "Product not found" });
      const imageUrl = product.imageUrl;
      if (!imageUrl)
        return reply.code(404).send({ error: "Product has no image" });
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        return reply.send({ url: imageUrl });
      }
      const url = await minioClient.getPresignedUrl(imageUrl, 3600);
      return reply.send({ url });
    },
  );

  // ── DELETE /api/v1/products/:id/image — remove product image ───────────────
  fastify.delete<{ Params: { id: string } }>(
    "/api/v1/products/:id/image",
    async (request, reply) => {
      const { id } = request.params;
      const tenantId = request.user!.tenantId;
      const product = await prisma.product.findFirst({
        where: { id, tenantId },
        select: { id: true, imageUrl: true },
      });
      if (!product)
        return reply.code(404).send({ error: "Product not found" });
      const imageUrl = product.imageUrl;
      if (!imageUrl)
        return reply.code(404).send({ error: "Product has no image" });
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        await prisma.product.update({
          where: { id },
          data: { imageUrl: null },
        });
        broadcaster.send(tenantId, "product:updated", { productId: id });
        return reply.send({ deleted: true });
      }
      try {
        await minioClient.deleteFile(imageUrl);
      } catch {
        logger.warn({ imageKey: imageUrl }, "Failed to delete image from MinIO");
      }
      await prisma.product.update({
        where: { id },
        data: { imageUrl: null },
      });
      logger.info({ productId: id }, "Product image removed");
      broadcaster.send(tenantId, "product:updated", { productId: id });
      return reply.send({ deleted: true });
    },
  );
}
