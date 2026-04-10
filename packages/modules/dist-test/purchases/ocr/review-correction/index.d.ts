/**
 * purchases/ocr/review-correction
 *
 * Feature: UI-facing API for human review of OCR-extracted purchase doc fields.
 * Corrections update the pending extraction record.
 * Stub — requires ocr_extraction table entries from the OCR job (⏳).
 */
export interface OcrExtractionCorrection {
    extractionId: string;
    tenantId: string;
    corrections: Partial<{
        vendorName: string;
        billNo: string;
        billDate: string;
        totalAmount: number;
        gstAmount: number;
        items: {
            description: string;
            qty: number;
            price: number;
        }[];
    }>;
    reviewedBy: string;
}
export interface OcrReviewResult {
    extractionId: string;
    status: "corrected" | "approved" | "rejected";
    correctedAt: Date;
}
export declare function submitOcrCorrection(correction: OcrExtractionCorrection): Promise<OcrReviewResult>;
//# sourceMappingURL=index.d.ts.map