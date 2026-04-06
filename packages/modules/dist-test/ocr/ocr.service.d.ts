/**
 * OCR Service — lifecycle management for OcrJob records.
 *
 * Actual image processing (OpenAI Vision → JSON extraction) is handled by the
 * BullMQ OCR worker in packages/infrastructure. This service provides:
 *  - createOcrJob   — enqueue a new scan request
 *  - getOcrJob      — fetch a single job (tenant-scoped IDOR guard)
 *  - listOcrJobs    — list all jobs for a tenant (optionally filtered by status)
 *  - retryOcrJob    — reset a failed job back to pending
 *
 * Job types:
 *  "purchase_bill"    — scan a supplier bill → auto-create Purchase Order
 *  "product_catalog"  — scan a product photo → seed item catalog
 */
export type OcrJobType = "purchase_bill" | "product_catalog";
export type OcrJobStatus = "pending" | "processing" | "completed" | "failed";
export interface OcrJobRecord {
    id: string;
    tenantId: string;
    jobType: OcrJobType;
    status: OcrJobStatus;
    imageKey: string;
    imageMimeType: string;
    rawResult: unknown | null;
    parsedItems: unknown | null;
    purchaseOrderId: string | null;
    productsCreated: number;
    errorMessage: string | null;
    retryCount: number;
    processedAt: Date | null;
    createdAt: Date;
}
export interface CreateOcrJobInput {
    jobType: OcrJobType;
    /** MinIO object key of the uploaded image */
    imageKey: string;
    imageMimeType?: string;
}
export declare function createOcrJob(tenantId: string, input: CreateOcrJobInput): Promise<OcrJobRecord>;
export declare function retryOcrJob(tenantId: string, id: string): Promise<OcrJobRecord>;
export declare function getOcrJob(tenantId: string, id: string): Promise<OcrJobRecord | null>;
export declare function listOcrJobs(tenantId: string, status?: OcrJobStatus, limit?: number): Promise<OcrJobRecord[]>;
//# sourceMappingURL=ocr.service.d.ts.map