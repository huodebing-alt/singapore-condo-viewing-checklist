// Minimal IndexedDB wrapper — used as local storage fallback when the
// app is deployed without a Blob store, and it keeps photos off localStorage.

const DB_NAME = "condoscout";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("viewings")) {
        db.createObjectStore("viewings", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("photos")) {
        db.createObjectStore("photos"); // key = photo id, value = dataUrl string
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
}

export const idb = {
  getAll: <T>(store: string) => tx<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>),
  get: <T>(store: string, key: string) =>
    tx<T | undefined>(store, "readonly", (s) => s.get(key) as IDBRequest<T | undefined>),
  put: (store: string, value: unknown, key?: string) =>
    tx(store, "readwrite", (s) => (key ? s.put(value, key) : s.put(value))),
  del: (store: string, key: string) => tx(store, "readwrite", (s) => s.delete(key)),
};
