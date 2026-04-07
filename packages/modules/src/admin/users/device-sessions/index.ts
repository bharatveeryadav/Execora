/**
 * admin/users/device-sessions
 *
 * Feature: mobile device session management — list/revoke active device sessions per user.
 */
export interface DeviceSession {
  id: string;
  userId: string;
  tenantId: string;
  deviceId: string;
  platform: "ios" | "android" | "web" | "desktop";
  deviceName?: string;
  ipAddress?: string;
  createdAt: string;
  lastActiveAt: string;
}

export async function listDeviceSessions(
  _tenantId: string,
  _userId: string,
): Promise<DeviceSession[]> {
  return [];
}

export async function revokeDeviceSession(_sessionId: string): Promise<void> {}

export async function revokeAllDeviceSessions(
  _tenantId: string,
  _userId: string,
): Promise<void> {}
