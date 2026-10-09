'use client';
import {useEffect,useState} from 'react';
import {apiFetch} from '@/lib/api';
import {databaseSheets,loadDatabaseRecords} from '@/lib/workbookDatabaseSource';
import {type WorkspaceSource,type Schema,fieldValue,resolvedSchema} from '@/lib/workbookDatabaseWorkspace';
import {newWorkbook,type FieldWorkbook,type FieldSheet} from '@/lib/fieldWorkbook';
const fresh={cacheResponse:false,cacheOfflineRead:false,memoryCache:false,queueWhenOffline:false};
const button='rounded-lg border px-3 py-2 text-sm disabled:opacity-40';
export default function WorkbookDatabaseWorkspace({onOpen}:{onOpen:(book:FieldWorkbook)=>void}) {
 const [sources,setSources]=useState<WorkspaceSource[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[search,setSearch]=useState(''),[related,setRelated]=useState(true),[creating,setCreating]=useState<WorkspaceSource|null>(null),[notice,setNotice]=useState('');
 async function refresh(){setBusy(true);setError('');try{setSources(await apiFetch<WorkspaceSource[]>('/api/v1/workbook-connections/workspace',{},true,fresh));}catch(e){setError(e instanceof Error?e.message:'Could not load tables');}finally{setBusy(false);}}
 useEffect(()=>{void refresh();},[]);
 async function open(source:WorkspaceSource){setBusy(true);setError('');try{
  const selected=[source,...(related?sources.filter(item=>source.relations?.some(relation=>relation.target===item.id)&&item.id!==source.id):[])];
  const sheets:FieldSheet[]=[];
  for(const item of selected){const records=await loadDatabaseRecords(item,(30-sheets.length)*1999,path=>apiFetch(path,{},true,fresh));sheets.push(...databaseSheets(item,records,item.columns.slice(0,100).map(c=>c.name),sheets.map(s=>s.name)));}
  onOpen({...newWorkbook(),name:source.name,sheets});
 }catch(e){setError(e instanceof Error?e.message:'Could not load table');}finally{setBusy(false);}}
 return <section className="space-y-3 rounded-xl border bg-white p-5 dark:bg-slate-900">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold">Database tables</h3><p className="text-sm text-slate-500">Tables available through your account. Sheet edits are drafts until you review and confirm each record.</p></div><div className="flex items-center gap-2"><input aria-label="Search database tables" placeholder="Search tables" value={search} onChange={e=>setSearch(e.target.value)} className="min-w-0 rounded border bg-transparent p-2"/><button type="button" className={button} disabled={busy} onClick={()=>void refresh()}>Refresh</button></div></div>
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={related} onChange={e=>setRelated(e.target.checked)}/>Also open accessible related tables (all visible records)</label>
  {notice&&<p role="status" className="text-sm text-emerald-700">{notice}</p>}
  {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
  {busy&&<p role="status">Loading database tables…</p>}
  {!busy&&!sources.length&&!error&&<p>No supported tables are available to this account.</p>}
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{sources.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())).map(source=><div key={source.id} className="rounded-lg border p-3"><h4 className="font-semibold">{source.name}</h4><p className="my-2 text-xs text-slate-500">{source.columns.length} columns · {source.relations?.length||0} relationships{!source.update?' · View only in database':''}</p><div className="flex gap-2"><button type="button" className={button} disabled={busy} onClick={()=>void open(source)}>View as sheets</button><button type="button" className={button} disabled={busy||!source.create} title={!source.create?'No supported create action for this account':undefined} onClick={()=>setCreating(source)}>New record</button></div></div>)}</div>
  {creating&&<NewDatabaseRecord source={creating} onCreated={()=>{setCreating(null);setNotice('Database record created successfully.');}} onClose={()=>setCreating(null)}/>}
 </section>;
}
function NewDatabaseRecord({source,onClose,onCreated}:{source:WorkspaceSource;onClose:()=>void;onCreated:()=>void}){
 const [values,setValues]=useState<Record<string,string>>({}),[preview,setPreview]=useState<Record<string,unknown>|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[submitted,setSubmitted]=useState(false);
 const schema=source.create!.schema;
 function review(){try{const data:Record<string,unknown>={};for(const [name,value]of Object.entries(values))if(value!=='')data[name]=fieldValue(value,schema.properties![name],schema);for(const name of schema.required||[])if(!(name in data))throw Error(`${name} is required.`);setPreview(data);setError('');}catch(e){setError(e instanceof Error?e.message:'Invalid record');}}
 async function save(){if(!preview||submitted)return;setBusy(true);setSubmitted(true);try{await apiFetch(source.create!.path,{method:'POST',body:JSON.stringify(preview)},true,fresh);setError('');onCreated();}catch(e){setError((e instanceof Error?e.message:'Could not confirm save')+' Check the table before trying again; this dialog will not resend the record.');}finally{setBusy(false);}}
 return <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-label="New database record" className="max-h-[85dvh] w-full max-w-xl space-y-3 overflow-auto rounded-xl bg-white p-5 dark:bg-slate-900"><div className="flex justify-between"><h3 className="font-bold">New record · {source.name}</h3><button type="button" disabled={busy} onClick={onClose}>Close</button></div>
 {preview?<><p>Review the exact values before creating this database record.</p><pre className="overflow-auto whitespace-pre-wrap rounded border p-3 text-xs">{JSON.stringify(preview,null,2)}</pre><button type="button" className={button} disabled={busy||submitted} onClick={()=>setPreview(null)}>Back</button><button type="button" className={button} disabled={busy||submitted} onClick={()=>void save()}>Confirm create record</button></>:<>{Object.entries(schema.properties||{}).map(([name,definition])=>{const field=resolvedSchema(definition,schema);const typed=field.anyOf?.find((s:Schema)=>s.type!=='null')||field;return <label key={name} className="block text-sm">{name}{schema.required?.includes(name)?' *':''}<textarea rows={typed.type==='object'||typed.type==='array'?4:1} value={values[name]||''} onChange={e=>setValues({...values,[name]:e.target.value})} placeholder={typed.enum?.join(' / ')||typed.format||typed.type||'Value'} className="mt-1 block w-full rounded border bg-transparent p-2"/>{field.description&&<span className="text-xs text-slate-500">{field.description}</span>}</label>;})}<p className="text-xs text-slate-500">Use record IDs for relationships, true/false for booleans, and JSON for nested fields. Server validation and account permissions apply.</p><button type="button" className={button} onClick={review}>Review new record</button></>}
 {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}</section></div>;
}
