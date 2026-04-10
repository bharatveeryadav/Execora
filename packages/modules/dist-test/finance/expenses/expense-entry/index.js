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
exports.getExpenseSummary = exports.listPurchases = exports.listExpenses = exports.createPurchase = exports.createExpense = void 0;
/**
 * finance/expenses/expense-entry
 *
 * Feature: business expense recording and listing.
 * Owner: finance domain
 * Source of truth: accounting/expenses/expense.ts
 * Write path: createExpense, createPurchase
 * Read path: listExpenses, listPurchases, getExpenseSummary
 */
__exportStar(require("./contracts/commands"), exports);
__exportStar(require("./contracts/dto"), exports);
var expense_1 = require("../../../accounting/expenses/expense");
Object.defineProperty(exports, "createExpense", { enumerable: true, get: function () { return expense_1.createExpense; } });
Object.defineProperty(exports, "createPurchase", { enumerable: true, get: function () { return expense_1.createPurchase; } });
Object.defineProperty(exports, "listExpenses", { enumerable: true, get: function () { return expense_1.listExpenses; } });
Object.defineProperty(exports, "listPurchases", { enumerable: true, get: function () { return expense_1.listPurchases; } });
Object.defineProperty(exports, "getExpenseSummary", { enumerable: true, get: function () { return expense_1.getExpenseSummary; } });
//# sourceMappingURL=index.js.map