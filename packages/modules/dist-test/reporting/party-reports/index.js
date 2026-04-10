"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOverdueCustomers = exports.getOutstandingReceivables = exports.getAgingReport = void 0;
/**
 * reporting/party-reports
 *
 * Feature: party-level analytics — aging, outstanding, top customers, overdue.
 * Sources: accounting/reports/aging-report.ts, outstanding-receivables.ts, crm
 */
var aging_report_1 = require("../../accounting/reports/aging-report");
Object.defineProperty(exports, "getAgingReport", { enumerable: true, get: function () { return aging_report_1.getAgingReport; } });
var outstanding_receivables_1 = require("../../accounting/reports/outstanding-receivables");
Object.defineProperty(exports, "getOutstandingReceivables", { enumerable: true, get: function () { return outstanding_receivables_1.getOutstandingReceivables; } });
var customer_1 = require("../../crm/customer");
Object.defineProperty(exports, "listOverdueCustomers", { enumerable: true, get: function () { return customer_1.listOverdueCustomers; } });
//# sourceMappingURL=index.js.map