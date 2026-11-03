import type {DashboardData,DashboardDefinition,DashboardWidget} from './workbookDashboard';

// Optional design settings stored beside a dashboard definition. Dashboards saved before
// layouts existed (or by older clients) have none and render with the defaults below.
export type WidgetHeight='auto'|'sm'|'md'|'lg'|'xl';
export type WidgetLayout={
 span?:number;                                   // twelfths of the row, 1–12; KPI cards default to metrics_per_row
 height?:WidgetHeight;
 orientation?:'auto'|'vertical'|'horizontal';    // bar charts
 legend?:'right'|'bottom'|'none';                // donut charts
 labels?:boolean;                                // value labels on bar/line/area marks
 kpi_style?:'accent'|'tint'|'plain';
};
export type DashboardFilter={id:string;column:string;label:string};
export type TextBlock={id:string;title:string;body:string;span:number;align:'left'|'center'};
export type DashboardLayout={
 version:1;
 metrics_per_row:2|3|4|5|6;
 gap:'compact'|'comfortable'|'spacious';
 card:'outlined'|'elevated'|'flat';
 filter_position:'top'|'left'|'hidden';
 filters:DashboardFilter[];
 widgets:Record<string,WidgetLayout>;
 blocks:TextBlock[];
 order:string[];                                  // widget and text block ids
};

export const WIDTH_PRESETS=[{span:3,label:'¼'},{span:4,label:'⅓'},{span:6,label:'½'},{span:8,label:'⅔'},{span:9,label:'¾'},{span:12,label:'Full'}];
export const HEIGHT_PX:Record<Exclude<WidgetHeight,'auto'>,number>={sm:180,md:300,lg:400,xl:520};
export const GAP_PX={compact:8,comfortable:16,spacious:24} as const;
export const GRID_COLUMNS=60; // divisible by 2–6 and 12, so every preset lands on whole columns

const clampSpan=(value:unknown,fallback=6)=>{const n=Number(value);return Number.isFinite(n)&&value!==null&&value!==''?Math.min(12,Math.max(1,Math.round(n))):fallback;};
const pick=<T extends string|number>(value:unknown,allowed:readonly T[],fallback:T)=>allowed.includes(value as T)?value as T:fallback;

export function defaultLayout():DashboardLayout{
 return {version:1,metrics_per_row:4,gap:'comfortable',card:'outlined',filter_position:'top',filters:[],widgets:{},blocks:[],order:[]};
}

/** Fills defaults, drops settings for removed widgets and keeps every widget/block in the order exactly once. */
export function normalizeLayout(definition:Pick<DashboardDefinition,'widgets'>&{layout?:Partial<DashboardLayout>}):DashboardLayout{
 const raw=definition.layout||{},base=defaultLayout();
 const blocks=(Array.isArray(raw.blocks)?raw.blocks:[]).filter(b=>b&&typeof b.id==='string').map(b=>({id:b.id,title:String(b.title||''),body:String(b.body||''),span:clampSpan(b.span,12),align:pick(b.align,['left','center'] as const,'left')}));
 const ids=new Set([...definition.widgets.map(w=>w.id),...blocks.map(b=>b.id)]);
 const order=[...new Set((Array.isArray(raw.order)?raw.order:[]).filter(id=>ids.has(id)))];
 for(const id of ids)if(!order.includes(id))order.push(id);
 const widgets:Record<string,WidgetLayout>={};
 for(const w of definition.widgets){const v=raw.widgets?.[w.id];if(!v)continue;widgets[w.id]={...v,...(v.span!==undefined?{span:clampSpan(v.span)}:{})};}
 const filters=(Array.isArray(raw.filters)?raw.filters:[]).filter(f=>f&&f.id&&f.column).map(f=>({id:f.id,column:String(f.column),label:String(f.label||f.column)}));
 return {...base,
  metrics_per_row:pick(raw.metrics_per_row,[2,3,4,5,6] as const,base.metrics_per_row),
  gap:pick(raw.gap,['compact','comfortable','spacious'] as const,base.gap),
  card:pick(raw.card,['outlined','elevated','flat'] as const,base.card),
  filter_position:pick(raw.filter_position,['top','left','hidden'] as const,base.filter_position),
  filters,widgets,blocks,order};
}

/** Width in 60ths of the row. KPI cards without an explicit width follow metrics per row. */
export function widgetColumns(widget:Pick<DashboardWidget,'id'|'kind'|'width'>,layout:DashboardLayout){
 const span=layout.widgets[widget.id]?.span;
 if(span!==undefined)return span*5;
 if(widget.width==='full')return GRID_COLUMNS;
 return widget.kind==='kpi'?GRID_COLUMNS/layout.metrics_per_row:GRID_COLUMNS/2;
}
/** Narrow containers widen cards so nothing gets unreadably thin. */
export function responsiveColumns(columns:number,containerWidth:number){
 if(containerWidth<640)return GRID_COLUMNS;
 if(containerWidth<1024)return Math.min(GRID_COLUMNS,columns*2);
 return columns;
}
/** Keeps the legacy half/full width in step so older clients still lay out sensibly. */
export const legacyWidth=(span:number):DashboardWidget['width']=>span>=12?'full':'half';

export function moveInOrder(order:string[],id:string,beforeId:string|null){
 const next=order.filter(x=>x!==id);
 const index=beforeId?next.indexOf(beforeId):-1;
 next.splice(index<0?next.length:index,0,id);
 return next;
}

/** Distinct values of a column across datasets, for filter dropdowns. */
export function filterValues(datasets:(DashboardData|undefined)[],column:string,limit=500){
 const values=new Set<string>();
 for(const data of datasets){if(!data?.columns.some(c=>c.name===column))continue;for(const row of data.rows){const v=String(row[column]??'').trim();if(v)values.add(v);if(values.size>=limit)break;}}
 return [...values].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
}
/** Applies dashboard filter selections to one dataset. Filters on columns the dataset lacks are skipped. */
export function applyDashboardFilters(data:DashboardData,filters:DashboardFilter[],selected:Record<string,string>):DashboardData{
 const active=filters.filter(f=>selected[f.id]&&data.columns.some(c=>c.name===f.column));
 if(!active.length)return data;
 const rows=data.rows.filter(row=>active.every(f=>String(row[f.column]??'').trim()===selected[f.id]));
 return {...data,rows,total:rows.length};
}
/** Columns available for dashboard filters: every column in any connected dataset. */
export function filterableColumns(datasets:(DashboardData|undefined)[]){
 return [...new Set(datasets.flatMap(d=>d?.columns.map(c=>c.name)||[]))];
}
