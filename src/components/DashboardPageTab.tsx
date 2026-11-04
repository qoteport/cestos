 'use client';
import {useId,useLayoutEffect,useRef,useState} from 'react';
import {MoreVertical} from 'lucide-react';
import {dashboardPages,duplicateDashboardPage,removeDashboardPage,type DashboardDefinition,type DashboardPage} from '@/lib/workbookDashboard';

/** Native popovers sit above scroll containers and modal workbook windows. */
export default function DashboardPageTab({page,definition,selected,editing,onSelect,onChange}:{page:DashboardPage;definition:DashboardDefinition;selected:boolean;editing:boolean;onSelect:(id:string)=>void;onChange:(d:DashboardDefinition)=>void}){
 const id=useId(),menu=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false),[mode,setMode]=useState<'menu'|'rename'|'delete'>('menu'),[name,setName]=useState(page.name);
 const pages=dashboardPages(definition),index=pages.findIndex(p=>p.id===page.id);
 const close=()=>{menu.current?.hidePopover();setOpen(false);setMode('menu');};
 const show=()=>{if(!editing)return;setMode('menu');setName(page.name);setOpen(true);menu.current?.showPopover();};
 useLayoutEffect(()=>{
  if(!open)return;
  const place=()=>{const node=menu.current,anchor=trigger.current;if(!node||!anchor)return;const a=anchor.getBoundingClientRect(),r=node.getBoundingClientRect();const viewport=window.visualViewport,left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,width=viewport?.width||window.innerWidth,height=viewport?.height||window.innerHeight;node.style.left=`${Math.max(left+8,Math.min(a.left,left+width-r.width-8))}px`;node.style.top=`${Math.max(top+8,Math.min(a.top-r.height-8,top+height-r.height-8))}px`;};
  place();menu.current?.querySelector<HTMLElement>('input,button:not(:disabled)')?.focus();
  window.addEventListener('resize',place);window.addEventListener('scroll',place,true);const observer=new ResizeObserver(place);if(menu.current)observer.observe(menu.current);
  return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);observer.disconnect();};
 },[open,mode]);
 const act=(fn:()=>void)=>{close();fn();};
 const item='w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100 focus:bg-emerald-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800 dark:focus:bg-slate-800';
 return <div className="flex shrink-0 items-center" onContextMenu={e=>{if(editing){e.preventDefault();e.stopPropagation();show();}}}>
  <button type="button" role="tab" aria-selected={selected} onClick={()=>onSelect(page.id)} onKeyDown={e=>{if(editing&&(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10')){e.preventDefault();show();}}} className={`min-h-10 whitespace-nowrap rounded px-4 py-2 text-sm ${selected?'bg-emerald-100 font-semibold text-emerald-900':'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{page.name}</button>
  {editing&&<><button type="button" ref={trigger} aria-haspopup="menu" aria-expanded={open} aria-controls={id} aria-label={`Options for ${page.name}`} onClick={()=>open?close():show()} className="rounded p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><MoreVertical size={16}/></button>
   <div id={id} ref={menu} popover="auto" onToggle={e=>{if((e.nativeEvent as ToggleEvent).newState==='closed'){setOpen(false);setMode('menu');}}} role={mode==='menu'?'menu':'dialog'} aria-label={`${page.name} tab options`} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();trigger.current?.focus();}if(mode==='menu'&&['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const buttons=Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')||[]);const i=buttons.indexOf(document.activeElement as HTMLButtonElement);const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();}}} style={{position:'fixed',inset:'auto',margin:0}} className="max-h-[calc(100dvh-16px)] w-56 max-w-[calc(100vw-16px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white">
   {mode==='menu'?<>
    <button role="menuitem" className={item} onClick={()=>setMode('rename')}>Rename</button>
    <button role="menuitem" className={item} disabled={pages.length>=20||definition.widgets.length+definition.widgets.filter(w=>(w.page_id||'overview')===page.id).length>24} onClick={()=>act(()=>{const next=crypto.randomUUID();onChange(duplicateDashboardPage(definition,page.id,next,()=>crypto.randomUUID()));onSelect(next);})}>Duplicate tab</button>
    <button role="menuitem" className={item} disabled={index<=0} onClick={()=>act(()=>{const next=[...pages];[next[index-1],next[index]]=[next[index],next[index-1]];onChange({...definition,pages:next});})}>Move left</button>
    <button role="menuitem" className={item} disabled={index===pages.length-1} onClick={()=>act(()=>{const next=[...pages];[next[index+1],next[index]]=[next[index],next[index+1]];onChange({...definition,pages:next});})}>Move right</button>
    <button role="menuitem" className={item} disabled={definition.default_page_id===page.id} onClick={()=>act(()=>onChange({...definition,default_page_id:page.id}))}>Make opening tab</button>
    <button role="menuitem" className={`${item} text-rose-700`} disabled={pages.length===1} onClick={()=>setMode('delete')}>Delete tab</button>
   </>:mode==='rename'?<form className="space-y-3 p-2" onSubmit={e=>{e.preventDefault();e.stopPropagation();if(name.trim())act(()=>onChange({...definition,pages:pages.map(p=>p.id===page.id?{...p,name:name.trim()}:p)}));}}><label className="block text-xs font-medium">Tab name<input value={name} maxLength={100} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded border bg-transparent p-2 text-sm"/></label><div className="flex justify-end gap-3"><button type="button" onClick={()=>setMode('menu')}>Back</button><button type="submit" disabled={!name.trim()} className="rounded bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-40">Rename</button></div></form>:<div className="space-y-3 p-2 text-sm"><p>Delete “{page.name}” and its visuals?</p><div className="flex justify-end gap-3"><button onClick={()=>setMode('menu')}>Cancel</button><button className="rounded bg-rose-700 px-3 py-2 text-white" onClick={()=>act(()=>{const next=removeDashboardPage(definition,page.id);onChange(next);if(selected)onSelect(dashboardPages(next)[0].id);})}>Delete</button></div></div>}
   </div></>}
 </div>;
}
