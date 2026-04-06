/**
 * Execora EventBus — Medusa-inspired dual-transport domain event system.
 *
 * Two transports from a single `eventBus.emit()` call:
 *   1. In-process Node.js EventEmitter  → instant WebSocket fan-out / same-request side effects
 *   2. BullMQ `domain-events` queue     → durable async side effects (stock deduction, ledger posts, etc.)
 *
 * Usage (producer — inside a route handler after a mutation):
 *   import { eventBus, DOMAIN_EVENTS } from '@execora/core';
 *   await eventBus.emit({ name: DOMAIN_EVENTS.INVOICE_CREATED, data: { tenantId, ... }, metadata: { source: 'invoicing', action: 'created', timestamp: new Date().toISOString() } });
 *
 * Usage (in-process consumer — in API bootstrap for WebSocket fan-out):
 *   eventBus.on('InvoiceCreated', (event) => broadcaster.send(event.data.tenantId, 'invoice:created', event.data));
 *
 * Usage (BullMQ consumer — in workers.ts for async side effects):
 *   The domain-events Worker receives jobs whose `job.name` equals the event name.
 *   Register handlers via `eventBus.onAsync('InvoiceCreated', handler)`.
 */

import EventEmitter from "node:events";
import type {
  DomainEvent,
  DomainEventName,
  DomainEventPayloadMap,
} from "@execora/types";
import { eventsQueue } from "./queue";
import { logger } from "./logger";

// ── Real-time push channel ───────────────────────────────────────────────────
// In-process Node.js EventEmitter used for instant WebSocket fan-out.
// EventEmitter has a default max-listeners warning at 10; raise it to avoid
// spurious warnings as more event handlers are registered at boot.
const pushChannel = new EventEmitter();
pushChannel.setMaxListeners(50);

// ── Reaction registry ─────────────────────────────────────────────────────────
// Async handlers registered at worker startup via eventBus.onAsync().
// The domain-events BullMQ Worker dispatches to these by job.name.
type ReactionHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;
const reactionRegistry = new Map<string, ReactionHandler>();

// ── Public API ────────────────────────────────────────────────────────────────

export const eventBus = {
  /**
   * Emit a domain event.
   * - Fires the in-process EventEmitter synchronously (for WebSocket fan-out).
   * - Enqueues a BullMQ job for durable async processing (stock, ledger, etc.).
   */
  async emit<K extends DomainEventName>(
    event: DomainEvent<DomainEventPayloadMap[K]>,
  ): Promise<void> {
    // 1. Real-time push — synchronous, for WebSocket broadcaster
    pushChannel.emit(event.name, event);

    // 2. BullMQ — async, durable
    try {
      await eventsQueue.add(event.name, event, {
        jobId: event.metadata.eventGroupId
          ? `${event.name}:${event.metadata.eventGroupId}`
          : undefined,
      });
    } catch (err) {
      logger.error(
        { err, eventName: event.name },
        "eventBus: failed to enqueue domain event",
      );
      // Do not rethrow — in-process delivery already succeeded; BullMQ failure
      // should not break the HTTP response. Logged for alerting.
    }
  },

  /**
   * Register a real-time listener (synchronous, same Node.js process).
   * Typical use: WebSocket broadcaster fan-out, registered at API boot.
   */
  on<K extends DomainEventName>(
    name: K,
    handler: (event: DomainEvent<DomainEventPayloadMap[K]>) => void,
  ): void {
    pushChannel.on(name, handler as (event: DomainEvent<unknown>) => void);
  },

  /**
   * Register an async reaction handler (called by the BullMQ domain-events Worker).
   * Typical use: inventory stock deduction, accounting ledger post, e-invoice trigger.
   * Registered in workers.ts at worker startup.
   */
  onAsync<K extends DomainEventName>(
    name: K,
    handler: (event: DomainEvent<DomainEventPayloadMap[K]>) => Promise<void>,
  ): void {
    reactionRegistry.set(name, handler as ReactionHandler);
  },

  /**
   * Route a BullMQ job to its registered reaction handler.
   * Called by the reactionWorker for each dequeued domain-events job.
   */
  async react(event: DomainEvent<unknown>): Promise<void> {
    const handler = reactionRegistry.get(event.name);
    if (!handler) {
      logger.debug(
        { eventName: event.name },
        "eventBus: no reaction handler registered, skipping",
      );
      return;
    }
    await handler(event);
  },
};

// ── Convenience factory ───────────────────────────────────────────────────────
// Creates a typed DomainEvent envelope with sane defaults.
export function createEvent<K extends DomainEventName>(
  name: K,
  data: DomainEventPayloadMap[K],
  options: { source: string; action: string; eventGroupId?: string } = {
    source: "unknown",
    action: "unknown",
  },
): DomainEvent<DomainEventPayloadMap[K]> {
  return {
    name,
    data,
    metadata: {
      source: options.source,
      action: options.action,
      timestamp: new Date().toISOString(),
      eventGroupId: options.eventGroupId,
    },
  };
}
