'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {BarChart3,Plus,X,RefreshCw,Save,Database,FileSpreadsheet,Trash2,Search,Pencil,Eye,Copy,FolderOpen,Table2,LineChart as LineIcon,AreaChart as AreaIcon,PieChart as PieIcon,Hash,BarChart2,Maximize2,Minimize2} from 'lucide-react';
import {useAuth} from './AuthProvider';
import SearchableSelect from './SearchableSelect';
import WorkbookDashboardChart from './WorkbookDashboardChart';
import DashboardLayoutHandle from './DashboardLayoutHandle';
import DashboardFilters from './DashboardFilters';
import DashboardVisualAssistant from './DashboardVisualAssistant';
import DashboardRelatedNames from './DashboardRelatedNames';
import DashboardPublishDialog from './DashboardPublishDialog';
import WorkbookPageHeader from './WorkbookPageHeader';
import {apiFetch,ApiError} from '@/lib/api';
import {API_DATA_REFRESHED_EVENT} from '@/lib/apiDataEvents';
import {importWorkbook,validateWorkbook,type FieldWorkbook,type FieldSheet} from '@/lib/fieldWorkbook';
import {cloudMetadata,cloudBytes,type FileLink} from '@/lib/fileSync';
import {listDeviceWorkbooks,listWorkbookSync,saveDeviceWorkbook,type DeviceWorkbook} from '@/lib/workbookDevice';
import {readDashboards,saveDashboards,readDashboardData,saveDashboardData} from '@/lib/dashboardStore';
import {dashboardPages,duplicateDashboardPage,removeDashboardPage,filterDashboardData,datasetKey,newDashboard,worksheetData,numericColumns,suggestWidget,widgetTitle,searchData,columnLabel,WIDGET_COLORS,WIDGET_COLOR_LABELS,type DashboardDataset,type DashboardWidget,type DashboardData,type SavedDashboard} from '@/lib/workbookDashboard';
import type {DatabaseSource} from '@/lib/workbookDatabaseSource';

function dashboardError(error:unknown){if(error instanceof ApiError&&error.status===422&&/definition[. ]filters(?::|\s)/i.test(error.message))return 'The server rejected dashboard filters. It may be running an older backend, or the filter list exceeds its supported limits. Deploy the latest backend and retry Save. Your filters and device draft have been kept.';return error instanceof ApiError && error.status===404 ? 'Dashboard services are not available on this server. Deploy the workbook dashboard backend and its database migration. Saved device dashboards remain available.' : error instanceof Error ? error.message : 'Could not load dashboards.';}

const policy={queueWhenOffline:false,cacheResponse:false,cacheOfflineRead:false,memoryCache:false};
const input='w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white';
const button='inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
const primary='inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50';
const label='block text-xs font-medium text-slate-600 dark:text-slate-300';
const kinds:{kind:DashboardWidget['kind'];name:string;icon:typeof BarChart2}[]=[{kind:'bar',name:'Bar',icon:BarChart2},{kind:'line',name:'Line',icon:LineIcon},{kind:'area',name:'Area',icon:AreaIcon},{kind:'pie',name:'Donut',icon:PieIcon},{kind:'kpi',name:'KPI',icon:Hash},{kind:'table',name:'Table',icon:Table2}];
type RemoteBook={id:string;name:string;version:string;sheets?:FieldSheet[];fileLink?:FileLink};
type NativeFile={id:string;name:string;relativePath:string;revision:string};
// Half-width KPIs take one column of four so headline numbers sit in a row; half charts take two.
// With the settings panel open the grid drops to two columns, so only full width spans.
const span=(w:DashboardWidget,narrow=false)=>narrow?(w.width==='full'?'md:col-span-2':''):w.width==='full'?'md:col-span-2 xl:col-span-4':w.kind==='kpi'?'':'xl:col-span-2';
const leaveMessage='Leave without saving dashboard changes?';

export default function WorkbookDashboards({book,backLabel,onBack,registerGuard}:{book?:FieldWorkbook;backLabel:string;onBack:()=>void;registerGuard?:(guard:(()=>boolean)|null)=>void}){
 const {user}=useAuth(),scope=user?`cestos-field-workbook:${user.id}`:'';
 const desktop=typeof window==='undefined'?null:(window as any).cestosDesktop;
 const open=true; // The page is mounted only while it is shown.
 const draggedWidget=useRef<string|null>(null);
 const [publishing,setPublishing]=useState(false);
 const [pageId,setPageId]=useState('overview');
 const [nativeFiles,setNativeFiles]=useState<NativeFile[]>([]);
 const [dashboards,setDashboards]=useState<SavedDashboard[]>([]),[active,setActive]=useState<SavedDashboard|null>(null),[editing,setEditing]=useState(false),[dirty,setDirty]=useState(false);
 const [sources,setSources]=useState<DatabaseSource[]>([]),[devices,setDevices]=useState<DeviceWorkbook[]>([]),[remote,setRemote]=useState<RemoteBook[]>([]),[remoteSelected,setRemoteSelected]=useState<RemoteBook|null>(null);
 const [data,setData]=useState<Record<string,DashboardData>>({}),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[focusMode,setFocusMode]=useState(false);
 const [datasetKind,setDatasetKind]=useState<'api'|'workbook'|'folder'>('api'),[source,setSource]=useState(''),[sheetId,setSheetId]=useState(''),[header,setHeader]=useState(1),[widget,setWidget]=useState<DashboardWidget|null>(null);
 const [query,setQuery]=useState(''),[listQuery,setListQuery]=useState(''),[addingData,setAddingData]=useState(false);
 const list=useRef(dashboards),current=useRef(active),running=useRef<number|null>(null),alive=useRef(false),epoch=useRef(0),dirtyRef=useRef(dirty),dataRef=useRef(data);
 list.current=dashboards;current.current=active;dirtyRef.current=dirty;dataRef.current=data;
 const identity=useRef(scope);identity.current=scope;const isCurrent=()=>alive.current&&identity.current===scope;
 useEffect(()=>{setActive(null);setDashboards([]);setData({});setDirty(false);setSources([]);setDevices([]);setRemote([]);setNativeFiles([]);current.current=null;list.current=[];dirtyRef.current=false;},[scope]);
 // The workspace asks before tab switches or Back leave unsaved changes behind.
 useEffect(()=>{registerGuard?.(()=>!dirtyRef.current||window.confirm(leaveMessage));return()=>registerGuard?.(null);},[registerGuard]);
 const setList=useCallback(async(items:SavedDashboard[])=>{list.current=items;setDashboards(items);await saveDashboards(scope,items);},[scope]);
 function change(next:SavedDashboard){setActive(next);setDirty(true);}
 function back(){if(dirtyRef.current&&!window.confirm(leaveMessage))return;dirtyRef.current=false;onBack();}
 async function loadDefinitions(){
  const cached=await readDashboards(scope)||[];if(!isCurrent())return;list.current=cached;setDashboards(cached);
  if(!current.current&&cached.length)setActive(cached[0]);
  if(!isCurrent()||!navigator.onLine)return;
  try{const server=await apiFetch<SavedDashboard[]>('/api/v1/workbook-dashboards',{},true,policy);if(!isCurrent())return;
   const merged=[...cached.filter(d=>d.pending),...server.filter(d=>!cached.some(c=>c.id===d.id&&c.pending))];await setList(merged);
   if(!dirtyRef.current){const selected=merged.find(d=>d.id===current.current?.id)||merged[0];if(selected)setActive(selected);}
  }catch(e){if(isCurrent())setError(dashboardError(e));}
 }
 async function syncPending(){
  if(!isCurrent()||!navigator.onLine)return;
  for(const draft of list.current.filter(d=>d.pending)){
   try{const saved=await apiFetch<SavedDashboard>(`/api/v1/workbook-dashboards/${draft.id}`,{method:'PUT',body:JSON.stringify({name:draft.name,definition:draft.definition,revision:draft.revision})},true,policy);
    if(!isCurrent())return;await setList(list.current.map(d=>d.id===draft.id?saved:d));if(current.current?.id===draft.id)setActive(value=>value?.id===draft.id&&dirtyRef.current?{...value,revision:saved.revision,pending:false}:saved);
   }catch(e){if(isCurrent())setError(dashboardError(e));break;}
  }
 }
 useEffect(()=>{if(!open||!scope)return;epoch.current++;alive.current=true;setError('');setData({});void loadDefinitions().then(syncPending).catch(e=>{if(isCurrent())setError(dashboardError(e));});
  if(desktop)void desktop.scanFolders(user!.id).then((v:{files:NativeFile[]})=>{if(isCurrent())setNativeFiles(v.files.filter(f=>/\.(xlsx?|csv)$/i.test(f.name)));}).catch(()=>{});
  void listDeviceWorkbooks(scope).then(items=>{if(isCurrent())setDevices(items);}).catch(e=>{if(isCurrent())setError(dashboardError(e));});
  if(navigator.onLine){void apiFetch<DatabaseSource[]>('/api/v1/workbook-dashboards/sources',{},true,policy).then(v=>{if(isCurrent())setSources(v);}).catch(e=>{if(isCurrent())setError(dashboardError(e));});void apiFetch<RemoteBook[]>('/api/v1/workbook-dashboards/workbooks',{},true,policy).then(v=>{if(isCurrent())setRemote(v);}).catch(()=>{});}
  return()=>{epoch.current++;alive.current=false;};
 },[open,scope]);
 const refresh=useCallback(async()=>{
  const dashboard=current.current;if(!dashboard||running.current===epoch.current||!isCurrent())return;const generation=epoch.current,valid=()=>isCurrent()&&epoch.current===generation;running.current=generation;setBusy(true);let changed=false;
  try{
   const [local,pending]=await Promise.all([listDeviceWorkbooks(scope),listWorkbookSync(scope)]);if(!valid())return;setDevices(local);
   const files:NativeFile[]=desktop&&dashboard.definition.datasets.some(d=>d.kind==='folder')?(await desktop.scanFolders(user!.id)).files:[];
   if(!valid())return;
   if(files.length)setNativeFiles(files.filter(f=>/\.(xlsx?|csv)$/i.test(f.name)));
   for(const dataset of dashboard.definition.datasets){
    if(!valid())return;const key=datasetKey(dataset);let previous=dataRef.current[key]||await readDashboardData(scope,key);if(!valid())return;
    if(previous&&!dataRef.current[key])setData(v=>({...v,[key]:previous!}));
    try{
     let next:DashboardData;
     if(dataset.kind==='api')next={...await apiFetch<Omit<DashboardData,'loadedAt'>>('/api/v1/workbook-dashboards/source-data?source='+encodeURIComponent(dataset.source),{},true,policy),loadedAt:new Date().toISOString(),origin:'Live table'};
     else if(dataset.kind==='folder'){
      if(!desktop)throw Error('This dataset uses a watched folder on the desktop app.');
      const file=files.find(f=>f.id===dataset.source);if(!file)throw Error('Linked file is missing or its folder is no longer connected.');
      if(previous?.version===file.revision&&!previous.error)next={...previous,loadedAt:new Date().toISOString()};
      else{const result=await desktop.readFolderFile(user!.id,file.id,file.revision);const parsed=await importWorkbook(new File([result.bytes],result.name));const sheet=parsed.sheets.find(s=>s.name===dataset.sheet_id);if(!sheet)throw Error('The linked worksheet was renamed or removed. Reconnect the file.');next={...worksheetData(sheet,dataset.header_row),origin:'Watched folder file',version:file.revision};}
     }else{
      const device=local.find(d=>d.book.id===dataset.source);let selected:Pick<FieldWorkbook,'id'|'name'|'sheets'|'fileLink'>|undefined=book?.id===dataset.source?book:undefined;let origin='Current workbook snapshot',cloudVersion:string|undefined;
      if(!selected&&device&&pending.some(p=>p.book.id===dataset.source&&p.state!=='synced')){selected=device.book;origin='Device workbook · Pending sync';}
      if(!selected&&navigator.onLine){try{const saved=await apiFetch<RemoteBook&{sheets:FieldSheet[]}>(`/api/v1/workbook-dashboards/workbooks/${encodeURIComponent(dataset.source)}`,{},true,policy);selected=device&&saved.version===device.remoteVersion?device.book:saved;origin=selected===device?.book?'Device workbook':'Latest saved file';}catch(e){if(e instanceof ApiError&&[401,403,404].includes(e.status)&&device?.remoteVersion)throw e;if(device){selected=device.book;origin='Device workbook';}else throw e;}}
      if(!selected&&device){selected=device.book;origin='Device workbook';}
      if(selected?.fileLink&&selected!==book&&navigator.onLine&&!pending.some(p=>p.book.id===dataset.source&&p.state!=='synced')){
       const latest=await cloudMetadata(selected.fileLink.cloud_id);cloudVersion=latest.content_hash;
       if(previous?.version===cloudVersion&&!previous.error){setData(v=>({...v,[key]:{...previous!,loadedAt:new Date().toISOString()}}));continue;}
       const bytes=await cloudBytes(latest),file=new File([new Uint8Array(bytes)],latest.name);
       const parsed=/\.cestos\.json$/i.test(latest.name)?validateWorkbook(JSON.parse(await file.text())):await importWorkbook(file);
       const old=selected.sheets;selected={...selected,sheets:parsed.sheets.map(s=>({...s,id:old.find(previous=>previous.name===s.name)?.id||s.id}))};origin='Latest linked cloud file';
      }
      const sheet=selected?.sheets.find(s=>s.id===dataset.sheet_id);if(!sheet)throw Error('Linked worksheet is unavailable. Reconnect the dataset.');
      next={...worksheetData(sheet,dataset.header_row),origin,version:cloudVersion};
     }
     if(!valid())return;
     if(JSON.stringify(previous?.rows)!==JSON.stringify(next.rows)||JSON.stringify(previous?.columns)!==JSON.stringify(next.columns))changed=true;
     setData(v=>({...v,[key]:next}));try{await saveDashboardData(scope,key,next);}catch{if(valid())setError('The dataset refreshed, but its offline snapshot could not be saved. Check device storage.');}
    }catch(e){
     if(!valid())return;const revoked=e instanceof ApiError&&[401,403,404].includes(e.status);
     const failed:DashboardData=revoked?{rows:[],columns:[],partial:false,total:0,loadedAt:new Date().toISOString(),error:'Source access is unavailable. Reconnect or remove this dataset.'}:previous?{...previous,error:'Refresh unavailable. Showing the last saved snapshot.'}:{rows:[],columns:[],partial:false,total:0,loadedAt:new Date().toISOString(),error:e instanceof Error?e.message:'Could not load dataset'};
     setData(v=>({...v,[key]:failed}));if(revoked)await saveDashboardData(scope,key,failed);
    }
   }
   if(valid()&&changed)setNotice('Dashboard refreshed with new data.');
  }catch(e){if(valid())setError(e instanceof Error?e.message:'Could not refresh');}finally{if(running.current===generation)running.current=null;if(valid())setBusy(false);}
 },[scope,book,user?.id,desktop]);
 const signature=active?JSON.stringify(active.definition.datasets):'';
 async function manualRefresh(){setError('');setBusy(true);try{await loadDefinitions();if(navigator.onLine&&!sources.length){const found=await apiFetch<DatabaseSource[]>('/api/v1/workbook-dashboards/sources',{},true,policy);if(isCurrent())setSources(found);}await refresh();}catch(e){if(isCurrent())setError(e instanceof Error?e.message:'Could not refresh');}finally{await new Promise(resolve=>setTimeout(resolve,300));if(isCurrent())setBusy(false);}}
 useEffect(()=>{if(open&&active)void refresh();},[open,active?.id,signature,refresh]);
 useEffect(()=>{if(!open)return;let debounce:ReturnType<typeof setTimeout>|undefined;
  const update=()=>{clearTimeout(debounce);debounce=setTimeout(()=>{if(document.visibilityState==='visible')void refresh();},800);};
  const online=()=>{void syncPending();update();};
  const interval=active?.definition.refresh_seconds===0?undefined:setInterval(update,(active?.definition.refresh_seconds||60)*1000);
  for(const name of [API_DATA_REFRESHED_EVENT,'cestos:api-cache-invalidated','cestos:operational-data-updated','cestos:workbook-saved'])window.addEventListener(name,update);
  document.addEventListener('visibilitychange',update);
  window.addEventListener('online',online);
  let channel:BroadcastChannel|undefined;try{channel=new BroadcastChannel('cestos-workbook-updates');channel.onmessage=update;}catch{}
  return()=>{clearInterval(interval);clearTimeout(debounce);channel?.close();for(const name of [API_DATA_REFRESHED_EVENT,'cestos:api-cache-invalidated','cestos:operational-data-updated','cestos:workbook-saved'])window.removeEventListener(name,update);document.removeEventListener('visibilitychange',update);window.removeEventListener('online',online);};
 },[open,active?.definition.refresh_seconds,refresh]);
 async function save(copy=false){if(!active||saving)return;setSaving(true);setError('');const draft={...active,access:copy?'owner' as const:active.access,id:copy?crypto.randomUUID():active.id,name:copy?`${active.name} (copy)`:active.name,revision:copy?0:active.revision,updated_at:new Date().toISOString(),pending:true};
  try{await setList([...list.current.filter(d=>d.id!==draft.id),draft]);setActive(draft);setDirty(false);if(!navigator.onLine){setNotice('Saved on this device. Reconnect to sync the dashboard.');return;}
   const result=await apiFetch<SavedDashboard>(`/api/v1/workbook-dashboards/${draft.id}`,{method:'PUT',body:JSON.stringify({name:draft.name,definition:draft.definition,revision:draft.revision})},true,policy);
   if(!isCurrent())return;await setList(list.current.map(d=>d.id===draft.id?result:d));if(current.current?.id===draft.id)setActive(value=>value?.id===draft.id&&dirtyRef.current?{...value,revision:result.revision,pending:false}:result);setNotice(copy?'Copy saved.':'Dashboard saved.');
  }catch(e){setError(dashboardError(e)+' Your device draft is retained.');}finally{setSaving(false);}
 }
 async function remove(){if(!active||!window.confirm(`Delete dashboard “${active.name}”? Source tables and files will be kept.`))return;try{if(active.revision)await apiFetch(`/api/v1/workbook-dashboards/${active.id}?revision=${active.revision}`,{method:'DELETE'},true,policy);const next=list.current.filter(d=>d.id!==active.id);await setList(next);setActive(next[0]||null);setDirty(false);setEditing(false);setWidget(null);}catch(e){setError(e instanceof Error?e.message:'Could not delete');}}
 const books=[...(book?[{id:book.id,name:book.name,sheets:book.sheets}]:[]),...devices.filter(d=>d.book.id!==book?.id).map(d=>d.book),...remote.filter(r=>r.id!==book?.id&&!devices.some(d=>d.book.id===r.id))];
 const selectedBook=books.find(b=>b.id===source),sheets=selectedBook?.sheets||(remoteSelected?.id===source?remoteSelected?.sheets:[])||[];
 async function chooseSource(id:string){setSource(id);setSheetId('');setRemoteSelected(null);const local=books.find(b=>b.id===id);try{if(datasetKind==='folder'){const file=nativeFiles.find(f=>f.id===id);if(!file)throw Error('Select a file');const data=await desktop.readFolderFile(user!.id,file.id,file.revision);const parsed=await importWorkbook(new File([data.bytes],data.name));setRemoteSelected({id,name:file.name,version:file.revision,sheets:parsed.sheets});}else if(datasetKind==='workbook'&&!local?.sheets)setRemoteSelected(await apiFetch<RemoteBook&{sheets:FieldSheet[]}>(`/api/v1/workbook-dashboards/workbooks/${encodeURIComponent(id)}`,{},true,policy));}catch(e){setError(e instanceof Error?e.message:'Could not load workbook');}}
 function addDataset(){if(!active||!source||(datasetKind!=='api'&&!sheetId))return;const name=datasetKind==='api'?sources.find(s=>s.id===source)?.name:`${selectedBook?.name||remoteSelected?.name} / ${sheets.find(s=>datasetKind==='folder'?s.name===sheetId:s.id===sheetId)?.name}`;const dataset:DashboardDataset={id:crypto.randomUUID(),name:name||source,kind:datasetKind,source,sheet_id:sheetId,header_row:header-1};change({...active,definition:{...active.definition,datasets:[...active.definition.datasets,dataset]}});setSource('');setSheetId('');setAddingData(false);setNotice(`Connected ${dataset.name}. Add a visualization to chart it.`);}
 const dataFor=(datasetId:string)=>{const dataset=active?.definition.datasets.find(d=>d.id===datasetId);return dataset?data[datasetKey(dataset)]:undefined;};
 const viewData=(w:DashboardWidget)=>{const d=dataFor(w.dataset_id);if(!d)return d;const filtered=filterDashboardData(d,w,active?.definition.filters);return query?searchData(filtered,query):filtered;};
 function editWidget(value?:DashboardWidget){const first=active?.definition.datasets[0];if(!first)return;if(value){setWidget(value);return;}
  const base:DashboardWidget={id:crypto.randomUUID(),page_id:activePage,title:'New visualization',dataset_id:first.id,kind:'bar',group_by:'',measure:'',aggregation:'count',filter_column:'',filter_value:'',color:'green',width:'half'};
  setWidget(suggestWidget(base,dataFor(first.id)));}
 // Titles that still match the generated description keep following the settings.
 function updateWidget(changes:Partial<DashboardWidget>){setWidget(w=>{if(!w)return w;const next={...w,...changes};return w.title===widgetTitle(w)?{...next,title:widgetTitle(next)}:next;});}
 function applyWidget(){if(!active||!widget)return;const exists=active.definition.widgets.some(w=>w.id===widget.id);const widgets=exists?active.definition.widgets.map(w=>w.id===widget.id?widget:w):[...active.definition.widgets,widget];change({...active,definition:{...active.definition,widgets}});setWidget(null);}
 function moveWidget(index:number,offset:number){if(!active)return;const widgets=[...active.definition.widgets];[widgets[index+offset],widgets[index]]=[widgets[index],widgets[index+offset]];change({...active,definition:{...active.definition,widgets}});}
 function duplicateWidget(index:number){if(!active||active.definition.widgets.length>=24)return;const widgets=[...active.definition.widgets];widgets.splice(index+1,0,{...widgets[index],id:crypto.randomUUID(),title:`${widgets[index].title} (copy)`});change({...active,definition:{...active.definition,widgets}});}
 function selectDashboard(next:SavedDashboard|null,edit=false){if(dirty&&!window.confirm('Discard unsaved dashboard changes?'))return;setActive(next);setDirty(!!next&&edit);setEditing(edit);setWidget(null);setQuery('');setPageId(next?.definition.default_page_id||dashboardPages(next?.definition||{datasets:[],widgets:[],refresh_seconds:60})[0].id);}
 const pages=active?dashboardPages(active.definition):[];
 const activePage=pages.some(p=>p.id===pageId)?pageId:pages.find(p=>p.id===active?.definition.default_page_id)?.id||pages[0]?.id||'overview';
 const widgetColumns=widget?dataFor(widget.dataset_id)?.columns||[]:[];
 const widgetNumbers=widget&&dataFor(widget.dataset_id)?numericColumns(dataFor(widget.dataset_id)!):[];
 const filteredDashboards=dashboards.filter(d=>d.name.toLowerCase().includes(listQuery.trim().toLowerCase()));
 const errors=active?active.definition.datasets.filter(d=>data[datasetKey(d)]?.error).length:0;
 useEffect(()=>{if(!focusMode)return;const restore=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();setFocusMode(false);}};window.addEventListener('keydown',restore);return()=>window.removeEventListener('keydown',restore);},[focusMode]);
 const lastLoaded=active?active.definition.datasets.map(d=>data[datasetKey(d)]?.loadedAt).filter(Boolean).sort().at(-1):undefined;
 if(!user)return null;

 const status=busy?{text:'Refreshing',dot:'animate-pulse bg-emerald-500',tone:'text-emerald-800 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-200'}
  :errors?{text:`${errors} source${errors>1?'s':''} need attention`,dot:'bg-amber-500',tone:'text-amber-800 bg-amber-50 dark:bg-amber-950 dark:text-amber-200'}
  :typeof navigator!=='undefined'&&!navigator.onLine?{text:'Offline · last snapshot',dot:'bg-slate-400',tone:'text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-200'}
  :{text:'Live',dot:'bg-emerald-500',tone:'text-emerald-800 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-200'};

 return <div className={`${focusMode?'fixed inset-0 z-[90]':'h-full'} flex min-h-0 flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white`}>
  {publishing&&active&&<DashboardPublishDialog dashboard={active} onClose={()=>setPublishing(false)}/>}
  <WorkbookPageHeader backLabel={backLabel} onBack={back} icon={<BarChart3 size={18}/>} title="Dashboards" subtitle="Charts and KPIs from live tables, workbooks and linked files. Personal to your account."
   actions={<><button type="button" className={button} aria-pressed={focusMode} onClick={()=>setFocusMode(value=>!value)}>{focusMode?<Minimize2 size={15}/>:<Maximize2 size={15}/>} {focusMode?'Show navigation':'Collapse all navigation'}</button><button type="button" title="Refresh all datasets" aria-label="Refresh dashboard" disabled={busy||!active} className={button} onClick={()=>void manualRefresh()}><RefreshCw size={15} className={busy?'animate-spin':''}/>Refresh</button></>}/>
  {(error||notice)&&<div className={`flex shrink-0 items-start gap-3 border-b px-4 py-2 text-sm sm:px-6 ${error?'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200':'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'}`}><p role={error?'alert':'status'} className="flex-1">{error||notice}</p><button type="button" aria-label="Dismiss message" className="rounded p-0.5 hover:bg-black/5" onClick={()=>{setError('');setNotice('');}}><X size={15}/></button></div>}
  <div className="flex min-h-0 flex-1 flex-col md:flex-row">
   {!focusMode&&<aside aria-label="Your dashboards" className="flex max-h-56 shrink-0 flex-col border-b border-slate-200 bg-white md:max-h-none md:w-60 md:border-b-0 md:border-r dark:border-slate-800 dark:bg-slate-900">
    <div className="space-y-2 p-3">
     <button type="button" className={`${primary} w-full`} onClick={()=>selectDashboard(newDashboard(),true)}><Plus size={16}/>New dashboard</button>
     {dashboards.length>5&&<label className="relative block"><span className="sr-only">Search dashboards</span><Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/><input className={`${input} !py-1.5 pl-8 text-xs`} placeholder="Search dashboards…" value={listQuery} onChange={e=>setListQuery(e.target.value)}/></label>}
    </div>
    <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
     {filteredDashboards.map(d=><button type="button" key={d.id} aria-current={active?.id===d.id?'page':undefined} className={`mb-0.5 block w-full rounded-md border-l-2 px-3 py-2 text-left text-sm ${active?.id===d.id?'border-emerald-600 bg-emerald-50 font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100':'border-transparent text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`} onClick={()=>{if(active?.id!==d.id)selectDashboard(d);}}>
      <span className="block truncate">{d.name}</span>
      <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">{d.pending?<span className="text-amber-700 dark:text-amber-300">Device draft · pending sync</span>:`${d.definition.widgets.length} visualization${d.definition.widgets.length===1?'':'s'}`}</span>
     </button>)}
     {!dashboards.length&&<p className="px-3 py-2 text-xs leading-5 text-slate-500">No dashboards yet. Create one to chart your data.</p>}
     {!!dashboards.length&&!filteredDashboards.length&&<p className="px-3 py-2 text-xs text-slate-500">No dashboards match.</p>}
    </nav>
   </aside>}

   <main className="min-w-0 flex-1 overflow-y-auto">
    <div className={focusMode?"w-full p-3":"mx-auto max-w-[1500px] p-4 sm:p-6"}>


    {!active?<div className="mx-auto max-w-xl py-16 text-center">
     <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><BarChart3 size={28}/></span>
     <h3 className="text-xl font-semibold">Build a dashboard from your data</h3>
     <p className="mt-2 text-sm text-slate-500">Connect a live table, workbook worksheet or CSV/Excel file, then add charts, KPI cards and tables. Data refreshes while the dashboard is open.</p>
     <ol className="mx-auto mt-6 grid max-w-md gap-2 text-left text-sm sm:grid-cols-3">{['Create a dashboard','Connect data','Add visualizations'].map((step,i)=><li key={step} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Step {i+1}</span><span className="mt-1 block text-slate-700 dark:text-slate-200">{step}</span></li>)}</ol>
     <button type="button" className={`${primary} mt-6`} onClick={()=>selectDashboard(newDashboard(),true)}><Plus size={16}/>New dashboard</button>
    </div>:<>
     <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
       {editing?<input aria-label="Dashboard name" maxLength={200} className={`${input} max-w-md !text-lg font-semibold`} value={active.name} onChange={e=>change({...active,name:e.target.value})}/>:<h3 className="truncate text-xl font-semibold">{active.name}</h3>}
       <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ${status.tone}`}><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${status.dot}`}/>{status.text}</span>
        <span>{active.definition.datasets.length} dataset{active.definition.datasets.length===1?'':'s'} · {active.definition.widgets.length} visualization{active.definition.widgets.length===1?'':'s'}</span>
        {lastLoaded&&<span>Updated {new Date(lastLoaded).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>}
        <label className="inline-flex items-center gap-1">Refresh every<select aria-label="Dashboard refresh interval" className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-900" value={active.definition.refresh_seconds} onChange={e=>change({...active,definition:{...active.definition,refresh_seconds:Number(e.target.value) as 0|30|60|300|900|3600}})}><option value={0}>Manual</option><option value={30}>30 seconds</option><option value={60}>1 minute</option><option value={300}>5 minutes</option><option value={900}>15 minutes</option><option value={3600}>1 hour</option></select></label>
        {dirty&&<span className="font-medium text-amber-700 dark:text-amber-300">Unsaved changes</span>}
       </div>
      </div>
      {!!active.definition.widgets.length&&<label className="relative"><span className="sr-only">Search all dashboard data</span><Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/><input className={`${input} w-56 !py-1.5 pl-8`} placeholder="Search all data…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" onClick={()=>setQuery('')}><X size={14}/></button>}</label>}
      <button type="button" className={button} onClick={()=>{setEditing(!editing);setWidget(null);}}>{editing?<><Eye size={15}/>Done editing</>:<><Pencil size={15}/>Edit</>}</button>
      <button type="button" className={dirty?primary:button} disabled={saving||!active.name.trim()} onClick={()=>void save()}><Save size={15}/>{saving?'Saving…':'Save'}</button>
      <button type="button" className={button} disabled={dirty||!!active.pending||!active.revision||active.access==='editor'} title={dirty||active.pending?'Save and sync this dashboard before publishing':'Publish and manage dashboard access'} onClick={()=>setPublishing(true)}>Publish</button>
      <a href="/dashboards" className={button}>Shared dashboards</a>
      {editing&&<><button type="button" className={button} title="Save as a new dashboard" onClick={()=>void save(true)}><Copy size={15}/>Save a copy</button><button type="button" disabled={!!active.access&&active.access!=='owner'} title="Delete dashboard" aria-label="Delete dashboard" className={`${button} hover:!border-rose-300 hover:!bg-rose-50 hover:!text-rose-700`} onClick={()=>void remove()}><Trash2 size={15}/></button></>}
     </div>
     <DashboardFilters definition={active.definition} dataFor={dataFor} editing={editing} onChange={filters=>change({...active,definition:{...active.definition,filters}})}/>
     {query&&<p className="mb-3 text-xs text-slate-500">Showing records containing “{query}” in any column. Saved settings are unchanged.</p>}

     {editing&&!focusMode&&<section className="mb-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800"><Database size={16} className="text-slate-500"/><h4 className="flex-1 text-sm font-semibold">Data sources</h4>{active.definition.datasets.length<8&&!addingData&&<button type="button" className={button} onClick={()=>setAddingData(true)}><Plus size={15}/>Connect data</button>}</div>
      {!!active.definition.datasets.length&&<ul className="divide-y divide-slate-100 dark:divide-slate-800">{active.definition.datasets.map(d=>{const values=data[datasetKey(d)];const Icon=d.kind==='api'?Database:d.kind==='folder'?FolderOpen:FileSpreadsheet;return <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
       <Icon size={16} className="shrink-0 text-slate-400"/>
       <div className="min-w-0 flex-1"><p className="truncate font-medium text-slate-800 dark:text-slate-100">{d.name}</p><p className="text-xs text-slate-500">{d.kind==='api'?'Live table':d.kind==='folder'?'Watched folder file':'Workbook worksheet'}{values?` · ${values.rows.length.toLocaleString()} records${values.partial?' (partial)':''}`:' · Loading…'}{values?.error&&<span className="text-amber-700 dark:text-amber-300"> · {values.error}</span>}</p></div>
       <button type="button" title="Remove dataset" aria-label={`Remove dataset ${d.name}`} className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950" onClick={()=>{if(!window.confirm('Remove this dataset and its visualizations?'))return;change({...active,definition:{...active.definition,datasets:active.definition.datasets.filter(x=>x.id!==d.id),widgets:active.definition.widgets.filter(w=>w.dataset_id!==d.id).map(w=>w.label_lookup?.dataset_id===d.id?{...w,label_lookup:undefined}:w)}});}}><X size={15}/></button>
      </li>;})}</ul>}
      {(addingData||!active.definition.datasets.length)&&active.definition.datasets.length<8&&<div className="border-t border-slate-100 p-4 dark:border-slate-800">
       <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={label}>Source type<select className={`${input} mt-1.5`} value={datasetKind} onChange={e=>{setDatasetKind(e.target.value as typeof datasetKind);setSource('');setSheetId('');}}><option value="api">Live data table</option><option value="workbook">Workbook / imported file</option>{desktop&&<option value="folder">Watched folder file</option>}</select></label>
        <div><span className={`${label} mb-1.5`}>{datasetKind==='api'?'Data table':datasetKind==='folder'?'Watched CSV / Excel file':'Workbook'}</span><SearchableSelect ariaLabel="Dashboard dataset source" value={source} onChange={id=>void chooseSource(id)} options={datasetKind==='api'?sources.map(s=>({value:s.id,label:s.name})):datasetKind==='folder'?nativeFiles.map(f=>({value:f.id,label:f.relativePath})):books.map(b=>({value:b.id,label:b.name}))} placeholder="Search…"/></div>
        {datasetKind!=='api'&&<><label className={label}>Worksheet<select className={`${input} mt-1.5`} value={sheetId} onChange={e=>setSheetId(e.target.value)}><option value="">Select worksheet</option>{sheets.map(s=><option key={s.id} value={datasetKind==='folder'?s.name:s.id}>{s.name}</option>)}</select></label><label className={label}>Header row<input className={`${input} mt-1.5`} type="number" min={1} max={2000} value={header} onChange={e=>setHeader(Number(e.target.value))}/></label></>}
       </div>
       <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={primary} disabled={!source||(datasetKind!=='api'&&!sheetId)||!Number.isInteger(header)||header<1||header>2000} onClick={addDataset}><Plus size={15}/>Connect dataset</button>
        <label className={`${button} cursor-pointer`}><FileSpreadsheet size={15}/>Import CSV / Excel<input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;void importWorkbook(file).then(async imported=>{await saveDeviceWorkbook(scope,imported);setDevices(await listDeviceWorkbooks(scope));setDatasetKind('workbook');setSource(imported.id);setSheetId(imported.sheets[0]?.id||'');setNotice('File imported to device workbooks. Choose its worksheet, then connect it.');}).catch(e=>setError(dashboardError(e)));}}/></label>
        {addingData&&!!active.definition.datasets.length&&<button type="button" className="px-2 text-sm text-slate-500 hover:text-slate-800" onClick={()=>setAddingData(false)}>Cancel</button>}
       </div>
       <p className="mt-3 text-xs text-slate-500">Linked worksheets follow the same workbook and worksheet. Replacing a file with a different workbook requires reconnecting it. Reads are limited to 2,000 records, with a warning when partial.</p>
      </div>}
     </section>}

     <div className={`flex flex-col gap-5 ${widget&&editing&&!focusMode?'lg:flex-row lg:items-start':''}`}>
      <div className="min-w-0 flex-1">
       <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${widget&&editing&&!focusMode?'':'xl:grid-cols-4'}`}>
        {active.definition.widgets.map((w,index)=>(w.page_id||'overview')!==activePage?null:<div data-visual-id={w.id} onDragOver={e=>{if(editing&&draggedWidget.current){e.preventDefault();e.dataTransfer.dropEffect="move";}}} onDrop={e=>{e.preventDefault();const id=draggedWidget.current;draggedWidget.current=null;if(!editing||!id||id===w.id)return;const widgets=[...active.definition.widgets];const from=widgets.findIndex(v=>v.id===id);if(from<0)return;const [moved]=widgets.splice(from,1);widgets.splice(index,0,moved);change({...active,definition:{...active.definition,widgets}});}} className={`relative min-w-0 self-start ${span(w,!!(widget&&editing&&!focusMode))}${widget?.id===w.id?'rounded-xl ring-2 ring-emerald-500/40':''}`} key={w.id}>
         {editing&&!focusMode&&<DashboardLayoutHandle widget={w} onDragStart={()=>{draggedWidget.current=w.id;}} onDragEnd={()=>{draggedWidget.current=null;}} onResize={patch=>{change({...active,definition:{...active.definition,widgets:active.definition.widgets.map(v=>v.id===w.id?{...v,...patch}:v)}});if(widget?.id===w.id)setWidget({...widget,...patch});}}/>}
         <WorkbookDashboardChart widget={widget?.id===w.id?widget:w} data={viewData(widget?.id===w.id?widget:w)} lookup={dataFor((widget?.id===w.id?widget:w).label_lookup?.dataset_id||'')} editing={editing&&!focusMode} onEdit={()=>editWidget(w)} onDuplicate={()=>duplicateWidget(index)} onRemove={()=>{change({...active,definition:{...active.definition,widgets:active.definition.widgets.filter(x=>x.id!==w.id)}});if(widget?.id===w.id)setWidget(null);}} onMoveEarlier={index?()=>moveWidget(index,-1):undefined} onMoveLater={index<active.definition.widgets.length-1?()=>moveWidget(index,1):undefined}/>
        </div>)}
        {editing&&!!active.definition.datasets.length&&active.definition.widgets.length<24&&!widget&&<button type="button" className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-sm font-medium text-slate-500 hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-emerald-700 dark:border-slate-700 dark:hover:bg-emerald-950/40 xl:col-span-2" onClick={()=>editWidget()}><Plus size={20}/>Add visualization</button>}
       </div>
       {!active.definition.widgets.length&&!editing&&<div className="rounded-xl border-2 border-dashed border-slate-300 p-12 text-center dark:border-slate-700"><p className="text-sm text-slate-500">{active.definition.datasets.length?'This dashboard has no visualizations yet.':'Connect a table or worksheet to get started.'}</p><button type="button" className={`${primary} mt-4`} onClick={()=>{setEditing(true);if(active.definition.datasets.length)editWidget();}}><Pencil size={15}/>{active.definition.datasets.length?'Add a visualization':'Connect data'}</button></div>}
      </div>

      {widget&&editing&&!focusMode&&<aside aria-label="Visualization settings" className="w-full shrink-0 rounded-xl border border-slate-200 bg-white lg:sticky lg:top-0 lg:w-[380px] dark:border-slate-800 dark:bg-slate-900">
       <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800"><h4 className="text-sm font-semibold">{active.definition.widgets.some(w=>w.id===widget.id)?'Edit visualization':'New visualization'}</h4><button type="button" aria-label="Close visualization settings" className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={()=>setWidget(null)}><X size={16}/></button></div>
       <div className="max-h-[calc(100dvh-220px)] space-y-4 overflow-y-auto p-4">
        <DashboardVisualAssistant key={widget.id} widget={widget} datasets={active.definition.datasets} dataFor={dataFor} onChange={setWidget}/>
        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-950"><p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Preview</p><div className="pointer-events-auto max-h-80 overflow-hidden"><WorkbookDashboardChart widget={widget} data={viewData(widget)} lookup={dataFor(widget.label_lookup?.dataset_id||'')} editing={false} preview/></div></div>
        <fieldset><legend className={label}>Type</legend><div className="mt-1.5 grid grid-cols-6 gap-1">{kinds.map(({kind,name,icon:Icon})=><button type="button" key={kind} aria-pressed={widget.kind===kind} title={name} onClick={()=>updateWidget({kind})} className={`flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-[11px] ${widget.kind===kind?'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200':'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}><Icon size={16}/>{name}</button>)}</div></fieldset>
        <label className={label}>Dataset<select className={`${input} mt-1.5`} value={widget.dataset_id} onChange={e=>{const base={...widget,dataset_id:e.target.value,label_lookup:undefined,group_by:'',measure:'',filter_column:'',filter_value:''};setWidget(widget.title===widgetTitle(widget)?suggestWidget(base,dataFor(e.target.value)):{...suggestWidget(base,dataFor(e.target.value)),title:widget.title});}}>{active.definition.datasets.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        {widget.kind!=='table'&&<div className="grid grid-cols-2 gap-3">
         <label className={label}>Calculation<select className={`${input} mt-1.5`} value={widget.aggregation} onChange={e=>{const aggregation=e.target.value as DashboardWidget['aggregation'];updateWidget({aggregation,measure:aggregation!=='count'&&!widget.measure?widgetNumbers[0]||'':widget.measure});}}><option value="count">Count records</option><option value="sum">Sum</option><option value="average">Average</option><option value="min">Minimum</option><option value="max">Maximum</option></select></label>
         <label className={label}>Of value<select className={`${input} mt-1.5`} disabled={widget.aggregation==='count'} value={widget.measure} onChange={e=>updateWidget({measure:e.target.value})}><option value="">{widget.aggregation==='count'?'—':'Select column'}</option>{widgetNumbers.length>0&&<optgroup label="Number columns">{widgetNumbers.map(c=><option key={c} value={c}>{columnLabel(c)}</option>)}</optgroup>}<optgroup label="Other columns">{widgetColumns.filter(c=>!widgetNumbers.includes(c.name)).map(c=><option key={c.name} value={c.name}>{columnLabel(c.name)}</option>)}</optgroup></select></label>
        </div>}
        {widget.kind!=='table'&&widget.kind!=='kpi'&&<label className={label}>{widget.kind==='line'||widget.kind==='area'?'Horizontal axis':'Group by'}<select className={`${input} mt-1.5`} value={widget.group_by} onChange={e=>updateWidget({group_by:e.target.value})}><option value="">All records</option>{widgetColumns.map(c=><option key={c.name} value={c.name}>{columnLabel(c.name)}</option>)}</select></label>}
        {widget.group_by&&widget.kind!=='table'&&<DashboardRelatedNames widget={widget} datasets={active.definition.datasets} sources={sources} dataFor={dataFor} onChange={setWidget} onSelect={(dataset,lookup)=>{if(!active.definition.datasets.some(d=>d.id===dataset.id)){if(active.definition.datasets.length>=8)return;change({...active,definition:{...active.definition,datasets:[...active.definition.datasets,dataset]}});}setWidget({...widget,label_lookup:lookup});}}/>}
        <div className="grid grid-cols-2 gap-3">
         <label className={label}>Filter column<select className={`${input} mt-1.5`} value={widget.filter_column} onChange={e=>updateWidget({filter_column:e.target.value})}><option value="">No filter</option>{widgetColumns.map(c=><option key={c.name} value={c.name}>{columnLabel(c.name)}</option>)}</select></label>
         <label className={label}>Contains<input className={`${input} mt-1.5`} disabled={!widget.filter_column} value={widget.filter_value} placeholder={widget.filter_column?'Text to match':''} onChange={e=>updateWidget({filter_value:e.target.value})}/></label>
        </div>
        {['bar','line','area'].includes(widget.kind)&&<label className={label}>Flip axes<select className={`${input} mt-1.5`} value={widget.axis_orientation||'auto'} onChange={e=>setWidget({...widget,axis_orientation:e.target.value as 'auto'|'vertical'|'horizontal'})}><option value="auto">Automatic</option><option value="vertical">Categories on X · Values on Y</option><option value="horizontal">Values on X · Categories on Y</option></select></label>}
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" checked={widget.show_details!==false} onChange={e=>setWidget({...widget,show_details:e.target.checked})}/>Show summary details</label>
        <p className="text-xs text-slate-500">Show the calculation description and matching record count below the visual title or value.</p>
        <label className={label}>Tab<select className={input} value={widget.page_id||'overview'} onChange={e=>setWidget({...widget,page_id:e.target.value})}>{pages.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className={label}>Title<input className={`${input} mt-1.5`} value={widget.title} maxLength={200} onChange={e=>setWidget({...widget,title:e.target.value})}/></label>
        <div className="grid grid-cols-2 gap-3">
         <fieldset><legend className={label}>Colour</legend><div className="mt-2 flex gap-2">{(Object.keys(WIDGET_COLORS) as DashboardWidget['color'][]).map(c=><button type="button" key={c} title={WIDGET_COLOR_LABELS[c]} aria-label={WIDGET_COLOR_LABELS[c]} aria-pressed={widget.color===c} onClick={()=>setWidget({...widget,color:c})} className={`h-7 w-7 rounded-full ring-offset-2 dark:ring-offset-slate-900 ${widget.color===c?'ring-2 ring-slate-700 dark:ring-slate-200':''}`} style={{backgroundColor:WIDGET_COLORS[c]}}/>)}</div></fieldset>
         <fieldset><legend className={label}>Width</legend><div className="mt-1.5 grid grid-cols-2 overflow-hidden rounded-md border border-slate-300 text-xs dark:border-slate-600">{(['half','full'] as const).map(size=><button type="button" key={size} aria-pressed={widget.width===size} onClick={()=>setWidget({...widget,width:size})} className={`py-2 ${widget.width===size?'bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200':'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{size==='half'?(widget.kind==='kpi'?'Compact':'Half'):'Full'}</button>)}</div></fieldset>
        </div>
       </div>
       <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800"><button type="button" className={button} onClick={()=>setWidget(null)}>Cancel</button><button type="button" className={primary} disabled={!!(widget.label_lookup&&(!widget.label_lookup.key||!widget.label_lookup.label))||!widget.title.trim()||(widget.aggregation!=='count'&&widget.kind!=='table'&&!widget.measure)} onClick={applyWidget}>{active.definition.widgets.some(w=>w.id===widget.id)?'Apply changes':'Add to dashboard'}</button></div>
      </aside>}
     </div>
    </>}
    </div>
   {active&&<div className="sticky bottom-0 z-20 flex flex-wrap items-center gap-1 border-t border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900" role="tablist" aria-label="Dashboard pages">
    {pages.map((p,i)=><div key={p.id} className="flex items-center"><button role="tab" aria-selected={activePage===p.id} className={`rounded px-4 py-2 text-sm ${activePage===p.id?'bg-emerald-100 font-semibold text-emerald-900':'hover:bg-slate-100 dark:hover:bg-slate-800'}`} onClick={()=>{setPageId(p.id);setWidget(null);}}>{p.name}</button>{editing&&<details className="relative"><summary className="cursor-pointer px-1" aria-label={`Options for ${p.name}`}>⋮</summary><div className="absolute bottom-full right-0 mb-2 flex w-44 flex-col rounded border bg-white p-1 text-xs shadow-xl dark:bg-slate-900">
     <button className="p-2 text-left" onClick={()=>{const name=window.prompt('Tab name',p.name)?.trim();if(name)change({...active,definition:{...active.definition,pages:pages.map(t=>t.id===p.id?{...t,name:name.slice(0,100)}:t)}});}}>Rename</button>
     <button className="p-2 text-left" disabled={pages.length>=20||active.definition.widgets.length+active.definition.widgets.filter(w=>(w.page_id||'overview')===p.id).length>24} onClick={()=>{const id=crypto.randomUUID();change({...active,definition:duplicateDashboardPage(active.definition,p.id,id,()=>crypto.randomUUID())});setPageId(id);}}>Duplicate tab</button>
     <button className="p-2 text-left" disabled={!i} onClick={()=>{const next=[...pages];[next[i-1],next[i]]=[next[i],next[i-1]];change({...active,definition:{...active.definition,pages:next}});}}>Move left</button>
     <button className="p-2 text-left" disabled={i===pages.length-1} onClick={()=>{const next=[...pages];[next[i+1],next[i]]=[next[i],next[i+1]];change({...active,definition:{...active.definition,pages:next}});}}>Move right</button>
     <button className="p-2 text-left" onClick={()=>change({...active,definition:{...active.definition,default_page_id:p.id}})}>Make opening tab</button>
     <button className="p-2 text-left text-rose-700" disabled={pages.length===1} onClick={()=>{if(window.confirm('Delete this tab and its visuals?')){change({...active,definition:removeDashboardPage(active.definition,p.id)});setWidget(null);}}}>Delete tab</button>
    </div></details>}</div>)}
    {editing&&pages.length<20&&<button className="px-3 py-2 text-sm" onClick={()=>{const id=crypto.randomUUID();change({...active,definition:{...active.definition,pages:[...pages,{id,name:`Page ${pages.length+1}`}]}});setPageId(id);setWidget(null);}}>+ Add tab</button>}
   </div>}
   </main>
  </div>
 </div>;
}
