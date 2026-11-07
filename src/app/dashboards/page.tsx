'use client';
import DashboardSelect from '@/components/DashboardSelect';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuth} from '@/components/AuthProvider';
import {apiFetch,ApiError} from '@/lib/api';
import {dashboardPages,filterDashboardData,worksheetData,type SavedDashboard,type DashboardData,type DashboardFilter} from '@/lib/workbookDashboard';
import {sameDashboardLayout} from '@/lib/dashboardLayout';
import DashboardPublishDialog from '@/components/DashboardPublishDialog';
import DashboardFilters from '@/components/DashboardFilters';
import DashboardLayoutView from '@/components/DashboardLayoutView';
import DashboardSubscriptionDialog from '@/components/DashboardSubscriptionDialog';
import WorkbookDashboards from '@/components/WorkbookDashboards';
function publicationError(error:unknown,list=false){
 if(error instanceof ApiError&&error.status===404)return list?'The configured server does not provide dashboard publishing. Check that the frontend points to the current backend.':'This published dashboard is unavailable. It may be unpublished, access may have changed, or the frontend may point to an older backend.';
 return error instanceof Error?error.message:'Dashboard unavailable';
}
const policy={queueWhenOffline:false,cacheResponse:false,cacheOfflineRead:false,memoryCache:false};
type Published=SavedDashboard&{description:string;access:'owner'|'manager'|'editor'|'viewer'};
export default function DashboardViewerPage(){
 const {user,loading}=useAuth();const [id,setId]=useState(''),[tab,setTab]=useState(''),[items,setItems]=useState<Published[]>([]),[report,setReport]=useState<Published|null>(null),[data,setData]=useState<Record<string,DashboardData>>({}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[interval,setIntervalValue]=useState<number|null>(null),[filters,setFilters]=useState<DashboardFilter[]|null>(null),[subscribe,setSubscribe]=useState(false),[edit,setEdit]=useState(false);
 const [savedDesign,setSavedDesign]=useState<SavedDashboard|null>(null),[publishDesign,setPublishDesign]=useState(false);
 const generation=useRef(0),running=useRef<number|null>(null);
 useEffect(()=>{const read=()=>{const q=new URLSearchParams(window.location.search);setId(q.get('dashboard')||'');setTab(q.get('tab')||'');};read();window.addEventListener('popstate',read);return()=>window.removeEventListener('popstate',read);},[]);
 useEffect(()=>{if(!loading&&!user)window.location.replace('/sign-up-login?next='+encodeURIComponent(window.location.pathname+window.location.search));},[loading,user]);
 useEffect(()=>{generation.current++;setReport(null);setData({});setFilters(null);setIntervalValue(null);setError('');setSubscribe(false);setEdit(false);if(!user)return;let live=true;void apiFetch<Published[]>('/api/v1/dashboard-publications',{},true,policy).then(v=>{if(live)setItems(v);}).catch(e=>{if(live)setError(publicationError(e,true));});return()=>{live=false;generation.current++;};},[user?.id,id]);
 const refresh=useCallback(async()=>{if(!id||!user)return;const gen=generation.current;if(running.current===gen)return;running.current=gen;setBusy(true);setError('');try{
 const r=await apiFetch<Published>(`/api/v1/dashboard-publications/${encodeURIComponent(id)}`,{},true,policy);if(gen!==generation.current)return;setReport(r);
 const sources=[...r.definition.datasets].sort((a,b)=>Number(r.definition.widgets.some(w=>w.dataset_id===b.id&&(w.page_id||'overview')===tab))-Number(r.definition.widgets.some(w=>w.dataset_id===a.id&&(w.page_id||'overview')===tab)));
 for(const source of sources){if(gen!==generation.current)return;try{let value:DashboardData;
 if(source.kind==='api')value={...await apiFetch<DashboardData>('/api/v1/workbook-dashboards/source-data?source='+encodeURIComponent(source.source),{},true,policy),loadedAt:new Date().toISOString()};
 else if(source.kind==='workbook'){const book=await apiFetch<any>('/api/v1/workbook-dashboards/workbooks/'+encodeURIComponent(source.source),{},true,policy);const sheet=book.sheets.find((s:any)=>s.id===source.sheet_id);if(!sheet)throw Error('Linked sheet is unavailable.');value=worksheetData(sheet,source.header_row);}
 else throw Error('This source is only available on its original device.');
 if(gen===generation.current)setData(old=>({...old,[source.id]:value}));
 }catch(e){if(gen===generation.current)setData(old=>{const denied=e instanceof ApiError&&[401,403,404].includes(e.status);const fallback=!denied?old[source.id]:undefined;return {...old,[source.id]:{...(fallback||{rows:[],columns:[],partial:false,total:0,loadedAt:''}),error:e instanceof Error?e.message:'Source unavailable'}};});}}
 }catch(e){if(gen!==generation.current)return;setError(publicationError(e));setReport(null);setData({});}finally{if(running.current===gen)running.current=null;if(gen===generation.current)setBusy(false);}},[id,user?.id,tab]);
 useEffect(()=>{void refresh();},[refresh]);
 useEffect(()=>{
  setSavedDesign(null);setPublishDesign(false);
  if(!report||!['owner','manager'].includes(report.access))return;
  let live=true;
  void apiFetch<SavedDashboard[]>('/api/v1/workbook-dashboards',{},true,policy).then(drafts=>{
   const draft=drafts.find(d=>d.id===report.id);
   if(live&&draft&&!sameDashboardLayout(draft.definition,report.definition))setSavedDesign(draft);
  }).catch(()=>{});
  return()=>{live=false;};
 },[report?.id,report?.revision,report?.access,user?.id]);
 const cadence=interval??report?.definition.refresh_seconds??60;
 useEffect(()=>{if(!id||!cadence||!report)return;const t=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh();},cadence*1000);return()=>clearInterval(t);},[cadence,id,refresh,!!report]);
 function navigate(next:string,page=''){const url='/dashboards'+(next?'?dashboard='+encodeURIComponent(next)+(page?'&tab='+encodeURIComponent(page):''):'');history.pushState(null,'',url);setId(next);setTab(page);}
 if(loading||!user)return <main className="p-6">Restoring your session…</main>;
 if(edit)return <div className="h-screen"><WorkbookDashboards backLabel="Published dashboards" onBack={()=>setEdit(false)}/></div>;
 const pages=report?dashboardPages(report.definition):[],activeTab=pages.find(p=>p.id===tab)?.id||pages.find(p=>p.id===report?.definition.default_page_id)?.id||pages[0]?.id;
 const definition=report?{...report.definition,filters:filters||report.definition.filters}:null;
 return <main className="flex min-h-screen min-w-0 flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white"><header className="flex flex-wrap items-center gap-2 border-b bg-white p-3 sm:gap-3 sm:p-4 [&>button]:min-h-11 [&>button]:px-2 [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center [&>a]:px-2 dark:bg-slate-900"><button onClick={()=>navigate('')}>Dashboards</button><h1 className="min-w-0 basis-full break-words text-lg font-semibold sm:flex-1 sm:basis-auto">{report?.name||'Published dashboards'}</h1><div data-cestos-desktop-slot className="flex flex-wrap items-center gap-1 empty:hidden"/><a href="/workbooks">Workbooks</a><button onClick={()=>setEdit(true)}>{report?.access==='editor'||report?.access==='manager'||report?.access==='owner'?'Edit dashboards':'My dashboards'}</button>{id&&<button disabled={busy} onClick={()=>void refresh()}>{busy?'Refreshing…':'Refresh'}</button>}{report&&<><DashboardSelect aria-label="Refresh frequency" value={cadence} onChange={e=>setIntervalValue(Number(e.target.value))} className="rounded border bg-white p-2 dark:bg-slate-900">{[[0,'Manual'],[30,'30 seconds'],[60,'1 minute'],[300,'5 minutes'],[900,'15 minutes'],[3600,'1 hour']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</DashboardSelect><button onClick={()=>setSubscribe(true)}>Subscribe</button><a href={`cestos://dashboard/${report.id}?tab=${encodeURIComponent(activeTab||'')}`}>Open in desktop</a></>}</header>
 {savedDesign&&<div role="status" className="mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><div className="min-w-0 flex-1"><p className="font-semibold">This shared page is using an older design</p><p className="mt-1">Your saved designer uses {savedDesign.definition.layout?.card||'outlined'} cards and {savedDesign.definition.layout?.gap||'comfortable'} spacing. Publish that saved design to update this page for viewers.</p></div><button type="button" className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white" onClick={()=>setPublishDesign(true)}>Publish saved design</button></div>}
 {publishDesign&&savedDesign&&<DashboardPublishDialog dashboard={savedDesign} onClose={()=>{setPublishDesign(false);void refresh();}}/>}
 {error&&<p role="alert" className="m-4 rounded bg-amber-50 p-3 text-amber-900">{error}</p>}
 {!id&&<div className="grid gap-4 p-6 md:grid-cols-3">{items.map(d=><button key={d.id} className="rounded-xl border bg-white p-4 text-left dark:bg-slate-900" onClick={()=>navigate(d.id)}><strong>{d.name}</strong><p className="mt-2 text-sm">{d.description}</p><p className="mt-2 text-xs text-slate-500">{d.access==='owner'?'My published dashboard':'Shared with me'} · {d.access}</p></button>)}{!items.length&&<p>No published dashboards are available to this account.</p>}</div>}
 {report&&definition&&<><div className="mx-auto w-full min-w-0 max-w-[1500px] flex-1 p-4 sm:p-6"><p className="mb-3 text-sm text-slate-500">{report.description} · Published revision {report.revision}. Source permissions apply. Shared viewing requires online verification.</p><DashboardLayoutView definition={definition} pageId={activeTab} activeFilters={(definition.filters||[]).filter(f=>f.value||f.end).length} filters={<DashboardFilters definition={definition} dataFor={id=>data[id]} onChange={setFilters} editing={false}/>} dataFor={w=>data[w.dataset_id]?filterDashboardData(data[w.dataset_id],w,definition.filters):undefined} lookupFor={w=>w.label_lookup?data[w.label_lookup.dataset_id]:undefined}/></div><nav className="sticky bottom-0 z-20 flex max-w-full overflow-x-auto border-t bg-white p-2 dark:bg-slate-900" aria-label="Dashboard tabs">{pages.map(p=><button key={p.id} aria-current={p.id===activeTab?'page':undefined} className={`min-h-11 shrink-0 whitespace-nowrap rounded px-4 py-2 text-sm ${p.id===activeTab?'bg-emerald-100 text-emerald-900':''}`} onClick={()=>navigate(report.id,p.id)}>{p.name}</button>)}</nav>{subscribe&&<DashboardSubscriptionDialog id={report.id} definition={definition} data={data} onClose={()=>setSubscribe(false)}/>}</>}
 </main>;
}
