"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDIAN_STATE_CODES = exports.indianFYRange = exports.getIndianFY = exports.gstr1Service = void 0;
/**
 * reporting/gst-reports/gst-read-model
 *
 * Feature: GST read model for GSTR-1 return data.
 * READ-ONLY — no mutations.
 * Owner: reporting domain
 * Source of truth: compliance/gst/gstr1 (which wraps accounting/gst/gstr1.service.ts)
 *
 * Read path: gstr1Service.generate() → B2B / B2CL / B2CS / HSN summaries
 * Utilities: getIndianFY, indianFYRange, INDIAN_STATE_CODES
 */
var gstr1_1 = require("../../../compliance/gst/gstr1");
Object.defineProperty(exports, "gstr1Service", { enumerable: true, get: function () { return gstr1_1.gstr1Service; } });
Object.defineProperty(exports, "getIndianFY", { enumerable: true, get: function () { return gstr1_1.getIndianFY; } });
Object.defineProperty(exports, "indianFYRange", { enumerable: true, get: function () { return gstr1_1.indianFYRange; } });
Object.defineProperty(exports, "INDIAN_STATE_CODES", { enumerable: true, get: function () { return gstr1_1.INDIAN_STATE_CODES; } });
//# sourceMappingURL=index.js.map