// @execora/modules — barrel exports

// Business services
export * from "./modules/customer/customer.service";
export * from "./modules/invoice/invoice.service";
export * from "./modules/ledger/ledger.service";
export * from "./modules/product/product.service";
export * from "./modules/reminder/reminder.service";
export * from "./modules/gst/gst.service";
export * from "./modules/gst/gstr1.service";

// Domain modules — flat async functions (Documenso/Cal.com style)
export * from "./sales/invoicing/create-invoice";
export * from "./crm/parties/customer-profile";
export * from "./inventory/stock/item-catalog";
export * from "./finance/payments/ledger";
export * from "./purchases/vendors/supplier-profile";
export * from "./purchases/purchase/purchase-order";
export * from "./finance/expenses/expense";
export * from "./sales/credit-notes/credit-note";

// Monitoring
export * from "./modules/monitoring/monitoring.service";

// Sprint 2 — AI Differentiators
export * from "./modules/ai/ai.service";

// Voice engine
export * from "./modules/voice/conversation";
export * from "./modules/voice/engine";
export * from "./modules/voice/session.service";
export * from "./modules/voice/task-queue";
export * from "./modules/voice/response-template";

// LLM / STT / TTS providers
export * from "./providers/types";
export * from "./providers/errors";
export * from "./providers/llm/index";
export * from "./providers/stt/index";
export * from "./providers/tts/index";

// Utilities
export * from "./utils/devanagari";
