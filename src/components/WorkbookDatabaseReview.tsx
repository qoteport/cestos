'use client';
import {useEffect,useState} from 'react';
import {apiFetch} from '@/lib/api';
import type {FieldSheet} from '@/lib/fieldWorkbook';
import {actionPath,sheetChanges,type RecordChange,type WorkspaceSource} from '@/lib/workbookDatabaseWorkspace';
const options={queueWhenOffline:false,cacheResponse:false,cacheOfflineRead:false,memoryCache:false};
export default function WorkbookDatabaseReview({sheet,onClose,onSaved}:{sheet:FieldSheet;onClose:()=>void;onSaved:(row:number,record:Record<string,unknown>)=>void}){
 const [changes,setChanges]=useState<RecordChange[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[done,setDone]=useState<number[]>([]),[attempted,setAttempted]=useState<number[]>([]);
 useEffect(()=>{let live=true;void apiFetch<WorkspaceSource[]>('/api/v1/workbook-connections/workspace',{},true,options).then(sources=>{const source=sources.find(s=>s.id===sheet.databaseSource?.path);if(!source)throw Error('This table is no longer available to your account.');const rows=sheetChanges(sheet,source);if(live)setChanges(rows);}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[]);
 async function save(change:RecordChange){setBusy(true);setError('');try{
  const path=actionPath(change.action,change.id);
  if(change.id){const current=await apiFetch<Record<string,unknown>>(path,{},true,options);for(const [key,value]of Object.entries(change.before))if(String(current[key]??'')!==String(value??''))throw Error('This record changed on the server. Reload the table and review your edits before saving.');}
  setAttempted(items=>[...items,change.row]);
  const record=await apiFetch<Record<string,unknown>>(path,{method:change.action.method,body:JSON.stringify(change.values)},true,options);
  if(!record||typeof record!=='object'||record.id==null)throw Error('The server did not return a record ID. Reload the table to verify the result.');
  onSaved(change.row,record);setDone(items=>[...items,change.row]);
 }catch(e){setError((e instanceof Error?e.message:'Could not confirm save')+' If a request was sent, it will not be automatically retried. Check the database before submitting again.');}finally{setBusy(false);}}
 return <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-label="Review database changes" className="max-h-[85dvh] w-full max-w-3xl space-y-3 overflow-auto rounded-xl bg-white p-5 dark:bg-slate-900"><div className="flex justify-between"><h3 className="font-bold">Review database changes · {sheet.name}</h3><button type="button" disabled={busy} onClick={onClose}>Close</button></div><p className="text-sm">Confirm each record separately. Workbook autosave never writes these changes to the database. Removed rows do not delete database records.</p><p className="text-xs text-slate-500">Existing records are checked for changes before sending. The table’s normal permissions and validation apply.</p>
 {loading&&<p>Checking permissions and changes…</p>}{error&&<p role="alert" className="text-red-600">{error}</p>}{!loading&&!error&&!changes.length&&<p>No database changes to save.</p>}
 {changes.map(change=><div className="space-y-2 rounded border p-3" key={change.row}><h4 className="font-semibold">Row {change.row+1} · {change.id?'Update record':'Create record'} {change.id}</h4><table className="w-full text-left text-xs"><thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>{Object.entries(change.values).map(([key,value])=><tr key={key}><td className="p-1">{key}</td><td className="max-w-48 break-words p-1">{String(change.before[key]??'—')}</td><td className="max-w-48 break-words p-1">{typeof value==='object'?JSON.stringify(value):String(value)}</td></tr>)}</tbody></table><button type="button" disabled={busy||attempted.includes(change.row)} className="rounded border px-3 py-2 text-sm disabled:opacity-50" onClick={()=>void save(change)}>{done.includes(change.row)?'Saved':attempted.includes(change.row)?'Check database before retrying':change.id?'Confirm update':'Confirm create'}</button></div>)}
 </section></div>;
}
