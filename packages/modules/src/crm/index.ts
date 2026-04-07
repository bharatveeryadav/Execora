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

// ── Customer profiles ─────────────────────────────────────────────────────────
export * from "./parties/customer-profile";

// ── Communication ─────────────────────────────────────────────────────────────
// reminder-schedule: schedule / cancel / modify / bulk-schedule reminders
export * from "./communication/reminder-schedule";
// reminder-dispatch: worker-layer ops (mark sent/failed, compute occurrence)
export * from "./communication/reminder-dispatch";
// comm-preferences: customer channel opt-ins (WhatsApp, email, SMS)
export * from "./communication/comm-preferences";
export * from "./parties/party-ledger";
export * from "./parties/credit-limit";
export * from "./parties/supplier-profile";
export * from "./communication/history";
