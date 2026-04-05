import { productService } from "../../modules/product/product.service";
import type {
  CreateProductInput,
  UpdateProductInput,
  UpdateStockInput,
  ProductRecord,
  PaginatedProductsResult,
} from "./types";

// ─── Commands ─────────────────────────────────────────────────────────────────

export async function createProduct(
  input: CreateProductInput,
): Promise<ProductRecord> {
  return productService.createProduct(input);
}

export async function updateProduct(
  productId: string,
  input: UpdateProductInput,
): Promise<ProductRecord> {
  return productService.updateProduct(productId, input);
}

export async function updateProductStock(
  productId: string,
  input: UpdateStockInput,
): Promise<ProductRecord> {
  return productService.updateStock(productId, input.quantity, input.operation);
}

export async function writeOffBatch(batchId: string): Promise<unknown> {
  return productService.writeOffBatch(batchId);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listProducts(): Promise<ProductRecord[]> {
  return productService.getAllProducts();
}

export async function listProductsPaginated(
  page: number,
  limit: number,
): Promise<PaginatedProductsResult> {
  return productService.getProductsPaginated(page, limit);
}

export async function listLowStockProducts(): Promise<ProductRecord[]> {
  return productService.getLowStockProducts();
}

export async function listExpiringBatches(days: number): Promise<unknown[]> {
  return productService.getExpiringBatches(days);
}

export async function getExpiryPage(
  filter: "expired" | "7d" | "30d" | "90d" | "all",
): Promise<unknown> {
  return productService.getExpiryPage(filter);
}

// ─── Type re-exports ──────────────────────────────────────────────────────────

export type {
  CreateProductInput,
  UpdateProductInput,
  UpdateStockInput,
  ProductRecord,
  PaginatedProductsResult,
} from "./types";
