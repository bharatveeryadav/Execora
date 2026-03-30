import { Decimal } from '@prisma/client/runtime/library';
declare class ProductService {
    /**
     * Create new product
     */
    createProduct(data: {
        name: string;
        description?: string;
        price: number;
        stock: number;
        unit?: string;
        category?: string;
        barcode?: string;
        sku?: string;
        wholesalePrice?: number;
        priceTier2?: number;
        priceTier3?: number;
    }): Promise<{
        tenantId: string;
        id: string;
        name: string;
        tags: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        cess: Decimal;
        description: string | null;
        isActive: boolean;
        unit: string;
        mrp: Decimal | null;
        hsnCode: string | null;
        gstRate: Decimal;
        category: string;
        subCategory: string | null;
        sku: string | null;
        barcode: string | null;
        price: Decimal;
        cost: Decimal | null;
        wholesalePrice: Decimal | null;
        priceTier2: Decimal | null;
        priceTier3: Decimal | null;
        baseUnit: string | null;
        baseUnitQuantity: Decimal | null;
        stock: number;
        minStock: number;
        maxStock: number | null;
        location: string | null;
        isGstExempt: boolean;
        trackBatches: boolean;
        trackSerialNumbers: boolean;
        hasVariants: boolean;
        imageUrl: string | null;
        imageUrls: string[];
        preferredSupplier: string | null;
        supplierId: string | null;
        isFeatured: boolean;
        attributes: import("@prisma/client/runtime/library").JsonValue;
    }>;
    /**
     * Search products by name — scoped to current tenant
     */
    searchProducts(query: string): Promise<{
        tenantId: string;
        id: string;
        name: string;
        tags: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        cess: Decimal;
        description: string | null;
        isActive: boolean;
        unit: string;
        mrp: Decimal | null;
        hsnCode: string | null;
        gstRate: Decimal;
        category: string;
        subCategory: string | null;
        sku: string | null;
        barcode: string | null;
        price: Decimal;
        cost: Decimal | null;
        wholesalePrice: Decimal | null;
        priceTier2: Decimal | null;
        priceTier3: Decimal | null;
        baseUnit: string | null;
        baseUnitQuantity: Decimal | null;
        stock: number;
        minStock: number;
        maxStock: number | null;
        location: string | null;
        isGstExempt: boolean;
        trackBatches: boolean;
        trackSerialNumbers: boolean;
        hasVariants: boolean;
        imageUrl: string | null;
        imageUrls: string[];
        preferredSupplier: string | null;
        supplierId: string | null;
        isFeatured: boolean;
        attributes: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    /**
     * Get product by ID — scoped to current tenant to prevent cross-tenant reads
     */
    getProductById(id: string): Promise<{
        tenantId: string;
        id: string;
        name: string;
        tags: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        cess: Decimal;
        description: string | null;
        isActive: boolean;
        unit: string;
        mrp: Decimal | null;
        hsnCode: string | null;
        gstRate: Decimal;
        category: string;
        subCategory: string | null;
        sku: string | null;
        barcode: string | null;
        price: Decimal;
        cost: Decimal | null;
        wholesalePrice: Decimal | null;
        priceTier2: Decimal | null;
        priceTier3: Decimal | null;
        baseUnit: string | null;
        baseUnitQuantity: Decimal | null;
        stock: number;
        minStock: number;
        maxStock: number | null;
        location: string | null;
        isGstExempt: boolean;
        trackBatches: boolean;
        trackSerialNumbers: boolean;
        hasVariants: boolean;
        imageUrl: string | null;
        imageUrls: string[];
        preferredSupplier: string | null;
        supplierId: string | null;
        isFeatured: boolean;
        attributes: import("@prisma/client/runtime/library").JsonValue;
    } | null>;
    /**
     * Update product stock — scoped to current tenant
     */
    updateStock(productId: string, quantity: number, operation: 'add' | 'subtract'): Promise<{
        tenantId: string;
        id: string;
        name: string;
        tags: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        cess: Decimal;
        description: string | null;
        isActive: boolean;
        unit: string;
        mrp: Decimal | null;
        hsnCode: string | null;
        gstRate: Decimal;
        category: string;
        subCategory: string | null;
        sku: string | null;
        barcode: string | null;
        price: Decimal;
        cost: Decimal | null;
        wholesalePrice: Decimal | null;
        priceTier2: Decimal | null;
        priceTier3: Decimal | null;
        baseUnit: string | null;
        baseUnitQuantity: Decimal | null;
        stock: number;
        minStock: number;
        maxStock: number | null;
        location: string | null;
        isGstExempt: boolean;
        trackBatches: boolean;
        trackSerialNumbers: boolean;
        hasVariants: boolean;
        imageUrl: string | null;
        imageUrls: string[];
        preferredSupplier: string | null;
        supplierId: string | null;
        isFeatured: boolean;
        attributes: import("@prisma/client/runtime/library").JsonValue;
    }>;
    /**
     * Get low stock products for the current tenant.
     * A product is considered low-stock when its stock is at or below its minStock threshold.
     */
    getLowStockProducts(): Promise<{
        id: string;
        name: string;
        category: string;
        description: string | null;
        price: string;
        unit: string;
        stock: number;
        minStock: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    /**
     * Get all active products for the current tenant.
     */
    getAllProducts(): Promise<{
        tenantId: string;
        id: string;
        name: string;
        tags: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        cess: Decimal;
        description: string | null;
        isActive: boolean;
        unit: string;
        mrp: Decimal | null;
        hsnCode: string | null;
        gstRate: Decimal;
        category: string;
        subCategory: string | null;
        sku: string | null;
        barcode: string | null;
        price: Decimal;
        cost: Decimal | null;
        wholesalePrice: Decimal | null;
        priceTier2: Decimal | null;
        priceTier3: Decimal | null;
        baseUnit: string | null;
        baseUnitQuantity: Decimal | null;
        stock: number;
        minStock: number;
        maxStock: number | null;
        location: string | null;
        isGstExempt: boolean;
        trackBatches: boolean;
        trackSerialNumbers: boolean;
        hasVariants: boolean;
        imageUrl: string | null;
        imageUrls: string[];
        preferredSupplier: string | null;
        supplierId: string | null;
        isFeatured: boolean;
        attributes: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    /**
     * Get products with pagination (Sprint 27).
     */
    getProductsPaginated(page?: number, limit?: number): Promise<{
        products: {
            tenantId: string;
            id: string;
            name: string;
            tags: string[];
            createdBy: string | null;
            updatedBy: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            cess: Decimal;
            description: string | null;
            isActive: boolean;
            unit: string;
            mrp: Decimal | null;
            hsnCode: string | null;
            gstRate: Decimal;
            category: string;
            subCategory: string | null;
            sku: string | null;
            barcode: string | null;
            price: Decimal;
            cost: Decimal | null;
            wholesalePrice: Decimal | null;
            priceTier2: Decimal | null;
            priceTier3: Decimal | null;
            baseUnit: string | null;
            baseUnitQuantity: Decimal | null;
            stock: number;
            minStock: number;
            maxStock: number | null;
            location: string | null;
            isGstExempt: boolean;
            trackBatches: boolean;
            trackSerialNumbers: boolean;
            hasVariants: boolean;
            imageUrl: string | null;
            imageUrls: string[];
            preferredSupplier: string | null;
            supplierId: string | null;
            isFeatured: boolean;
            attributes: import("@prisma/client/runtime/library").JsonValue;
        }[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
    }>;
    /**
     * Update product price — scoped to current tenant
     */
    updatePrice(productId: string, newPrice: number): Promise<{
        tenantId: string;
        id: string;
        name: string;
        tags: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        cess: Decimal;
        description: string | null;
        isActive: boolean;
        unit: string;
        mrp: Decimal | null;
        hsnCode: string | null;
        gstRate: Decimal;
        category: string;
        subCategory: string | null;
        sku: string | null;
        barcode: string | null;
        price: Decimal;
        cost: Decimal | null;
        wholesalePrice: Decimal | null;
        priceTier2: Decimal | null;
        priceTier3: Decimal | null;
        baseUnit: string | null;
        baseUnitQuantity: Decimal | null;
        stock: number;
        minStock: number;
        maxStock: number | null;
        location: string | null;
        isGstExempt: boolean;
        trackBatches: boolean;
        trackSerialNumbers: boolean;
        hasVariants: boolean;
        imageUrl: string | null;
        imageUrls: string[];
        preferredSupplier: string | null;
        supplierId: string | null;
        isFeatured: boolean;
        attributes: import("@prisma/client/runtime/library").JsonValue;
    }>;
    /**
     * Update product fields (name, price, stock, unit, category, description).
     * Only updates fields that are explicitly provided.
     * Scoped to current tenant — silently no-ops if product belongs to another tenant.
     */
    updateProduct(productId: string, data: {
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
    }): Promise<{
        tenantId: string;
        id: string;
        name: string;
        tags: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        cess: Decimal;
        description: string | null;
        isActive: boolean;
        unit: string;
        mrp: Decimal | null;
        hsnCode: string | null;
        gstRate: Decimal;
        category: string;
        subCategory: string | null;
        sku: string | null;
        barcode: string | null;
        price: Decimal;
        cost: Decimal | null;
        wholesalePrice: Decimal | null;
        priceTier2: Decimal | null;
        priceTier3: Decimal | null;
        baseUnit: string | null;
        baseUnitQuantity: Decimal | null;
        stock: number;
        minStock: number;
        maxStock: number | null;
        location: string | null;
        isGstExempt: boolean;
        trackBatches: boolean;
        trackSerialNumbers: boolean;
        hasVariants: boolean;
        imageUrl: string | null;
        imageUrls: string[];
        preferredSupplier: string | null;
        supplierId: string | null;
        isFeatured: boolean;
        attributes: import("@prisma/client/runtime/library").JsonValue;
    }>;
    /**
     * Get product stock — scoped to current tenant
     */
    getStock(productName: string): Promise<number>;
    /**
     * Returns products with batches expiring within `days` days.
     * Used for expiry alert widget on the dashboard.
     */
    getExpiringBatches(days?: number): Promise<({
        product: {
            name: string;
            unit: string;
        };
    } & {
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        productId: string;
        quantity: number;
        variantId: string | null;
        location: string | null;
        supplierId: string | null;
        batchNo: string;
        manufacturingDate: Date | null;
        expiryDate: Date;
        initialQuantity: number;
        purchasePrice: Decimal | null;
        purchaseDate: Date | null;
    })[]>;
    /**
     * Full expiry management page data.
     * filter: 'expired' | '7d' | '30d' | '90d' | 'all'
     */
    getExpiryPage(filter?: 'expired' | '7d' | '30d' | '90d' | 'all'): Promise<{
        batches: ({
            product: {
                name: string;
                unit: string;
                category: string;
            };
        } & {
            tenantId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            productId: string;
            quantity: number;
            variantId: string | null;
            location: string | null;
            supplierId: string | null;
            batchNo: string;
            manufacturingDate: Date | null;
            expiryDate: Date;
            initialQuantity: number;
            purchasePrice: Decimal | null;
            purchaseDate: Date | null;
        })[];
        summary: {
            expiredCount: number;
            critical7: number;
            warning30: number;
            valueAtRisk: number;
        };
    }>;
    /**
     * Write off a batch (mark qty = 0, status = written_off).
     */
    writeOffBatch(batchId: string): Promise<{
        ok: boolean;
        batchNo: string;
        qtyWrittenOff: number;
    }>;
}
export declare const productService: ProductService;
export {};
//# sourceMappingURL=product.service.d.ts.map