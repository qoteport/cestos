import {apiFetch,apiFetchBlob,ApiError,getAccessToken} from './api';
import {tokenScope} from './offlineAuth';
import {exportWorkbook,type FieldWorkbook} from './fieldWorkbook';
import {sheetCsv,readLinkedFileHead,saveLinkedFileHead} from './workbookDevice';
import {calculateSheet} from './workbookFormulas';
export type CloudFile={id:string;name:string;revision:number;content_hash:string;document_id:string;size_bytes:number;updated_at:string};
export type FileLink={cloud_id:string;file_name:string;base_revision:number;local_id?:string;local_revision?:string;last_file_hash?:string;workbook_hash?:string};
export type FileBaseline={cloudId:string;baseRevision:number;baseHash:string|null;localRevision?:string};
export type LocalSyncFile={id:string;name:string;revision:string;folderId:string;syncEnabled?:boolean;sync?:FileBaseline};
const policy={queueWhenOffline:false,cacheResponse:false,cacheOfflineRead:false,memoryCache:false};
async function timed<T>(milliseconds:number,run:(signal:AbortSignal)=>Promise<T>){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),milliseconds);try{return await run(controller.signal);}finally{clearTimeout(timer);}}
export async function bytesHash(bytes:Uint8Array){const copy=new Uint8Array(bytes);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',copy.buffer))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function fileSyncAction(localHash:string,remote:CloudFile|undefined,base?:FileBaseline):'missing'|'upload'|'ack'|'conflict'|'download'{
 if(!remote)return base?.baseRevision?'missing':'upload';
 if(localHash===remote.content_hash)return 'ack';
 if(!base?.baseHash)return 'conflict';
 const local=localHash!==base.baseHash,cloud=remote.content_hash!==base.baseHash;
 return local&&cloud?'conflict':local?'upload':cloud?'download':'ack';
}
export const cloudFiles=()=>timed(35000,signal=>apiFetch<CloudFile[]>('/api/v1/file-sync',{signal},true,policy));
export const fileSyncCapabilities=()=>timed(35000,signal=>apiFetch<{max_bytes:number}>('/api/v1/file-sync/capabilities',{signal},true,policy));
export const cloudMetadata=(id:string)=>timed(35000,signal=>apiFetch<CloudFile>(`/api/v1/file-sync/${encodeURIComponent(id)}`,{signal},true,policy));
export async function uploadCloudFile(id:string,base:number,name:string,bytes:Uint8Array){const body=new FormData();body.append('base_revision',String(base));body.append('file',new File([new Uint8Array(bytes)],name));return timed(120000,signal=>apiFetch<CloudFile>(`/api/v1/file-sync/${encodeURIComponent(id)}`,{method:'PUT',body,signal},true,policy));}
export async function cloudBytes(file:CloudFile){const bytes=await timed(120000,async signal=>new Uint8Array(await (await apiFetchBlob(`/api/v1/file-sync/${file.id}/content?revision=${file.revision}`,{signal})).arrayBuffer()));if(await bytesHash(bytes)!==file.content_hash)throw Error('Download verification failed. The original file was not changed.');return bytes;}
export async function fileWorkbookFingerprint(book:FieldWorkbook){return bytesHash(new TextEncoder().encode(JSON.stringify({sheets:book.sheets,assets:book.assets,folders:book.folders})));}
async function workbookBytes(book:FieldWorkbook,link:FileLink){
 if(/\.xlsx$/i.test(link.file_name))return new Uint8Array(await (await exportWorkbook(book)).arrayBuffer());
 if(/\.csv$/i.test(link.file_name)){if(book.sheets.length!==1)throw Error('A CSV can contain only one worksheet. Save a separate workbook copy to keep all sheets.');return new TextEncoder().encode(sheetCsv({...book.sheets[0],cells:calculateSheet(book.sheets[0])}));}
 if(/\.cestos\.json$/i.test(link.file_name))return new TextEncoder().encode(JSON.stringify({...book,fileLink:undefined}));
 throw Error('This original file type cannot be safely rewritten. Save a separate XLSX workbook copy instead.');
}
/** Explicit workbook Save writes its linked local original; autosave never does. */
export async function prepareLinkedWorkbook(book:FieldWorkbook,scope:string):Promise<FieldWorkbook>{
 const link=book.fileLink,desktop=typeof window==='undefined'?null:(window as any).cestosDesktop;
 if(!link||!desktop)return book;
 const files:LocalSyncFile[]=(await desktop.scanFolders(scope)).files;
 const file=files.find(f=>f.sync?.cloudId===link.cloud_id&&f.id===link.local_id);
 if(!file)return book; // A cloud-linked workbook may be opened on another computer.
 if(file.revision!==link.local_revision)throw new ApiError(409,'The original file changed after this workbook opened. Keep your draft and reopen the file or save a copy.');
 const signature=await fileWorkbookFingerprint(book);if(signature===link.workbook_hash)return book;
 const bytes=await workbookBytes(book,link),written=await desktop.writeLinkedFile(scope,file.id,file.revision,bytes);
 window.dispatchEvent(new Event('cestos:folder-sync-changed'));
 return {...book,fileLink:{...link,local_revision:written.revision,last_file_hash:written.content_hash,workbook_hash:signature}};
}
/** Invoked by the existing durable workbook queue, including after reconnection. */
export async function syncLinkedWorkbook(book:FieldWorkbook,scope:string):Promise<FieldWorkbook>{
 const link=book.fileLink;if(!link)return book;
 const identity=tokenScope(getAccessToken());
 const verify=()=>{if(!identity||identity.split(':').at(-1)!==scope||tokenScope(getAccessToken())!==identity)throw new ApiError(409,'The signed-in account changed. File synchronization was stopped.');};verify();
 const signature=await fileWorkbookFingerprint(book),desktop=typeof window==='undefined'?null:(window as any).cestosDesktop;
 let bytes:Uint8Array|undefined;
 if(desktop&&link.local_id&&signature===link.workbook_hash){
  const files:LocalSyncFile[]=(await desktop.scanFolders(scope)).files,file=files.find(f=>f.id===link.local_id&&f.sync?.cloudId===link.cloud_id);
  if(file){if(file.revision!==link.local_revision)throw new ApiError(409,'The linked original changed. Your queued workbook was preserved for review.');bytes=(await desktop.readFolderFile(scope,file.id,file.revision)).bytes;}
 }
 let remote:CloudFile|undefined;try{remote=await cloudMetadata(link.cloud_id);}catch(e){if(!(e instanceof ApiError&&e.status===404&&link.base_revision===0))throw e;}
 const acknowledged=await readLinkedFileHead(scope,link.cloud_id);
 verify();
 if(remote&&acknowledged?.workbook_hash===signature&&acknowledged.last_file_hash===remote.content_hash)return {...book,fileLink:{...link,...acknowledged,base_revision:remote.revision}};
 if(remote&&signature===link.workbook_hash&&remote.content_hash===link.last_file_hash)return {...book,fileLink:{...link,base_revision:remote.revision}};
 bytes??=await workbookBytes(book,link);
 verify();
 const base=remote&&(remote.content_hash===link.last_file_hash||remote.content_hash===acknowledged?.last_file_hash)?remote.revision:link.base_revision;
 const saved=await uploadCloudFile(link.cloud_id,base,link.file_name,bytes);
 if(desktop&&link.local_id&&link.local_revision){try{await desktop.ackSyncFile(scope,link.local_id,link.local_revision,saved);}catch{ /* A concurrent disk edit will be reviewed by folder sync. */ }}
 window.dispatchEvent(new Event('cestos:folder-sync-changed'));
 const confirmed={...link,base_revision:saved.revision,last_file_hash:saved.content_hash,workbook_hash:signature};
 await saveLinkedFileHead(scope,confirmed);
 return {...book,fileLink:confirmed};
}
