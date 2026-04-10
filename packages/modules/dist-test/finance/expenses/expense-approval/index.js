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
exports.approveExpense = approveExpense;
exports.rejectExpense = rejectExpense;
/**
 * finance/expenses/expense-approval
 *
 * Feature: expense approval workflow — approve or reject pending expenses.
 * Stub — approval workflow is planned (⏳).
 */
__exportStar(require("./contracts/commands"), exports);
async function approveExpense(cmd) {
    // TODO: persist approval status in DB
    return { success: true };
}
async function rejectExpense(cmd) {
    // TODO: persist rejection + notification
    return { success: true };
}
//# sourceMappingURL=index.js.map