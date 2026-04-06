"use strict";
/**
 * @execora/modules — six domain module platform
 *
 * All business logic is organised into six canonical modules:
 *
 *  1. accounting  — ledger, payments, expenses, P&L
 *  2. inventory   — products, stock, batches, expiry
 *  3. pos         — draft bills, voice billing, real-time session
 *  4. invoicing   — sales invoices, credit notes, purchase orders, customers
 *  5. e-invoice   — GST compliance, GSTR-1 filing, e-way bill
 *  6. ocr         — document scanning, AI image processing, predictive analytics
 *
 * All six modules re-export from this root barrel so existing imports
 * from "@execora/modules" continue to work without change.
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
// ── 1. Accounting ─────────────────────────────────────────────────────────────
__exportStar(require("./accounting"), exports);
// ── 2. Inventory ─────────────────────────────────────────────────────────────
__exportStar(require("./inventory"), exports);
// ── 3. POS ───────────────────────────────────────────────────────────────────
__exportStar(require("./pos"), exports);
// ── 4. Invoicing ─────────────────────────────────────────────────────────────
__exportStar(require("./invoicing"), exports);
// ── 5. E-Invoice ─────────────────────────────────────────────────────────────
__exportStar(require("./e-invoice"), exports);
// ── 6. OCR ───────────────────────────────────────────────────────────────────
__exportStar(require("./ocr"), exports);
// ── Cross-cutting: LLM / STT / TTS providers ──────────────────────────────────
__exportStar(require("./providers/types"), exports);
__exportStar(require("./providers/errors"), exports);
__exportStar(require("./providers/llm/index"), exports);
__exportStar(require("./providers/stt/index"), exports);
__exportStar(require("./providers/tts/index"), exports);
// ── Cross-cutting: monitoring & utilities ────────────────────────────────────
__exportStar(require("./modules/monitoring/monitoring.service"), exports);
__exportStar(require("./utils/devanagari"), exports);
//# sourceMappingURL=index.js.map