'use client';
import {useRef,useState} from 'react';
import {GripHorizontal,MoveDiagonal2} from 'lucide-react';
import type {DashboardWidget} from '@/lib/workbookDashboard';

/** Resize previews stay local until pointer release; cancelled gestures never change the draft. */
export default function DashboardLayoutHandle({widget,onDragStart,onDragEnd,onResize}:{widget:DashboardWidget;onDragStart:()=>void;onDragEnd:()=>void;onResize:(patch:Pick<DashboardWidget,'width'|'height'>)=>void}){
 const gesture=useRef<{x:number;y:number;width:number;height:number;gridWidth:number}|null>(null);
 const [preview,setPreview]=useState<{width:'half'|'full';height:number}|null>(null);
 const target=useRef<HTMLDivElement|null>(null);
 const reset=()=>{const article=target.current?.parentElement?.querySelector('article');if(article)article.style.height=widget.height?`${widget.height}px`:'';gesture.current=null;setPreview(null);};
 return <div ref={target}>
  <div className="flex items-center justify-between gap-2 px-2 py-1 text-xs text-slate-500">
   <button type="button" draggable onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',widget.id);onDragStart();}} onDragEnd={onDragEnd} title="Drag to move visual; use the arrow buttons to move with the keyboard" aria-label={`Drag ${widget.title} to move`} className="cursor-grab rounded p-1 hover:bg-slate-100 active:cursor-grabbing"><GripHorizontal size={18}/></button>
   <span>{preview?`${preview.width==='full'?'Full':'Compact'} · ${preview.height}px`:'Drag to move · resize corner'}</span>
  </div>
  <button type="button" aria-label={`Resize ${widget.title}`} title="Drag to resize. Arrow keys adjust height and width." className="absolute bottom-1 right-1 z-10 touch-none cursor-nwse-resize rounded bg-white/90 p-1 text-slate-500 shadow-sm hover:text-emerald-700 dark:bg-slate-900"
   onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();const card=e.currentTarget.parentElement?.parentElement;const rect=card?.querySelector('article')?.getBoundingClientRect();if(!rect||!card)return;gesture.current={x:e.clientX,y:e.clientY,width:rect.width,height:rect.height,gridWidth:card.parentElement!.getBoundingClientRect().width};e.currentTarget.setPointerCapture(e.pointerId);}}
   onPointerMove={e=>{const start=gesture.current;if(!start)return;const height=Math.round(Math.max(240,Math.min(1000,start.height+e.clientY-start.y)));const width=start.width+e.clientX-start.x>start.gridWidth*.75?'full':'half';setPreview({height,width});const article=target.current?.parentElement?.querySelector('article');if(article)article.style.height=`${height}px`;}}
   onPointerUp={()=>{if(gesture.current&&preview)onResize(preview);reset();}}
   onPointerCancel={reset} onLostPointerCapture={()=>{if(gesture.current)reset();}}
   onKeyDown={e=>{if(e.key==='Escape'){reset();return;}if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();onResize({width:e.key==='ArrowLeft'?'half':e.key==='ArrowRight'?'full':widget.width,height:Math.max(240,Math.min(1000,(widget.height||360)+(e.key==='ArrowDown'?20:e.key==='ArrowUp'?-20:0)))});}}
  ><MoveDiagonal2 size={16}/></button>
 </div>;
}
