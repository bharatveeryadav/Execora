/**
 * useWsInvalidation — subscribe to WS events and invalidate React Query caches.
 *
 * Usage (call once per page that needs live updates):
 *
 *   useWsInvalidation(['invoices', 'customers', 'summary']);
 *
 * Internally maps WS event types to the query keys they should invalidate.
 * Any WS event in the EVENT_MAP will trigger cache invalidation immediately
 * so the page re-fetches fresh data without a manual reload.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient } from '@/lib/ws';

// ── Event → query key mapping ────────────────────────────────────────────────
// Each WS event type maps to the list of query-key prefixes to invalidate.
// Extend this map as new real-time events are added to the API.
export const WS_EVENT_QUERIES: Record<string, string[][]> = {
	'invoice:created':   [['invoices'], ['summary'], ['customers']],
	'invoice:confirmed': [['invoices'], ['summary'], ['customers']],
	'invoice:updated':   [['invoices']],
	'invoice:cancelled': [['invoices'], ['summary'], ['customers']],
	'payment:recorded':  [['customers'], ['summary'], ['ledger'], ['cashbook'], ['invoices']],
	'customer:created':  [['customers'], ['summary']],
	'customer:deleted':  [['customers'], ['summary']],
	'customer:updated':  [['customers']],
	// 'customer:balance' not emitted by backend — 'payment:recorded' covers balance changes
	'reminder:created':  [['reminders']],
	'reminder:cancelled':[['reminders']],
	'reminders:updated': [['reminders']],   // AI predictive reminders (ai.routes.ts)
	'stock:updated':     [['products'], ['lowStock']],
	'product:created':   [['products'], ['lowStock']],
	'product:updated':   [['products'], ['lowStock']],
	'expense:created':   [['expenses'], ['incomes'], ['cashbook']],
	'expense:deleted':   [['expenses'], ['incomes'], ['cashbook']],
	'purchase:created':  [['purchases'], ['cashbook']],
	'purchase:deleted':  [['purchases'], ['cashbook']],
	// Draft / staging system
	'draft:created':     [['drafts']],
	'draft:updated':     [['drafts']],
	'draft:confirmed':   [['drafts'], ['purchases'], ['products'], ['expenses']],
	'draft:discarded':   [['drafts']],
	// Monitoring
	'monitoring:event':  [['monitoring']],
	'monitoring:snap':   [['monitoring']],
};

/**
 * Subscribe to real-time WS events for the given query-key scopes.
 * @param scopes  Which query-key prefixes this page cares about, e.g. ['invoices', 'customers']
 *                Pass empty array or 'all' to subscribe to every mapped event.
 */
export function useWsInvalidation(scopes: string[] | 'all' = 'all') {
	const qc = useQueryClient();

	useEffect(() => {
		const handlers: Array<() => void> = [];

		for (const [event, keys] of Object.entries(WS_EVENT_QUERIES)) {
			// Filter: only subscribe to events that touch one of the requested scopes
			if (scopes !== 'all') {
				const relevant = keys.some((k) => scopes.includes(k[0]));
				if (!relevant) continue;
			}

			const off = wsClient.on(event, () => {
				for (const key of keys) {
					qc.invalidateQueries({ queryKey: key });
				}
			});
			handlers.push(off);
		}

		return () => handlers.forEach((off) => off());
	}, [qc]); // eslint-disable-line react-hooks/exhaustive-deps
}
