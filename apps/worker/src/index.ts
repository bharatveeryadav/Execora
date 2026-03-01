/**
 * Standalone worker process entry point.
 *
 * Run with:  pnpm worker        (dev — tsx watch)
 *            pnpm start:worker  (production — compiled JS)
 *
 * All worker logic lives in packages/infrastructure/src/workers.ts — this file is
 * purely a process bootstrap so the worker can run as a separate process
 * (container / Kubernetes pod) for horizontal scaling.
 *
 * WARNING: DO NOT run this simultaneously with the embedded workers started
 * by the main API server (apps/api → startWorkers()), as both consume
 * from the same BullMQ queues and will double-process jobs.
 */
import dotenv from 'dotenv';
dotenv.config();

import { startWorkers, closeWorkers, logger } from '@execora/infrastructure';

startWorkers();
logger.info('Standalone worker process ready');

// Keep process alive (BullMQ worker is event-driven, not a loop)
process.stdin.resume();

const shutdown = async () => {
  logger.info('Worker shutdown signal received');
  await closeWorkers();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
