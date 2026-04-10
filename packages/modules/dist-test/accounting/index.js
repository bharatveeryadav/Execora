"use strict";
/**
 * Accounting Module
 *
 * Covers: ledger queries, payment recording, mixed payments, credit notes
 * reversal, expense / cashbook management, and advanced financial reporting
 * (P&L, aging report, payment velocity).
 *
 * Surfaces:
 *  - Flat async functions  → imported directly for API route handlers
 *  - ledgerService         → singleton class with report-generation methods
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
// ── Payments & ledger (flat functions + LedgerEntryRecord types) ──────────────
__exportStar(require("./payments/ledger"), exports);
// ── Expenses & cashbook ───────────────────────────────────────────────────────
__exportStar(require("./expenses/expense"), exports);
// ── LedgerService — P&L, aging, payment velocity ─────────────────────────────
__exportStar(require("./ledger/ledger.service"), exports);
// ── Financial Reports ─────────────────────────────────────────────────────────
// Shared report types (AgingReport, PaymentVelocityReport, DayBookReport, …)
__exportStar(require("./reports/types"), exports);
// Accounts-receivable aging (0–30, 31–60, 61–90, 91+ day buckets)
__exportStar(require("./reports/aging-report"), exports);
// Payment velocity analysis (avg days-to-pay, collection rate per customer)
__exportStar(require("./reports/payment-velocity"), exports);
// Day book — chronological daily journal with opening/closing cash balance
__exportStar(require("./reports/day-book"), exports);
// Customer account statement with running balance
__exportStar(require("./reports/account-statement"), exports);
// Outstanding receivables — all pending/partial invoices
__exportStar(require("./reports/outstanding-receivables"), exports);
// ── P&L, GSTR-1 reports, Indian FY helpers ────────────────────────────────────
// getPnlReport, getItemwisePnlReport, gstr1Service, PnlReport, PnlMonthEntry,
// Gstr1Report, Gstr1B2BEntry, getIndianFY, indianFYRange, INDIAN_STATE_CODES
__exportStar(require("./gst/gstr1.service"), exports);
// ── Credit Notes (accounting adjustment documents) ───────────────────────────
// listCreditNotes, getCreditNoteById, createCreditNote, issueCreditNote,
// cancelCreditNote, deleteCreditNote + CreateCreditNoteInput types
__exportStar(require("./credit-notes/credit-note"), exports);
//# sourceMappingURL=index.js.map