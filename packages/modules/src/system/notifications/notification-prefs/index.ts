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

export async function getNotificationPrefs(
  _tenantId: string,
  _userId: string
): Promise<NotificationPrefs> {
  return {
    userId: _userId,
    tenantId: _tenantId,
    channels: { email: true, sms: false, whatsapp: false, push: false },
  };
}

export async function updateNotificationPrefs(
  _tenantId: string,
  _userId: string,
  _prefs: Partial<Pick<NotificationPrefs, "channels" | "quietHoursStart" | "quietHoursEnd">>
): Promise<NotificationPrefs> {
  throw new Error("Not implemented");
}
