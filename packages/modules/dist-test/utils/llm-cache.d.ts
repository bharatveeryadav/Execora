export declare const llmCache: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<void>;
    close(): Promise<void>;
};
//# sourceMappingURL=llm-cache.d.ts.map