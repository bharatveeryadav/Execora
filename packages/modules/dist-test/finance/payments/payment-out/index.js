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
exports.reversePayment = void 0;
/**
 * finance/payments/payment-out
 *
 * Feature: outward payments — pay supplier/vendor, reverse payment.
 * Owner: finance domain
 * Source of truth: accounting/payment.ts
 *
 * Write path: reversePayment (record payment reversal / vendor payment)
 * Read path:  getCustomerLedger (via party ID — works for suppliers too)
 */
__exportStar(require("./contracts/commands"), exports);
var payment_1 = require("../../payment");
Object.defineProperty(exports, "reversePayment", { enumerable: true, get: function () { return payment_1.reversePayment; } });
//# sourceMappingURL=index.js.map