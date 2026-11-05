'use client';
import {useEffect,useRef,useState} from 'react';
import {apiFetch} from '@/lib/api';
import {numericColumns,type DashboardWidget,type DashboardDataset,type DashboardData} from '@/lib/workbookDashboard';
export default function DashboardVisualAssistant({widget,datasets,dataFor,onChange}:{widget:DashboardWidget;datasets:DashboardDataset[];dataFor:(id:string)=>DashboardData|undefined;onChange:(w:DashboardWidget)=>void}){
 const [prompt,setPrompt]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[previous,setPrevious]=useState<DashboardWidget|null>(null);
 const mounted=useRef(true);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const [history,setHistory]=useState<{role:'user'|'assistant';content:string}[]>([]);
 const current=useRef(widget);current.current=widget;
 async function ask(){if(!prompt.trim()||busy)return;const original=widget;setBusy(true);setMessage('');try{
 const available=datasets.flatMap(d=>{const data=dataFor(d.id);return !data||data.error?[]:[{id:d.id,name:d.name,columns:data.columns.map(c=>({name:c.name,type:c.type||'string'})),numeric_columns:numericColumns(data),partial:data.partial}];});
 if(!available.length)throw Error('Connect and load a dataset before asking the assistant.');
 const result=await apiFetch<{widget:DashboardWidget;explanation:string;clarification?:boolean}>('/api/v1/workbook-dashboards/suggest-visual',{method:'POST',body:JSON.stringify({prompt,current:widget,datasets:available,history})},true,{queueWhenOffline:false,cacheResponse:false,cacheOfflineRead:false,memoryCache:false});
 if(!mounted.current)return;
 if(current.current!==original){setMessage('The visual changed while the suggestion was being prepared. Retry to use the latest settings.');return;}
 setHistory(h=>[...h,{role:'user' as const,content:prompt.slice(0,3000)},{role:'assistant' as const,content:result.explanation.slice(0,3000)}].slice(-8));
 if(!result.clarification){setPrevious(original);onChange(result.widget);}
 setMessage(result.explanation);setPrompt('');
 }catch(e){setMessage(e instanceof Error?e.message:'Could not prepare a visual. Your settings are unchanged.');}finally{setBusy(false);}}
 return <section className="space-y-2 rounded-lg border border-emerald-200 p-3 dark:border-emerald-900"><h5 className="text-sm font-semibold">Create with AI</h5><p className="text-xs text-slate-500">Build or refine single- or multi-series visuals, date grouping and per-series filters across connected datasets. Sends your instructions, recent follow-ups, current visual settings and column names/types to OpenAI. No dataset rows are sent. Requires internet.</p>
 <textarea aria-label="Instructions for visualization assistant" maxLength={3000} value={prompt} onChange={e=>setPrompt(e.target.value)} className="min-h-20 w-full rounded border border-slate-300 bg-transparent p-2 text-sm" placeholder="Compare submitted and paid expenses monthly as two lines. Use status values submitted and paid, sum amount, and group by expense_date…"/>
 <div className="flex gap-3"><button type="button" disabled={busy||!prompt.trim()} onClick={()=>void ask()} className="rounded bg-emerald-700 px-3 py-1.5 text-sm text-white disabled:opacity-50">{busy?'Creating…':'Create / refine'}</button>{previous&&<button type="button" disabled={busy} className="text-xs" onClick={()=>{onChange(previous);setPrevious(null);setMessage('Previous settings restored.');}}>Undo AI change</button>}</div>
 {message&&<p role="status" className="text-xs">{message}</p>}<p className="text-xs text-slate-500">Review the preview and Model & aggregate data, then apply. If a field or query is unsupported, the assistant asks for clarification.</p></section>;
}
