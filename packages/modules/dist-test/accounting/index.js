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
__exportStar(require("../finance/payments/ledger"), exports);
// ── Expenses & cashbook ───────────────────────────────────────────────────────
__exportStar(require("../finance/expenses/expense"), exports);
// ── LedgerService — P&L, aging, payment velocity ─────────────────────────────
__exportStar(require("../modules/ledger/ledger.service"), exports);
//# sourceMappingURL=index.js.map