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
export function generateBarcode(
  productId: string,
  format: BarcodeFormat = "ean13"
): BarcodeData {
  const value = format === "ean13"
    ? productId.replace(/\D/g, "").padStart(13, "0").slice(-13)
    : productId;
  return { productId, format, value, displayText: productId };
}
