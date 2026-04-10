"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordGoodsReceived = void 0;
/**
 * inventory/movement/inward
 *
 * Feature: record goods-received (GRN) — stock inward movement.
 * Bridges to purchase order receipt functionality.
 * Source: purchases/purchase/purchase-order.ts → receivePurchaseOrder
 */
var purchase_order_1 = require("../../purchases/purchase/purchase-order");
Object.defineProperty(exports, "recordGoodsReceived", { enumerable: true, get: function () { return purchase_order_1.receivePurchaseOrder; } });
//# sourceMappingURL=inward.js.map