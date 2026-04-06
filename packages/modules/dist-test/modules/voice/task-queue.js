"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskQueueService = void 0;
const core_1 = require("@execora/core");
class TaskQueueService {
    queues = new Map();
    maxConcurrentPerSession = 3; // Allow up to 3 parallel tasks per session
    processingInterval = 100; // Check queue every 100ms
    /**
     * Get or create task queue for conversation
     */
    getQueue(conversationId) {
        if (!this.queues.has(conversationId)) {
            this.queues.set(conversationId, {
                tasks: new Map(),
                running: new Set(),
                maxConcurrent: this.maxConcurrentPerSession,
            });
        }
        return this.queues.get(conversationId);
    }
    /**
     * Add a task to the queue
     */
    addTask(conversationId, intent, entities, priority = 0) {
        const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const queue = this.getQueue(conversationId);
        const task = {
            id: taskId,
            conversationId,
            intent,
            entities,
            status: 'QUEUED',
            createdAt: new Date(),
            priority,
        };
        queue.tasks.set(taskId, task);
        core_1.logger.info({ taskId, conversationId, intent, priority, queueSize: queue.tasks.size }, '📋 Task added to queue');
        return taskId;
    }
    /**
     * Get task by ID
     */
    getTask(conversationId, taskId) {
        const queue = this.queues.get(conversationId);
        return queue?.tasks.get(taskId) || null;
    }
    /**
     * Get all tasks for conversation (sorted by status)
     */
    getTasks(conversationId) {
        const queue = this.queues.get(conversationId);
        if (!queue)
            return [];
        return Array.from(queue.tasks.values())
            .sort((a, b) => {
            // Running first, then queued by priority, then completed/failed
            const statusOrder = { RUNNING: 0, QUEUED: 1, COMPLETED: 2, FAILED: 3, CANCELLED: 4 };
            const statusDiff = statusOrder[a.status] - statusOrder[b.status];
            if (statusDiff !== 0)
                return statusDiff;
            return b.priority - a.priority;
        });
    }
    /**
     * Mark task as running
     */
    setTaskRunning(conversationId, taskId) {
        const queue = this.queues.get(conversationId);
        if (!queue)
            return false;
        const task = queue.tasks.get(taskId);
        if (!task || task.status !== 'QUEUED')
            return false;
        task.status = 'RUNNING';
        task.startedAt = new Date();
        queue.running.add(taskId);
        core_1.logger.info({ taskId, conversationId }, '▶️ Task started running');
        return true;
    }
    /**
     * Mark task as completed
     */
    completeTask(conversationId, taskId, result) {
        const queue = this.queues.get(conversationId);
        if (!queue)
            return false;
        const task = queue.tasks.get(taskId);
        if (!task || task.status !== 'RUNNING')
            return false;
        task.status = 'COMPLETED';
        task.completedAt = new Date();
        task.result = result;
        queue.running.delete(taskId);
        core_1.logger.info({
            taskId,
            conversationId,
            duration: task.completedAt.getTime() - (task.startedAt?.getTime() || 0),
            success: result.success,
        }, '✅ Task completed');
        return true;
    }
    /**
     * Mark task as failed
     */
    failTask(conversationId, taskId, error) {
        const queue = this.queues.get(conversationId);
        if (!queue)
            return false;
        const task = queue.tasks.get(taskId);
        if (!task || task.status !== 'RUNNING')
            return false;
        task.status = 'FAILED';
        task.completedAt = new Date();
        task.error = error;
        queue.running.delete(taskId);
        core_1.logger.error({
            taskId,
            conversationId,
            error,
            duration: task.completedAt.getTime() - (task.startedAt?.getTime() || 0),
        }, '❌ Task failed');
        return true;
    }
    /**
     * Cancel a task (if queued or running)
     */
    cancelTask(conversationId, taskId) {
        const queue = this.queues.get(conversationId);
        if (!queue)
            return false;
        const task = queue.tasks.get(taskId);
        if (!task)
            return false;
        if (task.status === 'QUEUED' || task.status === 'RUNNING') {
            task.status = 'CANCELLED';
            task.completedAt = new Date();
            queue.running.delete(taskId);
            core_1.logger.info({ taskId, conversationId }, '🚫 Task cancelled');
            return true;
        }
        return false;
    }
    /**
     * Get next ready task to execute
     */
    getNextReadyTask(conversationId) {
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
    getQueueStats(conversationId) {
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
            stats[task.status.toLowerCase()]++;
        }
        return stats;
    }
    /**
     * Clean old completed tasks (older than 5 minutes)
     */
    cleanupCompletedTasks(conversationId) {
        const queue = this.queues.get(conversationId);
        if (!queue)
            return 0;
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        let cleaned = 0;
        for (const [taskId, task] of queue.tasks.entries()) {
            if ((task.status === 'COMPLETED' || task.status === 'FAILED' || task.status === 'CANCELLED') &&
                task.completedAt &&
                now - task.completedAt.getTime() > fiveMinutes) {
                queue.tasks.delete(taskId);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            core_1.logger.info({ conversationId, cleaned }, '🧹 Cleaned old completed tasks');
        }
        return cleaned;
    }
    /**
     * Clear all tasks for conversation (on session end)
     */
    clearConversationQueue(conversationId) {
        const queue = this.queues.get(conversationId);
        if (!queue)
            return;
        if (queue.processingTimer) {
            clearInterval(queue.processingTimer);
        }
        this.queues.delete(conversationId);
        core_1.logger.info({ conversationId }, '🗑️ Conversation queue cleared');
    }
}
exports.taskQueueService = new TaskQueueService();
//# sourceMappingURL=task-queue.js.map