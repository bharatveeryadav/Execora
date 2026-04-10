"use strict";
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
exports.getRecentTransactions = exports.getLedgerSummary = exports.getCustomerLedger = exports.recordMixedPayment = exports.recordPayment = void 0;
/**
 * finance/payments/payment-in
 *
 * Feature: record incoming customer payments and apply to unpaid invoices.
 * Owner: finance domain
 * Source of truth: accounting/payment.ts
 * Write path: recordPayment, recordMixedPayment
 * Read path: getCustomerLedger, getLedgerSummary, getRecentTransactions
 */
__exportStar(require("./contracts/commands"), exports);
__exportStar(require("./contracts/dto"), exports);
var ledger_1 = require("../../../accounting/payments/ledger");
Object.defineProperty(exports, "recordPayment", { enumerable: true, get: function () { return ledger_1.recordPayment; } });
Object.defineProperty(exports, "recordMixedPayment", { enumerable: true, get: function () { return ledger_1.recordMixedPayment; } });
Object.defineProperty(exports, "getCustomerLedger", { enumerable: true, get: function () { return ledger_1.getCustomerLedger; } });
Object.defineProperty(exports, "getLedgerSummary", { enumerable: true, get: function () { return ledger_1.getLedgerSummary; } });
Object.defineProperty(exports, "getRecentTransactions", { enumerable: true, get: function () { return ledger_1.getRecentTransactions; } });
//# sourceMappingURL=index.js.map