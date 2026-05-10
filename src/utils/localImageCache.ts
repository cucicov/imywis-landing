const DB_NAME = 'imywis-local-image-cache';
const STORE_NAME = 'images';
const DB_VERSION = 1;

type CachedLocalImageRecord = {
  path: string;
  dataUrl: string;
  updatedAt: number;
};

const openCacheDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {keyPath: 'path'});
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveLocalImageDataUrl = async (path: string, dataUrl: string) => {
  if (!path || !dataUrl.startsWith('data:image/')) {
    return;
  }

  const db = await openCacheDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record: CachedLocalImageRecord = {
      path,
      dataUrl,
      updatedAt: Date.now(),
    };
    store.put(record);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};

export const getLocalImageDataUrl = async (path: string): Promise<string | null> => {
  if (!path) {
    return null;
  }

  const db = await openCacheDb();
  const record = await new Promise<CachedLocalImageRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(path);

    request.onsuccess = () => resolve(request.result as CachedLocalImageRecord | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();

  if (!record?.dataUrl?.startsWith('data:image/')) {
    return null;
  }
  return record.dataUrl;
};
