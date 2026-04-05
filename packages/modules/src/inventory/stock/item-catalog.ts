/**
 * Inventory / Stock — product and stock-level operations.
 * Re-exports from the canonical flat domain file (inventory/product.ts).
 * Kept for backwards-compatibility with any existing imports.
 */

export {
  createProduct,
  updateProduct,
  updateProductStock,
  writeOffBatch,
  getProductById,
  searchProducts,
  listProducts,
  listProductsPaginated,
  getLowStockProducts,
  getExpiringBatches,
  getExpiryPage,
} from "../product";

// ─── Type re-exports ──────────────────────────────────────────────────────────

export type {
  CreateProductInput,
  UpdateProductInput,
  UpdateStockInput,
  ProductRecord,
  PaginatedProductsResult,
} from "./types";
