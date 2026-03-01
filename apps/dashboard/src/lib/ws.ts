import type { WSMessage } from '@/types';

type MessageHandler = (msg: WSMessage) => void;
type ConnectionHandler = () => void;

const WS_BASE = import.meta.env.VITE_WS_URL ?? (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;

export class ExecoraWebSocket {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private onOpenCbs = new Set<ConnectionHandler>();
  private onCloseCbs = new Set<ConnectionHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 2000;
  private maxReconnectDelay = 30_000;
  private shouldReconnect = true;
  private token: string | null = null;

  get readyState() {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect(token: string) {
    this.token = token;
    this.shouldReconnect = true;
    this._open();
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  send(type: string, data?: Record<string, unknown>) {
    if (this.isConnected) {
      this.ws!.send(JSON.stringify({ type, ...data }));
    }
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  onOpen(cb: ConnectionHandler) {
    this.onOpenCbs.add(cb);
    return () => this.onOpenCbs.delete(cb);
  }

  onClose(cb: ConnectionHandler) {
    this.onCloseCbs.add(cb);
    return () => this.onCloseCbs.delete(cb);
  }

  private _open() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;

    const url = `${WS_BASE}/ws${this.token ? `?token=${encodeURIComponent(this.token)}` : ''}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectDelay = 2000;
      this.onOpenCbs.forEach((cb) => cb());
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data as string);
        const listeners = this.handlers.get(msg.type);
        if (listeners) listeners.forEach((h) => h(msg));
        // Also fire wildcard '*' handlers
        const wildcard = this.handlers.get('*');
        if (wildcard) wildcard.forEach((h) => h(msg));
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.onCloseCbs.forEach((cb) => cb());
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
          this._open();
        }, this.reconnectDelay);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }
}

export const wsClient = new ExecoraWebSocket();
