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
 * sales/invoicing
 *
 * Aggregates all invoicing sub-modules: core CRUD, document types, output, and
 * numbering. Parties and reminders are available via their own sub-paths.
 */
// ── Core invoicing ────────────────────────────────────────────────────────────
__exportStar(require("./create-invoice"), exports);
__exportStar(require("./update-invoice-status"), exports);
__exportStar(require("./returns"), exports);
__exportStar(require("./template-render"), exports);
__exportStar(require("./numbering"), exports);
// ── Document types ────────────────────────────────────────────────────────────
__exportStar(require("./documents"), exports);
// ── Output (PDF, preview, dispatch) ──────────────────────────────────────────
__exportStar(require("./output"), exports);
//# sourceMappingURL=index.js.map