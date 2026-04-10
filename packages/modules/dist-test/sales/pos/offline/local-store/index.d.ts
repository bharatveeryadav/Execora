/**
 * sales/pos/offline/local-store
 *
 * Feature: local IndexedDB/SQLite store for offline POS data — products, carts, invoices.
 */
export interface LocalStoreEntry<T = unknown> {
    key: string;
    value: T;
    updatedAt: string;
    synced: boolean;
}
export declare function localGet<T>(_store: string, _key: string): Promise<T | null>;
export declare function localSet<T>(_store: string, _key: string, _value: T): Promise<void>;
export declare function localGetAll<T>(_store: string): Promise<T[]>;
export declare function localMarkSynced(_store: string, _key: string): Promise<void>;
//# sourceMappingURL=index.d.ts.map