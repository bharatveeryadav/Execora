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
export * from "./finance-reports/aging-report";
export * from "./finance-reports/payment-velocity";
export * from "./finance-reports/day-book";
export * from "./finance-reports/account-statement";
export * from "./finance-reports/outstanding-receivables";
export * from "./finance-reports/profit-loss";
export * from "./sales-reports/daily-summary";
export * from "./sales-reports/item-performance";
export { PartyWiseSalesRow, getPartyWiseSalesReport } from "./sales-reports/party-wise";
export * from "./sales-reports/rep-performance";
export * from "./sales-reports/returns-rate";
export * from "./gst-reports/gst-read-model";
export * from "./gst-reports/hsn-summary";
export * from "./gst-reports/tax-collected";
export * from "./gst-reports/input-credit";
export * from "./inventory-reports/stock-report";
export * from "./inventory-reports/fast-slow-movement";
export * from "./inventory-reports/valuation";
export * from "./inventory-reports/movement-ledger";
export { StockAlertType, StockAlertRow, getLowOverstockReport } from "./inventory-reports/low-overstock";
export * from "./inventory-reports/ageing";
export * from "./inventory-reports/batch-expiry";
export * from "./party-reports";
export * from "./party-reports/dso";
export * from "./dashboard/overview-cards";
export * from "./dashboard/extended-kpis";
export * from "./finance-reports/balance-sheet-report";
//# sourceMappingURL=index.d.ts.map