"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationPrefs = getNotificationPrefs;
exports.updateNotificationPrefs = updateNotificationPrefs;
async function getNotificationPrefs(_tenantId, _userId) {
    return {
        userId: _userId,
        tenantId: _tenantId,
        channels: { email: true, sms: false, whatsapp: false, push: false },
    };
}
async function updateNotificationPrefs(_tenantId, _userId, _prefs) {
    throw new Error("Not implemented");
}
//# sourceMappingURL=index.js.map