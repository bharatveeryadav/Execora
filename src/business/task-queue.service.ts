import { logger } from '../lib/logger';
import { ExecutionResult } from '../types';

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
    priority: number; // Higher = run first
}

interface TaskQueueContext {
    tasks: Map<string, Task>;
    running: Set<string>;
    maxConcurrent: number;
    processingTimer?: NodeJS.Timeout;
}

class TaskQueueService {
    private queues: Map<string, TaskQueueContext> = new Map();
    private maxConcurrentPerSession = 3; // Allow up to 3 parallel tasks per session
    private processingInterval = 100; // Check queue every 100ms

    /**
     * Get or create task queue for conversation
     */
    private getQueue(conversationId: string): TaskQueueContext {
        if (!this.queues.has(conversationId)) {
            this.queues.set(conversationId, {
                tasks: new Map(),
                running: new Set(),
                maxConcurrent: this.maxConcurrentPerSession,
            });
        }
        return this.queues.get(conversationId)!;
    }

    /**
     * Add a task to the queue
     */
    addTask(
        conversationId: string,
        intent: string,
        entities: any,
        priority: number = 0
    ): string {
        const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const queue = this.getQueue(conversationId);

        const task: Task = {
            id: taskId,
            conversationId,
            intent,
            entities,
            status: 'QUEUED',
            createdAt: new Date(),
            priority,
        };

        queue.tasks.set(taskId, task);

        logger.info(
            { taskId, conversationId, intent, priority, queueSize: queue.tasks.size },
            '📋 Task added to queue'
        );

        return taskId;
    }

    /**
     * Get task by ID
     */
    getTask(conversationId: string, taskId: string): Task | null {
        const queue = this.queues.get(conversationId);
        return queue?.tasks.get(taskId) || null;
    }

    /**
     * Get all tasks for conversation (sorted by status)
     */
    getTasks(conversationId: string): Task[] {
        const queue = this.queues.get(conversationId);
        if (!queue) return [];

        return Array.from(queue.tasks.values())
            .sort((a, b) => {
                // Running first, then queued by priority, then completed/failed
                const statusOrder = { RUNNING: 0, QUEUED: 1, COMPLETED: 2, FAILED: 3, CANCELLED: 4 };
                const statusDiff = statusOrder[a.status] - statusOrder[b.status];
                if (statusDiff !== 0) return statusDiff;
                return b.priority - a.priority;
            });
    }

    /**
     * Mark task as running
     */
    setTaskRunning(conversationId: string, taskId: string): boolean {
        const queue = this.queues.get(conversationId);
        if (!queue) return false;

        const task = queue.tasks.get(taskId);
        if (!task || task.status !== 'QUEUED') return false;

        task.status = 'RUNNING';
        task.startedAt = new Date();
        queue.running.add(taskId);

        logger.info({ taskId, conversationId }, '▶️ Task started running');
        return true;
    }

    /**
     * Mark task as completed
     */
    completeTask(conversationId: string, taskId: string, result: ExecutionResult): boolean {
        const queue = this.queues.get(conversationId);
        if (!queue) return false;

        const task = queue.tasks.get(taskId);
        if (!task || task.status !== 'RUNNING') return false;

        task.status = 'COMPLETED';
        task.completedAt = new Date();
        task.result = result;
        queue.running.delete(taskId);

        logger.info(
            {
                taskId,
                conversationId,
                duration: task.completedAt.getTime() - (task.startedAt?.getTime() || 0),
                success: result.success,
            },
            '✅ Task completed'
        );

        return true;
    }

    /**
     * Mark task as failed
     */
    failTask(conversationId: string, taskId: string, error: string): boolean {
        const queue = this.queues.get(conversationId);
        if (!queue) return false;

        const task = queue.tasks.get(taskId);
        if (!task || task.status !== 'RUNNING') return false;

        task.status = 'FAILED';
        task.completedAt = new Date();
        task.error = error;
        queue.running.delete(taskId);

        logger.error(
            {
                taskId,
                conversationId,
                error,
                duration: task.completedAt.getTime() - (task.startedAt?.getTime() || 0),
            },
            '❌ Task failed'
        );

        return true;
    }

    /**
     * Cancel a task (if queued or running)
     */
    cancelTask(conversationId: string, taskId: string): boolean {
        const queue = this.queues.get(conversationId);
        if (!queue) return false;

        const task = queue.tasks.get(taskId);
        if (!task) return false;

        if (task.status === 'QUEUED' || task.status === 'RUNNING') {
            task.status = 'CANCELLED';
            task.completedAt = new Date();
            queue.running.delete(taskId);

            logger.info({ taskId, conversationId }, '🚫 Task cancelled');
            return true;
        }

        return false;
    }

    /**
     * Get next ready task to execute
     */
    getNextReadyTask(conversationId: string): Task | null {
        const queue = this.queues.get(conversationId);
        if (!queue || queue.running.size >= queue.maxConcurrent) {
            return null;
        }

        // Get highest priority queued task
        const tasks = Array.from(queue.tasks.values())
            .filter((t) => t.status === 'QUEUED')
            .sort((a, b) => b.priority - a.priority);

        return tasks.length > 0 ? tasks[0] : null;
    }

    /**
     * Get queue stats
     */
    getQueueStats(conversationId: string) {
        const queue = this.queues.get(conversationId);
        if (!queue) {
            return { queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
        }

        const stats = {
            queued: 0,
            running: 0,
            completed: 0,
            failed: 0,
            cancelled: 0,
            total: queue.tasks.size,
        };

        for (const task of queue.tasks.values()) {
            stats[task.status.toLowerCase() as keyof typeof stats]++;
        }

        return stats;
    }

    /**
     * Clean old completed tasks (older than 5 minutes)
     */
    cleanupCompletedTasks(conversationId: string): number {
        const queue = this.queues.get(conversationId);
        if (!queue) return 0;

        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        let cleaned = 0;

        for (const [taskId, task] of queue.tasks.entries()) {
            if (
                (task.status === 'COMPLETED' || task.status === 'FAILED' || task.status === 'CANCELLED') &&
                task.completedAt &&
                now - task.completedAt.getTime() > fiveMinutes
            ) {
                queue.tasks.delete(taskId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.info({ conversationId, cleaned }, '🧹 Cleaned old completed tasks');
        }

        return cleaned;
    }

    /**
     * Clear all tasks for conversation (on session end)
     */
    clearConversationQueue(conversationId: string): void {
        const queue = this.queues.get(conversationId);
        if (!queue) return;

        if (queue.processingTimer) {
            clearInterval(queue.processingTimer);
        }

        this.queues.delete(conversationId);
        logger.info({ conversationId }, '🗑️ Conversation queue cleared');
    }
}

export const taskQueueService = new TaskQueueService();
