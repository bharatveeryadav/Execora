/**
 * inventory/alerts/reorder-suggestions
 *
 * Feature: AI-driven reorder suggestions — stub ready for agent mode wiring.
 * Based on low-stock list + historical velocity. Planned: Mode 3 (Agent).
 *
 * Until agents are wired, delegates to the low-stock query as a starting point.
 */
export { getLowStockProducts as listReorderCandidates } from "../stock/item-catalog";
