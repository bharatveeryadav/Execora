/**
 * purchases/ocr/extraction
 *
 * Feature: AI-powered data extraction pipeline — processes completed OCR jobs
 * and maps raw results to Purchase Orders or product catalog entries.
 * Owner: purchases domain
 * Implementation: BullMQ worker in apps/worker (scheduled separately)
 * This module only exports the job-status contract for API visibility.
 */
export type { OcrJobRecord } from "../../../ocr/ocr.service";
//# sourceMappingURL=index.d.ts.map