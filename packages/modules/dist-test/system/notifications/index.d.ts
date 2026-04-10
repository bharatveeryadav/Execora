/**
 * system/notifications
 *
 * Feature: in-app notification system — alert business owners of system events.
 * e.g., low stock alert, payment received, backup complete.
 * Stub — notification_event table required (⏳).
 */
export type NotificationCategory = "stock_alert" | "payment_received" | "invoice_overdue" | "backup_complete" | "system_error" | "subscription";
export interface AppNotification {
    id: string;
    tenantId: string;
    userId?: string;
    category: NotificationCategory;
    title: string;
    body: string;
    isRead: boolean;
    link?: string;
    createdAt: Date;
}
export declare function listNotifications(tenantId: string, _userId?: string, _onlyUnread?: boolean): Promise<AppNotification[]>;
export declare function markNotificationRead(_id: string): Promise<boolean>;
export declare function createNotification(notif: Omit<AppNotification, "id" | "isRead" | "createdAt">): Promise<AppNotification>;
//# sourceMappingURL=index.d.ts.map