/**
 * platform/sync/device-registry
 *
 * Feature: device registration tracking — register/deregister devices for push/offline sync.
 */
export interface DeviceRegistration {
    id: string;
    tenantId: string;
    userId: string;
    deviceId: string;
    platform: "ios" | "android" | "web" | "desktop";
    pushToken?: string;
    lastSeenAt: string;
    active: boolean;
}
export declare function registerDevice(_tenantId: string, _userId: string, _input: Omit<DeviceRegistration, "id" | "tenantId" | "userId" | "lastSeenAt" | "active">): Promise<DeviceRegistration>;
export declare function deregisterDevice(_deviceId: string): Promise<void>;
export declare function listDevices(_tenantId: string, _userId?: string): Promise<DeviceRegistration[]>;
//# sourceMappingURL=index.d.ts.map