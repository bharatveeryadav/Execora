/**
 * OCR Module
 *
 * Covers: async document scanning (supplier bills, product catalog photos),
 * OcrJob lifecycle management (create → BullMQ → completed/failed → retry),
 * and AI-driven analytics (stock replenishment suggestions, invoice anomaly
 * detection, predictive payment reminders).
 *
 * Surfaces:
 *  - createOcrJob / getOcrJob / listOcrJobs / retryOcrJob
 *  - OcrJobRecord / CreateOcrJobInput / OcrJobType / OcrJobStatus
 *  - aiService → ReplenishmentSuggestion, AnomalyResult, PredictiveReminderResult
 */
export * from "./ocr.service";
export * from "../modules/ai/ai.service";
//# sourceMappingURL=index.d.ts.map