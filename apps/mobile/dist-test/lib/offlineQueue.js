"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueInvoice = enqueueInvoice;
exports.getQueuedInvoices = getQueuedInvoices;
exports.removeFromQueue = removeFromQueue;
exports.clearQueue = clearQueue;
exports.cacheProducts = cacheProducts;
exports.getCachedProducts = getCachedProducts;
exports.cacheCustomers = cacheCustomers;
exports.getCachedCustomers = getCachedCustomers;
/**
 * Offline invoice queue (Sprint 18).
 * Bills created offline are stored here and synced when connection is restored.
 */
const storage_1 = require("./storage");
const QUEUE_KEY = "execora:offline_invoice_queue";
const PRODUCTS_CACHE_KEY = "execora:offline_products";
const CUSTOMERS_CACHE_KEY = "execora:offline_customers";
function getQueue() {
    try {
        const raw = storage_1.storage.getString(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    }
    catch {
        return [];
    }
}
function setQueue(queue) {
    storage_1.storage.set(QUEUE_KEY, JSON.stringify(queue));
}
function enqueueInvoice(payload, displayTotal, notesWithDue) {
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
function getQueuedInvoices() {
    return getQueue();
}
function removeFromQueue(id) {
    const queue = getQueue().filter((q) => q.id !== id);
    setQueue(queue);
}
function clearQueue() {
    setQueue([]);
}
// ── Product cache (for offline product search) ────────────────────────────────
function cacheProducts(products) {
    try {
        storage_1.storage.set(PRODUCTS_CACHE_KEY, JSON.stringify(products));
    }
    catch {
        // ignore
    }
}
function getCachedProducts() {
    try {
        const raw = storage_1.storage.getString(PRODUCTS_CACHE_KEY);
        return raw ? JSON.parse(raw) : [];
    }
    catch {
        return [];
    }
}
// ── Customer cache ───────────────────────────────────────────────────────────
function cacheCustomers(customers) {
    try {
        storage_1.storage.set(CUSTOMERS_CACHE_KEY, JSON.stringify(customers));
    }
    catch {
        // ignore
    }
}
function getCachedCustomers() {
    try {
        const raw = storage_1.storage.getString(CUSTOMERS_CACHE_KEY);
        return raw ? JSON.parse(raw) : [];
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=offlineQueue.js.map