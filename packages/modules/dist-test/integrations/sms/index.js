"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendViaMsg91 = sendViaMsg91;
exports.sendViaFast2Sms = sendViaFast2Sms;
/** MSG91 stub — configure MSG91_AUTH_KEY in env */
async function sendViaMsg91(msg) {
    const key = process.env["MSG91_AUTH_KEY"];
    if (!key)
        return { success: false, error: "MSG91_AUTH_KEY not set" };
    return { success: false, error: "MSG91 integration not fully implemented" };
}
/** Fast2SMS stub — configure FAST2SMS_API_KEY in env */
async function sendViaFast2Sms(msg) {
    const key = process.env["FAST2SMS_API_KEY"];
    if (!key)
        return { success: false, error: "FAST2SMS_API_KEY not set" };
    return { success: false, error: "Fast2SMS integration not fully implemented" };
}
//# sourceMappingURL=index.js.map