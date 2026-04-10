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
export declare function listDeviceSessions(_tenantId: string, _userId: string): Promise<DeviceSession[]>;
export declare function revokeDeviceSession(_sessionId: string): Promise<void>;
export declare function revokeAllDeviceSessions(_tenantId: string, _userId: string): Promise<void>;
//# sourceMappingURL=index.d.ts.map