/**
 * system/notifications/notification-prefs
 *
 * Feature: per-user notification channel preferences — enable/disable email, SMS, WhatsApp, push.
 */
export type NotificationChannel = "email" | "sms" | "whatsapp" | "push";
export interface NotificationPrefs {
    userId: string;
    tenantId: string;
    channels: Record<NotificationChannel, boolean>;
    quietHoursStart?: string;
    quietHoursEnd?: string;
}
export declare function getNotificationPrefs(_tenantId: string, _userId: string): Promise<NotificationPrefs>;
export declare function updateNotificationPrefs(_tenantId: string, _userId: string, _prefs: Partial<Pick<NotificationPrefs, "channels" | "quietHoursStart" | "quietHoursEnd">>): Promise<NotificationPrefs>;
//# sourceMappingURL=index.d.ts.map