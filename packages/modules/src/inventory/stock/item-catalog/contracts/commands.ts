import {
  CreateProductInput,
  UpdateProductInput,
  UpdateStockInput,
  ProductRecord,
} from "./dto";

// ─── Commands ─────────────────────────────────────────────────────────────────

export interface CreateProductCommand {
  execute(input: CreateProductInput): Promise<ProductRecord>;
}

export interface UpdateProductCommand {
  execute(
    productId: string,
    input: UpdateProductInput,
  ): Promise<ProductRecord | null>;
}

export interface UpdateStockCommand {
  execute(productId: string, input: UpdateStockInput): Promise<ProductRecord>;
}

export interface WriteOffBatchCommand {
  execute(batchId: string): Promise<unknown>;
}
