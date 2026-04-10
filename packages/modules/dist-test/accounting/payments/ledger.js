"use strict";
/**
 * Finance / Payments — payment recording and ledger queries.
 * Re-exports from the canonical flat domain file (finance/payment.ts).
 * Kept for backwards-compatibility with any existing imports.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentTransactions = exports.getLedgerSummary = exports.getCustomerLedger = exports.reversePayment = exports.addCredit = exports.recordMixedPayment = exports.recordPayment = void 0;
var payment_1 = require("../payment");
Object.defineProperty(exports, "recordPayment", { enumerable: true, get: function () { return payment_1.recordPayment; } });
Object.defineProperty(exports, "recordMixedPayment", { enumerable: true, get: function () { return payment_1.recordMixedPayment; } });
Object.defineProperty(exports, "addCredit", { enumerable: true, get: function () { return payment_1.addCredit; } });
Object.defineProperty(exports, "reversePayment", { enumerable: true, get: function () { return payment_1.reversePayment; } });
Object.defineProperty(exports, "getCustomerLedger", { enumerable: true, get: function () { return payment_1.getCustomerLedger; } });
Object.defineProperty(exports, "getLedgerSummary", { enumerable: true, get: function () { return payment_1.getLedgerSummary; } });
Object.defineProperty(exports, "getRecentTransactions", { enumerable: true, get: function () { return payment_1.getRecentTransactions; } });
//# sourceMappingURL=ledger.js.map