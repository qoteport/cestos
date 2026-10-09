'use client';
import {useState} from 'react';
import {CloudCheck,AlertTriangle,FileSpreadsheet} from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import {apiFetch,apiFetchBlob} from '@/lib/api';
import {type WorkbookSyncEntry,deleteDeviceWorkbook,saveDeviceWorkbook,queueWorkbookSync,removeWorkbookSync} from '@/lib/workbookDevice';
import {copyWorkbook,validateWorkbook,type FieldWorkbook} from '@/lib/fieldWorkbook';
import {mergeWorkbookVersions} from '@/lib/workbookMerge';
const button='rounded-lg border px-3 py-2 text-xs disabled:opacity-40';
type Review={entry:WorkbookSyncEntry;action:string;server?:FieldWorkbook;version?:string;base?:FieldWorkbook};
export default function WorkbookSyncPanel({scope,entries,status,onOpen,onResolved}:{scope:string;entries:WorkbookSyncEntry[];status:string;onOpen:(book:FieldWorkbook)=>void;onResolved:(id:string,book?:FieldWorkbook)=>Promise<void>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[review,setReview]=useState<Review|null>(null),[choices,setChoices]=useState<Record<string,'local'|'server'>>({});
 const pending=entries.filter(e=>e.state!=='synced');
 async function prepare(entry:WorkbookSyncEntry,action:string){if(!action)return;setBusy(true);setError('');setChoices({});try{
  if(action==='open'){onOpen(entry.book);return;}
  const draft:Review={entry,action};
  if(action==='server'||action==='merge'){
   let docs:any[]=[];for(let page=1;;page++){const result=await apiFetch<{items:any[];total:number}>(`/api/v1/documents?view=all&category=Field%20Workbooks&page_size=100&page=${page}`,{},true,{memoryCache:false,cacheResponse:false,cacheOfflineRead:false});docs.push(...result.items);if(!result.items.length||docs.length>=result.total)break;}
   const doc=docs.filter(d=>d.tags?.includes(`wb-${entry.book.id}`)).sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];if(!doc)throw Error('No server version is available. Keep your local work as a new workbook or discard it.');
   draft.server=validateWorkbook(JSON.parse(await(await apiFetchBlob(`/api/v1/documents/${doc.id}/download`)).text()));draft.version=doc.id;
   if(action==='merge'){if(!entry.baseVersion)throw Error('The original shared version is unavailable. Open both versions and preserve your local work as a new workbook.');draft.base=validateWorkbook(JSON.parse(await(await apiFetchBlob(`/api/v1/documents/${entry.baseVersion}/download`)).text()));}
  }
  setReview(draft);
 }catch(e){setError(e instanceof Error?e.message:'Could not prepare resolution.');}finally{setBusy(false);}}
 const merged=review?.base&&review.server?mergeWorkbookVersions(review.base,review.entry.book,review.server,choices):null;
 async function confirm(){if(!review)return;setBusy(true);setError('');try{
  const {entry,action}=review;let next:FieldWorkbook|undefined;
  if(action==='local'||action==='merge'){
   next=copyWorkbook(validateWorkbook(action==='merge'?merged!.book:entry.book),entry.book.template);next.name=`${entry.book.name} — ${action==='merge'?'merged':'recovered'} copy`;
   await saveDeviceWorkbook(scope,next);await queueWorkbookSync(scope,next);
   // Preserve the original server version; only the reviewed result is a new workbook.
   if(action==='merge'&&review.server){await deleteDeviceWorkbook(scope,entry.book.id,false,{book:review.server,version:review.version});}else await deleteDeviceWorkbook(scope,entry.book.id,/deleted on the server/i.test(entry.error||''));
  }else if(action==='server'){
   await deleteDeviceWorkbook(scope,entry.book.id,false,{book:review.server!,version:review.version});next=review.server;
  }else await deleteDeviceWorkbook(scope,entry.book.id,/deleted on the server/i.test(entry.error||''));
  await removeWorkbookSync(scope,entry.book.id);await onResolved(entry.book.id,next);setReview(null);
 }catch(e){setError(e instanceof Error?e.message:'Could not resolve this workbook.');}finally{setBusy(false);}}
 return <section className="overflow-hidden rounded-xl border bg-white dark:bg-slate-900"><header className="flex items-center gap-3 p-4"><CloudCheck className="text-emerald-600" size={22}/><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">Offline storage & sync</h3><p className="text-xs text-slate-500">{status||'Your workbooks are saved on this device.'}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">{pending.length?`${pending.length} need attention`:'Up to date'}</span></header>
 {pending.length>0&&<div className="divide-y border-t">{pending.map(entry=>{const deleted=/deleted on the server/i.test(entry.error||'');return <div key={entry.key} className="flex flex-wrap items-center gap-3 p-4"><AlertTriangle size={18} className="shrink-0 text-amber-600"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium" title={entry.book.name}>{entry.book.name}</p><p className="text-xs text-slate-500">{deleted?'Deleted on server · Local copy remains':entry.state==='conflict'?'Different versions · Choose how to resolve':entry.state==='blocked'?'Sync needs attention':'Waiting to sync'}</p>{entry.error&&<p className="mt-1 text-xs text-slate-500">{entry.error}</p>}</div><div className="w-56"><SearchableSelect ariaLabel={`Resolve ${entry.book.name}`} disabled={busy} value="" placeholder="Choose an action..." onChange={action=>void prepare(entry,action)} options={[{value:'open',label:'Open local version'},{value:'local',label:'Keep local as new workbook'},...(!deleted?[{value:'server',label:'Keep server · discard local edits'},{value:'merge',label:'Review and merge versions'}]:[]),{value:'discard',label:'Discard local copy'}]}/></div></div>;})}</div>}
 <p className="border-t px-4 py-3 text-[11px] text-slate-500">Autosave protects local edits. Keep a backup before clearing browser data. Discarding affects this device only; it never deletes the server workbook.</p>
 {error&&<p role="alert" className="p-3 text-sm text-red-600">{error}</p>}
 {review&&<div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-label="Resolve workbook sync" className="max-h-[85dvh] w-full max-w-2xl space-y-3 overflow-auto rounded-xl bg-white p-5 dark:bg-slate-900"><h3 className="flex items-center gap-2 font-semibold"><FileSpreadsheet size={18}/>{review.entry.book.name}</h3><p className="text-sm">{review.action==='discard'?'Discard this device’s workbook, local edits, recovery history and pending upload? The server is not changed.':review.action==='server'?'Replace your local copy and recovery history with the fetched server version?':review.action==='local'?'Save your local work under a new workbook ID and remove the old local conflict? The server workbook is not changed.':'Merge independent changes into a new workbook. Choose which value to keep wherever both versions changed. Both server and local edits are reviewed before saving.'}</p>
 {merged&&<><p className="text-sm">{merged.conflicts.length} overlapping changes to review. Independent changes are combined automatically.</p>{merged.conflicts.map(conflict=><div key={conflict.path} className="space-y-2 rounded border p-3"><p className="break-all text-xs font-semibold">{conflict.path}</p><div className="grid grid-cols-2 gap-2 text-xs"><pre className="max-h-32 overflow-auto whitespace-pre-wrap">Local: {JSON.stringify(conflict.local)??'(removed)'}</pre><pre className="max-h-32 overflow-auto whitespace-pre-wrap">Server: {JSON.stringify(conflict.server)??'(removed)'}</pre></div><SearchableSelect ariaLabel={`Keep value for ${conflict.path}`} value={choices[conflict.path]||''} placeholder="Choose value to keep" options={[{value:'local',label:'Keep local value'},{value:'server',label:'Keep server value'}]} onChange={value=>setChoices({...choices,[conflict.path]:value as 'local'|'server'})}/></div>)}</>}
 <div className="flex justify-end gap-2"><button type="button" className={button} disabled={busy} onClick={()=>setReview(null)}>Cancel</button><button type="button" className={button} disabled={busy||!!merged?.conflicts.some(c=>!choices[c.path])} onClick={()=>void confirm()}>{busy?'Saving...':review.action==='merge'?'Save merged workbook':review.action==='discard'?'Discard local copy':'Confirm resolution'}</button></div>{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}</section></div>}
 </section>;
}
