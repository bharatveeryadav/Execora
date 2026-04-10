"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitPrintJob = submitPrintJob;
exports.openCashDrawer = openCashDrawer;
async function submitPrintJob(content, options = {}) {
    return {
        id: `PJ-${Date.now()}`,
        content,
        options,
        status: "queued",
        createdAt: new Date(),
    };
}
async function openCashDrawer() {
    return false;
}
//# sourceMappingURL=index.js.map