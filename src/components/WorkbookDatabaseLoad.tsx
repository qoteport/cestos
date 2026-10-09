'use client';
import {useEffect,useState,useRef} from 'react';
import {apiFetch,ApiError} from '@/lib/api';
import {databaseSheets,loadDatabaseRecords,type DatabaseSource} from '@/lib/workbookDatabaseSource';
import type {FieldSheet} from '@/lib/fieldWorkbook';
import SearchableSelect from './SearchableSelect';
export default function WorkbookDatabaseLoad({existingNames,onClose,onLoad}:{existingNames:string[];onClose:()=>void;onLoad:(sheets:FieldSheet[])=>void}) {
 const [sources,setSources]=useState<DatabaseSource[]>([]),[sourceId,setSourceId]=useState(''),[columns,setColumns]=useState<string[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState(''),[progress,setProgress]=useState('');
 const [retry,setRetry]=useState(0);
 const alive=useRef(true);
 useEffect(()=>{alive.current=true;setBusy(true);setError('');void apiFetch<DatabaseSource[]>('/api/v1/workbook-connections/sources',{},true,{cacheResponse:false,cacheOfflineRead:false,memoryCache:false}).then(data=>{if(alive.current)setSources(data);}).catch(e=>{if(alive.current)setError(e instanceof ApiError && e.status===404?'Database loading needs the updated backend. Your workbook has not changed.':e.message);}).finally(()=>{if(alive.current)setBusy(false);});return()=>{alive.current=false;};},[retry]);
 const selected=sources.find(source=>source.id===sourceId);
 async function load(){if(!selected)return;setBusy(true);setError('');try {
  let page=0;
  const records=await loadDatabaseRecords(selected,(30-existingNames.length)*1999,async path=>{
   if(!alive.current)throw new Error('Cancelled');
   setProgress(`Loading records · request ${++page}`);
   return apiFetch(path,{},true,{cacheResponse:false,cacheOfflineRead:false,memoryCache:false});
  });
  const sheets=databaseSheets(selected,records,columns,existingNames);
  if(alive.current)onLoad(sheets);
 }catch(e){if(alive.current)setError(e instanceof Error?e.message:'Could not load records');}finally{if(alive.current){setBusy(false);setProgress('');}}}
 return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/100 p-4" onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape')onClose();}}>
  <section role="dialog" aria-modal="true" aria-label="Load database into sheets" className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5 text-slate-900 dark:bg-slate-900 dark:text-white">
   <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Load database into sheets</h3><button type="button" onClick={onClose}>Close</button></div>
   <p className="my-3 text-sm">Load records you can view into new, editable sheets. Edits stay in your workbook; they do not update database records. Loaded sheets are saved on your device for offline use.</p>
   <SearchableSelect ariaLabel="Database source" disabled={busy} value={sourceId} options={sources.map(source=>({value:source.id,label:source.name}))} placeholder="Select a database table" onChange={value=>{setSourceId(value);setColumns(sources.find(source=>source.id===value)?.columns.slice(0,100).map(c=>c.name)||[]);}}/>
   {!busy && !sources.length && !error && <p className="my-3 text-sm">No supported record lists are available for your account.</p>}
   {selected && <><p className="my-3 text-sm">Columns ({columns.length}/100). Records are split across sheets with up to 1,999 records each.</p><div className="grid max-h-64 grid-cols-2 gap-2 overflow-auto">{selected.columns.map(column=><label key={column.name} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={busy || (!columns.includes(column.name)&&columns.length>=100)} checked={columns.includes(column.name)} onChange={e=>setColumns(previous=>e.target.checked?[...previous,column.name]:previous.filter(name=>name!==column.name))}/>{column.name}</label>)}</div></>}
   {error && <div className="my-3 text-sm text-red-600"><p role="alert">{error}</p>{!sources.length && <button type="button" className="mt-2 underline" disabled={busy} onClick={()=>setRetry(value=>value+1)}>Retry loading tables</button>}</div>}
   {progress && <p role="status" className="my-3 text-sm">{progress}</p>}
   <button type="button" className="btn-primary mt-4" disabled={busy || !selected || !columns.length || existingNames.length>=30} onClick={()=>void load()}>{busy?'Loading…':'Load into new sheets'}</button>
   <p className="mt-3 text-xs text-slate-500">An internet connection is needed to fetch fresh records. Your existing sheets will not be replaced.</p>
  </section>
 </div>;
}
