/**
 * system/storage
 *
 * Feature: object storage policy — upload, read, delete, quota tracking.
 * Source of truth: MinIO via @execora/core storage adapter.
 */
export interface StorageObject {
    key: string;
    tenantId: string;
    bucket: string;
    sizeBytes: number;
    contentType: string;
    url?: string;
    uploadedAt: Date;
}
export declare function listStorageObjects(_tenantId: string, _prefix?: string): Promise<StorageObject[]>;
export declare function getStorageUsage(_tenantId: string): Promise<{
    totalFiles: number;
    totalBytes: number;
}>;
//# sourceMappingURL=index.d.ts.map