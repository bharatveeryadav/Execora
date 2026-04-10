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
 * sales/pos/cart-session
 *
 * Feature: draft bill staging — create, update, confirm, or discard in-progress bills.
 * Owner: sales/pos domain
 * Write path: createDraft, updateDraft, confirmDraft, discardDraft
 * Read path: listDrafts, getDraft
 */
__exportStar(require("./contracts/commands"), exports);
__exportStar(require("./contracts/queries"), exports);
__exportStar(require("./draft"), exports);
//# sourceMappingURL=index.js.map