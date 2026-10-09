import {apiFetch, ApiError, getAccessToken} from './api';
import {offlineAccessActive,tokenScope} from './offlineAuth';
import {workbookWasDeleted,listWorkbookSync,finishWorkbookSync,failWorkbookSync} from './workbookDevice';
const running = new Map<string,Promise<void>>();
export function syncWorkbooks(scope:string):Promise<void> {
  const existing=running.get(scope);if(existing)return existing;
  const run=async()=>{
    const tokenIdentity=tokenScope(getAccessToken());
    const expected=`cestos-field-workbook:${tokenIdentity?.split(':').at(-1)}`;
    if(!tokenIdentity || scope!==expected || offlineAccessActive() || !navigator.onLine)return;
    const sameAccount=()=>tokenScope(getAccessToken())===tokenIdentity && !offlineAccessActive() && navigator.onLine;
    try {
      const actor=await apiFetch<{id:string}>('/api/v1/auth/me',{},true,{verifySession:true,memoryCache:false,cacheResponse:false,cacheOfflineRead:false});
      if(!sameAccount() || `cestos-field-workbook:${actor.id}`!==scope)return;
    } catch{return;}
    for(const entry of await listWorkbookSync(scope)) {
      if(!sameAccount())return;
      if(entry.state!=='pending' || await workbookWasDeleted(scope,entry.book.id))continue;
      try {
        const result=await apiFetch<{version:string}>('/api/v1/workbook-sync',{method:'POST',body:JSON.stringify({workbook:entry.book,operation_id:entry.operationId,base_version:entry.baseVersion || null})},true,{queueWhenOffline:false,cacheResponse:false,cacheOfflineRead:false});
        if(!result || typeof result.version!=='string' || !result.version)throw new Error('Server did not confirm the workbook version. The save remains queued.');
        await finishWorkbookSync(entry,result.version);
      } catch(error) {
        const status=error instanceof ApiError?error.status:0;
        const message=status===404?'Automatic workbook sync needs the updated backend. Your device copy is safe.':error instanceof Error?error.message:'Connection lost. Will retry.';
        await failWorkbookSync(entry,status===409?'conflict':[400,403,413,422].includes(status)?'blocked':'pending',message);
        if([0,401,404].includes(status)||status>=500)return;
      }
    }
  };
  const promise=(async()=>{
    if(navigator.locks)await navigator.locks.request(`workbook-sync:${scope}`,{ifAvailable:true},async lock=>{if(lock)await run();});
    else await run();
  })().finally(()=>running.delete(scope));
  running.set(scope,promise);return promise;
}
