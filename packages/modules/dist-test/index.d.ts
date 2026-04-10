/**
 * @execora/modules — 11-domain modular platform
 *
 * ┌──────────────────── Canonical Domain Architecture ─────────────────────────┐
 * │                                                                             │
 * │  FOUNDATIONAL (no cross-domain imports)                                    │
 * │    crm        — customer CRUD, balance, communication prefs                │
 * │    inventory  — products, stock, batches, expiry                           │
 * │    finance    — payments, ledger, expenses, cashbook                       │
 * │                                                                             │
 * │  TRANSACTIONAL (may import from foundational)                              │
 * │    sales      — invoicing, POS drafts, billing, returns, PDF render        │
 * │    purchases  — purchase orders, vendor profiles, OCR bill scanning        │
 * │                                                                             │
 * │  REGULATORY / READ-ONLY                                                    │
 * │    compliance — GST (GSTR-1), e-invoicing (IRN tax computation)            │
 * │    reporting  — financial reports, sales summaries (read-only)             │
 * │                                                                             │
 * │  AI / ISOLATED                                                             │
 * │    ai         — voice assistant, DB-driven insights (no state ownership)   │
 * │                                                                             │
 * │  INFRASTRUCTURE                                                             │
 * │    integrations — LLM / STT / TTS providers, notifications                 │
 * │                                                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * Legacy 6-module barrel mapping (kept for zero breaking changes):
 *   accounting  → finance + reporting + compliance/gst
 *   pos         → ai/voice-assistant + sales/pos
 *   invoicing   → sales/invoicing + purchases + crm
 *   e-invoice   → compliance/e-invoicing + compliance/gst
 *   ocr         → purchases/ocr + ai/insights
 */
export * from "./crm";
export {} from "./purchases/ocr/document-upload";
export { aiService } from "./modules/ai/ai.service";
export type { ReplenishmentSuggestion, AnomalyResult, PredictiveReminderResult } from "./modules/ai/ai.service";
export * from "./accounting";
export * from "./inventory";
export * from "./pos";
export * from "./invoicing";
export * from "./e-invoice";
export * from "./ocr";
export * from "./providers/types";
export * from "./providers/errors";
export * from "./providers/llm/index";
export * from "./providers/stt/index";
export * from "./providers/tts/index";
export * from "./modules/monitoring/monitoring.service";
export * from "./utils/devanagari";
export * from "./utils/pdf";
export * from "./utils/fuzzy-match";
export * from "./utils/llm-cache";
export * from "./infra/email";
export * from "./infra/whatsapp-service";
export * from "./infra/reminder-ops";
export * from "./workers";
//# sourceMappingURL=index.d.ts.map