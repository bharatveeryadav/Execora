"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSummaryRange = exports.getDailySummary = void 0;
/**
 * reporting/sales-reports/daily-summary
 *
 * READ-ONLY. Daily sales summary + date-range summaries.
 * Source of truth: sales/invoice.ts
 */
var invoice_1 = require("../../../sales/invoice");
Object.defineProperty(exports, "getDailySummary", { enumerable: true, get: function () { return invoice_1.getDailySummary; } });
Object.defineProperty(exports, "getSummaryRange", { enumerable: true, get: function () { return invoice_1.getSummaryRange; } });
//# sourceMappingURL=index.js.map