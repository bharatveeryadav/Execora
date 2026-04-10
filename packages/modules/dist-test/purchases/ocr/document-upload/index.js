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
exports.retryOcrJob = exports.listOcrJobs = exports.getOcrJob = exports.createOcrJob = void 0;
/**
 * purchases/ocr/document-upload
 *
 * Feature: enqueue OCR scan jobs for supplier bills and product catalogs.
 * Owner: purchases domain
 * Source of truth: ocr/ocr.service.ts
 * Write path: createOcrJob, retryOcrJob
 * Read path: getOcrJob, listOcrJobs
 */
__exportStar(require("./contracts/commands"), exports);
var ocr_service_1 = require("../../../ocr/ocr.service");
Object.defineProperty(exports, "createOcrJob", { enumerable: true, get: function () { return ocr_service_1.createOcrJob; } });
Object.defineProperty(exports, "getOcrJob", { enumerable: true, get: function () { return ocr_service_1.getOcrJob; } });
Object.defineProperty(exports, "listOcrJobs", { enumerable: true, get: function () { return ocr_service_1.listOcrJobs; } });
Object.defineProperty(exports, "retryOcrJob", { enumerable: true, get: function () { return ocr_service_1.retryOcrJob; } });
//# sourceMappingURL=index.js.map