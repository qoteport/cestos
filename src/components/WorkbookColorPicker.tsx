'use client';

import { useEffect, useRef, useState } from 'react';

const palettes = [
  {name:'Neutral', colors:['#ffffff','#e2e8f0','#94a3b8','#475569','#000000']},
  {name:'Blue', colors:['#dbeafe','#93c5fd','#3b82f6','#1d4ed8','#1e3a8a']},
  {name:'Cyan', colors:['#cffafe','#67e8f9','#06b6d4','#0e7490','#164e63']},
  {name:'Green', colors:['#dcfce7','#86efac','#22c55e','#15803d','#14532d']},
  {name:'Yellow', colors:['#fef9c3','#fde047','#facc15','#ca8a04','#854d0e']},
  {name:'Orange', colors:['#ffedd5','#fdba74','#f97316','#c2410c','#7c2d12']},
  {name:'Red', colors:['#fee2e2','#fca5a5','#ef4444','#b91c1c','#7f1d1d']},
  {name:'Pink', colors:['#fce7f3','#f9a8d4','#ec4899','#be185d','#831843']},
  {name:'Purple', colors:['#f3e8ff','#d8b4fe','#a855f7','#7e22ce','#581c87']},
];

export default function WorkbookColorPicker({label, value, fallback, onChange}: {
  label:string; value?:string; fallback:string; onChange:(color:string)=>void;
}) {
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open) return;
    const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node)) setOpen(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);trigger.current?.focus();}};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape,true);
    return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape,true);};
  },[open]);
  return <div ref={root} className="relative">
    <button ref={trigger} type="button" title={label} aria-label={label} aria-expanded={open} onClick={()=>setOpen(!open)}
      className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold dark:border-slate-600 dark:bg-slate-800">
      {label === 'Text color' ? 'A' : 'Fill'}<span aria-hidden="true" className="h-4 w-5 rounded-sm border border-slate-400" style={{backgroundColor:value||fallback}}/><span aria-hidden="true">▾</span>
    </button>
    {open && <div role="group" aria-label={`${label} palette`} className="absolute left-0 top-full z-40 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-2 text-xs font-semibold">{label}</p>
      <div className="space-y-1.5">
        {palettes.map(row=><div key={row.name} className="flex items-center gap-1.5">
          <span className="w-12 shrink-0 text-[10px] text-slate-500">{row.name}</span>
          {row.colors.map((color,index)=><button key={color} type="button" title={`${row.name} ${index+1} (${color})`} aria-label={`${label}: ${row.name} shade ${index+1}`} aria-pressed={value?.toLowerCase()===color}
            className="h-7 min-w-0 flex-1 rounded-sm border border-slate-300 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 aria-pressed:ring-2 aria-pressed:ring-emerald-600 aria-pressed:ring-offset-1"
            style={{backgroundColor:color}} onClick={()=>{onChange(color);setOpen(false);trigger.current?.focus();}}/>) }
        </div>)}
      </div>
      <label className="mt-3 flex cursor-pointer items-center justify-between border-t pt-2 text-xs">Custom color
        <input type="color" aria-label={`Custom ${label.toLowerCase()}`} value={value||fallback} onChange={event=>onChange(event.target.value)} className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0"/>
      </label>
    </div>}
  </div>;
}
