'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {X,ExternalLink,Link2} from 'lucide-react';
import {apiFetch} from '@/lib/api';
import type {FieldSheet} from '@/lib/fieldWorkbook';
import type {WorkspaceSource} from '@/lib/workbookDatabaseWorkspace';
const policy={cacheResponse:false,cacheOfflineRead:false,memoryCache:false};
const isId=(key:string)=>key==='id'||key.endsWith('_id')||key.endsWith('_ids');
const label=(key:string)=>key.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const display=(value:unknown)=>value==null?'—':typeof value==='object'?JSON.stringify(value,null,2):String(value);
export default function WorkbookRecordPreview({sheet,grid}:{sheet:FieldSheet;grid:RefObject<HTMLDivElement|null>}){
 const [preview,setPreview]=useState<{left:number;top:number;field:string;record?:Record<string,unknown>;error?:string}|null>(null),[details,setDetails]=useState(false),[ids,setIds]=useState(false);
 const catalog=useRef<WorkspaceSource[]|null>(null),cache=useRef(new Map<string,Record<string,unknown>>()),timer=useRef<ReturnType<typeof setTimeout>|null>(null),hide=useRef<ReturnType<typeof setTimeout>|null>(null),sequence=useRef(0),current=useRef(''),open=useRef(false);
 open.current=details;
 useEffect(()=>{setPreview(null);setDetails(false);current.current='';sequence.current++;},[sheet.id]);
 const cancelHide=()=>{if(hide.current)clearTimeout(hide.current);};
 const close=()=>{sequence.current++;current.current='';setPreview(null);setDetails(false);};
 useEffect(()=>{
  const element=grid.current;if(!element)return;
  const over=(event:MouseEvent)=>{
   if(open.current)return;const cell=(event.target as HTMLElement).closest<HTMLElement>('[data-grid-cell]');if(!cell)return;
   const [r,c]=(cell.dataset.gridCell||'').split(':').map(Number),value=sheet.cells[r]?.[c],field=sheet.cells[sheet.connection?.headerRow??0]?.[c]?.trim();
   if(r===(sheet.connection?.headerRow??0)||!field||!isId(field)||!value||!/^[-a-zA-Z0-9_]{1,100}$/.test(value)){if(timer.current)clearTimeout(timer.current);close();return;}
   cancelHide();const key=`${sheet.id}:${r}:${c}:${value}`;if(current.current===key)return;current.current=key;const run=++sequence.current;setPreview(null);if(timer.current)clearTimeout(timer.current);
   const rect=cell.getBoundingClientRect();
   timer.current=setTimeout(()=>{void(async()=>{try{
    const left=Math.max(8,Math.min(rect.left,window.innerWidth-328)),top=Math.max(8,Math.min(rect.bottom+4,window.innerHeight-280));
    if(run!==sequence.current)return;setPreview({left,top,field});
    const sources=catalog.current||await apiFetch<WorkspaceSource[]>('/api/v1/workbook-connections/workspace',{},true,policy);catalog.current=sources;
    const path=sheet.databaseSource?.path||sheet.connection?.table;const source=sources.find(s=>s.id===path);
    const targets=field==='id'&&source?[source]:sources.filter(target=>(source?[source]:sources).some(s=>s.relations?.some(rel=>rel.column===field&&rel.target===target.id&&rel.targetColumn==='id')));
    if(targets.length!==1||!targets[0].detailPath)throw Error('No unambiguous, permitted record preview is available for this field.');
    const route=targets[0].detailPath!;if(!route.startsWith('/api/v1/')||/[?#]/.test(route))throw Error('Invalid record route.');
    const url=route.replace(/\{[^}]+\}/,encodeURIComponent(value));
    const record=cache.current.get(url)||await apiFetch<Record<string,unknown>>(url,{},true,policy);
    if(!record||Array.isArray(record)||typeof record!=='object')throw Error('Record details are unavailable.');
    if(cache.current.size>=100)cache.current.clear();cache.current.set(url,record);
    if(run===sequence.current)setPreview({left,top,field,record});
   }catch(e){if(run===sequence.current)setPreview({left:Math.max(8,Math.min(rect.left,window.innerWidth-328)),top:Math.max(8,Math.min(rect.bottom+4,window.innerHeight-180)),field,error:e instanceof Error?e.message:'Record unavailable.'});}})();},350);
  };
  const leave=(event:MouseEvent)=>{const to=event.relatedTarget as HTMLElement|null;if(to?.closest?.('[data-record-preview]'))return;if(timer.current)clearTimeout(timer.current);if(!open.current)hide.current=setTimeout(close,180);};
  element.addEventListener('mouseover',over);element.addEventListener('mouseleave',leave);
  return()=>{sequence.current++;if(timer.current)clearTimeout(timer.current);cancelHide();element.removeEventListener('mouseover',over);element.removeEventListener('mouseleave',leave);};
 },[sheet,grid]);
 useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&preview){event.stopPropagation();close();}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[preview]);
 if(!preview)return null;
 const record=preview.record,fields=Object.entries(record||{}).filter(([key])=>!isId(key));
 const title=record?String(record.name||record.title||record.display_name||[record.first_name,record.last_name].filter(Boolean).join(' ')||label(preview.field.replace(/_id$/,''))):label(preview.field);
 return createPortal(details&&record?<div data-record-preview className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4" onClick={e=>{if(e.target===e.currentTarget)close();}}><section role="dialog" aria-modal="true" aria-label="Linked record details" className="max-h-[85dvh] w-full max-w-2xl overflow-auto rounded-xl bg-white shadow-2xl dark:bg-slate-900"><header className="sticky top-0 flex items-center justify-between gap-3 border-b bg-white p-5 dark:bg-slate-900"><div><p className="text-xs text-slate-500">Linked record · {label(preview.field)}</p><h3 className="text-lg font-semibold">{title}</h3></div><button type="button" aria-label="Close record details" onClick={close}><X size={20}/></button></header><div className="p-5"><label className="mb-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={ids} onChange={e=>setIds(e.target.checked)}/>Show record IDs</label><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Field</th><th className="p-2">Value</th></tr></thead><tbody>{Object.entries(record).filter(([key])=>ids||!isId(key)).map(([key,value])=><tr key={key} className="border-b last:border-0"><th className="w-1/3 p-2 align-top font-medium text-slate-500">{label(key)}</th><td className="whitespace-pre-wrap break-words p-2">{display(value)}</td></tr>)}</tbody></table></div></section></div>:<div data-record-preview onMouseEnter={cancelHide} onMouseLeave={()=>{hide.current=setTimeout(close,180);}} style={{left:preview.left,top:preview.top,width:'min(320px,calc(100vw - 16px))'}} className="fixed z-[110] max-h-64 overflow-auto rounded-xl border bg-white p-4 text-sm shadow-xl dark:border-slate-700 dark:bg-slate-900"><p className="mb-2 flex items-center gap-2 font-semibold"><Link2 size={15}/>{title}</p>{preview.error?<p className="text-xs text-slate-500">{preview.error}</p>:!record?<p role="status" className="text-xs">Loading linked record…</p>:<><dl className="space-y-1 text-xs">{fields.slice(0,4).map(([key,value])=><div key={key}><dt className="text-slate-500">{label(key)}</dt><dd className="truncate">{display(value)}</dd></div>)}</dl><button type="button" className="mt-3 flex items-center gap-2 rounded border px-3 py-2 text-xs" onClick={()=>{cancelHide();setIds(false);setDetails(true);}}><ExternalLink size={14}/>View details</button></>}</div>,document.body);
}
