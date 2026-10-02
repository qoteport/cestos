'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, FileSpreadsheet, Plus, Redo2, Save, Undo2, Upload } from 'lucide-react';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import { changeDimension, columnName, copyWorkbook, exportWorkbook, importWorkbook, makeSheet, mergeCells, newWorkbook, overlaps, pasteCells, rangeBetween, suggestionsFor, validateWorkbook, workbookTemplates, type CellRange, type FieldSheet, type FieldWorkbook } from '@/lib/fieldWorkbook';

type Document = { id: string; title: string; tags: string[]; created_at: string };
type Point = { r: number; c: number };
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';
const primary = `${button} !border-emerald-700 !bg-emerald-700 !text-white hover:!bg-emerald-800`;

const GridCell = memo(function GridCell({ value, r, c, selected, active, merge, header, list, onValue, onSelect, onNavigate, onPaste }: {
  value: string; r: number; c: number; selected: boolean; active: boolean; merge?: CellRange; header: boolean; list?: string;
  onValue: (r: number,c: number,value: string)=>void; onSelect: (r: number,c: number,extend: boolean)=>void;
  onNavigate: (r: number,c: number,key: string,shift: boolean)=>void; onPaste: (r: number,c: number,text: string)=>void;
}) {
  return <td rowSpan={merge ? merge.er-merge.r+1 : 1} colSpan={merge ? merge.ec-merge.c+1 : 1} className={`relative border border-slate-200 p-0 dark:border-slate-700 ${selected ? 'bg-emerald-50 dark:bg-emerald-950' : header ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-900'} ${active ? 'outline outline-2 -outline-offset-2 outline-emerald-600' : ''}`}>
    <input data-cell={`${r}:${c}`} aria-label={`${columnName(c)}${r+1}`} aria-selected={selected} list={list} value={value} maxLength={32767} autoComplete="off" className={`h-full min-h-[32px] w-full min-w-0 bg-transparent px-2 py-1 text-sm text-slate-900 outline-none dark:text-slate-100 ${header ? 'font-semibold' : ''}`} title={value} onFocus={()=>onSelect(r,c,false)} onMouseDown={event=>{if(event.shiftKey){event.preventDefault();onSelect(r,c,true);}}} onChange={event=>onValue(r,c,event.target.value)} onKeyDown={event=>{if(event.key==='Tab'||event.key==='Enter'||(event.shiftKey && event.key.startsWith('Arrow')) || (event.altKey && event.key.startsWith('Arrow'))){event.preventDefault();onNavigate(r,c,event.key,event.shiftKey);}}} onPaste={event=>{const text=event.clipboardData.getData('text/plain');if(text.includes('\t')||text.includes('\n')){event.preventDefault();onPaste(r,c,text);}}} />
  </td>;
});

export default function FieldWorkbookWorkspace({ projects, assets, employees, sites, storageScope }: { projects: any[]; assets: any[]; employees: any[]; sites: any[]; storageScope: string }) {
  const [book,setBook]=useState<FieldWorkbook|null>(null);
  const [sheetIndex,setSheetIndex]=useState(0);
  const [anchor,setAnchor]=useState<Point>({r:0,c:0});
  const [end,setEnd]=useState<Point>({r:0,c:0});
  const [dirty,setDirty]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [documents,setDocuments]=useState<Document[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [undo,setUndo]=useState<FieldWorkbook[]>([]);
  const [redo,setRedo]=useState<FieldWorkbook[]>([]);
  const [templatePicker,setTemplatePicker]=useState(false);
  const [templateName,setTemplateName]=useState('');
  const [sheetName,setSheetName]=useState('');
  const [width,setWidth]=useState(160);
  const [height,setHeight]=useState(34);
  const [showHistory,setShowHistory]=useState(false);
  const bookRef=useRef(book); bookRef.current=book;
  const sheetRef=useRef(sheetIndex); sheetRef.current=sheetIndex;
  const lastEdit=useRef('');
  const gridRef=useRef<HTMLDivElement>(null);
  const storageKey=`cestos-field-workbook:${storageScope}`;
  const sheet=book?.sheets[sheetIndex];
  const selection=rangeBetween(anchor,end);

  const loadLibrary=useCallback(async()=>{
    setLoading(true);
    try {
      const all: Document[]=[]; let page=1;
      while(true){ const result=await apiFetch<{items:Document[];total:number}>(`/api/v1/documents?view=all&category=Field%20Workbooks&page_size=100&page=${page}`,{},true,{bypassMemoryRead:true}); all.push(...result.items); if(all.length>=result.total||!result.items.length) break; page++; }
      setDocuments(all);
    } catch(e){setError(e instanceof Error?e.message:'Could not load saved workbooks.');}
    finally {setLoading(false);}
  },[]);
  useEffect(()=>{void loadLibrary();},[loadLibrary]);
  useEffect(()=>{
    try {const raw=localStorage.getItem(storageKey);if(raw){setBook(validateWorkbook(JSON.parse(raw)));setDirty(true);setNotice('Recovered your unsaved workbook from this browser.');}}
    catch {setError('A previous draft could not be restored. Saved workbooks are still available below.');}
  },[storageKey]);
  useEffect(()=>{
    if(!dirty||!book)return;
    try{localStorage.setItem(storageKey,JSON.stringify(book));}catch{setError('The browser could not keep a recovery draft. Save your workbook to keep your changes.');}
  },[book,dirty,storageKey]);
  useEffect(()=>{if(!dirty)return;const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty]);
  useEffect(()=>{setSheetName(sheet?.name||'');},[sheet?.id,sheet?.name]);
  useEffect(()=>{if(sheet){setWidth(sheet.widths[anchor.c]||160);setHeight(sheet.heights[anchor.r]||34);}},[sheet,anchor]);

  const latest=useMemo(()=>{const seen=new Set<string>();return documents.filter(doc=>{const key=doc.tags.find(t=>t.startsWith('wb-'))||doc.id;if(seen.has(key))return false;seen.add(key);return true;});},[documents]);
  const commit=useCallback((next:FieldWorkbook,key='')=>{
    const previous=bookRef.current;if(!previous)return;
    if(!key||lastEdit.current!==key)setUndo(history=>[...history.slice(-29),previous]);
    lastEdit.current=key;setRedo([]);bookRef.current=next;setBook(next);setDirty(true);setError('');setNotice('');
  },[]);
  const changeSheet=useCallback((transform:(sheet:FieldSheet)=>FieldSheet,key='')=>{
    const current=bookRef.current;if(!current)return;
    try {const next={...current,sheets:current.sheets.map((s,i)=>i===sheetRef.current?transform(s):s)};commit(next,key);}
    catch(e){setError(e instanceof Error?e.message:'Could not update the sheet.');}
  },[commit]);
  const onValue=useCallback((r:number,c:number,value:string)=>changeSheet(s=>({...s,cells:s.cells.map((row,i)=>i===r?row.map((cell,j)=>j===c?value:cell):row)}),`cell:${sheetRef.current}:${r}:${c}`),[changeSheet]);
  const onSelect=useCallback((r:number,c:number,extend:boolean)=>{if(!extend)setAnchor({r,c});setEnd({r,c});},[]);
  const focus=useCallback((r:number,c:number)=>{requestAnimationFrame(()=>gridRef.current?.querySelector<HTMLInputElement>(`[data-cell="${r}:${c}"]`)?.focus());},[]);
  const onNavigate=useCallback((r:number,c:number,key:string,shift:boolean)=>{
    const s=bookRef.current?.sheets[sheetRef.current];if(!s)return;
    const merged=s.merges.find(m=>r>=m.r&&r<=m.er&&c>=m.c&&c<=m.ec);
    if(key==='Tab'||key==='ArrowRight')c=shift?c-1:(merged?.ec??c)+1;
    else if(key==='ArrowLeft')c--;
    else if(key==='ArrowUp')r--;
    else r=shift&&key==='Enter'?r-1:(merged?.er??r)+1;
    if(key==='Tab'){if(c>=s.widths.length){c=0;r++;}else if(c<0){c=s.widths.length-1;r--;}}
    r=Math.max(0,Math.min(s.cells.length-1,r));c=Math.max(0,Math.min(s.widths.length-1,c));
    const target=s.merges.find(m=>r>=m.r&&r<=m.er&&c>=m.c&&c<=m.ec);if(target){r=target.r;c=target.c;}
    if(shift&&key.startsWith('Arrow'))setEnd({r,c});else focus(r,c);
  },[focus]);
  const onPaste=useCallback(async(r:number,c:number,text:string)=>{
    try{const XLSX=await import('xlsx');const parsed=XLSX.read(text,{type:'string',FS:'\t',raw:true});const values=XLSX.utils.sheet_to_json<string[]>(parsed.Sheets[parsed.SheetNames[0]],{header:1,raw:false,defval:''});changeSheet(s=>pasteCells(s,r,c,values));}
    catch(e){setError(e instanceof Error?e.message:'Could not paste this table.');}
  },[changeSheet]);
  const suggestions=useMemo(()=>sheet?.widths.map((_,c)=>suggestionsFor(sheet.cells[0][c]||'',projects,assets,employees,sites))||[],[sheet?.cells[0],sheet?.widths,projects,assets,employees,sites]);
  const mergeLookup=useMemo(()=>{const map=new Map<string,CellRange>();for(const m of sheet?.merges||[])for(let r=m.r;r<=m.er;r++)for(let c=m.c;c<=m.ec;c++)map.set(`${r}:${c}`,m);return map;},[sheet?.merges]);
  function activate(next:FieldWorkbook,isDirty:boolean){try{localStorage.removeItem(storageKey);}catch{}setBook(next);bookRef.current=next;setSheetIndex(0);setAnchor({r:0,c:0});setEnd({r:0,c:0});setUndo([]);setRedo([]);lastEdit.current='';setDirty(isDirty);setTemplatePicker(false);setShowHistory(false);setError('');setNotice('');}
  function leave(){if(dirty&&!window.confirm('Leave this workbook and discard unsaved changes?'))return;localStorage.removeItem(storageKey);setBook(null);setDirty(false);setError('');setNotice('');}
  async function openDocument(doc:Document,asTemplate=false){setBusy(true);setError('');try{const blob=await apiFetchBlob(`/api/v1/documents/${doc.id}/download`);const source=validateWorkbook(JSON.parse(await blob.text()));const next=asTemplate?copyWorkbook(source):source;if(asTemplate)next.name=source.name.replace(/ template$/i,'');activate(next,asTemplate);}catch(e){setError(e instanceof Error?e.message:'Could not open workbook.');}finally{setBusy(false);}}
  async function save(asTemplate=false){if(!book)return;if(!book.name.trim()){setError('Give your workbook a name.');return;}setBusy(true);setError('');try{
    const saved=asTemplate?{...copyWorkbook(book,true),name:templateName.trim()||`${book.name} template`}:book;
    validateWorkbook(saved);
    const form=new FormData();form.append('file',new File([JSON.stringify(saved)],`${saved.id}.cestos.json`,{type:'application/json'}));form.append('title',saved.name.slice(0,250));form.append('category','Field Workbooks');form.append('tags',`wb-${saved.id},${saved.template?'workbook-template':'field-workbook'}`);form.append('visibility','PRIVATE');
    await apiFetch('/api/v1/documents',{method:'POST',body:form},true,{queueWhenOffline:false});
    if(!asTemplate){setDirty(false);localStorage.removeItem(storageKey);}setTemplatePicker(false);setNotice(asTemplate?'Template saved. Reuse it from the workbook library.':'Workbook saved. Previous saved versions remain available in History.');await loadLibrary();
  }catch(e){setError(e instanceof Error?e.message:'Could not save workbook.');}finally{setBusy(false);}}
  function undoRedo(forward:boolean){const stack=forward?redo:undo;if(!book||!stack.length)return;const next=stack[stack.length-1];if(forward){setRedo(stack.slice(0,-1));setUndo([...undo,book]);}else{setUndo(stack.slice(0,-1));setRedo([...redo,book]);}setBook(next);bookRef.current=next;setSheetIndex(Math.min(sheetIndex,next.sheets.length-1));setAnchor({r:0,c:0});setEnd({r:0,c:0});setDirty(true);lastEdit.current='';}
  function dimension(axis:'row'|'column',remove:boolean,after=false){changeSheet(s=>changeDimension(s,axis,(axis==='row'?anchor.r:anchor.c)+(after?1:0),remove));setAnchor({r:0,c:0});setEnd({r:0,c:0});}
  function renameSheet(){const name=sheetName.trim();if(!book||!sheet)return;if(!name||name.length>31||/[\\/?*\[\]:]/.test(name)||book.sheets.some(s=>s.id!==sheet.id&&s.name.toLowerCase()===name.toLowerCase())){setError('Use a unique sheet name of 1–31 characters without \\ / ? * [ ] :');setSheetName(sheet.name);return;}if(name!==sheet.name)changeSheet(s=>({...s,name}));}
  async function readFile(file?:File){if(!file)return;setBusy(true);setError('');try{activate(await importWorkbook(file),true);setNotice('Imported all worksheets. Formula cells use saved values; advanced Excel formatting is not imported.');}catch(e){setError(e instanceof Error?e.message:'Could not import workbook.');}finally{setBusy(false);}}
  async function download(){if(!book)return;setBusy(true);try{downloadBlob(await exportWorkbook(book),`${book.name.replace(/[\\/:*?"<>|]/g,'-')}.xlsx`);}catch(e){setError(e instanceof Error?e.message:'Export failed.');}finally{setBusy(false);}}
  const feedback=<>{error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{notice&&<p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}</>;
  if(!book||!sheet)return <section className="space-y-6 rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Field Admin</p><h2 className="mt-1 text-2xl font-bold">Workbooks</h2><p className="mt-1 text-sm text-slate-500">Simple tables for field work. Start with a template, a blank file or your existing spreadsheet.</p></div><div className="flex gap-2"><button className={primary} disabled={busy} onClick={()=>activate(newWorkbook(),true)}><Plus size={16}/>New workbook</button><label className={`${button} cursor-pointer`}><Upload size={16}/>Import Excel / CSV<input aria-label="Import Excel or CSV workbook" className="hidden" type="file" accept=".xlsx,.xls,.csv" disabled={busy} onChange={e=>{void readFile(e.target.files?.[0]);e.target.value='';}}/></label></div></header>
    {feedback}{busy&&<p role="status">Opening workbook…</p>}
    <div><h3 className="mb-3 font-semibold">Ready-to-use templates</h3><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{workbookTemplates.map((template,index)=><button key={template.name} disabled={busy} onClick={()=>activate(newWorkbook(index),true)} className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:hover:bg-emerald-950"><FileSpreadsheet className="mb-3 text-emerald-700" size={22}/><p className="text-sm font-bold">{template.name}</p><p className="mt-1 text-xs text-slate-500">{template.description}</p><span className="mt-3 block text-xs font-medium text-emerald-700">{template.sheets.length} {template.sheets.length===1?'sheet':'sheets'} · Use template →</span></button>)}</div></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Saved workbooks & templates</h3><input aria-label="Search workbooks" placeholder="Search saved files…" className="input-field" value={search} onChange={e=>setSearch(e.target.value)}/><button className={button} disabled={loading} onClick={()=>void loadLibrary()}>Refresh</button></div>
    <p className="text-xs text-slate-500">Saved privately in your document library. Each save keeps a new version. Workbook data stays in these sheets; it does not create maintenance records.</p>
    {loading?<p role="status">Loading saved files…</p>:<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{latest.filter(d=>d.title.toLowerCase().includes(search.toLowerCase())).map(doc=><div key={doc.id} className="rounded-xl border p-4"><p className="font-semibold">{doc.title}</p><p className="my-2 text-xs text-slate-500">{doc.tags.includes('workbook-template')?'Template':'Workbook'} · {new Date(doc.created_at).toLocaleString()}</p><button disabled={busy} className={button} onClick={()=>void openDocument(doc,doc.tags.includes('workbook-template'))}>{doc.tags.includes('workbook-template')?'Use template':'Open workbook'}</button></div>)}{!latest.length&&<p className="text-sm text-slate-500">Your saved workbooks and templates will appear here.</p>}</div>}
  </section>;

  return <section className="space-y-3" onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();if(!busy)void save();}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();if(!busy)undoRedo(event.shiftKey);}}}>
    <header className="flex flex-wrap items-center gap-3"><button className={button} disabled={busy} onClick={leave}><ArrowLeft size={15}/>Library</button><input aria-label="Workbook name" maxLength={250} className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-lg font-bold dark:bg-slate-900" value={book.name} disabled={busy} onChange={e=>commit({...book,name:e.target.value},'name')}/><span className="text-xs text-slate-500">{dirty?'Unsaved changes':'Saved'} · {book.sheets.length} sheets</span><button className={button} disabled={busy} onClick={()=>void download()}><Download size={15}/>Excel</button><button className={primary} disabled={busy} onClick={()=>void save()}><Save size={15}/>{busy?'Working…':'Save workbook'}</button></header>
    {feedback}
    <fieldset disabled={busy} className="space-y-3">
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
      <button className={button} disabled={!undo.length} aria-label="Undo" onClick={()=>undoRedo(false)}><Undo2 size={16}/></button><button className={button} disabled={!redo.length} aria-label="Redo" onClick={()=>undoRedo(true)}><Redo2 size={16}/></button>
      <button className={button} onClick={()=>dimension('row',false)}>Insert row above</button><button className={button} onClick={()=>dimension('row',false,true)}>Add row below</button><button className={button} onClick={()=>dimension('column',false)}>Insert column left</button><button className={button} onClick={()=>dimension('column',false,true)}>Add column right</button>
      <button className={button} onClick={()=>{if(window.confirm('Delete the selected row and its contents?'))dimension('row',true);}}>Delete row</button><button className={button} onClick={()=>{if(window.confirm('Delete the selected column and its contents?'))dimension('column',true);}}>Delete column</button>
      <button className={button} onClick={()=>changeSheet(s=>mergeCells(s,selection))}>Merge selection</button><button className={button} onClick={()=>changeSheet(s=>({...s,merges:s.merges.filter(m=>!overlaps(m,selection))}))}>Unmerge</button>
      <button className={button} onClick={()=>{setTemplateName(`${book.name} template`);setTemplatePicker(!templatePicker);}}>Save as template</button><button className={button} onClick={()=>setShowHistory(!showHistory)}>History</button>
    </div>
    {templatePicker&&<div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 dark:bg-slate-900"><input className="input-field" aria-label="Template name" value={templateName} maxLength={250} onChange={e=>setTemplateName(e.target.value)}/><p className="text-xs text-slate-500">Includes all sheets, values and layout. Clear example data first if needed.</p><button className={primary} onClick={()=>void save(true)}>Save template</button><button className={button} onClick={()=>setTemplatePicker(false)}>Cancel</button></div>}
    {showHistory&&<div className="max-h-48 space-y-2 overflow-auto rounded-xl border bg-white p-3 dark:bg-slate-900"><p className="text-sm font-semibold">Saved versions</p>{documents.filter(d=>d.tags.includes(`wb-${book.id}`)).map(doc=><button key={doc.id} className={`${button} mr-2`} onClick={()=>{if(!dirty||window.confirm('Open this saved version and discard unsaved changes?'))void openDocument(doc);}}>{new Date(doc.created_at).toLocaleString()}</button>)}{!documents.some(d=>d.tags.includes(`wb-${book.id}`))&&<p className="text-xs text-slate-500">Save this workbook to start its history.</p>}</div>}
    <div className="flex flex-wrap items-center gap-3 text-xs"><span className="rounded border bg-white px-3 py-2 font-mono dark:bg-slate-900">{columnName(selection.c)}{selection.r+1}{selection.er!==selection.r||selection.ec!==selection.c?`:${columnName(selection.ec)}${selection.er+1}`:''}</span><label>Column width <input aria-label="Column width" type="number" min={60} max={600} value={width} className="ml-1 w-20 rounded border p-1 dark:bg-slate-900" onChange={e=>setWidth(Number(e.target.value))} onBlur={()=>{const size=Math.max(60,Math.min(600,width||160));changeSheet(s=>({...s,widths:s.widths.map((w,c)=>c>=selection.c&&c<=selection.ec?size:w)}));}}/></label><label>Row height <input aria-label="Row height" type="number" min={26} max={300} value={height} className="ml-1 w-20 rounded border p-1 dark:bg-slate-900" onChange={e=>setHeight(Number(e.target.value))} onBlur={()=>{const size=Math.max(26,Math.min(300,height||34));changeSheet(s=>({...s,heights:s.heights.map((h,r)=>r>=selection.r&&r<=selection.er?size:h)}));}}/></label><p className="text-slate-500">Shift-click to select a range · Tab / Enter to move · Alt + arrows to navigate · Paste tables from Excel</p></div>
    <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 dark:bg-slate-900"><span className="text-xs font-semibold text-slate-500">Cell value</span><input aria-label="Selected cell value" className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={sheet.cells[anchor.r]?.[anchor.c]||''} maxLength={32767} onChange={e=>onValue(anchor.r,anchor.c,e.target.value)}/></div>
    <div ref={gridRef} className="relative max-h-[60vh] overflow-auto rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
      <table className="table-fixed border-separate border-spacing-0" style={{width:48+sheet.widths.reduce((a,b)=>a+b,0)}} aria-label={sheet.name}>
        <colgroup><col style={{width:48}}/>{sheet.widths.map((w,c)=><col key={c} style={{width:w}}/>)}</colgroup>
        <thead className="sticky top-0 z-20"><tr><th className="sticky left-0 z-30 border bg-slate-100 text-xs dark:bg-slate-800">#</th>{sheet.widths.map((_,c)=><th key={c} className="border bg-slate-100 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"><button className="w-full py-2" onClick={()=>{setAnchor({r:0,c});setEnd({r:sheet.cells.length-1,c});}} aria-label={`Select column ${columnName(c)}`}>{columnName(c)}</button></th>)}</tr></thead>
        <tbody>{sheet.cells.map((row,r)=><tr key={r} style={{height:sheet.heights[r]}}><th className="sticky left-0 z-10 border bg-slate-100 text-xs font-normal dark:border-slate-700 dark:bg-slate-800"><button className="h-full w-full py-2" aria-label={`Select row ${r+1}`} onClick={()=>{setAnchor({r,c:0});setEnd({r,c:sheet.widths.length-1});}}>{r+1}</button></th>{row.map((value,c)=>{const merge=mergeLookup.get(`${r}:${c}`);if(merge&&(merge.r!==r||merge.c!==c))return null;return <GridCell key={c} {...{value,r,c,merge}} header={r===0} active={anchor.r===r&&anchor.c===c} selected={r>=selection.r&&r<=selection.er&&c>=selection.c&&c<=selection.ec} list={r>0&&suggestions[c]?.length?`wb-suggest-${sheet.id}-${c}`:undefined} onValue={onValue} onSelect={onSelect} onNavigate={onNavigate} onPaste={onPaste}/>;})}</tr>)}</tbody>
      </table>
    </div>
    {suggestions.map((values,c)=>values.length>0&&<datalist key={c} id={`wb-suggest-${sheet.id}-${c}`}>{values.map(value=><option key={value} value={value}/>)}</datalist>)}
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-2 dark:border-slate-700 dark:bg-slate-900"><div role="tablist" aria-label="Worksheets" className="flex max-w-full gap-1 overflow-auto">{book.sheets.map((s,i)=><button key={s.id} role="tab" aria-selected={i===sheetIndex} className={`${button} whitespace-nowrap ${i===sheetIndex?'!border-emerald-600 !bg-emerald-50 !text-emerald-800':''}`} onClick={()=>{setSheetIndex(i);setAnchor({r:0,c:0});setEnd({r:0,c:0});lastEdit.current='';}}>{s.name}</button>)}</div><button aria-label="Add worksheet" className={button} disabled={book.sheets.length>=30} onClick={()=>{let n=book.sheets.length+1;while(book.sheets.some(s=>s.name===`Sheet ${n}`))n++;commit({...book,sheets:[...book.sheets,makeSheet(`Sheet ${n}`)]});setSheetIndex(book.sheets.length);setAnchor({r:0,c:0});setEnd({r:0,c:0});}}><Plus size={16}/>Sheet</button><label className="text-xs">Sheet name <input aria-label="Sheet name" className="ml-1 w-40 rounded border p-2 dark:bg-slate-900" value={sheetName} maxLength={31} onChange={e=>setSheetName(e.target.value)} onBlur={renameSheet} onKeyDown={e=>{if(e.key==='Enter')renameSheet();}}/></label><button className={button} disabled={book.sheets.length===1} onClick={()=>{if(window.confirm(`Delete “${sheet.name}” and all its cells?`)){commit({...book,sheets:book.sheets.filter(s=>s.id!==sheet.id)});setSheetIndex(0);setAnchor({r:0,c:0});setEnd({r:0,c:0});}}}>Delete sheet</button></div>
    <p className="text-xs text-slate-500">{sheet.cells.length} rows × {sheet.widths.length} columns · Suggestions follow the first-row headings and allow custom values · Basic tables only, no formula calculation</p>
    </fieldset>
  </section>;
}
