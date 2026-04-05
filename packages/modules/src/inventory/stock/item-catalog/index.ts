/**
 * Inventory / stock / item-catalog
 *
 * Compatibility adapters delegating to the legacy ProductService.
 * Routes that access prisma directly (barcode lookup, search, image ops) are
 * NOT part of this module — they remain as infrastructure-level operations in
 * the route file until a dedicated storage adapter is built.
 */
import { productService } from "../../../modules/product/product.service";
import {
  CreateProductInput,
  UpdateProductInput,
  UpdateStockInput,
} from "./contracts/dto";
import {
  CreateProductCommand,
  UpdateProductCommand,
  UpdateStockCommand,
  WriteOffBatchCommand,
} from "./contracts/commands";
import {
  ListProductsQuery,
  ListProductsPaginatedQuery,
  ListLowStockQuery,
  ListExpiringBatchesQuery,
  GetExpiryPageQuery,
} from "./contracts/queries";

// ─── Commands ─────────────────────────────────────────────────────────────────

class LegacyCreateProductCommand implements CreateProductCommand {
  async execute(input: CreateProductInput) {
    return productService.createProduct(input);
  }
}

class LegacyUpdateProductCommand implements UpdateProductCommand {
  async execute(productId: string, input: UpdateProductInput) {
    return productService.updateProduct(productId, input);
  }
}

class LegacyUpdateStockCommand implements UpdateStockCommand {
  async execute(productId: string, input: UpdateStockInput) {
    return productService.updateStock(
      productId,
      input.quantity,
      input.operation,
    );
  }
}

class LegacyWriteOffBatchCommand implements WriteOffBatchCommand {
  async execute(batchId: string) {
    return productService.writeOffBatch(batchId);
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

class LegacyListProductsQuery implements ListProductsQuery {
  async execute() {
    return productService.getAllProducts();
  }
}

class LegacyListProductsPaginatedQuery implements ListProductsPaginatedQuery {
  async execute(page: number, limit: number) {
    return productService.getProductsPaginated(page, limit);
  }
}

class LegacyListLowStockQuery implements ListLowStockQuery {
  async execute() {
    return productService.getLowStockProducts();
  }
}

class LegacyListExpiringBatchesQuery implements ListExpiringBatchesQuery {
  async execute(days: number) {
    return productService.getExpiringBatches(days);
  }
}

class LegacyGetExpiryPageQuery implements GetExpiryPageQuery {
  async execute(filter: "expired" | "7d" | "30d" | "90d" | "all") {
    return productService.getExpiryPage(filter);
  }
}

// ─── Singleton exports ────────────────────────────────────────────────────────

export const createProductCommand: CreateProductCommand =
  new LegacyCreateProductCommand();
export const updateProductCommand: UpdateProductCommand =
  new LegacyUpdateProductCommand();
export const updateStockCommand: UpdateStockCommand =
  new LegacyUpdateStockCommand();
export const writeOffBatchCommand: WriteOffBatchCommand =
  new LegacyWriteOffBatchCommand();

export const listProductsQuery: ListProductsQuery =
  new LegacyListProductsQuery();
export const listProductsPaginatedQuery: ListProductsPaginatedQuery =
  new LegacyListProductsPaginatedQuery();
export const listLowStockQuery: ListLowStockQuery =
  new LegacyListLowStockQuery();
export const listExpiringBatchesQuery: ListExpiringBatchesQuery =
  new LegacyListExpiringBatchesQuery();
export const getExpiryPageQuery: GetExpiryPageQuery =
  new LegacyGetExpiryPageQuery();

export * from "./contracts/dto";
export * from "./contracts/commands";
export * from "./contracts/queries";
