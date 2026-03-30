"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsClient = void 0;
/**
 * Execora WebSocket client for React Native.
 * Real-time cache invalidation — events from server trigger React Query refetch.
 */
const storage_1 = require("./storage");
const SESSION_KEY = "execora_ws_session";
class ExecoraWSClient {
    socket = null;
    listeners = new Map();
    reconnectTimer = null;
    reconnectDelay = 1000;
    sessionId = null;
    _intentionalDisconnect = false;
    _apiBaseUrl = "";
    get isConnected() {
        return this.socket?.readyState === WebSocket.OPEN;
    }
    async connect(apiBaseUrl) {
        if (this.socket && this.socket.readyState <= WebSocket.OPEN)
            return;
        this._intentionalDisconnect = false;
        this._apiBaseUrl = apiBaseUrl;
        this.sessionId = storage_1.storage.getString(SESSION_KEY) ?? null;
        const token = storage_1.tokenStorage.getToken();
        const wsBase = apiBaseUrl.replace(/^http/, "ws").replace(/\/$/, "");
        const sessionParam = this.sessionId ? `&sessionId=${this.sessionId}` : "";
        const url = token
            ? `${wsBase}/ws?token=${token}${sessionParam}`
            : `${wsBase}/ws${sessionParam ? "?" + sessionParam.slice(1) : ""}`;
        try {
            this.socket = new WebSocket(url);
        }
        catch {
            this._scheduleReconnect();
            return;
        }
        this.socket.onopen = () => {
            this.reconnectDelay = 1000;
            this.emit("__connected__", {});
        };
        this.socket.onmessage = (event) => {
            const data = event.data;
            if (typeof data !== "string")
                return;
            try {
                const msg = JSON.parse(data);
                if (msg.type === "voice:start" && msg.data?.sessionId) {
                    this.sessionId = msg.data.sessionId;
                    storage_1.storage.set(SESSION_KEY, this.sessionId);
                }
                this.emit(msg.type, msg);
            }
            catch {
                /* ignore malformed */
            }
        };
        this.socket.onclose = () => {
            this.emit("__disconnected__", {});
            if (!this._intentionalDisconnect)
                this._scheduleReconnect();
        };
        this.socket.onerror = () => {
            /* onclose fires after onerror */
        };
    }
    _scheduleReconnect() {
        if (this.reconnectTimer)
            return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
            if (this._apiBaseUrl)
                this.connect(this._apiBaseUrl);
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
    send(type, data) {
        if (!this.isConnected)
            return;
        this.socket.send(JSON.stringify(data ? { type, data } : { type }));
    }
    on(type, handler) {
        if (!this.listeners.has(type))
            this.listeners.set(type, new Set());
        this.listeners.get(type).add(handler);
        return () => this.listeners.get(type)?.delete(handler);
    }
    emit(type, payload) {
        this.listeners.get(type)?.forEach((h) => {
            try {
                h(payload);
            }
            catch {
                /* ignore */
            }
        });
    }
}
exports.wsClient = new ExecoraWSClient();
//# sourceMappingURL=ws.js.map