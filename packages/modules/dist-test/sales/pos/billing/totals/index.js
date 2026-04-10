"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCartTotals = computeCartTotals;
function computeCartTotals(lines) {
    const subtotal = lines.reduce((s, l) => s + l.taxableAmount, 0);
    const taxAmount = lines.reduce((s, l) => s + l.taxAmount, 0);
    const discountAmount = lines.reduce((s, l) => s + l.discountAmount, 0);
    const raw = subtotal + taxAmount - discountAmount;
    const roundOff = Math.round(raw) - raw;
    return {
        subtotal,
        taxableAmount: subtotal,
        taxAmount,
        discountAmount,
        roundOff,
        grandTotal: Math.round(raw),
    };
}
//# sourceMappingURL=index.js.map