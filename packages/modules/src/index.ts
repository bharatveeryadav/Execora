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

// ═══════════════════════════════════════════════════════════════════════════════
//  NEW: Additional exports from new domain modules not covered by legacy barrels
// ═══════════════════════════════════════════════════════════════════════════════

// ── crm domain (customer-profile functions) ───────────────────────────────────
// NOTE: also re-exported via compat ./invoicing barrel (crm/parties/customer-profile)
export * from "./crm";

// ── purchases domain (PO + vendors + OCR) ────────────────────────────────────
// NOTE: PO + vendor functions also in compat ./invoicing barrel
// OCR functions also in compat ./ocr barrel
// Using selective exports to avoid duplicates:
export {
  // OCR: only these are NOT in legacy ocr barrel (retryOcrJob is new)
} from "./purchases/ocr/document-upload";

// ── ai insights (DB-driven analytics) ────────────────────────────────────────
// NOTE: aiService singleton is also exported via compat ./ocr barrel
export { aiService } from "./modules/ai/ai.service";
export type { ReplenishmentSuggestion, AnomalyResult, PredictiveReminderResult } from "./modules/ai/ai.service";

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPAT: Legacy 6-module barrels — unchanged for zero breaking changes
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Accounting (→ finance + reporting + compliance/gst) ───────────────────
export * from "./accounting";

// ── 2. Inventory ─────────────────────────────────────────────────────────────
export * from "./inventory";

// ── 3. POS (→ ai/voice-assistant + sales/pos) ────────────────────────────────
export * from "./pos";

// ── 4. Invoicing (→ sales/invoicing + purchases + crm) ───────────────────────
export * from "./invoicing";

// ── 5. E-Invoice (→ compliance/e-invoicing + compliance/gst) ─────────────────
export * from "./e-invoice";

// ── 6. OCR (→ purchases/ocr + ai/insights) ───────────────────────────────────
export * from "./ocr";

// ═══════════════════════════════════════════════════════════════════════════════
//  INTEGRATIONS: LLM / STT / TTS providers, notifications
// ═══════════════════════════════════════════════════════════════════════════════
export * from "./providers/types";
export * from "./providers/errors";
export * from "./providers/llm/index";
export * from "./providers/stt/index";
export * from "./providers/tts/index";

// ═══════════════════════════════════════════════════════════════════════════════
//  PLATFORM UTILITIES (monitoring, PDF, text helpers, workers)
// ═══════════════════════════════════════════════════════════════════════════════
export * from "./modules/monitoring/monitoring.service";
export * from "./utils/devanagari";
export * from "./utils/pdf";
export * from "./utils/fuzzy-match";
export * from "./utils/llm-cache";

// ── Infrastructure helpers ────────────────────────────────────────────────────
export * from "./infra/email";
export * from "./infra/whatsapp-service";
export * from "./infra/reminder-ops";
export * from "./workers";
