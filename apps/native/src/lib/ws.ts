/**
 * Execora WebSocket client for React Native.
 *
 * Mirrors apps/web/src/lib/ws.ts but adapted for React Native:
 *  - Uses AsyncStorage for token (not localStorage)
 *  - Exponential-backoff reconnect (1s → 2s → 4s … 30s cap)
 *  - Reconnects on AppState 'active' (app comes to foreground)
 *  - Stores sessionId in AsyncStorage for voice-context resumption
 */
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY } from './storage';

export const SESSION_ID_KEY = 'execora_ws_session';

type Handler = (payload: unknown) => void;

class ExecoraWSClient {
  private socket: WebSocket | null = null;
  private listeners = new Map<string, Set<Handler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private _shouldConnect = false;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

  get isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /** Call once after login. Sets base URL and starts the connection. */
  async connect(apiBase: string) {
    this._shouldConnect = true;
    this.reconnectDelay = 1000;

    const wsBase = apiBase
      .replace(/^https:/, 'wss:')
      .replace(/^http:/, 'ws:')
      .replace(/\/$/, '');

    await this._open(wsBase);
    this._listenAppState(wsBase);
  }

  private async _open(wsBase: string) {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;

    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const sessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
    const url = `${wsBase}/ws?token=${token}${sessionId ? `&sessionId=${sessionId}` : ''}`;

    try {
      this.socket = new WebSocket(url);
    } catch {
      this._scheduleReconnect(wsBase);
      return;
    }

    this.socket.onopen = () => {
      this.reconnectDelay = 1000;
      this.emit('__connected__', {});
    };

    this.socket.onclose = () => {
      this.emit('__disconnected__', {});
      if (this._shouldConnect) this._scheduleReconnect(wsBase);
    };

    this.socket.onerror = () => {
      // onclose fires after onerror — let it handle reconnect
    };

    this.socket.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      try {
        const msg = JSON.parse(event.data) as { type: string; [k: string]: unknown };

        // Persist sessionId for voice context resumption on reconnect
        if (msg.type === 'voice:start' && typeof msg.data === 'object' && msg.data !== null) {
          const sid = (msg.data as Record<string, unknown>).sessionId;
          if (typeof sid === 'string') AsyncStorage.setItem(SESSION_ID_KEY, sid);
        }

        this.emit(msg.type, msg);
      } catch {
        // ignore non-JSON
      }
    };
  }

  private _scheduleReconnect(wsBase: string) {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this._open(wsBase);
      // Increase delay with cap: 1s → 2s → 4s → 8s → … → 30s
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
    }, this.reconnectDelay);
  }

  private _listenAppState(wsBase: string) {
    this.appStateSubscription?.remove();
    this.appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && !this.isConnected && this._shouldConnect) {
        this._open(wsBase);
      }
    });
  }

  disconnect() {
    this._shouldConnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.socket?.close();
    this.socket = null;
    AsyncStorage.removeItem(SESSION_ID_KEY);
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
      try { h(payload); } catch { /* ignore */ }
    });
  }
}

export const wsClient = new ExecoraWSClient();
