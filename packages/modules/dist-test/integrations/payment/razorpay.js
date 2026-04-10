"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRazorpayOrder = createRazorpayOrder;
exports.verifyRazorpayPayment = verifyRazorpayPayment;
async function createRazorpayOrder(_input) {
    throw new Error("Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
}
async function verifyRazorpayPayment(_orderId, _paymentId, _signature) {
    throw new Error("Razorpay not configured.");
}
//# sourceMappingURL=razorpay.js.map