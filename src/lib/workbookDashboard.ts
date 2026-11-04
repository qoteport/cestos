import type {DashboardLayout} from './dashboardLayout';
import type {FieldSheet} from './fieldWorkbook';
import {calculateSheet} from './workbookFormulas';
export type DashboardDataset={id:string;name:string;kind:'api'|'workbook'|'folder';source:string;sheet_id:string;header_row:number};
export type DashboardWidget={model?:import("./dashboardModel").DashboardModel;axis_orientation?:"auto"|"vertical"|"horizontal";page_id?:string;show_details?:boolean;height?:number;label_lookup?:{dataset_id:string;key:string;label:string};id:string;title:string;dataset_id:string;kind:'bar'|'line'|'area'|'pie'|'kpi'|'table';group_by:string;measure:string;aggregation:'count'|'sum'|'average'|'min'|'max';filter_column:string;filter_value:string;color:'blue'|'red'|'green'|'purple';width:'half'|'full'};
export type DashboardFilter={page_ids?:string[];id:string;name:string;kind:"category"|"date"|"number";columns:Record<string,string>;widget_ids:string[];value:string;end:string};
export type DashboardPage={id:string;name:string};
export type DashboardDefinition={pages?:DashboardPage[];default_page_id?:string;filters?:DashboardFilter[];datasets:DashboardDataset[];widgets:DashboardWidget[];refresh_seconds:0|30|60|300|900|3600;layout?:DashboardLayout};
export type SavedDashboard={access?:"owner"|"manager"|"editor";id:string;name:string;revision:number;definition:DashboardDefinition;updated_at:string;pending?:boolean};
export type DashboardData={rows:Record<string,unknown>[];columns:{name:string;type:string}[];partial:boolean;total:number;loadedAt:string;error?:string;origin?:string;version?:string};
export const datasetKey=(d:DashboardDataset)=>JSON.stringify([d.kind,d.source,d.sheet_id,d.header_row]);
export const newDashboard=():SavedDashboard=>({id:crypto.randomUUID(),name:'Untitled dashboard',revision:0,definition:{datasets:[],widgets:[],refresh_seconds:60},updated_at:new Date().toISOString()});
export function worksheetData(sheet:FieldSheet,header:number):DashboardData {
 if(!Number.isInteger(header)||header<0||header>=sheet.cells.length)throw Error('Choose an existing header row.');
 const calculated=calculateSheet(sheet),seen=new Set<string>();
 const names=sheet.cells[header].map((value,c)=>{let label=value.trim()||`Column ${c+1}`;if(seen.has(label))label+=` [${c+1}]`;seen.add(label);return label;});
 const rows=calculated.slice(header+1).filter(row=>row.some(v=>v.trim())).map(row=>Object.fromEntries(names.map((name,c)=>[name,row[c]??''])));
 return {rows,columns:names.map(name=>({name,type:'string'})),partial:!!sheet.previewLimited,total:rows.length,loadedAt:new Date().toISOString()};
}
const numeric=(v:unknown)=>{if(v===null||v===undefined||typeof v==='boolean'||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
export function widgetValues(widget:DashboardWidget,data:DashboardData,lookup?:DashboardData){
 const columns=new Set(data.columns.map(c=>c.name));
 for(const key of [widget.group_by,widget.measure,widget.filter_column])if(key&&!columns.has(key))throw Error(`Column “${key}” is no longer available. Edit this visualization.`);
 const rows=data.rows.filter(row=>!widget.filter_column||!widget.filter_value||String(row[widget.filter_column]??'').toLocaleLowerCase().includes(widget.filter_value.toLocaleLowerCase()));
 const currencies=new Set(rows.map(r=>r.currency).filter(Boolean));
 if(widget.aggregation!=='count'&&currencies.size>1&&widget.group_by!=='currency')throw Error('Mixed currencies: filter to one currency or group by currency before combining amounts.');
 const groups=new Map<string,{count:number;values:number[]}>();let excluded=0;
 for(const row of rows){const label=widget.group_by?String(row[widget.group_by]??'Unspecified'):'All records';const group=groups.get(label)||{count:0,values:[]};group.count++;if(widget.aggregation!=='count'){const value=numeric(row[widget.measure]);if(value===null)excluded++;else group.values.push(value);}groups.set(label,group);}
 const value=(g:{count:number;values:number[]})=>{if(widget.aggregation==='count')return g.count;if(!g.values.length)return null;const sum=g.values.reduce((a,b)=>a+b,0);return Number((widget.aggregation==='sum'?sum:widget.aggregation==='average'?sum/g.values.length:widget.aggregation==='min'?Math.min(...g.values):Math.max(...g.values)).toPrecision(12));};
 const labels=new Map<string,string>(), ambiguous=new Set<string>();
 if(widget.label_lookup&&lookup&&!lookup.error){for(const row of lookup.rows){const id=row[widget.label_lookup.key],label=row[widget.label_lookup.label];if(id===null||id===undefined||label===null||label===undefined||!String(label).trim())continue;const key=String(id);if(labels.has(key))ambiguous.add(key);else labels.set(key,String(label));}}
 const names=new Map<string,number>();for(const [id,label] of labels){if(!ambiguous.has(id))names.set(label,(names.get(label)||0)+1);}
 const display=(id:string)=>!ambiguous.has(id)&&labels.has(id)?`${labels.get(id)}${(names.get(labels.get(id)!)||0)>1?` (${id})`:''}`:id;
 const points=[...groups].map(([name,g])=>({name:display(name),value:value(g)}));
 if(['bar','pie'].includes(widget.kind))points.sort((a,b)=>(b.value??0)-(a.value??0));else points.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
 const total=value({count:rows.length,values:rows.map(r=>numeric(r[widget.measure])).filter((v):v is number=>v!==null)});
 return {points:points.slice(0,30),total,rows,excluded,hiddenGroups:Math.max(0,points.length-30)};
}
export function dashboardCsv(rows:Record<string,unknown>[],columns:string[]){
 const quote=(v:unknown)=>{let value=String(v??'');if(/^\s*[=+@]/.test(value)||(/^\s*-/.test(value)&&!/^\s*-\d+(\.\d+)?\s*$/.test(value)))value="'"+value;return '"'+value.replace(/"/g,'""')+'"';};
 return '\ufeff'+[columns,...rows.map(r=>columns.map(c=>r[c]))].map(row=>row.map(quote).join(',')).join('\r\n');
}

// Chart palette in fixed order. Checked for colour-blind separation and 3:1 contrast
// on light and dark surfaces; categories beyond it fold into "Other" rather than reuse a hue.
export const DASHBOARD_PALETTE=['#16856b','#c4840f','#3a68b8','#c4536a','#7656c4','#1e98b8','#7a982a'];
export const WIDGET_COLORS:Record<DashboardWidget['color'],string>={green:'#16856b',blue:'#3a68b8',red:'#c4536a',purple:'#7656c4'};
export const WIDGET_COLOR_LABELS:Record<DashboardWidget['color'],string>={green:'Emerald',blue:'Blue',red:'Rose',purple:'Violet'};
export const columnLabel=(name:string)=>name.replaceAll('_',' ');
const blank=(v:unknown)=>v===null||v===undefined||String(v).trim()==='';
/** Columns where at least 80% of the filled values (first 500 rows) are numbers. */
export function numericColumns(data:DashboardData){
 return data.columns.map(c=>c.name).filter(name=>{let filled=0,count=0;for(const row of data.rows.slice(0,500)){if(blank(row[name]))continue;filled++;if(numeric(row[name])!==null)count++;}return filled>0&&count/filled>=0.8;});
}
export function widgetTitle(w:Pick<DashboardWidget,'aggregation'|'measure'|'group_by'>){
 const what=w.aggregation==='count'||!w.measure?'Record count':`${w.aggregation[0].toUpperCase()+w.aggregation.slice(1)} of ${columnLabel(w.measure)}`;
 return w.group_by?`${what} by ${columnLabel(w.group_by)}`:what;
}
/** Sensible first settings for a new visualization: group by a low-cardinality text column, sum the first numeric column. */
export function suggestWidget(base:DashboardWidget,data?:DashboardData):DashboardWidget{
 if(!data?.columns.length)return base;
 const numbers=numericColumns(data);
 const group=data.columns.map(c=>c.name).find(name=>{if(numbers.includes(name))return false;const values=new Set(data.rows.slice(0,500).map(r=>String(r[name]??'').trim()).filter(Boolean));return values.size>1&&values.size<=30;})||'';
 const measure=numbers.find(n=>n!==group)||'';
 const next:DashboardWidget={...base,group_by:group,measure,aggregation:measure?'sum':'count',kind:group?base.kind:'kpi'};
 return {...next,title:widgetTitle(next)};
}
/** View-only search across every column; saved definitions are unchanged. */
export function searchData(data:DashboardData,text:string):DashboardData{
 const query=text.trim().toLocaleLowerCase();if(!query)return data;
 const rows=data.rows.filter(row=>data.columns.some(c=>String(row[c.name]??'').toLocaleLowerCase().includes(query)));
 return {...data,rows,total:rows.length};
}
export function formatNumber(value:number|null|undefined,compact=false){
 if(value===null||value===undefined||!Number.isFinite(value))return '—';
 return value.toLocaleString(undefined,compact&&Math.abs(value)>=10000?{notation:'compact',maximumFractionDigits:1}:{maximumFractionDigits:2});
}
/** Numbers sort numerically, everything else naturally; blanks always last. */
export function sortRows(rows:Record<string,unknown>[],column:string,direction:'asc'|'desc'){
 const sign=direction==='asc'?1:-1;
 return [...rows].sort((a,b)=>{const x=a[column],y=b[column];if(blank(x)||blank(y))return blank(x)===blank(y)?0:blank(x)?1:-1;const nx=numeric(x),ny=numeric(y);if(nx!==null&&ny!==null)return (nx-ny)*sign;return String(x).localeCompare(String(y),undefined,{numeric:true,sensitivity:'base'})*sign;});
}

/** Filters are ANDed. Explicit dataset bindings prevent unrelated columns being filtered. */
export function filterDashboardData(data:DashboardData,widget:DashboardWidget,filters:DashboardFilter[]=[]):DashboardData{
 const applicable=filters.filter(f=>(!f.page_ids?.length||f.page_ids.includes(widget.page_id||'overview'))&&f.columns[widget.dataset_id]&&(!f.widget_ids.length||f.widget_ids.includes(widget.id))&&(f.value!==''||f.end!==''));
 if(!applicable.length)return data;
 const rows=data.rows.filter(row=>applicable.every(f=>{
  const raw=row[f.columns[widget.dataset_id]];
  if(raw===null||raw===undefined||String(raw).trim()==='')return false;
  if(f.kind==='category')return !f.value||String(raw)===f.value;
  if(f.kind==='date'){
   const text=String(raw);if(!/^\d{4}-\d{2}-\d{2}(?:$|T| )/.test(text))return false;
   const day=text.slice(0,10);return Number.isFinite(Date.parse(day))&&(!f.value||day>=f.value)&&(!f.end||day<=f.end);
  }
  const n=typeof raw==='boolean'?NaN:Number(raw);return Number.isFinite(n)&&(!f.value||n>=Number(f.value))&&(!f.end||n<=Number(f.end));
 }));
 return {...data,rows,total:rows.length};
}

export const dashboardPages=(d:DashboardDefinition):DashboardPage[]=>d.pages?.length?d.pages:[{id:'overview',name:'Overview'}];
export function duplicateDashboardPage(d:DashboardDefinition,id:string,newId:string,makeId:()=>string):DashboardDefinition{
 const page=dashboardPages(d).find(p=>p.id===id);if(!page)return d;
 const originals=d.widgets.filter(w=>(w.page_id||'overview')===id),ids=new Map(originals.map(w=>[w.id,makeId()]));
 return {...d,pages:[...dashboardPages(d),{id:newId,name:`${page.name} (copy)`}],widgets:[...d.widgets,...originals.map(w=>({...w,id:ids.get(w.id)!,page_id:newId}))],filters:d.filters?.map(f=>({...f,page_ids:f.page_ids?.includes(id)?[...f.page_ids,newId]:f.page_ids,widget_ids:[...f.widget_ids,...f.widget_ids.flatMap(w=>ids.has(w)?[ids.get(w)!]:[])]}))};
}
export function removeDashboardPage(d:DashboardDefinition,id:string):DashboardDefinition{
 const pages=dashboardPages(d).filter(p=>p.id!==id);if(!pages.length)return d;
 const removed=new Set(d.widgets.filter(w=>(w.page_id||'overview')===id).map(w=>w.id));
 return {...d,pages,default_page_id:d.default_page_id===id?pages[0].id:d.default_page_id,widgets:d.widgets.filter(w=>!removed.has(w.id)),filters:d.filters?.filter(f=>!(f.page_ids?.length&&f.page_ids.every(p=>p===id))&&!(f.widget_ids.length&&f.widget_ids.every(w=>removed.has(w)))).map(f=>({...f,page_ids:f.page_ids?.filter(p=>p!==id),widget_ids:f.widget_ids.filter(w=>!removed.has(w))}))};
}

export function horizontalDashboardAxes(widget:DashboardWidget,points:{name:string}[]):boolean {
 if(!['bar','line','area'].includes(widget.kind))return false;
 if(widget.axis_orientation&&widget.axis_orientation!=='auto')return widget.axis_orientation==='horizontal';
 return widget.kind==='bar'&&(points.length>8||points.some(p=>p.name.length>12));
}

/** Repair older device drafts to the API's pixel-height contract before saving. */
export function normalizeDashboardHeights(d:DashboardDefinition):DashboardDefinition {
 return {...d,widgets:d.widgets.map(w=>{const height=w.height;if(height===undefined||height===null)return w;return {...w,height:typeof height==='number'&&Number.isFinite(height)?Math.round(Math.max(w.kind==='kpi'?1:240,Math.min(1000,height))):undefined};})};
}
