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
exports.generatePnlPdf = exports.generateGstr1Pdf = exports.generateInvoicePdf = void 0;
/**
 * sales/invoicing/template-render
 *
 * Feature: render invoice PDFs for dispatch and storage.
 * Owner: sales domain
 * Read path: generateInvoicePdf, generateGstr1Pdf, generatePnlPdf
 */
__exportStar(require("./contracts/dto"), exports);
var pdf_1 = require("../../../utils/pdf");
Object.defineProperty(exports, "generateInvoicePdf", { enumerable: true, get: function () { return pdf_1.generateInvoicePdf; } });
Object.defineProperty(exports, "generateGstr1Pdf", { enumerable: true, get: function () { return pdf_1.generateGstr1Pdf; } });
Object.defineProperty(exports, "generatePnlPdf", { enumerable: true, get: function () { return pdf_1.generatePnlPdf; } });
//# sourceMappingURL=index.js.map