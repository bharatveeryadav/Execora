/**
 * system/offline
 *
 * Feature: system-side offline resilience — dead letter queue for failed jobs,
 * retry policies, circuit breaker status.
 * Source: BullMQ via @execora/core queue.
 */
export interface DeadLetterJobSummary {
  queue: string;
  failedCount: number;
  oldestFailedAt?: Date;
}
export async function getDeadLetterSummary(): Promise<DeadLetterJobSummary[]> {
  return [];
}
export async function requeueFailedJobs(_queue: string, _limit = 50): Promise<number> {
  return 0;
}
