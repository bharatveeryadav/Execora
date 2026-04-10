/**
 * inventory/barcode/scanner
 *
 * Feature: look up a product by scanned barcode value.
 * Source: inventory/product.service.ts (listProductsPaginated with barcode filter)
 */
export interface BarcodeScanResult {
    productId: string;
    name: string;
    sku?: string;
    currentStock: number;
    price: number;
    gstRate: number;
}
export declare function lookupByBarcode(_tenantId: string, _barcodeValue: string): Promise<BarcodeScanResult | null>;
//# sourceMappingURL=scanner.d.ts.map