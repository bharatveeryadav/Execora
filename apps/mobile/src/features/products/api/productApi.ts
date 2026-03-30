import { apiFetch, productApi, type Product } from "@execora/shared";

export const productExtApi = {
  lowStock: () =>
    apiFetch<{
      products: Array<{
        id: string;
        name: string;
        stock: number;
        unit?: string;
        minStock?: number;
      }>;
    }>("/api/v1/products/low-stock"),

  expiringBatches: (days = 30) =>
    apiFetch<{
      batches: Array<{
        id: string;
        batchNo: string;
        expiryDate: string;
        quantity: number;
        product: { name: string; unit: string };
      }>;
    }>(`/api/v1/products/expiring?days=${days}`),

  expiryPage: (filter: "expired" | "7d" | "30d" | "90d" | "all" = "30d") =>
    apiFetch<{
      batches: Array<{
        id: string;
        batchNo: string;
        expiryDate: string;
        manufacturingDate: string | null;
        quantity: number;
        purchasePrice: string | null;
        status: string;
        product: { name: string; unit: string; category: string | null };
      }>;
      summary: {
        expiredCount: number;
        critical7: number;
        warning30: number;
        valueAtRisk: number;
      };
    }>(`/api/v1/products/expiry-page?filter=${filter}`),

  writeOffBatch: (batchId: string) =>
    apiFetch<{ ok: boolean; batchNo: string; qtyWrittenOff: number }>(
      `/api/v1/products/batches/${batchId}/write-off`,
      { method: "PATCH" },
    ),

  create: (data: {
    name: string;
    price?: number;
    unit?: string;
    category?: string;
    stock?: number;
    minStock?: number;
    barcode?: string;
  }) =>
    apiFetch<{ product: Product & { minStock?: number } }>("/api/v1/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: {
      isFeatured?: boolean;
      name?: string;
      price?: number;
      category?: string;
    },
  ) =>
    apiFetch<{ product: Product & { minStock?: number } }>(
      `/api/v1/products/${id}`,
      { method: "PUT", body: JSON.stringify(data) },
    ),

  adjustStock: (
    id: string,
    quantity: number,
    operation: "add" | "subtract",
    reason = "Mobile app adjustment",
  ) =>
    apiFetch<{ product: Product & { minStock?: number } }>(
      `/api/v1/products/${id}/stock`,
      {
        method: "PATCH",
        body: JSON.stringify({ quantity, operation, reason }),
      },
    ),

  getImageUrls: (ids: string[]) =>
    apiFetch<Record<string, string>>(
      `/api/v1/products/image-urls?ids=${ids.slice(0, 50).join(",")}`,
    ),
};

export { productApi };
