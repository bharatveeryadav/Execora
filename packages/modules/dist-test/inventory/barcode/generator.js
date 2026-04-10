"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBarcode = generateBarcode;
function generateBarcode(productId, format = "ean13") {
    const value = format === "ean13"
        ? productId.replace(/\D/g, "").padStart(13, "0").slice(-13)
        : productId;
    return { productId, format, value, displayText: productId };
}
//# sourceMappingURL=generator.js.map