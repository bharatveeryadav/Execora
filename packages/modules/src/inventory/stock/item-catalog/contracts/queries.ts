import { PaginatedProductsResult, ProductRecord } from "./dto";

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface ListProductsQuery {
  execute(): Promise<ProductRecord[]>;
}

export interface ListProductsPaginatedQuery {
  execute(page: number, limit: number): Promise<PaginatedProductsResult>;
}

export interface ListLowStockQuery {
  execute(): Promise<ProductRecord[]>;
}

export interface ListExpiringBatchesQuery {
  execute(days: number): Promise<unknown[]>;
}

export interface GetExpiryPageQuery {
  execute(filter: "expired" | "7d" | "30d" | "90d" | "all"): Promise<unknown>;
}
