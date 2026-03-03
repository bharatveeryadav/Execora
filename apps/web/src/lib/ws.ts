// ── Execora WebSocket client ──────────────────────────────────────────────────
// Singleton that manages the WS connection, event emitting, and binary audio streaming.

const WS_URL = (
	import.meta.env.VITE_WS_URL ?? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
).replace(/\/$/, '');
const TOKEN_KEY = 'execora_token';

type Handler = (payload: unknown) => void;

class ExecoraWSClient {
	private socket: WebSocket | null = null;
	private listeners = new Map<string, Set<Handler>>();
	private openPromise: Promise<boolean> | null = null;
	private openResolve: ((v: boolean) => void) | null = null;
	private _reconnecting = false;

	get isConnected() {
		return this.socket?.readyState === WebSocket.OPEN;
	}

	connect() {
		if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;

		const token = localStorage.getItem(TOKEN_KEY);
		const url = token ? `${WS_URL}/ws?token=${token}` : `${WS_URL}/ws`;

		this.openPromise = new Promise<boolean>((resolve) => {
			this.openResolve = resolve;
		});

		try {
			this.socket = new WebSocket(url);
		} catch {
			this.openResolve?.(false);
			return;
		}

		this.socket.binaryType = 'arraybuffer';

		this.socket.onopen = () => {
			this._reconnecting = false;
			this.openResolve?.(true);
			this.openPromise = null;
			this.openResolve = null;
			this.emit('__connected__', {});
		};

		this.socket.onclose = () => {
			this.emit('__disconnected__', {});
			this.openResolve?.(false);
			this.openPromise = null;
			this.openResolve = null;
		};

		this.socket.onerror = () => {
			this.openResolve?.(false);
		};

		this.socket.onmessage = (event: MessageEvent) => {
			if (typeof event.data !== 'string') return;
			try {
				const msg = JSON.parse(event.data) as { type: string; [k: string]: unknown };
				this.emit(msg.type, msg);
			} catch {
				// ignore non-JSON
			}
		};
	}

	async waitForOpen(timeoutMs = 8000): Promise<boolean> {
		if (this.isConnected) return true;
		if (this.openPromise) {
			return Promise.race([
				this.openPromise,
				new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
			]);
		}
		return false;
	}

	reconnect() {
		if (this._reconnecting) return;
		this._reconnecting = true;
		this.disconnect();
		setTimeout(() => this.connect(), 300);
	}

	disconnect() {
		this.socket?.close();
		this.socket = null;
	}

	send(type: string, data?: Record<string, unknown>) {
		if (!this.isConnected) return;
		this.socket!.send(JSON.stringify(data ? { type, data } : { type }));
	}

	sendBinary(blob: Blob | ArrayBuffer) {
		if (!this.isConnected) return;
		this.socket!.send(blob);
	}

	on(type: string, handler: Handler): () => void {
		if (!this.listeners.has(type)) this.listeners.set(type, new Set());
		this.listeners.get(type)!.add(handler);
		return () => this.listeners.get(type)?.delete(handler);
	}

	private emit(type: string, payload: unknown) {
		this.listeners.get(type)?.forEach((h) => {
			try {
				h(payload);
			} catch {
				/* ignore */
			}
		});
	}
}

export const wsClient = new ExecoraWSClient();
