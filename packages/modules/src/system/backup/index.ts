/**
 * system/backup
 *
 * Feature: on-demand and scheduled tenant data backup — export to MinIO / S3.
 * Stub — requires backup job scheduler (⏳).
 */
export interface BackupJob {
  id: string;
  tenantId?: string;
  type: "full" | "incremental";
  status: "pending" | "running" | "completed" | "failed";
  storageKey?: string;
  sizeBytes?: number;
  startedAt: Date;
  completedAt?: Date;
}
export async function triggerBackup(
  tenantId?: string,
  type: BackupJob["type"] = "full"
): Promise<BackupJob> {
  return { id: `BK-${Date.now()}`, tenantId, type, status: "pending", startedAt: new Date() };
}
export async function listBackups(_tenantId?: string): Promise<BackupJob[]> {
  return [];
}
