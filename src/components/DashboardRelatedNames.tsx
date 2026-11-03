'use client';
import SearchableSelect from './SearchableSelect';
import {columnLabel,type DashboardWidget,type DashboardDataset,type DashboardData} from '@/lib/workbookDashboard';
import type {DatabaseSource} from '@/lib/workbookDatabaseSource';
export default function DashboardRelatedNames({widget,datasets,sources,dataFor,onSelect,onChange}:{widget:DashboardWidget;datasets:DashboardDataset[];sources:DatabaseSource[];dataFor:(id:string)=>DashboardData|undefined;onSelect:(dataset:DashboardDataset,lookup:NonNullable<DashboardWidget['label_lookup']>)=>void;onChange:(w:DashboardWidget)=>void}){
 const original=datasets.find(d=>d.id===widget.dataset_id);
 const relations=sources.find(s=>original?.kind==='api'&&s.id===original.source)?.relations?.filter(r=>r.column===widget.group_by)||[];
 const connected=datasets.filter(d=>d.id!==widget.dataset_id);
 const options=[...connected.map(d=>({value:d.id,label:`${d.name}${relations.some(r=>r.target===d.source)?' · Related table':''} · Connected`})),...sources.filter(s=>s.columns.some(c=>c.name==='id')&&!datasets.some(d=>d.kind==='api'&&d.source===s.id)).sort((a,b)=>Number(relations.some(r=>r.target===b.id))-Number(relations.some(r=>r.target===a.id))).map(s=>({value:`table:${s.id}`,label:`${s.name}${relations.some(r=>r.target===s.id)?' · Related table':' · Available table'}`}))];
 const columns=(id:string)=>{const dataset=datasets.find(d=>d.id===id);return dataFor(id)?.columns||sources.find(s=>dataset?.kind==='api'&&s.id===dataset.source)?.columns||[];};
 function select(id:string){if(!id){onChange({...widget,label_lookup:undefined});return;}
 const source=id.startsWith('table:')?sources.find(s=>s.id===id.slice(6)):undefined;
 const dataset=source?{id:crypto.randomUUID(),name:source.name,kind:'api' as const,source:source.id,sheet_id:'',header_row:0}:datasets.find(d=>d.id===id);
 if(!dataset)return;
 const cols=source?.columns||columns(dataset.id),relation=relations.find(r=>r.target===dataset.source);
 onSelect(dataset,{dataset_id:dataset.id,key:relation?.targetColumn||cols.find(c=>c.name==='id')?.name||'',label:['name','title','full_name','vendor_name','company_name','display_name','description'].find(name=>cols.some(c=>c.name===name))||''});
 }
 return <fieldset className="space-y-2 rounded-lg border p-3"><legend className="text-xs font-medium">Display related names</legend>
 <p className="text-xs text-slate-500">Choose a related table for {columnLabel(widget.group_by)}. Selecting a table connects it here and loads its names automatically. Records stay grouped by their original IDs.</p>
 {!!relations.length&&<div className="flex flex-wrap gap-2">{relations.map(r=>{const source=sources.find(s=>s.id===r.target),existing=datasets.find(d=>d.kind==='api'&&d.source===r.target);return source&&<button key={r.target} type="button" disabled={!existing&&datasets.length>=8} className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 disabled:opacity-50" onClick={()=>select(existing?.id||`table:${source.id}`)}>{source.name} · Match found</button>;})}</div>}
 {!relations.length&&<p className="text-xs text-slate-500">No confirmed relationship is available. You can select another accessible table and check the ID mapping.</p>}
 <SearchableSelect ariaLabel="Related label dataset" value={widget.label_lookup?.dataset_id||''} placeholder="Use original values" options={options.filter(o=>!o.value.startsWith('table:')||datasets.length<8)} onChange={select}/>
 {datasets.length>=8&&<p className="text-xs text-amber-700">The dashboard has eight datasets. Remove an unused dataset to connect another table.</p>}
 {widget.label_lookup&&<><SearchableSelect ariaLabel="Related record ID column" placeholder="Match to ID column" value={widget.label_lookup.key} options={columns(widget.label_lookup.dataset_id).map(c=>({value:c.name,label:columnLabel(c.name)}))} onChange={key=>onChange({...widget,label_lookup:{...widget.label_lookup!,key}})}/>
 <SearchableSelect ariaLabel="Related display column" placeholder="Display name column" value={widget.label_lookup.label} options={columns(widget.label_lookup.dataset_id).map(c=>({value:c.name,label:columnLabel(c.name)}))} onChange={label=>onChange({...widget,label_lookup:{...widget.label_lookup!,label}})}/>
 <p className="text-xs text-slate-500">Unmatched or ambiguous records keep their IDs. {!dataFor(widget.label_lookup.dataset_id)?'Loading related records…':dataFor(widget.label_lookup.dataset_id)?.error?'Related records are unavailable. Retry Refresh when online.':dataFor(widget.label_lookup.dataset_id)?.partial?'Related records are partial; some names may be missing.':''}</p></>}
 </fieldset>;
}
