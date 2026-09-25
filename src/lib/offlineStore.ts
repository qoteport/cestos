const DB_NAME = 'cestos-offline-store';
const DB_VERSION = 1;
const OUTBOX = 'outbox';
const RESPONSES = 'responses';

export type StoredFormValue = { name: string; value: string | Blob; filename?: string; contentType?: string };
export type OfflineWrite = {
  id: string;
  scope: string;
  path: string;
  method: string;
  authenticated: boolean;
  headers: [string, string][];
  bodyType: 'none' | 'json' | 'form' | 'text';
  body?: string;
  form?: StoredFormValue[];
  createdAt: number;
  state: 'pending' | 'failed';
  attempts: number;
  error?: string;
};
type CachedResponse = { key: string; scope: string; path: string; data: unknown; cachedAt: number };

let database: Promise<IDBDatabase> | undefined;
function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Offline storage is not available in this browser.'));
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OUTBOX)) db.createObjectStore(OUTBOX, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(RESPONSES)) db.createObjectStore(RESPONSES, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open offline storage.'));
  });
  return database;
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Offline storage request failed.'));
  });
}

async function storeRequest<T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, mode);
  const result = await requestValue(run(tx.objectStore(storeName)));
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Offline storage transaction failed.'));
    tx.onabort = () => reject(tx.error || new Error('Offline storage transaction was aborted.'));
  });
  return result;
}

function dispatchChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('cestos:offline-queue-changed'));
}

export async function enqueueOfflineWrite(item: OfflineWrite): Promise<void> {
  await storeRequest(OUTBOX, 'readwrite', (store) => store.put(item));
  dispatchChanged();
}

export async function listOfflineWrites(scope?: string): Promise<OfflineWrite[]> {
  const rows = await storeRequest(OUTBOX, 'readonly', (store) => store.getAll()) as OfflineWrite[];
  return rows.filter((row) => !scope || row.scope === scope).sort((a, b) => a.createdAt - b.createdAt);
}

export async function updateOfflineWrite(item: OfflineWrite): Promise<void> {
  await storeRequest(OUTBOX, 'readwrite', (store) => store.put(item));
  dispatchChanged();
}

export async function removeOfflineWrite(id: string): Promise<void> {
  await storeRequest(OUTBOX, 'readwrite', (store) => store.delete(id));
  dispatchChanged();
}

export async function cacheApiResponse(scope: string, path: string, data: unknown): Promise<void> {
  try {
    if (!(data instanceof Blob)) JSON.stringify(data);
    const key = `${scope}:${path}`;
    await storeRequest(RESPONSES, 'readwrite', (store) => store.put({ key, scope, path, data, cachedAt: Date.now() } satisfies CachedResponse));
  } catch {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('cestos:offline-cache-error'));
  }
}

export async function readCachedApiResponse<T>(scope: string, path: string): Promise<T | undefined> {
  try {
    const row = await storeRequest(RESPONSES, 'readonly', (store) => store.get(`${scope}:${path}`)) as CachedResponse | undefined;
    return row?.data as T | undefined;
  } catch { return undefined; }
}

export async function invalidateCachedApiResponses(scope: string): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(RESPONSES, 'readwrite');
    const store = tx.objectStore(RESPONSES);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if ((cursor.value as CachedResponse).scope === scope) cursor.delete();
      cursor.continue();
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Could not refresh offline data.'));
      tx.onabort = () => reject(tx.error || new Error('Could not refresh offline data.'));
    });
  } catch { /* Cache invalidation cannot break a successful write. */ }
}

export async function clearOfflineStore(): Promise<void> {
  try {
    await Promise.all([storeRequest(OUTBOX, 'readwrite', (store) => store.clear()), storeRequest(RESPONSES, 'readwrite', (store) => store.clear())]);
    dispatchChanged();
  } catch { /* Storage cleanup is best effort. */ }
}

export async function currentOfflineScope(token: string | null): Promise<string | null> {
  if (!token) return 'anonymous';
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    const userId = decoded.sub || decoded.user_id || decoded.id;
    const orgId = decoded.organization_id || decoded.org_id || decoded.org || '';
    return userId ? `${orgId}:${userId}` : null;
  } catch { return null; }
}

export function serializeOfflineBody(body: BodyInit | null | undefined): Pick<OfflineWrite, 'bodyType' | 'body' | 'form'> | null {
  if (body == null) return { bodyType: 'none' };
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const form: StoredFormValue[] = [];
    body.forEach((value, name) => {
      if (typeof value === 'string') form.push({ name, value });
      else form.push({ name, value: value.slice(0, value.size, value.type), filename: value.name, contentType: value.type });
    });
    return { bodyType: 'form', form };
  }
  if (typeof body === 'string') return { bodyType: 'json', body };
  if (body instanceof URLSearchParams) return { bodyType: 'text', body: body.toString() };
  if (body instanceof Blob) return null;
  return null;
}

export function restoreOfflineBody(item: OfflineWrite): BodyInit | undefined {
  if (item.bodyType === 'none') return undefined;
  if (item.bodyType === 'form') {
    const form = new FormData();
    for (const entry of item.form || []) {
      if (typeof entry.value === 'string') form.append(entry.name, entry.value);
      else if (entry.filename) form.append(entry.name, entry.value, entry.filename);
      else form.append(entry.name, entry.value);
    }
    return form;
  }
  return item.body || '';
}
