/**
 * Execora WebSocket client for React Native.
 * Real-time cache invalidation — events from server trigger React Query refetch.
 */
import { tokenStorage, storage } from "./storage";

const SESSION_KEY = "execora_ws_session";

type Handler = (payload: unknown) => void;

class ExecoraWSClient {
  private socket: WebSocket | null = null;
  private listeners = new Map<string, Set<Handler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private sessionId: string | null = null;
  private _intentionalDisconnect = false;
  private _apiBaseUrl = "";

  get isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  async connect(apiBaseUrl: string) {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;
    this._intentionalDisconnect = false;
    this._apiBaseUrl = apiBaseUrl;
    this.sessionId = storage.getString(SESSION_KEY) ?? null;

    const token = tokenStorage.getToken();
    const wsBase = apiBaseUrl.replace(/^http/, "ws").replace(/\/$/, "");
    const sessionParam = this.sessionId ? `&sessionId=${this.sessionId}` : "";
    const url = token
      ? `${wsBase}/ws?token=${token}${sessionParam}`
      : `${wsBase}/ws${sessionParam ? "?" + sessionParam.slice(1) : ""}`;

    try {
      this.socket = new WebSocket(url);
    } catch {
      this._scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.reconnectDelay = 1000;
      this.emit("__connected__", {});
    };

    this.socket.onmessage = (event: unknown) => {
      const data = (event as { data?: unknown }).data;
      if (typeof data !== "string") return;
      try {
        const msg = JSON.parse(data) as { type: string; data?: { sessionId?: string }; [k: string]: unknown };
        if (msg.type === "voice:start" && msg.data?.sessionId) {
          this.sessionId = msg.data.sessionId as string;
          storage.set(SESSION_KEY, this.sessionId);
        }
        this.emit(msg.type, msg);
      } catch {
        /* ignore malformed */
      }
    };

    this.socket.onclose = () => {
      this.emit("__disconnected__", {});
      if (!this._intentionalDisconnect) this._scheduleReconnect();
    };

    this.socket.onerror = () => {
      /* onclose fires after onerror */
    };
  }

  private _scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
      if (this._apiBaseUrl) this.connect(this._apiBaseUrl);
    }, this.reconnectDelay);
  }

  disconnect() {
    this._intentionalDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  send(type: string, data?: Record<string, unknown>) {
    if (!this.isConnected) return;
    this.socket!.send(JSON.stringify(data ? { type, data } : { type }));
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
