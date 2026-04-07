/**
 * inventory/barcode/label-printing
 *
 * Feature: generate print-ready barcode label HTML/PDF for a product.
 * Stub — PDF generation can use utils/pdf.ts when template is ready (⏳).
 */
export interface BarcodeLabelInput {
  tenantId: string;
  productId: string;
  productName: string;
  price?: number;
  mrp?: number;
  barcodeValue: string;
  format?: "ean13" | "code128" | "qr";
  quantity?: number; /** number of copies */
}
export async function generateBarcodeLabel(
  _input: BarcodeLabelInput
): Promise<{ html: string }> {
  return { html: "<p>Label generation not yet implemented</p>" };
}
