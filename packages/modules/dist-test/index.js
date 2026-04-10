"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = void 0;
// ═══════════════════════════════════════════════════════════════════════════════
//  NEW: Additional exports from new domain modules not covered by legacy barrels
// ═══════════════════════════════════════════════════════════════════════════════
// ── crm domain (customer-profile functions) ───────────────────────────────────
// NOTE: also re-exported via compat ./invoicing barrel (crm/parties/customer-profile)
__exportStar(require("./crm"), exports);
// ── ai insights (DB-driven analytics) ────────────────────────────────────────
// NOTE: aiService singleton is also exported via compat ./ocr barrel
var ai_service_1 = require("./modules/ai/ai.service");
Object.defineProperty(exports, "aiService", { enumerable: true, get: function () { return ai_service_1.aiService; } });
// ═══════════════════════════════════════════════════════════════════════════════
//  COMPAT: Legacy 6-module barrels — unchanged for zero breaking changes
// ═══════════════════════════════════════════════════════════════════════════════
// ── 1. Accounting (→ finance + reporting + compliance/gst) ───────────────────
__exportStar(require("./accounting"), exports);
// ── 2. Inventory ─────────────────────────────────────────────────────────────
__exportStar(require("./inventory"), exports);
// ── 3. POS (→ ai/voice-assistant + sales/pos) ────────────────────────────────
__exportStar(require("./pos"), exports);
// ── 4. Invoicing (→ sales/invoicing + purchases + crm) ───────────────────────
__exportStar(require("./invoicing"), exports);
// ── 5. E-Invoice (→ compliance/e-invoicing + compliance/gst) ─────────────────
__exportStar(require("./e-invoice"), exports);
// ── 6. OCR (→ purchases/ocr + ai/insights) ───────────────────────────────────
__exportStar(require("./ocr"), exports);
// ═══════════════════════════════════════════════════════════════════════════════
//  INTEGRATIONS: LLM / STT / TTS providers, notifications
// ═══════════════════════════════════════════════════════════════════════════════
__exportStar(require("./providers/types"), exports);
__exportStar(require("./providers/errors"), exports);
__exportStar(require("./providers/llm/index"), exports);
__exportStar(require("./providers/stt/index"), exports);
__exportStar(require("./providers/tts/index"), exports);
// ═══════════════════════════════════════════════════════════════════════════════
//  PLATFORM UTILITIES (monitoring, PDF, text helpers, workers)
// ═══════════════════════════════════════════════════════════════════════════════
__exportStar(require("./modules/monitoring/monitoring.service"), exports);
__exportStar(require("./utils/devanagari"), exports);
__exportStar(require("./utils/pdf"), exports);
__exportStar(require("./utils/fuzzy-match"), exports);
__exportStar(require("./utils/llm-cache"), exports);
// ── Infrastructure helpers ────────────────────────────────────────────────────
__exportStar(require("./infra/email"), exports);
__exportStar(require("./infra/whatsapp-service"), exports);
__exportStar(require("./infra/reminder-ops"), exports);
__exportStar(require("./workers"), exports);
//# sourceMappingURL=index.js.map