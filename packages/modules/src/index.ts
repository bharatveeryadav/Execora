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

// ── 1. Accounting ─────────────────────────────────────────────────────────────
export * from "./accounting";

// ── 2. Inventory ─────────────────────────────────────────────────────────────
export * from "./inventory";

// ── 3. POS ───────────────────────────────────────────────────────────────────
export * from "./pos";

// ── 4. Invoicing ─────────────────────────────────────────────────────────────
export * from "./invoicing";

// ── 5. E-Invoice ─────────────────────────────────────────────────────────────
export * from "./e-invoice";

// ── 6. OCR ───────────────────────────────────────────────────────────────────
export * from "./ocr";

// ── Cross-cutting: LLM / STT / TTS providers ──────────────────────────────────
export * from "./providers/types";
export * from "./providers/errors";
export * from "./providers/llm/index";
export * from "./providers/stt/index";
export * from "./providers/tts/index";

// ── Cross-cutting: monitoring & utilities ────────────────────────────────────
export * from "./modules/monitoring/monitoring.service";
export * from "./utils/devanagari";
export * from "./utils/pdf";
export * from "./utils/fuzzy-match";
export * from "./utils/llm-cache";

// ── Infrastructure helpers (moved from @execora/core) ────────────────────────
export * from "./infra/email";
export * from "./infra/whatsapp-service";
export * from "./infra/reminder-ops";
export * from "./workers";
