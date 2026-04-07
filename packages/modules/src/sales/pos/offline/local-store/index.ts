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

export async function localGet<T>(
  _store: string,
  _key: string,
): Promise<T | null> {
  return null;
}

export async function localSet<T>(
  _store: string,
  _key: string,
  _value: T,
): Promise<void> {}

export async function localGetAll<T>(_store: string): Promise<T[]> {
  return [];
}

export async function localMarkSynced(
  _store: string,
  _key: string,
): Promise<void> {}
