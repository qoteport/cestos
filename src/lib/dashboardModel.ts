import type {DashboardData,DashboardWidget} from './workbookDashboard';
export type ModelSeries={id:string;name:string;dataset_id:string;axis:string;measure:string;aggregation:'count'|'sum'|'average'|'min'|'max';filter_column:string;filter_value:string};
export type DashboardModel={grain:'category'|'day'|'month'|'year';missing:'gap'|'zero';series:ModelSeries[]};
export function aggregateModel(widget:DashboardWidget,dataFor:(widget:DashboardWidget)=>DashboardData|undefined){
 const model=widget.model!;
 if(!model.series.length)throw Error('Add at least one series.');
 const keys=new Set<string>(),currencies=new Set<string>(),allRows:Record<string,unknown>[]=[];
 let excluded=0,partial=false;
 const series=model.series.map((s,index)=>{
  if(!s.name.trim()||!s.axis||!s.dataset_id||s.aggregation!=='count'&&!s.measure)throw Error('Each series needs a name, dataset, axis and calculation column.');
  const data=dataFor({...widget,dataset_id:s.dataset_id});
  if(!data||data.error)throw Error(data?.error||`Waiting for ${s.name} data.`);
  partial ||= data.partial;
  for(const col of [s.axis,s.aggregation==='count'?'':s.measure,s.filter_column])if(col&&!data.columns.some(c=>c.name===col))throw Error(`${s.name}: column ${col} is unavailable.`);
  const rows=data.rows.filter(r=>!s.filter_column||String(r[s.filter_column]??'')===s.filter_value);
  allRows.push(...rows);
  const groups=new Map<string,number[]>();
  for(const row of rows){
   const raw=String(row[s.axis]??'').trim();let key=raw;
   if(model.grain!=='category'){
    const day=raw.slice(0,10);const time=Date.parse(day);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==day){excluded++;continue;}
    key=day.slice(0,model.grain==='year'?4:model.grain==='month'?7:10);
   }
   if(!key){excluded++;continue;}
   const v=row[s.measure],number=s.aggregation==='count'?1:v==null||typeof v==='boolean'||String(v).trim()===''?NaN:Number(v);
   if(!Number.isFinite(number)){excluded++;continue;}
   if(s.aggregation!=='count'&&row.currency)currencies.add(String(row.currency));
   keys.add(key);const values=groups.get(key)||[];values.push(number);groups.set(key,values);
  }
  const values=new Map([...groups].map(([key,vs])=>{const sum=vs.reduce((a,b)=>a+b,0);return [key,s.aggregation==='count'?vs.length:s.aggregation==='sum'?sum:s.aggregation==='average'?sum/vs.length:s.aggregation==='min'?vs.reduce((a,b)=>Math.min(a,b)):vs.reduce((a,b)=>Math.max(a,b))];}));
  return {key:`series_${index}`,name:s.name,values};
 });
 if(currencies.size>1)throw Error('Mixed currencies: filter every amount series to the same currency before comparing totals.');
 const ordered=[...keys].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 const points=ordered.slice(0,500).map(name=>({name,value:null as number|null,...Object.fromEntries(series.map(s=>[s.key,s.values.get(name)??(model.missing==='zero'?0:null)]))}));
 return {points,series:series.map(({key,name})=>({key,name})),rows:allRows,total:null,excluded,partial,hiddenGroups:Math.max(0,ordered.length-500)};
}
