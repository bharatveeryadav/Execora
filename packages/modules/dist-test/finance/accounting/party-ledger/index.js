"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentTransactions = exports.getLedgerSummary = exports.getCustomerLedger = void 0;
/**
 * finance/accounting/party-ledger
 *
 * Feature: party ledger — read-only view of transactions per customer/supplier.
 */
var payment_1 = require("../../../accounting/payment");
Object.defineProperty(exports, "getCustomerLedger", { enumerable: true, get: function () { return payment_1.getCustomerLedger; } });
Object.defineProperty(exports, "getLedgerSummary", { enumerable: true, get: function () { return payment_1.getLedgerSummary; } });
Object.defineProperty(exports, "getRecentTransactions", { enumerable: true, get: function () { return payment_1.getRecentTransactions; } });
//# sourceMappingURL=index.js.map