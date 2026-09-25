 'use client';
import {useEffect,useState,ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {RefreshCw,AlertCircle,X,Package,Search as SearchIcon} from 'lucide-react';
import {apiFetch, invalidateMemoryApiCache, peekMemoryApiResponse} from '@/lib/api';
export type Row=Record<string,any>;
export const title=(value:string)=>value.replace(/_id$/, '').replace(/[_-]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
export const rows=(data:any):Row[]=>{if(Array.isArray(data))return data;if(!data||typeof data!=='object')return [];if(Array.isArray(data.items))return data.items;if(Array.isArray(data.data))return data.data;if(Array.isArray(data.results))return data.results;if(Array.isArray(data.assets))return data.assets;if(Array.isArray(data.projects))return data.projects;if(Array.isArray(data.employees))return data.employees;if(Array.isArray(data.clients))return data.clients;if(Array.isArray(data.records))return data.records;return [];};
export function display(value:any):string {if(value===null||value===undefined)return '—';if(typeof value==='boolean')return value?'Yes':'No';if(typeof value==='object')return value.name||value.full_name||[value.first_name,value.last_name].filter(Boolean).join(' ')||value.document_number||'—';if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value))return new Date(value).toLocaleDateString();return String(value);}
export function useData<T=any>(path:string|null){const [data,setData]=useState<T|null>(()=>path?peekMemoryApiResponse<T>(path)??null:null);const [error,setError]=useState('');const [loading,setLoading]=useState(!!path&&!peekMemoryApiResponse<T>(path));const [version,setVersion]=useState(0);useEffect(()=>{let active=true;setError('');if(!path){setData(null);setLoading(false);return;}const cached=peekMemoryApiResponse<T>(path);if(cached!==undefined){setData(cached);setLoading(false);}else{setData(null);setLoading(true);}const onCacheInvalidated=()=>setVersion(v=>v+1);window.addEventListener('cestos:api-cache-invalidated',onCacheInvalidated);apiFetch<T>(path).then(d=>{if(active)setData(previous=>{try{return previous!==null&&JSON.stringify(previous)===JSON.stringify(d)?previous:d;}catch{return d;}});}).catch(e=>{if(active){if(cached===undefined)setError(e.message);}}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;window.removeEventListener('cestos:api-cache-invalidated',onCacheInvalidated);};},[path,version]);return{data,error,loading,reload:()=>invalidateMemoryApiCache()};}
export function State({loading,error,retry,children}:{loading:boolean;error:string;retry:()=>void;children:ReactNode}){if(loading)return <div role="status" className="card p-8 text-muted-foreground animate-pulse">Loading live records…</div>;if(error)return <div role="alert" className="card border-red-200 p-6"><div className="flex gap-2 text-red-700"><AlertCircle size={18}/>{error}</div><button className="btn-secondary mt-4" onClick={retry}><RefreshCw size={14}/>Retry</button></div>;return <>{children}</>;}
export function Table({data,onSelect,columns}:{data:Row[];onSelect?:(row:Row)=>void;columns?:string[]}){const preferred=['title','name','code','contact_name','email','phone','country','address','department_name','grade','level','is_supervisory_role','item_name','store_name','first_name','last_name','employee_number','asset_number','item_number','document_number','transaction_number','transaction_type','status','employment_status','quantity_on_hand','quantity_available','normalized_quantity','quantity','reorder_status','start_date','end_date','expiry_date','created_at'];const keys=columns||preferred.filter(k=>data.some(r=>r[k]!=null)).slice(0,7);const actual=keys.length?keys:Object.keys(data[0]||{}).filter(k=>!k.endsWith('_id')&&k!=='id'&&typeof data[0][k]!=='object').slice(0,6);if(!data.length)return <div className="p-10 text-center text-muted-foreground"><Package className="mx-auto mb-3 opacity-40" size={28}/><p className="font-semibold text-foreground">No records to show</p><p className="text-sm mt-1">Records will appear here as your team works.</p></div>;return <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-muted text-muted-foreground text-xs uppercase"><tr>{actual.map(k=><th className="px-4 py-3 font-semibold whitespace-nowrap" key={k}>{title(k)}</th>)}{onSelect&&<th className="px-4 py-3">Details</th>}</tr></thead><tbody>{data.map((row,index)=><tr className="border-t border-border hover:bg-muted/50" key={row.id||index}>{actual.map(k=><td className="px-4 py-3 max-w-xs" key={k}>{k.includes('status')?<span className="rounded bg-secondary px-2 py-1 text-xs font-semibold text-primary">{display(row[k]).replace(/_/g,' ')}</span>:display(row[k])}</td>)}{onSelect&&<td className="px-4 py-3"><button className="text-primary font-semibold hover:underline" onClick={()=>onSelect(row)}>Open<span className="sr-only"> {display(row.name||row.document_number||row.employee_number||row.asset_number)}</span></button></td>}</tr>)}</tbody></table></div>;}
export function Modal({name,title: modalTitle,onClose,children,className,error,footer}:{name?:string;title?:string;onClose:()=>void;children:ReactNode;className?:string;error?:string;footer?:ReactNode}){const headerTitle = name || modalTitle || 'Dialog'; const [mounted,setMounted]=useState(false);useEffect(()=>{setMounted(true);const listener=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);},[onClose]);if(!mounted)return null;return createPortal(<div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-hidden" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><section role="dialog" aria-modal="true" aria-label={headerTitle} className={`card shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] shadow-black/50 ring-1 ring-black/10 dark:ring-white/10 w-full h-[100dvh] sm:h-auto max-w-full sm:max-w-4xl sm:max-h-[90vh] rounded-none sm:rounded-2xl border-0 sm:border flex flex-col z-[100000] bg-white dark:bg-slate-900 overflow-hidden ${className||''}`}><header className="flex justify-between items-center px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:px-5 sm:py-5 border-b shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-10"><h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{headerTitle}</h2><button type="button" autoFocus aria-label="Close dialog" className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-900 dark:hover:text-white" onClick={(e)=>{e.preventDefault();e.stopPropagation();onClose();}}><X size={20}/></button></header><div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-thin">{error && <div role="alert" className="sticky top-0 z-20 mb-4 border border-red-300 bg-red-50 p-3 text-sm text-red-900 shadow-sm"><strong className="block">Could not save changes</strong><p className="whitespace-pre-wrap break-words">{error}</p></div>}{children}</div>{footer&&<footer className="z-20 shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] dark:border-slate-700 dark:bg-slate-900/95 backdrop-blur-md sm:px-6 sm:pb-3 sticky bottom-0">{footer}</footer>}</section></div>,document.body);}
export function Facts({data}:{data:Row}){return <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">{Object.entries(data).filter(([k,v])=>v!=null&&k!=='id'&&!k.endsWith('_id')&&!Array.isArray(v)&&!(typeof v==='object'&&!v.name)).map(([k,v])=><div key={k}><dt className="text-xs text-muted-foreground mb-1">{title(k)}</dt><dd className="text-sm break-words">{display(v)}</dd></div>)}</dl>;}

export function ErrorModal({title = 'Operational Alert', error, onClose}: {title?: string; error: string | null; onClose: () => void}) {
  if (!error) return null;
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4 p-1">
        <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
          <div className="space-y-1 text-xs leading-relaxed">
            <h4 className="font-bold text-sm text-rose-800 dark:text-rose-300">Action Could Not Be Completed</h4>
            <p className="font-mono break-words">{error}</p>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition shadow-sm"
          >
            Dismiss
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function SearchableProjectSelect({
  projects,
  value,
  onChange,
  placeholder = 'All Projects & Sites',
  required = false,
  className = '',
}: {
  projects: any[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const [search, setSearch] = useState('');

  // Sort projects so ACTIVE projects show first
  const sortedProjects = [...(Array.isArray(projects) ? projects : [])].sort((a, b) => {
    const aActive = (a.status || '').toUpperCase() === 'ACTIVE' || a.is_active === true ? 1 : 0;
    const bActive = (b.status || '').toUpperCase() === 'ACTIVE' || b.is_active === true ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive; // Active first
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const activeProjects = sortedProjects.filter(
    (p) => (p.status || '').toUpperCase() === 'ACTIVE' || p.is_active === true
  );
  const inactiveProjects = sortedProjects.filter(
    (p) => (p.status || '').toUpperCase() !== 'ACTIVE' && p.is_active !== true
  );

  const filteredActive = activeProjects.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.client_name || '').toLowerCase().includes(q)
    );
  });

  const filteredInactive = inactiveProjects.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.client_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search project name, code, or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs border rounded-lg pl-8 pr-3 py-1.5 bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs border rounded-lg p-2 bg-background font-medium focus:outline-hidden focus:ring-1 focus:ring-primary"
      >
        <option value="">{placeholder}</option>

        {filteredActive.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name || p.code} {p.client_name ? `(${p.client_name})` : ''}
          </option>
        ))}

        {filteredInactive.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name || p.code} {p.client_name ? `(${p.client_name})` : ''} ({p.status || 'Inactive'})
          </option>
        ))}

        {filteredActive.length === 0 && filteredInactive.length === 0 && (
          <option value="" disabled>
            No projects found matching "{search}"
          </option>
        )}
      </select>
    </div>
  );
}
