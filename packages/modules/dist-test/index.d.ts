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
//# sourceMappingURL=index.d.ts.map