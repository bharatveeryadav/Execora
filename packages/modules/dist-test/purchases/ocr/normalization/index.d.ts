/**
 * purchases/ocr/normalization
 *
 * Feature: extracted field normalization — map raw OCR output to schema fields.
 */
export interface NormalizedDocument {
    vendorName?: string;
    vendorGstin?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    totalAmount?: number;
    taxAmount?: number;
    lineItems: Array<{
        description: string;
        qty: number;
        rate: number;
        amount: number;
        hsn?: string;
        gstPct?: number;
    }>;
    confidence: number;
}
export declare function normalizeOcrOutput(_rawExtraction: Record<string, unknown>): NormalizedDocument;
//# sourceMappingURL=index.d.ts.map