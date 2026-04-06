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

// ── OCR job CRUD ──────────────────────────────────────────────────────────────
export * from "./ocr.service";

// ── AI analytics (replenishment, anomaly detection, predictive reminders) ─────
export * from "../modules/ai/ai.service";
