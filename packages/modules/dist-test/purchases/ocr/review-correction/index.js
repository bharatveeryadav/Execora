"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitOcrCorrection = submitOcrCorrection;
async function submitOcrCorrection(correction) {
    return {
        extractionId: correction.extractionId,
        status: "corrected",
        correctedAt: new Date(),
    };
}
//# sourceMappingURL=index.js.map