type Handler = (payload: unknown) => void;
declare class ExecoraWSClient {
    private socket;
    private listeners;
    private reconnectTimer;
    private reconnectDelay;
    private sessionId;
    private _intentionalDisconnect;
    private _apiBaseUrl;
    get isConnected(): boolean;
    connect(apiBaseUrl: string): Promise<void>;
    private _scheduleReconnect;
    disconnect(): void;
    send(type: string, data?: Record<string, unknown>): void;
    on(type: string, handler: Handler): () => void;
    private emit;
}
export declare const wsClient: ExecoraWSClient;
export {};
//# sourceMappingURL=ws.d.ts.map