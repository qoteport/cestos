'use client';
import {useCallback,useRef,useState,type ReactNode} from 'react';
import {SlidersHorizontal} from 'lucide-react';
import WorkbookDashboardChart from './WorkbookDashboardChart';
import DashboardTextBlock from './DashboardTextBlock';
import {cellStyle,gridStyle,minCardPx,normalizeLayout,pageItems,responsiveColumns,visualColumns} from '@/lib/dashboardLayout';
import type {DashboardData,DashboardDefinition,DashboardWidget} from '@/lib/workbookDashboard';

/** Read-only dashboard page laid out with the dashboard's saved design (used for published dashboards). */
export default function DashboardLayoutView({definition,pageId,dataFor,lookupFor,filters,activeFilters=0}:{definition:DashboardDefinition;pageId:string;dataFor:(w:DashboardWidget)=>DashboardData|undefined;lookupFor:(w:DashboardWidget)=>DashboardData|undefined;filters:ReactNode;activeFilters?:number}){
 const layout=normalizeLayout(definition),items=pageItems(definition,layout,pageId);
 const [width,setWidth]=useState(1200),[filtersOpen,setFiltersOpen]=useState(false),observer=useRef<ResizeObserver|null>(null);
 const gridRef=useCallback((element:HTMLDivElement|null)=>{observer.current?.disconnect();observer.current=null;if(!element)return;const next=new ResizeObserver(([entry])=>setWidth(Math.round(entry.contentRect.width)));next.observe(element);observer.current=next;},[]);
 const hasFilters=!!definition.filters?.length;
 const grid=<div ref={gridRef} className="grid items-start" style={gridStyle(layout.gap)}>
  {items.map(item=>{
   const columns=item.type==='block'?responsiveColumns(item.block.span*5,width,minCardPx('block')):visualColumns(item.widget,layout,width);
   const cell=cellStyle(columns,layout.gap);
   if(item.type==='block')return <div key={item.id} style={cell} className="min-w-0 self-end"><DashboardTextBlock block={item.block} editing={false} onChange={()=>{}} onRemove={()=>{}} onDragStart={()=>{}} onDragEnd={()=>{}}/></div>;
   return <div key={item.id} style={cell} className="min-w-0"><WorkbookDashboardChart widget={item.widget} layout={layout.widgets[item.id]} card={layout.card} editing={false} modelDataFor={dataFor} data={dataFor(item.widget)} lookup={lookupFor(item.widget)}/></div>;
  })}
 </div>;
 return <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start">
  {hasFilters&&<><button type="button" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(v=>!v)} className="inline-flex min-h-11 items-center gap-2 self-start rounded-md border border-slate-300 px-3 text-sm lg:hidden"><SlidersHorizontal size={15}/>Filters{activeFilters?` (${activeFilters})`:''}</button><aside aria-label="Filter panel" className={`${filtersOpen?'block':'hidden'} w-full shrink-0 lg:sticky lg:top-0 lg:block lg:w-64`}>{filters}</aside></>}
  <div className="min-w-0 w-full flex-1">{grid}</div>
 </div>;
}
