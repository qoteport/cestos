import type { FieldWorkbook, FieldSheet } from './fieldWorkbook';

const DATABASE = 'cestos-workbook-device-v1';
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('sessions');
      request.result.createObjectStore('workbooks', {keyPath: 'key'});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {database = undefined; reject(request.error);};
  });
  return database;
}
async function transact<T>(store: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = run(tx.objectStore(store));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('Device storage failed. Download a backup to keep your work.'));
  });
}
export type DeviceSession = {openBooks: {book: FieldWorkbook; dirty: boolean}[]; activeId: string | null};
export type DeviceWorkbook = {key: string; scope: string; book: FieldWorkbook; savedAt: string};
export const readDeviceSession = (scope: string) => transact<DeviceSession | undefined>('sessions', 'readonly', store => store.get(scope));
export const saveDeviceSession = (scope: string, session: DeviceSession) => transact('sessions', 'readwrite', store => store.put(session, scope));
export async function saveDeviceWorkbook(scope: string, book: FieldWorkbook) {
  await transact('workbooks', 'readwrite', store => store.put({key: JSON.stringify([scope, book.id]), scope, book, savedAt: new Date().toISOString()} satisfies DeviceWorkbook));
}
export async function listDeviceWorkbooks(scope: string): Promise<DeviceWorkbook[]> {
  const rows = await transact<DeviceWorkbook[]>('workbooks', 'readonly', store => store.getAll());
  return rows.filter(row => row.scope === scope).sort((a,b) => b.savedAt.localeCompare(a.savedAt));
}
export const deleteDeviceWorkbook = (scope: string, id: string) => transact('workbooks', 'readwrite', store => store.delete(JSON.stringify([scope,id])));

// CSV represents one sheet's values; workbook backups retain styles and mappings.
export function sheetCsv(sheet: FieldSheet): string {
  if (sheet.previewLimited) throw new Error('This sheet is partially loaded. Download Excel to retain all its rows.');
  const rows = sheet.cells.slice();
  while (rows.length && rows[rows.length - 1].every(cell => cell === '')) rows.pop();
  const lastColumn = rows.reduce((last,row) => Math.max(last, row.reduce((index,cell,i) => cell !== '' ? i : index,-1)), -1);
  const quote = (value: string) => {
    // Prevent literal text from being interpreted as a formula by spreadsheet apps.
    const safe = /^[\s]*[=+@]/.test(value) || (/^[\s]*-/.test(value) && !/^\s*-\d+(\.\d+)?\s*$/.test(value)) ? "'" + value : value;
    return '"' + safe.replace(/"/g, '""') + '"';
  };
  return '\ufeff' + rows.map(row => row.slice(0,lastColumn+1).map(quote).join(',')).join('\r\n');
}
