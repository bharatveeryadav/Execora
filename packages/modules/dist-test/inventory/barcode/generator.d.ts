/**
 * inventory/barcode/generator
 *
 * Feature: generate barcode strings for products (EAN-13, Code-128, QR).
 * Returns barcode data; rendering is handled by frontend.
 */
export type BarcodeFormat = "ean13" | "code128" | "qr";
export interface BarcodeData {
    productId: string;
    format: BarcodeFormat;
    value: string;
    displayText: string;
}
export declare function generateBarcode(productId: string, format?: BarcodeFormat): BarcodeData;
//# sourceMappingURL=generator.d.ts.map