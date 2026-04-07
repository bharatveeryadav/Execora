/**
 * inventory/stock/batch-tracking
 *
 * Feature: batch lifecycle — write-offs, expiry listing, expiry page.
 * Re-exports relevant functions from inventory/stock/item-catalog.
 */
export { writeOffBatch, getExpiringBatches, getExpiryPage } from "./item-catalog";
export type { ProductRecord } from "./types";
