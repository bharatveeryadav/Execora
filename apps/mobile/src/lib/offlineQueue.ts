/**
 * Offline invoice queue (Sprint 18).
 * Bills created offline are stored here and synced when connection is restored.
 */
import { storage } from "./storage";
import type { CreateInvoicePayload } from "@execora/shared";

const QUEUE_KEY = "execora:offline_invoice_queue";
const PRODUCTS_CACHE_KEY = "execora:offline_products";
const CUSTOMERS_CACHE_KEY = "execora:offline_customers";

export interface QueuedInvoice {
  id: string;
  payload: CreateInvoicePayload;
  displayTotal: number;
  notesWithDue: string;
  createdAt: string;
}

function getQueue(): QueuedInvoice[] {
  try {
    const raw = storage.getString(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setQueue(queue: QueuedInvoice[]): void {
  storage.set(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueInvoice(
  payload: CreateInvoicePayload,
  displayTotal: number,
  notesWithDue: string
): string {
  const queue = getQueue();
  const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  queue.push({
    id,
    payload,
    displayTotal,
    notesWithDue,
    createdAt: new Date().toISOString(),
  });
  setQueue(queue);
  return id;
}

export function getQueuedInvoices(): QueuedInvoice[] {
  return getQueue();
}

export function removeFromQueue(id: string): void {
  const queue = getQueue().filter((q) => q.id !== id);
  setQueue(queue);
}

export function clearQueue(): void {
  setQueue([]);
}

// ── Product cache (for offline product search) ────────────────────────────────

export function cacheProducts(products: unknown[]): void {
  try {
    storage.set(PRODUCTS_CACHE_KEY, JSON.stringify(products));
  } catch {
    // ignore
  }
}

export function getCachedProducts(): unknown[] {
  try {
    const raw = storage.getString(PRODUCTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Customer cache ───────────────────────────────────────────────────────────

export function cacheCustomers(customers: unknown[]): void {
  try {
    storage.set(CUSTOMERS_CACHE_KEY, JSON.stringify(customers));
  } catch {
    // ignore
  }
}

export function getCachedCustomers(): unknown[] {
  try {
    const raw = storage.getString(CUSTOMERS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
