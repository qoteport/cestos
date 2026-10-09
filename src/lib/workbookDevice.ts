import type { FieldWorkbook, FieldSheet } from './fieldWorkbook';

const DATABASE = 'cestos-workbook-device-v1';
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 2);
    let blocked=false;
    request.onblocked=()=>{blocked=true;database=undefined;reject(new Error('Close older workbook tabs and reload to upgrade device storage.'));};
    request.onupgradeneeded = () => {
      if(!request.result.objectStoreNames.contains('sessions'))request.result.createObjectStore('sessions');
      if(!request.result.objectStoreNames.contains('workbooks'))request.result.createObjectStore('workbooks', {keyPath: 'key'});
      if(!request.result.objectStoreNames.contains('revisions'))request.result.createObjectStore('revisions', {keyPath:'key'});
    };
    request.onsuccess = () => {if(blocked){request.result.close();return;}request.result.onversionchange=()=>{request.result.close();database=undefined;};resolve(request.result);};
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
export type DeviceWorkbook = {key: string; scope: string; book: FieldWorkbook; savedAt: string; remoteVersion?: string};
export const readDeviceSession = (scope: string) => transact<DeviceSession | undefined>('sessions', 'readonly', store => store.get(scope));
export const saveDeviceSession = (scope: string, session: DeviceSession) => transact('sessions', 'readwrite', store => store.put(session, scope));
export async function saveDeviceWorkbook(scope: string, book: FieldWorkbook, remoteVersion?: string) {
  const db=await openDatabase();
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(['workbooks','revisions'],'readwrite');
    const books=tx.objectStore('workbooks'),revisions=tx.objectStore('revisions');
    const key=JSON.stringify([scope,book.id]);
    const request=books.get(key);
    request.onsuccess=()=>{
      const previous=request.result as DeviceWorkbook | undefined;
      // Never overwrite a locally edited workbook during background downloads.
      if (remoteVersion && previous && !previous.remoteVersion) return;
      if(previous && JSON.stringify(previous.book)===JSON.stringify(book) && (!remoteVersion || previous.remoteVersion === remoteVersion))return;
      if(previous) {
        const read=revisions.get(key);
        read.onsuccess=()=>revisions.put({key,items:[previous,...(read.result?.items || [])].slice(0,5)});
      }
      books.put({key,scope,book,savedAt:new Date().toISOString(), ...(remoteVersion ? {remoteVersion} : {})} satisfies DeviceWorkbook);
    };
    tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(tx.error || new Error('Device autosave failed. Download a backup.'));
  });
}
export async function deviceRevisions(scope:string,id:string):Promise<DeviceWorkbook[]> {
  const row=await transact<{items:DeviceWorkbook[]} | undefined>('revisions','readonly',store=>store.get(JSON.stringify([scope,id])));
  return row?.items || [];
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

export const readDeviceLibrary = <T>(scope: string) => transact<T[] | undefined>('sessions', 'readonly', store => store.get(`library:${scope}`));
export const saveDeviceLibrary = <T>(scope: string, documents: T[]) => transact('sessions', 'readwrite', store => store.put(documents, `library:${scope}`));
export const readDeviceWorkbook = (scope: string, id: string) => transact<DeviceWorkbook | undefined>('workbooks', 'readonly', store => store.get(JSON.stringify([scope,id])));
