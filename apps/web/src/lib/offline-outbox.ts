/**
 * Offline outbox — queue failed API mutations when offline (S11-06).
 * Replays when back online. Uses IndexedDB for persistence.
 */

const DB_NAME = "execora-offline-outbox";
const STORE_NAME = "requests";
const DB_VERSION = 1;
export const OUTBOX_UPDATED_EVENT = "execora:outbox-updated";

export interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  body: string | null;
  headers: Record<string, string>;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

function notifyOutboxUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OUTBOX_UPDATED_EVENT));
  }
}

export async function addToOutbox(
  method: string,
  url: string,
  body: string | null,
  headers: Record<string, string>,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const item: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      method,
      url,
      body,
      headers,
      createdAt: Date.now(),
    };
    const req = store.add(item);
    req.onsuccess = () => {
      db.close();
      notifyOutboxUpdated();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function getOutboxCount(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => {
      db.close();
      resolve(req.result);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function getAllFromOutbox(): Promise<QueuedRequest[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      db.close();
      resolve(req.result);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function removeFromOutbox(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => {
      db.close();
      notifyOutboxUpdated();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

function isMutation(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && err.message === "Failed to fetch") return true;
  if (err instanceof DOMException && err.name === "NetworkError") return true;
  return false;
}

export { isMutation };

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

/**
 * Replay all queued requests. Call when back online.
 * Removes each on success; leaves on failure for next retry.
 */
export async function replayOutbox(): Promise<{ sent: number; failed: number }> {
  const items = await getAllFromOutbox();
  let sent = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const url = item.url.startsWith("http") ? item.url : `${API_BASE}${item.url}`;
      const res = await fetch(url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });
      if (res.ok) {
        await removeFromOutbox(item.id);
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}
