export interface CreateProductInput {
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
}
export interface UpdateProductInput {
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
    gstRate?: number;
    hsnCode?: string;
    cost?: number;
    mrp?: number;
}
export interface UpdateStockInput {
    quantity: number;
    operation: "add" | "subtract";
    reason?: string;
}
export interface ProductRecord {
    id: string;
    name: string;
    [key: string]: unknown;
}
export interface PaginatedProductsResult {
    products: ProductRecord[];
    total: number;
    page: number;
    limit: number;
    [key: string]: unknown;
}
//# sourceMappingURL=types.d.ts.map