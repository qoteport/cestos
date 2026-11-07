'use client';
import {useRef,useState} from 'react';
import {GripHorizontal,MoveDiagonal2} from 'lucide-react';
import type {DashboardWidget} from '@/lib/workbookDashboard';
import {WIDTH_PRESETS,snapSpan} from '@/lib/dashboardLayout';

const MAX_HEIGHT=1000;
// KPI cards on Auto follow "cards per row", which can give ⅕ or ⅙ widths outside the presets.
const FRACTIONS:Record<number,string>={5:'⅕',6:'⅙'};
const presetLabel=(span:number)=>WIDTH_PRESETS.find(p=>p.span===span)?.label||FRACTIONS[Math.round(12/span)]&&`${FRACTIONS[Math.round(12/span)]} (auto)`||`${Math.round(span/12*100)}%`;

/** Resize previews stay local until pointer release; cancelled gestures never change the draft.
 *  Charts snap to width presets; KPIs use individual grid columns. Height is free within limits. */
export default function DashboardLayoutHandle({widget,span,onDragStart,onDragEnd,onResize}:{widget:DashboardWidget;span:number;onDragStart:()=>void;onDragEnd:()=>void;onResize:(patch:{span:number;height?:number})=>void}){
 const MIN_HEIGHT=widget.kind==='kpi'?1:240;
 const gesture=useRef<{x:number;y:number;width:number;height:number;gridWidth:number;gridColumn:string;cardHeight:string}|null>(null);
 const [preview,setPreview]=useState<{span:number;height:number}|null>(null);
 const target=useRef<HTMLDivElement|null>(null);
 const article=()=>target.current?.parentElement?.querySelector('article') as HTMLElement|null|undefined;
 const reset=()=>{const start=gesture.current;if(!start)return;const card=article();if(card)card.style.height=start.cardHeight;const frame=target.current?.parentElement;if(frame){frame.style.outline='';frame.style.gridColumn=start.gridColumn;}gesture.current=null;setPreview(null);};
 const step=(direction:-1|1)=>{if(widget.kind==='kpi')return Math.round(Math.max(0.2,Math.min(12,span+direction*0.2))*5)/5;const index=WIDTH_PRESETS.findIndex(p=>p.span>=span);const next=WIDTH_PRESETS[Math.min(WIDTH_PRESETS.length-1,Math.max(0,(index<0?WIDTH_PRESETS.length-1:index)+direction))];return next.span;};
 return <div ref={target}>
  <div className="absolute bottom-0 left-0 z-10 flex items-center gap-1 rounded bg-white/90 text-xs text-slate-500 dark:bg-slate-900/90">
   <button type="button" draggable onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',widget.id);onDragStart();}} onDragEnd={onDragEnd} title="Drag to move visual; use the arrow buttons to move with the keyboard" aria-label={`Drag ${widget.title} to move`} className="cursor-grab rounded p-1 hover:bg-slate-100 active:cursor-grabbing dark:hover:bg-slate-800"><GripHorizontal size={18}/></button>
   <span className="truncate tabular-nums" title="Drag the handle to move. Drag the corner to resize; KPI widths adjust in fine steps; chart widths snap to presets.">{preview?`${presetLabel(preview.span)} · ${preview.height}px`:presetLabel(span)}</span>
  </div>
  <button type="button" aria-label={`Resize ${widget.title}`} title="Drag to resize. Arrow keys: left/right change width, up/down change height." className="absolute bottom-1 right-1 z-10 touch-none cursor-nwse-resize rounded bg-white/90 p-1 text-slate-500 shadow-sm hover:text-emerald-700 dark:bg-slate-900"
   onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();const frame=target.current?.parentElement;const rect=article()?.getBoundingClientRect();const grid=frame?.parentElement?.getBoundingClientRect();if(!rect||!frame||!grid)return;gesture.current={x:e.clientX,y:e.clientY,width:frame.getBoundingClientRect().width,height:rect.height,gridWidth:grid.width,gridColumn:frame.style.gridColumn,cardHeight:article()?.style.height||''};e.currentTarget.setPointerCapture(e.pointerId);}}
   onPointerMove={e=>{const start=gesture.current;if(!start)return;const height=Math.round(Math.max(MIN_HEIGHT,Math.min(MAX_HEIGHT,start.height+e.clientY-start.y)));const fraction=(start.width+e.clientX-start.x)/start.gridWidth;const nextSpan=widget.kind==='kpi'?Math.max(0.2,Math.min(12,Math.round(fraction*60)/5)):snapSpan(fraction);setPreview({height,span:nextSpan});const card=article();if(card)card.style.height=`${height}px`;const frame=target.current?.parentElement;if(frame){frame.style.gridColumn=`span ${Math.round(nextSpan*5)} / span ${Math.round(nextSpan*5)}`;frame.style.outline=nextSpan!==span?'2px dashed rgb(16 185 129 / .6)':'';}}}
   onPointerUp={()=>{if(gesture.current&&preview)onResize(preview);reset();}}
   onPointerCancel={reset} onLostPointerCapture={()=>{if(gesture.current)reset();}}
   onKeyDown={e=>{if(e.key==='Escape'){reset();return;}if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft'||e.key==='ArrowRight'){onResize({span:step(e.key==='ArrowLeft'?-1:1),height:widget.height});return;}const height=widget.height||Math.round(article()?.getBoundingClientRect().height||320);onResize({span,height:Math.max(MIN_HEIGHT,Math.min(MAX_HEIGHT,height+(e.key==='ArrowDown'?20:-20)))});}}
  ><MoveDiagonal2 size={16}/></button>
 </div>;
}
