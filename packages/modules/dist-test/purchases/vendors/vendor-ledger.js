"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVendorLedger = getVendorLedger;
async function getVendorLedger(tenantId, vendorId, _dateRange) {
    return {
        vendorId,
        tenantId,
        openingBalance: 0,
        entries: [],
        closingBalance: 0,
    };
}
//# sourceMappingURL=vendor-ledger.js.map