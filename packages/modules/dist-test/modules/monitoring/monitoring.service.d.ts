import { Decimal } from '@prisma/client/runtime/library';
export interface RecordEventInput {
    tenantId: string;
    userId?: string;
    eventType: string;
    entityType: string;
    entityId: string;
    amount?: number;
    description: string;
    meta?: Record<string, unknown>;
    severity?: 'info' | 'warning' | 'alert';
}
declare class MonitoringService {
    /**
     * Persist a monitoring event. Fire-and-forget — never throws so it cannot
     * break the primary transaction that called it.
     */
    recordEvent(input: RecordEventInput): Promise<void>;
    getEvents(tenantId: string, opts?: {
        limit?: number;
        offset?: number;
        eventType?: string;
        severity?: string;
        userId?: string;
        from?: Date;
        to?: Date;
        unreadOnly?: boolean;
    }): Promise<{
        events: ({
            user: {
                id: string;
                name: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
        } & {
            tenantId: string;
            id: string;
            createdAt: Date;
            userId: string | null;
            amount: Decimal | null;
            description: string;
            eventType: string;
            entityType: string;
            entityId: string;
            meta: import("@prisma/client/runtime/library").JsonValue;
            snapKey: string | null;
            severity: string;
            isRead: boolean;
        })[];
        total: number;
    }>;
    getUnreadAlertCount(tenantId: string): Promise<number>;
    markAllRead(tenantId: string): Promise<void>;
    markRead(tenantId: string, id: string): Promise<void>;
    getStats(tenantId: string, from: Date, to: Date): Promise<{
        byType: Record<string, number>;
        byEmployee: Record<string, {
            bills: number;
            payments: number;
            cancellations: number;
            totalAmount: number;
        }>;
        total: number;
        totalBillAmount: number;
        avgBillAmount: number;
        footfall: number;
        conversionRate: number | null;
        hourlyBills: Record<number, number>;
        peakHour: number | null;
    }>;
    /**
     * Record end-of-day cash reconciliation.
     * Stored as a monitoring event (eventType: cash.reconciliation) so no schema change needed.
     */
    recordCashReconciliation(tenantId: string, userId: string | undefined, date: string, actual: number, expected: number, note?: string): Promise<void>;
    /**
     * Get the latest cash reconciliation record for a given date.
     */
    getCashReconciliation(tenantId: string, date: string): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        userId: string | null;
        amount: Decimal | null;
        description: string;
        eventType: string;
        entityType: string;
        entityId: string;
        meta: import("@prisma/client/runtime/library").JsonValue;
        snapKey: string | null;
        severity: string;
        isRead: boolean;
    } | null>;
    getConfig(tenantId: string): Promise<{
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        enabled: boolean;
        snapsOnBills: boolean;
        snapsOnPayments: boolean;
        alertDiscountAbove: Decimal;
        alertCancelAbove: Decimal;
        alertBillAbove: Decimal | null;
        ownerPhoneAlert: boolean;
        cameraEnabled: boolean;
        cameraSource: string;
        ipCameraUrl: string | null;
        retentionDays: number;
    } | null>;
    /**
     * Store a JPEG snapshot to MinIO and attach it to the most recent matching
     * MonitoringEvent for this entity, or create a new snap-only event.
     */
    storeSnap(tenantId: string, userId: string | undefined, imageBuffer: Buffer, opts: {
        eventType: string;
        entityType: string;
        entityId: string;
        description?: string;
    }): Promise<{
        snapKey: string;
        eventId: string;
    }>;
    getSnapPresignedUrl(tenantId: string, snapKey: string): Promise<string>;
    upsertConfig(tenantId: string, data: Partial<{
        enabled: boolean;
        snapsOnBills: boolean;
        snapsOnPayments: boolean;
        alertDiscountAbove: number;
        alertCancelAbove: number;
        alertBillAbove: number | null;
        ownerPhoneAlert: boolean;
        cameraEnabled: boolean;
        cameraSource: string;
        ipCameraUrl: string | null;
        retentionDays: number;
    }>): Promise<{
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        enabled: boolean;
        snapsOnBills: boolean;
        snapsOnPayments: boolean;
        alertDiscountAbove: Decimal;
        alertCancelAbove: Decimal;
        alertBillAbove: Decimal | null;
        ownerPhoneAlert: boolean;
        cameraEnabled: boolean;
        cameraSource: string;
        ipCameraUrl: string | null;
        retentionDays: number;
    }>;
}
export declare const monitoringService: MonitoringService;
export {};
//# sourceMappingURL=monitoring.service.d.ts.map