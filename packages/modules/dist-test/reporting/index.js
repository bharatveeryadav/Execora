"use strict";
/**
 * Reporting Domain
 *
 * READ-ONLY. All report generation — no writes, no state mutations.
 * Imports from finance, sales, and compliance domains via their own
 * source-of-truth files.
 *
 * Sub-domains (per 02-domain-modules.md):
 *  - finance-reports:   aging-report, payment-velocity, day-book,
 *                       account-statement, outstanding-receivables, profit-loss
 *  - sales-reports:     daily-summary
 *  - gst-reports:       gst-read-model (GSTR-1 data)
 *  - inventory-reports: stock-report (low-stock, expiry)
 *
 * Dependency rule: read-only, no writes permitted.
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
exports.getLowOverstockReport = exports.getPartyWiseSalesReport = void 0;
// ── Finance reports ───────────────────────────────────────────────────────────
__exportStar(require("./finance-reports/aging-report"), exports);
__exportStar(require("./finance-reports/payment-velocity"), exports);
__exportStar(require("./finance-reports/day-book"), exports);
__exportStar(require("./finance-reports/account-statement"), exports);
__exportStar(require("./finance-reports/outstanding-receivables"), exports);
__exportStar(require("./finance-reports/profit-loss"), exports);
// ── Sales reports ─────────────────────────────────────────────────────────────
__exportStar(require("./sales-reports/daily-summary"), exports);
__exportStar(require("./sales-reports/item-performance"), exports);
var party_wise_1 = require("./sales-reports/party-wise");
Object.defineProperty(exports, "getPartyWiseSalesReport", { enumerable: true, get: function () { return party_wise_1.getPartyWiseSalesReport; } });
__exportStar(require("./sales-reports/rep-performance"), exports);
__exportStar(require("./sales-reports/returns-rate"), exports);
// ── GST reports ───────────────────────────────────────────────────────────────
__exportStar(require("./gst-reports/gst-read-model"), exports);
__exportStar(require("./gst-reports/hsn-summary"), exports);
__exportStar(require("./gst-reports/tax-collected"), exports);
__exportStar(require("./gst-reports/input-credit"), exports);
// ── Inventory reports ─────────────────────────────────────────────────────────
__exportStar(require("./inventory-reports/stock-report"), exports);
__exportStar(require("./inventory-reports/fast-slow-movement"), exports);
__exportStar(require("./inventory-reports/valuation"), exports);
__exportStar(require("./inventory-reports/movement-ledger"), exports);
var low_overstock_1 = require("./inventory-reports/low-overstock");
Object.defineProperty(exports, "getLowOverstockReport", { enumerable: true, get: function () { return low_overstock_1.getLowOverstockReport; } });
__exportStar(require("./inventory-reports/ageing"), exports);
__exportStar(require("./inventory-reports/batch-expiry"), exports);
// ── Party reports ─────────────────────────────────────────────────────────────
__exportStar(require("./party-reports"), exports);
__exportStar(require("./party-reports/dso"), exports);
// ── Dashboard ─────────────────────────────────────────────────────────────────
__exportStar(require("./dashboard/overview-cards"), exports);
__exportStar(require("./dashboard/extended-kpis"), exports);
// ── Finance reports ───────────────────────────────────────────────────────────
__exportStar(require("./finance-reports/balance-sheet-report"), exports);
//# sourceMappingURL=index.js.map