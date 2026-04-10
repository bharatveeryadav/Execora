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
exports.reversePayment = exports.addCredit = void 0;
/**
 * finance/payments/settlement
 *
 * Feature: credit balance management and payment reversal.
 * Owner: finance domain
 * Write path: addCredit, reversePayment
 */
__exportStar(require("./contracts/commands"), exports);
var ledger_1 = require("../../../accounting/payments/ledger");
Object.defineProperty(exports, "addCredit", { enumerable: true, get: function () { return ledger_1.addCredit; } });
Object.defineProperty(exports, "reversePayment", { enumerable: true, get: function () { return ledger_1.reversePayment; } });
//# sourceMappingURL=index.js.map