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
/**
 * reporting/finance-reports
 *
 * Aggregates all finance report sub-modules.
 */
__exportStar(require("./aging-report"), exports);
__exportStar(require("./payment-velocity"), exports);
__exportStar(require("./day-book"), exports);
__exportStar(require("./account-statement"), exports);
__exportStar(require("./outstanding-receivables"), exports);
__exportStar(require("./profit-loss"), exports);
__exportStar(require("./balance-sheet-report"), exports);
//# sourceMappingURL=index.js.map