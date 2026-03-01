import { ExecutionResult } from '@execora/types';
export interface Task {
    id: string;
    conversationId: string;
    intent: string;
    entities: any;
    status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    result?: ExecutionResult;
    error?: string;
    priority: number;
}
declare class TaskQueueService {
    private queues;
    private maxConcurrentPerSession;
    private processingInterval;
    /**
     * Get or create task queue for conversation
     */
    private getQueue;
    /**
     * Add a task to the queue
     */
    addTask(conversationId: string, intent: string, entities: any, priority?: number): string;
    /**
     * Get task by ID
     */
    getTask(conversationId: string, taskId: string): Task | null;
    /**
     * Get all tasks for conversation (sorted by status)
     */
    getTasks(conversationId: string): Task[];
    /**
     * Mark task as running
     */
    setTaskRunning(conversationId: string, taskId: string): boolean;
    /**
     * Mark task as completed
     */
    completeTask(conversationId: string, taskId: string, result: ExecutionResult): boolean;
    /**
     * Mark task as failed
     */
    failTask(conversationId: string, taskId: string, error: string): boolean;
    /**
     * Cancel a task (if queued or running)
     */
    cancelTask(conversationId: string, taskId: string): boolean;
    /**
     * Get next ready task to execute
     */
    getNextReadyTask(conversationId: string): Task | null;
    /**
     * Get queue stats
     */
    getQueueStats(conversationId: string): {
        queued: number;
        running: number;
        completed: number;
        failed: number;
        cancelled: number;
        total: number;
    } | {
        queued: number;
        running: number;
        completed: number;
        failed: number;
        cancelled: number;
    };
    /**
     * Clean old completed tasks (older than 5 minutes)
     */
    cleanupCompletedTasks(conversationId: string): number;
    /**
     * Clear all tasks for conversation (on session end)
     */
    clearConversationQueue(conversationId: string): void;
}
export declare const taskQueueService: TaskQueueService;
export {};
//# sourceMappingURL=task-queue.d.ts.map