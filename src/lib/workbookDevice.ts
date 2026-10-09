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
export type DeviceWorkbook = {key: string; scope: string; book: FieldWorkbook; savedAt: string; remoteVersion?: string; baseVersion?: string; editorId?: string};
export const readDeviceSession = (scope: string) => transact<DeviceSession | undefined>('sessions', 'readonly', store => store.get(scope));
export async function saveDeviceSession(scope:string,session:DeviceSession) {
  const db=await openDatabase();
  return new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('sessions','readwrite'),store=tx.objectStore('sessions');
    const openBooks:DeviceSession['openBooks']=[];
    let pending=session.openBooks.length;
    const save=()=>store.put({...session,openBooks,activeId:openBooks.some(item=>item.book.id===session.activeId)?session.activeId:null},scope);
    if(!pending)save();
    for(const item of session.openBooks){const request=store.get(`deleted:${JSON.stringify([scope,item.book.id])}`);request.onsuccess=()=>{if(!request.result)openBooks.push(item);if(!--pending)save();};}
    tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error || new Error('Could not save workbook session.'));
  });
}
export class DeviceWorkbookConflict extends Error {constructor(public workbook?:FieldWorkbook){super('Another tab changed this workbook. Your version was preserved in recovery history. Choose a version below.');this.name='DeviceWorkbookConflict';}}
export async function saveDeviceWorkbook(scope: string, book: FieldWorkbook, remoteVersion?: string, editor?: {id:string; baseline:FieldWorkbook}) {
  const db=await openDatabase();
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(['workbooks','revisions','sessions'],'readwrite');
    const books=tx.objectStore('workbooks'),revisions=tx.objectStore('revisions');
    let conflict = false;
    const key=JSON.stringify([scope,book.id]);
    const deleted=tx.objectStore('sessions').get(`deleted:${key}`);
    deleted.onsuccess=()=>{
    if(deleted.result)return;
    const request=books.get(key);
    request.onsuccess=()=>{
      const previous=request.result as DeviceWorkbook | undefined;
      if(editor && previous && previous.editorId!==editor.id && JSON.stringify(previous.book)!==JSON.stringify(editor.baseline) && JSON.stringify(previous.book)!==JSON.stringify(book)) {
        conflict=true;
        const read=revisions.get(key);
        read.onsuccess=()=>revisions.put({key,items:recoveryCheckpoints([{key,scope,book,savedAt:new Date().toISOString()},...(read.result?.items || [])])});
        return;
      }
      // Never overwrite a locally edited workbook during background downloads.
      if (remoteVersion && previous && !previous.remoteVersion) return;
      if(previous && JSON.stringify(previous.book)===JSON.stringify(book) && (!remoteVersion || previous.remoteVersion === remoteVersion))return;
      if(previous) {
        const read=revisions.get(key);
        read.onsuccess=()=>revisions.put({key,items:recoveryCheckpoints([previous,...(read.result?.items || [])])});
      }
      books.put({key,scope,book,...(editor?{editorId:editor.id}:{}),baseVersion:remoteVersion || previous?.remoteVersion || previous?.baseVersion,savedAt:new Date().toISOString(), ...(remoteVersion ? {remoteVersion} : {})} satisfies DeviceWorkbook);
    };
    };
    tx.oncomplete=()=>conflict?reject(new DeviceWorkbookConflict(book)):resolve();tx.onabort=tx.onerror=()=>reject(tx.error || new Error('Device autosave failed. Download a backup.'));
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
export async function deleteDeviceWorkbook(scope:string,id:string, permanentlyDeleted=true, replacement?:{book:FieldWorkbook;version?:string}) {
  const db=await openDatabase();
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(['workbooks','revisions','sessions'],'readwrite');
    const key=JSON.stringify([scope,id]),sessions=tx.objectStore('sessions');
    tx.objectStore('workbooks').delete(key);
    if(replacement)tx.objectStore('workbooks').put({key,scope,book:replacement.book,savedAt:new Date().toISOString(),remoteVersion:replacement.version,baseVersion:replacement.version});
    tx.objectStore('revisions').delete(key);
    sessions.delete(`sync:${key}`);
    if(permanentlyDeleted)sessions.put(true,`deleted:${key}`);else sessions.delete(`deleted:${key}`);
    const session=sessions.get(scope);
    session.onsuccess=()=>{if(session.result){const value=session.result as DeviceSession;sessions.put({...value,openBooks:value.openBooks.filter(item=>item.book.id!==id),activeId:value.activeId===id?null:value.activeId},scope);}};
    const library=sessions.get(`library:${scope}`);
    library.onsuccess=()=>{if(library.result)sessions.put(library.result.filter((doc:{tags?:string[]})=>!doc.tags?.includes(`wb-${id}`)),`library:${scope}`);};
    tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error || new Error('Could not remove offline workbook copies.'));
  });
}
export const workbookWasDeleted=(scope:string,id:string)=>transact<boolean | undefined>('sessions','readonly',store=>store.get(`deleted:${JSON.stringify([scope,id])}`));

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

export type WorkbookSyncEntry = {key:string; scope:string; book:FieldWorkbook; operationId:string; baseVersion?:string; state:'pending'|'synced'|'conflict'|'blocked'; error?:string};
async function updateWorkbookSync(scope:string,id:string, change:(entry:WorkbookSyncEntry | undefined)=>WorkbookSyncEntry | undefined) {
  const db=await openDatabase();
  return new Promise<void>((resolve,reject)=>{
    const tx=db.transaction('sessions','readwrite'), store=tx.objectStore('sessions');
    const key=`sync:${JSON.stringify([scope,id])}`;
    const deleted=store.get(`deleted:${JSON.stringify([scope,id])}`);
    deleted.onsuccess=()=>{
    if(deleted.result)return;
    const request=store.get(key);
    request.onsuccess=()=>{const next=change(request.result);if(next)store.put(next,key);};
    };
    tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error || new Error('Could not store workbook sync queue'));
  });
}
export async function queueWorkbookSync(scope:string,book:FieldWorkbook) {
  const device=await readDeviceWorkbook(scope,book.id);
  await updateWorkbookSync(scope,book.id,previous=>{
    if(previous && JSON.stringify(previous.book)===JSON.stringify(book))return previous;
    return {key:`sync:${JSON.stringify([scope,book.id])}`,scope,book,operationId:crypto.randomUUID(),baseVersion:previous?.baseVersion || device?.baseVersion || device?.remoteVersion,
      state:previous?.state==='conflict'?'conflict':'pending',error:previous?.state==='conflict'?previous.error:undefined};
  });
}
export async function listWorkbookSync(scope:string):Promise<WorkbookSyncEntry[]> {
  const entries=await transact<any[]>('sessions','readonly',store=>store.getAll());
  return entries.filter(row=>row?.key?.startsWith('sync:') && row.scope===scope);
}
export async function finishWorkbookSync(entry:WorkbookSyncEntry,version:string) {
  await updateWorkbookSync(entry.scope,entry.book.id,current=>{
    if(!current)return current;
    // A newer edit made while uploading stays pending, based on the just-accepted version.
    return {...current,baseVersion:version,state:current.operationId===entry.operationId?'synced':'pending',error:undefined};
  });
}
export async function failWorkbookSync(entry:WorkbookSyncEntry,state:'conflict'|'blocked'|'pending',error:string) {
  await updateWorkbookSync(entry.scope,entry.book.id,current=>current?{...current,state,error}:current);
}
export async function removeWorkbookSync(scope:string,id:string) {
  await transact('sessions','readwrite',store=>store.delete(`sync:${JSON.stringify([scope,id])}`));
}

/** Keep recent undo-level snapshots plus time-spaced checkpoints, with a storage budget. */
export function recoveryCheckpoints(items:DeviceWorkbook[]):DeviceWorkbook[] {
  const buckets=new Set<number>();let bytes=0;
  const result:DeviceWorkbook[]=[];
  for(let i=0;i<items.length;i++) {
    const item=items[i],bucket=Math.floor(Date.parse(item.savedAt)/(15*60*1000));
    if(i>=3&&buckets.has(bucket))continue;
    const size=JSON.stringify(item.book).length*2;
    if(result.length && bytes+size>50_000_000)continue;
    result.push(item);bytes+=size;buckets.add(bucket);
    if(result.length>=60)break;
  }
  return result;
}
