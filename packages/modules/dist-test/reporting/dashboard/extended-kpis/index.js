"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExtendedKpis = getExtendedKpis;
async function getExtendedKpis(_tenantId, _dateRange) {
    return {
        tenantId: _tenantId,
        periodLabel: "",
        totalRevenue: 0,
        totalExpenses: 0,
        grossProfit: 0,
        grossMarginPercent: 0,
        totalTaxCollected: 0,
        totalPaymentsReceived: 0,
        totalOutstanding: 0,
        newCustomers: 0,
        repeatCustomers: 0,
        invoiceCount: 0,
        averageInvoiceValue: 0,
        topProducts: [],
        topCustomers: [],
    };
}
//# sourceMappingURL=index.js.map