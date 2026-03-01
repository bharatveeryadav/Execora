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
    }): Promise<{
        id: string;
        tenantId: string;
        name: string;
        tags: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        cess: Decimal;
        description: string | null;
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
        isActive: boolean;
        isFeatured: boolean;
        attributes: import("@prisma/client/runtime/library").JsonValue;
    }>;
    /**
     * Search products by name
     */
    searchProducts(query: string): Promise<{
        id: string;
        tenantId: string;
        name: string;
        tags: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        cess: Decimal;
        description: string | null;
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
        isActive: boolean;
        isFeatured: boolean;
        attributes: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    /**
     * Get product by ID
     */
    getProductById(id: string): Promise<{
        id: string;
        tenantId: string;
        name: string;
        tags: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        cess: Decimal;
        description: string | null;
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
        isActive: boolean;
        isFeatured: boolean;
        attributes: import("@prisma/client/runtime/library").JsonValue;
    } | null>;
    /**
     * Update product stock
     */
    updateStock(productId: string, quantity: number, operation: 'add' | 'subtract'): Promise<{
        id: string;
        tenantId: string;
        name: string;
        tags: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        cess: Decimal;
        description: string | null;
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
        isActive: boolean;
        isFeatured: boolean;
        attributes: import("@prisma/client/runtime/library").JsonValue;
    }>;
    /**
     * Get low stock products
     */
    getLowStockProducts(threshold?: number): Promise<{
        id: string;
        tenantId: string;
        name: string;
        tags: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        cess: Decimal;
        description: string | null;
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
        isActive: boolean;
        isFeatured: boolean;
        attributes: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    /**
     * Get all products
     */
    getAllProducts(): Promise<{
        id: string;
        tenantId: string;
        name: string;
        tags: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        cess: Decimal;
        description: string | null;
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
        isActive: boolean;
        isFeatured: boolean;
        attributes: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    /**
     * Update product price
     */
    updatePrice(productId: string, newPrice: number): Promise<{
        id: string;
        tenantId: string;
        name: string;
        tags: string[];
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        cess: Decimal;
        description: string | null;
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
        isActive: boolean;
        isFeatured: boolean;
        attributes: import("@prisma/client/runtime/library").JsonValue;
    }>;
    /**
     * Get product stock
     */
    getStock(productName: string): Promise<number>;
}
export declare const productService: ProductService;
export {};
//# sourceMappingURL=product.service.d.ts.map