'use client';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import type { FieldSheet } from '@/lib/fieldWorkbook';
import SearchableSelect from './SearchableSelect';

type Table = {id:string;name:string;columns:{name:string;required:boolean;nullable:boolean;type:string;schema:any}[]};
function mappingError(error: unknown): string {
 if (error instanceof ApiError && error.status === 404) return 'Workbook database mapping is unavailable on this server. The backend needs to be updated or restarted with the workbook mapping routes. Your workbook data has not been changed.';
 return error instanceof Error ? error.message : 'Could not load database mapping. Please retry.';
}
const normalize=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
export default function WorkbookDatabaseConnection({sheet,onClose,onSave}:{sheet:FieldSheet;onClose:()=>void;onSave:(connection:NonNullable<FieldSheet['connection']>)=>void}) {
 const [tables,setTables]=useState<Table[]>([]),[table,setTable]=useState(sheet.connection?.table || ''),[header,setHeader]=useState(sheet.connection?.headerRow || 0);
 const [mapping,setMapping]=useState<Record<string,number>>(sheet.connection?.mapping || {}),[result,setResult]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setBusy(true);setError('');apiFetch<Table[]>('/api/v1/workbook-connections/tables',{},true,{bypassMemoryRead:true,cacheOfflineRead:false,cacheResponse:false}).then(data=>{if(active)setTables(data);}).catch(e=>{if(active)setError(mappingError(e));}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[retry]);
 const selected=tables.find(t=>t.id===table);
 const headers=sheet.cells[header] || [];
 const duplicates=useMemo(()=>headers.filter((h,i)=>h.trim() && headers.findIndex(other=>normalize(other)===normalize(h))!==i),[headers]);
 function suggest(id:string,row:number) {
  setTable(id);setHeader(row);setResult(null);
  const fields=tables.find(t=>t.id===id)?.columns || [];
  const proposed:Record<string,number>={}; const used=new Set<number>();
  for(const field of fields) {
    const aliases=[field.name,field.name.replace(/_number$/,'')];
    const matches=(sheet.cells[row] || []).map((h,i)=>({h,i})).filter(({h})=>h.trim() && aliases.some(alias=>normalize(h)===normalize(alias)));
    if(matches.length===1 && !used.has(matches[0].i)){proposed[field.name]=matches[0].i;used.add(matches[0].i);}
  }
  setMapping(proposed);
 }
 async function validate(){setBusy(true);setError('');setResult(null);try{setResult(await apiFetch('/api/v1/workbook-connections/preview',{method:'POST',body:JSON.stringify({table,mapping,rows:sheet.cells.slice(header+1)})},true,{queueWhenOffline:false}));}catch(e){setError(mappingError(e));}finally{setBusy(false);}}
 return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}}}>
  <section role="dialog" aria-modal="true" aria-label="Connect to Database Table" className="max-h-[90dvh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-5 text-slate-900 shadow-xl dark:bg-slate-900 dark:text-slate-100">
   <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold">Connect to Database Table</h3><button type="button" onClick={onClose}>Close</button></div>
   <p className="my-3 text-sm">Review the column mapping for {sheet.name}. Only tables with supported flat create schemas and your account permissions appear. Relationship fields need record IDs.</p>
   <p className="mb-3 rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-950">Preview only: database imports are not enabled. Saving a mapping stores it in this workbook; it does not create database records.</p>
   <p className="mb-3 text-sm">Copies retain this mapping and are configured for new records when importing becomes available. Existing records are not update targets.</p>
   {error && <div className="my-3 rounded border border-red-200 bg-red-50 p-3 text-sm dark:bg-red-950"><p role="alert" className="text-red-700 dark:text-red-200">{error}</p><button type="button" disabled={busy} className="mt-2 rounded border border-red-300 px-3 py-1 font-medium" onClick={()=>{setResult(null);setRetry(value=>value+1);}}>Retry connection</button></div>}
   <div className="grid gap-3 sm:grid-cols-2"><SearchableSelect ariaLabel="Database table" disabled={busy || !tables.length} value={table} options={tables.map(t=>({value:t.id,label:t.name}))} onChange={value=>suggest(value,header)} placeholder={busy?'Loading tables…':'Select database table'}/>
   <label className="flex items-center gap-2 text-sm">Header row<input type="number" min={1} max={sheet.cells.length} value={header+1} className="input-field" onChange={e=>suggest(table,Math.max(0,Math.min(sheet.cells.length-1,Number(e.target.value)-1)))}/></label></div>
   {!busy && !tables.length && !error && <p className="mt-3 text-sm">No supported tables are available for this account.</p>}
   {duplicates.length>0 && <p role="alert" className="my-2 text-red-600">Duplicate column names: {duplicates.join(', ')}. Rename them before validating.</p>}
   {selected && <table className="my-4 w-full text-sm"><thead><tr><th className="p-2 text-left">Database column</th><th className="p-2 text-left">Type / rules</th><th className="p-2 text-left">Sheet column</th></tr></thead><tbody>{selected.columns.map(field=><tr key={field.name} className="border-t"><td className="p-2">{field.name}</td><td className="p-2 text-xs">{field.type}{field.required?' · Required':''}{field.nullable?' · Nullable':' · Not null'}</td><td className="p-2"><SearchableSelect ariaLabel={`Map ${field.name}`} value={mapping[field.name]===undefined?'':String(mapping[field.name])} options={[{value:'',label:'Not mapped'},...headers.map((h,i)=>({value:String(i),label:`${i+1}: ${h || '(blank header)'}`,disabled:!h.trim()}))]} onChange={value=>{setResult(null);setMapping(old=>{const next={...old};if(value==='')delete next[field.name];else next[field.name]=Number(value);return next;});}}/></td></tr>)}</tbody></table>}
   <button type="button" disabled={!selected || busy || !!duplicates.length || sheet.previewLimited} className="btn-primary" onClick={()=>void validate()}>{busy?'Checking…':'Validate & preview'}</button>
   {sheet.previewLimited && <p className="text-red-600">This sheet is only partially loaded; database mapping is disabled to avoid missing rows.</p>}
   {result && <div className="mt-4"><p>{result.count} data rows checked.</p>{result.issues.length>0 ? <ul className="max-h-52 overflow-auto text-sm text-red-600">{result.issues.map((issue:any,i:number)=><li key={i}>Row {issue.row ? issue.row+header+1 : '—'} {issue.field}: {issue.message}</li>)}</ul> : <><p className="text-emerald-700">Schema validation passed. Destination-specific business rules will still need checking before an import is enabled.</p><pre className="my-3 max-h-48 overflow-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-800">{JSON.stringify(result.preview,null,2)}</pre><button type="button" className="btn-primary" onClick={()=>onSave({table,mapping,headerRow:header,validatedAt:new Date().toISOString(),writeMode:'insert',importId:sheet.connection?.table === table && sheet.connection?.importId ? sheet.connection.importId : crypto.randomUUID()})}>Save mapping to workbook</button></>}</div>}
  </section>
 </div>;
}
