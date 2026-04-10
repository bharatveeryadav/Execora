"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFeatureEnabled = isFeatureEnabled;
exports.getEnabledFeatures = getEnabledFeatures;
const DEFAULT_FLAGS = {
    voice_assistant: true,
    e_invoicing: false,
    e_waybill: false,
    multi_warehouse: false,
    barcode_scanner: true,
    ecommerce_sync: false,
    payment_gateway: false,
    ocr_receipts: true,
    gstr3b_filing: false,
};
function isFeatureEnabled(flag, _tenantId) {
    return DEFAULT_FLAGS[flag] ?? false;
}
function getEnabledFeatures(_tenantId) {
    return Object.keys(DEFAULT_FLAGS).filter(f => DEFAULT_FLAGS[f]);
}
//# sourceMappingURL=index.js.map