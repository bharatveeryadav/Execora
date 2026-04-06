/**
 * RtcRelay — WebRTC signalling relay over existing WebSocket connections.
 *
 * Counter device (sender) and owner device (viewer) are in the same tenant.
 * They exchange RTCPeerConnection offer/answer/ICE via this relay.
 *
 * Flow:
 *   Sender → rtc:offer  → server relays to all viewers in tenant
 *   Viewer → rtc:answer → server routes back to the specific sender
 *   Both   → rtc:ice    → server routes to specified peer (toId) or broadcasts
 */
import type { WebSocket } from 'ws';
import { logger } from '@execora/core';

interface RtcPeer {
	ws:       WebSocket;
	role:     'sender' | 'viewer';
	wsId:     string;
	tenantId: string;
}

class RtcRelay {
	/** tenantId → Map<wsId, RtcPeer> */
	private peers = new Map<string, Map<string, RtcPeer>>();

	register(tenantId: string, wsId: string, ws: WebSocket, role: 'sender' | 'viewer' = 'viewer') {
		if (!this.peers.has(tenantId)) this.peers.set(tenantId, new Map());
		this.peers.get(tenantId)!.set(wsId, { ws, role, wsId, tenantId });
		logger.debug({ tenantId, wsId, role }, 'rtc-relay: peer registered');
	}

	unregister(tenantId: string, wsId: string) {
		this.peers.get(tenantId)?.delete(wsId);
		logger.debug({ tenantId, wsId }, 'rtc-relay: peer unregistered');
	}

	setRole(tenantId: string, wsId: string, role: 'sender' | 'viewer') {
		const peer = this.peers.get(tenantId)?.get(wsId);
		if (peer) peer.role = role;
	}

	/** Relay to all peers in tenant EXCEPT fromWsId. Returns number of recipients. */
	relay(tenantId: string, fromWsId: string, msg: object): number {
		const tenantPeers = this.peers.get(tenantId);
		if (!tenantPeers) return 0;
		const payload = JSON.stringify(msg);
		let sent = 0;
		for (const [id, peer] of tenantPeers) {
			if (id === fromWsId) continue;
			if (peer.ws.readyState === peer.ws.OPEN) {
				try {
					peer.ws.send(payload);
					sent++;
				} catch (err) {
					logger.warn({ tenantId, wsId: id, err }, 'rtc-relay: send error');
				}
			}
		}
		return sent;
	}

	/** Send to a specific peer by wsId. Returns true if sent. */
	send(tenantId: string, toWsId: string, msg: object): boolean {
		const peer = this.peers.get(tenantId)?.get(toWsId);
		if (!peer || peer.ws.readyState !== peer.ws.OPEN) return false;
		try {
			peer.ws.send(JSON.stringify(msg));
			return true;
		} catch (err) {
			logger.warn({ tenantId, toWsId, err }, 'rtc-relay: send error');
			return false;
		}
	}

	/** All senders for a tenant (counter devices currently streaming). */
	getSenders(tenantId: string): RtcPeer[] {
		const tenantPeers = this.peers.get(tenantId);
		if (!tenantPeers) return [];
		return Array.from(tenantPeers.values()).filter((p) => p.role === 'sender');
	}

	viewerCount(tenantId: string): number {
		const tenantPeers = this.peers.get(tenantId);
		if (!tenantPeers) return 0;
		return Array.from(tenantPeers.values()).filter((p) => p.role === 'viewer').length;
	}
}

export const rtcRelay = new RtcRelay();
