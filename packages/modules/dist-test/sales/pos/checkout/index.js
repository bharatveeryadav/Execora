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
exports.confirmDraft = void 0;
/**
 * sales/pos/checkout
 *
 * Feature: finalise a cart-session draft into a confirmed invoice.
 * Owner: sales/pos domain
 * Write path: confirmDraft (re-exported here for checkout flow)
 */
__exportStar(require("./contracts/commands"), exports);
var draft_1 = require("../cart-session/draft");
Object.defineProperty(exports, "confirmDraft", { enumerable: true, get: function () { return draft_1.confirmDraft; } });
//# sourceMappingURL=index.js.map