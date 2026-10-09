'use client';
import {useEffect, useId, useState, type RefObject, type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import {formulaCompletion,insertFormulaFunction} from '@/lib/workbookFormulaSuggestions';

export function useWorkbookFormulaSuggestions(input:RefObject<HTMLInputElement | null>,value:string,enabled:boolean,onValue:(value:string)=>void) {
  const [caret,setCaret]=useState(0),[selected,setSelected]=useState(0),[dismissed,setDismissed]=useState(true);
  const [position,setPosition]=useState<{left:number;top:number;width:number;maxHeight:number}|null>(null);
  const id=useId();
  const completion=enabled&&!dismissed?formulaCompletion(value,caret):null;
  const count=completion?.items.length || 0;
  const index=Math.min(selected,Math.max(0,count-1));
  useEffect(()=>{
    if(!count){setPosition(null);return;}
    const place=()=>{
      const el=input.current;if(!el)return;
      const rect=el.getBoundingClientRect(),width=Math.min(340,window.innerWidth-16);
      const below=window.innerHeight-rect.bottom-8,above=rect.top-8;
      const height=Math.min(300,Math.max(below,above));
      setPosition({left:Math.max(8,Math.min(rect.left,window.innerWidth-width-8)),top:below>=Math.min(300,above)?rect.bottom+4:Math.max(8,rect.top-height-4),width,maxHeight:Math.max(80,height)});
    };
    place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
    return ()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
  },[count,input]);
  useEffect(()=>{document.getElementById(`${id}-${index}`)?.scrollIntoView({block:'nearest'});},[index,id]);
  const choose=(name:string)=>{
    const next=insertFormulaFunction(value,caret,name);onValue(next.value);setDismissed(true);
    requestAnimationFrame(()=>{input.current?.focus();input.current?.setSelectionRange(next.caret,next.caret);});
  };
  return {
    changed:(element:HTMLInputElement)=>{setCaret(element.selectionStart??element.value.length);setSelected(0);setDismissed(false);},
    dismiss:()=>setDismissed(true),
    onKeyDown:(event:KeyboardEvent<HTMLInputElement>)=>{
      if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key))setDismissed(true);
      if(!completion||event.nativeEvent.isComposing||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return false;
      if(['ArrowDown','ArrowUp','Tab','Enter','Escape'].includes(event.key)){
        event.preventDefault();event.stopPropagation();
        if(event.key==='Escape')setDismissed(true);
        else if(event.key==='ArrowDown')setSelected((index+1)%count);
        else if(event.key==='ArrowUp')setSelected((index+count-1)%count);
        else choose(completion.items[index].name);
        return true;
      }
      return false;
    },
    aria: completion?{'aria-controls':id,'aria-activedescendant':`${id}-${index}`,'aria-autocomplete':'list' as const}: {},
    popup:completion&&position?createPortal(
      <div role="listbox" id={id} aria-label="Formula functions" style={position} className="fixed z-[110] overflow-y-auto rounded-lg border border-slate-300 bg-white p-1 text-slate-900 shadow-xl dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" onPointerDown={event=>{event.preventDefault();event.stopPropagation();}}>
        <p className="px-2 py-1 text-xs text-slate-500">Functions Â· â†‘â†“ choose Â· Tab or Enter insert</p>
        {completion.items.map((item,i)=><button key={item.name} id={`${id}-${i}`} type="button" role="option" aria-selected={i===index} tabIndex={-1} onClick={()=>choose(item.name)} className={`block w-full rounded px-2 py-2 text-left text-xs ${i===index?'bg-emerald-100 dark:bg-emerald-950':'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
          <span className="font-semibold">{item.name}</span><span className="ml-2 font-mono text-slate-500">{item.example}</span><span className="mt-1 block">{item.description}</span>
        </button>)}
      </div>,document.body):null,
  };
}
