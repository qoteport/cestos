'use client';
import {useCallback,useRef,useState,type ReactNode} from 'react';
import {ChevronLeft,ChevronRight,Filter} from 'lucide-react';
import WorkbookDashboardChart from './WorkbookDashboardChart';
import DashboardTextBlock from './DashboardTextBlock';
import {dashboardRows,cellStyle,gridStyle,minCardPx,normalizeLayout,pageItems,responsiveColumns,visualColumns} from '@/lib/dashboardLayout';
import type {DashboardData,DashboardDefinition,DashboardWidget} from '@/lib/workbookDashboard';

/** Read-only dashboard page laid out with the dashboard's saved design (used for published dashboards). */
export default function DashboardLayoutView({definition,pageId,dataFor,lookupFor,filters,activeFilters=0}:{definition:DashboardDefinition;pageId:string;dataFor:(w:DashboardWidget)=>DashboardData|undefined;lookupFor:(w:DashboardWidget)=>DashboardData|undefined;filters:ReactNode;activeFilters?:number}){
 const layout=normalizeLayout(definition),items=pageItems(definition,layout,pageId);
 const [width,setWidth]=useState(1200),[filtersOpen,setFiltersOpen]=useState(false),observer=useRef<ResizeObserver|null>(null);
 const gridRef=useCallback((element:HTMLDivElement|null)=>{observer.current?.disconnect();observer.current=null;if(!element)return;const next=new ResizeObserver(([entry])=>setWidth(Math.round(entry.contentRect.width)));next.observe(element);observer.current=next;},[]);
 const hasFilters=!!definition.filters?.length;
 const rows=dashboardRows(items,layout,width);
 const grid=<div ref={gridRef} className="grid items-start" style={gridStyle(layout.gap,layout.row_gap)}>
  {items.map(item=>{
   const columns=item.type==='block'?responsiveColumns(item.block.span*5,width,minCardPx('block')):visualColumns(item.widget,layout,width);
   const cell={...cellStyle(columns,layout.gap),gridRow:rows.findIndex(row=>row.includes(item.id))+1};
   if(item.type==='block')return <div key={item.id} style={cell} className="min-w-0 self-end"><DashboardTextBlock block={item.block} editing={false} onChange={()=>{}} onRemove={()=>{}} onDragStart={()=>{}} onDragEnd={()=>{}}/></div>;
   return <div key={item.id} style={cell} className="min-w-0"><WorkbookDashboardChart published widget={item.widget} layout={layout.widgets[item.id]} card={layout.card} editing={false} modelDataFor={dataFor} data={dataFor(item.widget)} lookup={lookupFor(item.widget)}/></div>;
  })}
 </div>;
 const filterLabel=(filtersOpen?'Collapse filters':'Expand filters')+(activeFilters?` (${activeFilters} active)`:'');
 return <div className="relative flex min-w-0 items-start gap-1">
  <div className="min-w-0 flex-1">{grid}</div>
  {hasFilters&&<aside aria-label="Dashboard filters" className="sticky top-1 z-10 flex shrink-0 items-start">
   <button type="button" aria-label={filterLabel} title={filterLabel} aria-expanded={filtersOpen} aria-controls="published-dashboard-filters" onClick={()=>setFiltersOpen(open=>!open)} className="inline-flex h-11 min-w-9 items-center justify-center gap-1 rounded-md border bg-white px-1 text-sm dark:bg-slate-900">
    {filtersOpen?<ChevronRight size={18}/>:<><Filter size={16} aria-hidden/><ChevronLeft size={14} aria-hidden/></>}
    {activeFilters>0&&<span>{activeFilters}</span>}
   </button>
   <div id="published-dashboard-filters" hidden={!filtersOpen} className="absolute right-0 top-12 max-h-[70vh] w-64 max-w-[80vw] overflow-y-auto rounded-xl shadow-lg [&>section]:mb-0 lg:static lg:ml-1 lg:shadow-none">{filters}</div>
  </aside>}
 </div>;
}
