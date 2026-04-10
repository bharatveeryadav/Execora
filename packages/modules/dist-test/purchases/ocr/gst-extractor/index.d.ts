/**
 * purchases/ocr/gst-extractor
 *
 * Feature: GST-specific field extraction — GSTIN, HSN codes, tax rates from scanned docs.
 */
export interface GstExtractResult {
    supplierGstin?: string;
    buyerGstin?: string;
    hsnCodes: string[];
    taxLines: Array<{
        hsnCode: string;
        taxableValue: number;
        cgst: number;
        sgst: number;
        igst: number;
    }>;
    invoiceType?: "B2B" | "B2C" | "exports";
}
export declare function extractGstFields(_rawText: string): GstExtractResult;
//# sourceMappingURL=index.d.ts.map