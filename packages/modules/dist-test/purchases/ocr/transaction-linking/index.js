"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkOcrToTransaction = linkOcrToTransaction;
async function linkOcrToTransaction(input) {
    return { ...input, linkedAt: new Date() };
}
//# sourceMappingURL=index.js.map