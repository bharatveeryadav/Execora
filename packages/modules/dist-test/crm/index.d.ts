/**
 * CRM Domain
 *
 * Covers all customer relationship management: customer CRUD, balance tracking,
 * overdue monitoring, and communication preferences.
 *
 * Sub-domains (per 02-domain-modules.md):
 *  - parties:       customer-profile (canonical customer operations)
 *  - communication: reminder-schedule, reminder-dispatch, comm-preferences
 *
 * Dependency rule: foundational — no imports from other domains.
 * Source of truth: crm/customer.ts (voice-engine legacy: modules/customer/)
 */
export * from "./parties/customer-profile";
export * from "./communication/reminder-schedule";
export * from "./communication/reminder-dispatch";
export * from "./communication/comm-preferences";
export * from "./parties/party-ledger";
export * from "./parties/credit-limit";
export * from "./parties/supplier-profile";
export * from "./communication/history";
//# sourceMappingURL=index.d.ts.map