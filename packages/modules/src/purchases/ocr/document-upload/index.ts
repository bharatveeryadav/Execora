/**
 * purchases/ocr/document-upload
 *
 * Feature: enqueue OCR scan jobs for supplier bills and product catalogs.
 * Owner: purchases domain
 * Source of truth: ocr/ocr.service.ts
 * Write path: createOcrJob, retryOcrJob
 * Read path: getOcrJob, listOcrJobs
 */
export * from "./contracts/commands";
export {
  createOcrJob,
  getOcrJob,
  listOcrJobs,
  retryOcrJob,
} from "../../../ocr/ocr.service";
export type { OcrJobRecord, OcrJobType, OcrJobStatus } from "../../../ocr/ocr.service";
