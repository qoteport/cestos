'use client';
import DashboardSelect from '@/components/DashboardSelect';
import {AlignCenter,AlignLeft,ArrowLeft,ArrowRight,GripHorizontal,Trash2} from 'lucide-react';
import {WIDTH_PRESETS,type TextBlock} from '@/lib/dashboardLayout';

const iconButton='rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white';
const field='w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white';

/** Section heading with optional description, used to structure a dashboard page. */
export default function DashboardTextBlock({block,editing,onChange,onRemove,onDragStart,onDragEnd,onMoveEarlier,onMoveLater}:{block:TextBlock;editing:boolean;onChange:(patch:Partial<TextBlock>)=>void;onRemove:()=>void;onDragStart:()=>void;onDragEnd:()=>void;onMoveEarlier?:()=>void;onMoveLater?:()=>void}){
 const align=block.align==='center'?'text-center':'';
 if(!editing)return <div className={`px-1 pt-2 ${align}`}>
  {block.title&&<h3 className="text-base font-semibold text-slate-900 dark:text-white">{block.title}</h3>}
  {block.body&&<p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-500 dark:text-slate-400">{block.body}</p>}
 </div>;
 return <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-2 dark:border-slate-700 dark:bg-slate-900/60">
  <div className="mb-1.5 flex flex-wrap items-center gap-1">
   <button type="button" draggable onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',block.id);onDragStart();}} onDragEnd={onDragEnd} aria-label={`Drag heading ${block.title||'section'} to move`} title="Drag to move" className={`${iconButton} cursor-grab active:cursor-grabbing`}><GripHorizontal size={16}/></button>
   <span className="mr-auto text-xs font-medium text-slate-500">Section heading</span>
   <DashboardSelect aria-label="Heading width" className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-900" value={block.span} onChange={e=>onChange({span:Number(e.target.value)})}>{WIDTH_PRESETS.map(p=><option key={p.span} value={p.span}>{p.label} width</option>)}</DashboardSelect>
   <button type="button" aria-pressed={block.align==='left'} aria-label="Align left" title="Align left" className={`${iconButton} ${block.align==='left'?'bg-slate-100 dark:bg-slate-800':''}`} onClick={()=>onChange({align:'left'})}><AlignLeft size={15}/></button>
   <button type="button" aria-pressed={block.align==='center'} aria-label="Align centre" title="Align centre" className={`${iconButton} ${block.align==='center'?'bg-slate-100 dark:bg-slate-800':''}`} onClick={()=>onChange({align:'center'})}><AlignCenter size={15}/></button>
   {onMoveEarlier&&<button type="button" aria-label="Move heading earlier" title="Move earlier" className={iconButton} onClick={onMoveEarlier}><ArrowLeft size={15}/></button>}
   {onMoveLater&&<button type="button" aria-label="Move heading later" title="Move later" className={iconButton} onClick={onMoveLater}><ArrowRight size={15}/></button>}
   <button type="button" aria-label="Remove heading" title="Remove" className={`${iconButton} hover:!bg-rose-50 hover:!text-rose-700 dark:hover:!bg-rose-950`} onClick={onRemove}><Trash2 size={15}/></button>
  </div>
  <input aria-label="Heading text" maxLength={200} placeholder="Heading" className={`${field} text-base font-semibold ${align}`} value={block.title} onChange={e=>onChange({title:e.target.value})}/>
  <textarea aria-label="Heading description" maxLength={1000} rows={1} placeholder="Optional description" className={`${field} mt-1.5 resize-y text-sm ${align}`} value={block.body} onChange={e=>onChange({body:e.target.value})}/>
 </div>;
}
