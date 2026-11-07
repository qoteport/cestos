'use client';
import {useEffect,useMemo,useState} from 'react';
import {Area,AreaChart,Bar,BarChart,CartesianGrid,Cell,LabelList,Line,LineChart,Legend,Pie,PieChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {categoryColor,CHART_PALETTES} from '@/lib/dashboardColors';
import {visualDate,tooltipNumber} from '@/lib/dashboardDisplay';
import {aggregateModel} from '@/lib/dashboardModel';
import type {WidgetLayout,DashboardLayout} from '@/lib/dashboardLayout';
import {ArrowDown,ArrowLeft,ArrowRight,ArrowUp,Copy,Pencil,Trash2} from 'lucide-react';
import {horizontalDashboardAxes,DASHBOARD_PALETTE,WIDGET_COLORS,columnLabel,formatNumber,sortRows,widgetTitle,widgetValues,type DashboardWidget,type DashboardData} from '@/lib/workbookDashboard';

const ink='#64748b',grid='#e2e8f0';
const axisTick={fontSize:11,fill:ink};
const truncate=(text:string,max=14)=>text.length>max?text.slice(0,max-1)+'…':text;
const PIE_SLICES=6;

function ChartTooltip({active,payload,label,measure,layout,modeled}:{active?:boolean;payload?:{value?:number;name?:string;color?:string;dataKey?:string;payload?:{name:string;fill?:string}}[];label?:string;measure:string;layout:WidgetLayout;modeled:boolean}){
 if(!active||!payload?.length)return null;
 return <div className="max-w-xs rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-900">
 {layout.tooltip_title!==false&&<p className="mb-2 font-semibold text-slate-900 dark:text-white">{visualDate(payload[0].payload?.name??label,layout.date_format)}</p>}
 <div className="space-y-2">{payload.map((item,index)=><div key={item.dataKey||index} className="flex items-center gap-3"><span className="h-2 w-2 shrink-0 rounded-full" style={{backgroundColor:item.payload?.fill||item.color||'#16856b'}}/>{layout.tooltip_series!==false&&<span className="min-w-0 flex-1 break-words text-slate-600 dark:text-slate-300">{modeled?item.name:layout.tooltip_label||measure}</span>}<strong className="ml-auto whitespace-nowrap tabular-nums text-slate-900 dark:text-white">{tooltipNumber(item.value,layout.tooltip_decimals,layout.tooltip_prefix,layout.tooltip_suffix)}</strong></div>)}</div>
 </div>;
}

const iconButton='rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white';

export default function WorkbookDashboardChart({widget,data,lookup,modelDataFor,editing,published=false,preview=false,layout={},card='outlined',onEdit,onRemove,onDuplicate,onMoveEarlier,onMoveLater}:{widget:DashboardWidget;modelDataFor?:(widget:DashboardWidget)=>DashboardData|undefined;data?:DashboardData;lookup?:DashboardData;editing:boolean;published?:boolean;preview?:boolean;layout?:WidgetLayout;card?:DashboardLayout['card'];onEdit?:()=>void;onRemove?:()=>void;onDuplicate?:()=>void;onMoveEarlier?:()=>void;onMoveLater?:()=>void}){
  const [page,setPage]=useState(0),[sort,setSort]=useState<{column:string;direction:'asc'|'desc'}|null>(null);
  let result:ReturnType<typeof widgetValues>|undefined,error='';
  let modeled:ReturnType<typeof aggregateModel>|undefined;
  try{if(widget.model){if(!modelDataFor)throw Error('Series data is unavailable.');modeled=aggregateModel(widget,modelDataFor);result=modeled;}else if(data)result=widgetValues(widget,data,lookup);}catch(e){error=e instanceof Error?e.message:'Cannot render chart';}
  useEffect(()=>{setPage(p=>Math.min(p,Math.max(0,Math.ceil((result?.rows.length||0)/25)-1)));},[result?.rows.length,widget.id]);
  const chartSeries=modeled?.series||[{key:'value',name:widget.title}];
  const color=WIDGET_COLORS[widget.color]||WIDGET_COLORS.green;
  const categoryBars=widget.kind==='bar'&&!modeled&&layout.color_mode==='category';
  const categoryFill=(name:string)=>categoryColor(name,layout.palette,layout.category_colors);
  const seriesFill=(index:number)=>CHART_PALETTES[layout.palette||'classic'][index%CHART_PALETTES[layout.palette||'classic'].length];
  const points=(result?.points||[]).map(p=>({...p,...(categoryBars?{fill:categoryFill(p.name)}:{})}));
  const measureLabel=widget.aggregation==='count'?'Records':`${widget.aggregation[0].toUpperCase()+widget.aggregation.slice(1)} of ${columnLabel(widget.measure)}`;
  const description=widget.model?`${widget.model.series.length} series · ${widget.model.grain} aggregation`:widgetTitle(widget);
  // Long or many category labels read better as horizontal bars.
  const horizontal=horizontalDashboardAxes(widget,points);
  // Donut slices: colour follows the category name (stable across filters); extras fold into "Other".
  const positive=points.filter(p=>p.value!==null&&p.value>0) as {name:string;value:number}[];
  const kept=positive.slice(0,PIE_SLICES),rest=positive.slice(PIE_SLICES);
  const order=kept.map(p=>p.name).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  const slices=kept.map(p=>({...p,fill:categoryFill(p.name)}));
  if(rest.length)slices.push({name:`Other (${rest.length})`,value:rest.reduce((a,p)=>a+p.value,0),fill:'#94a3b8'});
  const sliceTotal=slices.reduce((a,p)=>a+p.value,0);
  const rows=result?.rows;
  const tableRows=useMemo(()=>rows&&sort?sortRows(rows,sort.column,sort.direction):rows||[],[rows,sort]);
  const updated=data?new Date(data.loadedAt):null;
  const xAngle=Math.max(-90,Math.min(90,layout.x_axis_angle||0));
  const xAxisStyle={angle:xAngle,textAnchor:(xAngle<0?'end':xAngle>0?'start':'middle') as 'end'|'start'|'middle',height:32+Math.ceil(Math.abs(Math.sin(xAngle*Math.PI/180))*150),tickMargin:8};
  const cartesian={top:layout.labels?18:8,right:layout.labels?16:8,bottom:0,left:-8};
  const kpiStyle=widget.kind==='kpi'?layout.kpi_style||'accent':undefined;
  const legend=layout.legend||(widget.kind==='pie'?'right':modeled||categoryBars?'bottom':'none');
  const chartLegend=legend!=='none'?<Legend layout={legend==='right'?'vertical':'horizontal'} align={legend==='right'?'right':'center'} verticalAlign={legend==='right'?'middle':'bottom'} width={legend==='right'?130:undefined} iconType="circle" wrapperStyle={{fontSize:11,maxHeight:120,overflowY:'auto'}} payload={categoryBars?points.map(p=>({value:visualDate(p.name,layout.date_format),type:'circle',color:p.fill})):undefined}/>:null;
  // Value labels on marks, compact so they stay readable on small cards.
  const valueLabels=(position:'top'|'right',dataKey='value')=>layout.labels?<LabelList dataKey={dataKey} position={position} formatter={(v:unknown)=>formatNumber(typeof v==='number'?v:null,true)} style={{fontSize:11,fill:ink}}/>:null;
  const surface=card==='flat'?'border-transparent bg-transparent dark:bg-transparent':card==='elevated'?'border-transparent bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10':editing&&!preview?'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900':'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';

  return <article style={{...(widget.height?{height:widget.height}:{}),...(kpiStyle==='tint'?{backgroundColor:`${color}14`}:{})}} className={`relative box-border flex h-full min-w-0 flex-col overflow-hidden rounded-xl border ${surface}`}>
    {/* In edit mode the actions get their own row so narrow KPI cards keep their titles. */}
    <header className={`flex gap-x-2 px-4 pb-1 pt-3 items-start`}>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white" title={widget.title}>{widget.title}</h3>
        {widget.show_details!==false&&widget.title!==description&&widget.kind!=='kpi'&&<p className="truncate text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {!preview&&<div className={`flex shrink-0 items-center ${editing?'absolute right-0 top-0 z-20 rounded bg-white/95 shadow-sm dark:bg-slate-900/95':'-mr-1'}`}>
        {editing&&onMoveEarlier&&<button type="button" title="Move earlier" aria-label={`Move ${widget.title} earlier`} className={iconButton} onClick={onMoveEarlier}><ArrowLeft size={15}/></button>}
        {editing&&onMoveLater&&<button type="button" title="Move later" aria-label={`Move ${widget.title} later`} className={iconButton} onClick={onMoveLater}><ArrowRight size={15}/></button>}
        {editing&&<>
          <button type="button" title="Edit" aria-label={`Edit ${widget.title}`} onClick={onEdit} className={iconButton}><Pencil size={15}/></button>
          <button type="button" title="Duplicate" aria-label={`Duplicate ${widget.title}`} onClick={onDuplicate} className={iconButton}><Copy size={15}/></button>
          <button type="button" title="Remove" aria-label={`Remove ${widget.title}`} onClick={onRemove} className={`${iconButton} hover:!bg-rose-50 hover:!text-rose-700 dark:hover:!bg-rose-950`}><Trash2 size={15}/></button>
        </>}
      </div>}
    </header>
    <div className={`flex min-h-0 flex-1 flex-col overflow-auto px-4 pb-3 ${published&&kpiStyle?"[scrollbar-width:none] [&::-webkit-scrollbar]:hidden":""}`}>
      {!data&&<div className="flex flex-1 flex-col justify-center gap-2 py-6" aria-label="Loading dataset"><div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800"/><div className="h-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800"/></div>}
      {(error||data?.error)&&<p role="alert" className="my-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950 dark:text-rose-200">{error||data?.error}</p>}
      {result&&!error&&<>
        {widget.kind==='kpi'?<div className="flex flex-1 items-stretch gap-3 py-3">
          {kpiStyle==='accent'&&<span aria-hidden="true" className="w-1 shrink-0 rounded-full" style={{backgroundColor:color}}/>}
          <div className="min-w-0">
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white" title={result.total===null?'':String(result.total)}>{result.total!==null&&layout.tooltip_prefix}{formatNumber(result.total,true)}{result.total!==null&&layout.tooltip_suffix}</p>
            {widget.show_details!==false&&<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{measureLabel} · {result.rows.length.toLocaleString()} matching records</p>}
          </div>
        </div>
        :widget.kind==='table'?<>
          <div className="max-h-72 overflow-auto rounded-md border border-slate-100 dark:border-slate-800">
            <table className="w-full whitespace-nowrap text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800"><tr>{data?.columns.map(c=>{const sorted=sort?.column===c.name;return <th key={c.name} aria-sort={sorted?(sort!.direction==='asc'?'ascending':'descending'):'none'} className="border-b border-slate-200 p-0 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                <button type="button" className="flex w-full items-center gap-1 px-2.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700" onClick={()=>{setPage(0);setSort(sorted?(sort!.direction==='asc'?{column:c.name,direction:'desc'}:null):{column:c.name,direction:'asc'});}}>
                  {columnLabel(c.name)}{sorted&&(sort!.direction==='asc'?<ArrowUp size={12}/>:<ArrowDown size={12}/>)}
                </button></th>;})}</tr></thead>
              <tbody>{tableRows.slice(page*25,page*25+25).map((row,i)=><tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">{data?.columns.map(c=><td key={c.name} className="max-w-64 truncate px-2.5 py-1.5 text-slate-700 dark:text-slate-200" title={String(row[c.name]??'')}>{String(row[c.name]??'')||<span className="text-slate-400">—</span>}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <button type="button" className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800" disabled={!page} onClick={()=>setPage(p=>p-1)}>Previous</button>
            <span>{result.rows.length.toLocaleString()} records · Page {page+1} of {Math.max(1,Math.ceil(result.rows.length/25))}</span>
            <button type="button" className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800" disabled={(page+1)*25>=result.rows.length} onClick={()=>setPage(p=>p+1)}>Next</button>
          </div>
        </>
        :!points.length?<p className="flex flex-1 items-center justify-center py-10 text-sm text-slate-500">No records match this visualization.</p>
        :widget.kind==='pie'?<div className={`flex flex-1 items-center justify-center gap-4 py-2 ${legend==='bottom'?'flex-col':'flex-wrap'}`}>
          <div className="h-48 w-48 max-w-full shrink-0" role="img" aria-label={`Donut chart: ${widget.title}`}><ResponsiveContainer width="100%" height="100%"><PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="92%" stroke="#fff" strokeWidth={2} isAnimationActive={false}>{slices.map(p=><Cell key={p.name} fill={p.fill}/>)}</Pie>
            <Tooltip content={<ChartTooltip measure={measureLabel} layout={layout} modeled={!!modeled}/>}/>
          </PieChart></ResponsiveContainer></div>
          {legend!=='none'&&<ul className={`space-y-1.5 text-xs ${legend==='bottom'?'w-full max-w-sm':'min-w-[11rem] flex-1'}`}>{slices.map(p=><li key={p.name} className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{backgroundColor:p.fill}}/><span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200" title={p.name}>{p.name}</span><span className="tabular-nums text-slate-900 dark:text-white">{formatNumber(p.value,true)}</span><span className="w-10 text-right tabular-nums text-slate-500">{sliceTotal?Math.round(p.value/sliceTotal*100):0}%</span></li>)}</ul>}
        </div>
        :<div className={`w-full ${horizontal?'':'h-64'}`} style={widget.height?{height:Math.max(xAxisStyle.height+100,widget.height-150),flexShrink:0}:horizontal?{height:Math.max(200,Math.min(points.length,30)*26+30)}:xAngle?{height:Math.max(256,xAxisStyle.height+100)}:undefined} role="img" aria-label={`${widget.kind} chart: ${widget.title}`}><ResponsiveContainer width="100%" height="100%">
          {widget.kind==='bar'?(horizontal
            ?<BarChart data={points} layout="vertical" margin={{top:4,right:16,bottom:4,left:4}}><CartesianGrid stroke={grid} horizontal={false}/><XAxis {...xAxisStyle} type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v=>formatNumber(v,true)}/><YAxis type="category" dataKey="name" width={120} tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v=>truncate(visualDate(v,layout.date_format),24)}/><Tooltip cursor={{fill:'rgba(148,163,184,.12)'}} content={<ChartTooltip measure={measureLabel} layout={layout} modeled={!!modeled}/>}/>{chartLegend}{chartSeries.map((series,index)=><Bar key={series.key} name={series.name} dataKey={series.key} fill={modeled?seriesFill(index):color} radius={[0,4,4,0]} maxBarSize={18} isAnimationActive={false}>{categoryBars&&points.map(p=><Cell key={p.name} fill={p.fill}/>)}{valueLabels('right',series.key)}</Bar>)}</BarChart>
            :<BarChart data={points} margin={cartesian}><CartesianGrid stroke={grid} vertical={false}/><XAxis {...xAxisStyle} dataKey="name" tick={axisTick} axisLine={{stroke:grid}} tickLine={false} interval={0} tickFormatter={v=>truncate(visualDate(v,layout.date_format),24)}/><YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v=>formatNumber(v,true)}/><Tooltip cursor={{fill:'rgba(148,163,184,.12)'}} content={<ChartTooltip measure={measureLabel} layout={layout} modeled={!!modeled}/>}/>{chartLegend}{chartSeries.map((series,index)=><Bar key={series.key} name={series.name} dataKey={series.key} fill={modeled?seriesFill(index):color} radius={[4,4,0,0]} maxBarSize={36} isAnimationActive={false}>{categoryBars&&points.map(p=><Cell key={p.name} fill={p.fill}/>)}{valueLabels('top',series.key)}</Bar>)}</BarChart>)
          :widget.kind==='area'?<AreaChart data={points} layout={horizontal?'vertical':'horizontal'} margin={cartesian}><CartesianGrid stroke={grid} vertical={horizontal} horizontal={!horizontal}/><XAxis {...xAxisStyle} type={horizontal?'number':'category'} dataKey={horizontal?undefined:'name'} tick={axisTick} axisLine={{stroke:grid}} tickLine={false} tickFormatter={v=>horizontal?formatNumber(v,true):truncate(visualDate(v,layout.date_format),24)} minTickGap={12}/><YAxis type={horizontal?'category':'number'} dataKey={horizontal?'name':undefined} width={horizontal?120:60} tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v=>horizontal?truncate(visualDate(v,layout.date_format),24):formatNumber(v,true)}/><Tooltip cursor={{stroke:ink,strokeDasharray:'3 3'}} content={<ChartTooltip measure={measureLabel} layout={layout} modeled={!!modeled}/>}/>{chartLegend}{chartSeries.map((series,index)=><Area type="monotone" key={series.key} name={series.name} dataKey={series.key} stroke={modeled?seriesFill(index):color} strokeWidth={2} fill={modeled?seriesFill(index):color} fillOpacity={0.12} activeDot={{r:4,strokeWidth:2,stroke:'#fff'}} isAnimationActive={false}>{valueLabels(horizontal?'right':'top',series.key)}</Area>)}</AreaChart>
          :<LineChart data={points} layout={horizontal?'vertical':'horizontal'} margin={cartesian}><CartesianGrid stroke={grid} vertical={horizontal} horizontal={!horizontal}/><XAxis {...xAxisStyle} type={horizontal?'number':'category'} dataKey={horizontal?undefined:'name'} tick={axisTick} axisLine={{stroke:grid}} tickLine={false} tickFormatter={v=>horizontal?formatNumber(v,true):truncate(visualDate(v,layout.date_format),24)} minTickGap={12}/><YAxis type={horizontal?'category':'number'} dataKey={horizontal?'name':undefined} width={horizontal?120:60} tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v=>horizontal?truncate(visualDate(v,layout.date_format),24):formatNumber(v,true)}/><Tooltip cursor={{stroke:ink,strokeDasharray:'3 3'}} content={<ChartTooltip measure={measureLabel} layout={layout} modeled={!!modeled}/>}/>{chartLegend}{chartSeries.map((series,index)=><Line type="monotone" key={series.key} name={series.name} dataKey={series.key} stroke={modeled?seriesFill(index):color} strokeWidth={2} dot={points.length<=20?{r:3,fill:color,strokeWidth:0}:false} activeDot={{r:5,strokeWidth:2,stroke:'#fff'}} isAnimationActive={false}>{valueLabels(horizontal?'right':'top',series.key)}</Line>)}</LineChart>}
        </ResponsiveContainer></div>}
        {!!result.excluded&&<p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{result.excluded.toLocaleString()} blank or non-numeric values excluded.</p>}
        {widget.kind==='pie'&&result.points.some(p=>p.value!==null&&p.value<=0)&&<p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Donut charts show positive values only. Use a bar chart to compare zero or negative values.</p>}
        {!!result.hiddenGroups&&<p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{result.hiddenGroups} more groups are not shown. Export to see all matching records.</p>}
      </>}
      {modeled?.partial&&<p className="text-xs text-amber-700">One or more series use a partial dataset. Totals may be incomplete.</p>}
      {data&&!preview&&<p className={`${published?"pt-1":"mt-auto pt-2"} text-[11px] ${data.partial?'text-amber-700 dark:text-amber-300':'text-slate-400 dark:text-slate-500'}`} title={updated?.toLocaleString()}>{data.partial?'Partial dataset · ':''}{data.origin?data.origin+' · ':''}Updated {updated?.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p>}
    </div>
  </article>;
}
