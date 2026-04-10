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
export declare function getDeadLetterSummary(): Promise<DeadLetterJobSummary[]>;
export declare function requeueFailedJobs(_queue: string, _limit?: number): Promise<number>;
//# sourceMappingURL=index.d.ts.map