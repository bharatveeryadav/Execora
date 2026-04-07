/**
 * system/notifications
 *
 * Feature: in-app notification system — alert business owners of system events.
 * e.g., low stock alert, payment received, backup complete.
 * Stub — notification_event table required (⏳).
 */
export type NotificationCategory =
  | "stock_alert" | "payment_received" | "invoice_overdue"
  | "backup_complete" | "system_error" | "subscription";
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
export async function listNotifications(
  tenantId: string,
  _userId?: string,
  _onlyUnread = false
): Promise<AppNotification[]> {
  return [];
}
export async function markNotificationRead(_id: string): Promise<boolean> {
  return false;
}
export async function createNotification(
  notif: Omit<AppNotification, "id" | "isRead" | "createdAt">
): Promise<AppNotification> {
  return { ...notif, id: `N-${Date.now()}`, isRead: false, createdAt: new Date() };
}
