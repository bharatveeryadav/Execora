"use strict";
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
// ── Customer profiles ─────────────────────────────────────────────────────────
__exportStar(require("./parties/customer-profile"), exports);
// ── Communication ─────────────────────────────────────────────────────────────
// reminder-schedule: schedule / cancel / modify / bulk-schedule reminders
__exportStar(require("./communication/reminder-schedule"), exports);
// reminder-dispatch: worker-layer ops (mark sent/failed, compute occurrence)
__exportStar(require("./communication/reminder-dispatch"), exports);
// comm-preferences: customer channel opt-ins (WhatsApp, email, SMS)
__exportStar(require("./communication/comm-preferences"), exports);
__exportStar(require("./parties/party-ledger"), exports);
__exportStar(require("./parties/credit-limit"), exports);
__exportStar(require("./parties/supplier-profile"), exports);
__exportStar(require("./communication/history"), exports);
//# sourceMappingURL=index.js.map