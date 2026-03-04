/**
 * WS Broadcaster — per-tenant WebSocket event fan-out.
 *
 * REST route handlers call `broadcaster.send(tenantId, type, payload)` after
 * mutations so all active browser tabs for that tenant get a real-time push
 * without implementing SSE or a dedicated pub/sub bus.
 */
import type { WebSocket } from 'ws';
import { logger } from '@execora/infrastructure';

class TenantBroadcaster {
	/** tenantId → set of live WS connections for that tenant */
	private connections = new Map<string, Set<WebSocket>>();

	/** Register a connection when authenticated WS opens. */
	register(tenantId: string, ws: WebSocket) {
		if (!this.connections.has(tenantId)) {
			this.connections.set(tenantId, new Set());
		}
		this.connections.get(tenantId)!.add(ws);

		ws.on('close', () => this.unregister(tenantId, ws));
		ws.on('error', () => this.unregister(tenantId, ws));
	}

	/** Remove a connection — called on close/error. */
	private unregister(tenantId: string, ws: WebSocket) {
		this.connections.get(tenantId)?.delete(ws);
	}

	/**
	 * Broadcast a typed event to every connected tab for this tenant.
	 * Silently skips closed connections and cleans them up.
	 */
	send(tenantId: string, type: string, payload: Record<string, unknown> = {}) {
		const sockets = this.connections.get(tenantId);
		if (!sockets || sockets.size === 0) return;

		const message = JSON.stringify({ type, ...payload });
		const dead: WebSocket[] = [];

		for (const ws of sockets) {
			if (ws.readyState === ws.OPEN) {
				try {
					ws.send(message);
				} catch (err) {
					logger.warn({ tenantId, type, err }, 'broadcaster: send error, dropping socket');
					dead.push(ws);
				}
			} else {
				dead.push(ws);
			}
		}

		for (const ws of dead) sockets.delete(ws);
	}

	/** How many live connections exist for a tenant (useful for tests/metrics). */
	count(tenantId: string) {
		return this.connections.get(tenantId)?.size ?? 0;
	}
}

export const broadcaster = new TenantBroadcaster();
