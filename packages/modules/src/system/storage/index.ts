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
export async function listStorageObjects(
  _tenantId: string,
  _prefix?: string
): Promise<StorageObject[]> {
  return [];
}
export async function getStorageUsage(
  _tenantId: string
): Promise<{ totalFiles: number; totalBytes: number }> {
  return { totalFiles: 0, totalBytes: 0 };
}
