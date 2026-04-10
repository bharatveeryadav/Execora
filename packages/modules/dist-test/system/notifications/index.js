"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotifications = listNotifications;
exports.markNotificationRead = markNotificationRead;
exports.createNotification = createNotification;
async function listNotifications(tenantId, _userId, _onlyUnread = false) {
    return [];
}
async function markNotificationRead(_id) {
    return false;
}
async function createNotification(notif) {
    return { ...notif, id: `N-${Date.now()}`, isRead: false, createdAt: new Date() };
}
//# sourceMappingURL=index.js.map