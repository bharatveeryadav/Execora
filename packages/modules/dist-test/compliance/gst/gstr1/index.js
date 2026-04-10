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
exports.INDIAN_STATE_CODES = exports.indianFYRange = exports.getIndianFY = exports.gstr1Service = void 0;
/**
 * compliance/gst/gstr1
 *
 * Feature: GSTR-1 outward supply return data (B2B, B2CL, B2CS, HSN).
 * Owner: compliance domain
 * Source of truth: accounting/gst/gstr1.service.ts
 * Read path: gstr1Service.generate, getIndianFY, indianFYRange
 */
__exportStar(require("./contracts/dto"), exports);
__exportStar(require("./contracts/queries"), exports);
var gstr1_service_1 = require("../../../accounting/gst/gstr1.service");
Object.defineProperty(exports, "gstr1Service", { enumerable: true, get: function () { return gstr1_service_1.gstr1Service; } });
Object.defineProperty(exports, "getIndianFY", { enumerable: true, get: function () { return gstr1_service_1.getIndianFY; } });
Object.defineProperty(exports, "indianFYRange", { enumerable: true, get: function () { return gstr1_service_1.indianFYRange; } });
Object.defineProperty(exports, "INDIAN_STATE_CODES", { enumerable: true, get: function () { return gstr1_service_1.INDIAN_STATE_CODES; } });
//# sourceMappingURL=index.js.map