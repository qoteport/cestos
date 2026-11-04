import {DATE_FORMATS,type VisualDateFormat} from './dashboardDisplay';
import type {DashboardDefinition,DashboardWidget} from './workbookDashboard';

// Optional design settings kept in `definition.layout`. Dashboards saved before layouts
// existed, or by older clients, have none and render with the defaults below. Widget height
// stays on the widget (`widget.height`); everything else lives here so the server sees one field.
export type WidgetLayout={
 date_format?:VisualDateFormat;
 tooltip_title?:boolean;
 tooltip_series?:boolean;
 tooltip_label?:string;
 tooltip_decimals?:number;
 tooltip_prefix?:string;
 tooltip_suffix?:string;
 span?:number;                                   // twelfths of the row, 1–12; KPI cards default to metrics_per_row
 legend?:'right'|'bottom'|'none';                // donut charts
 labels?:boolean;                                // value labels on bar, line and area marks
 kpi_style?:'accent'|'tint'|'plain';
};
export type TextBlock={id:string;page_id:string;title:string;body:string;span:number;align:'left'|'center'};
export type DashboardLayout={
 version:1;
 compatibility_heights?:Record<string,number>; // Device-only sizes for older servers.
 metrics_per_row:2|3|4|5|6;
 gap:'compact'|'comfortable'|'spacious';
 card:'outlined'|'elevated'|'flat';
 filter_position:'top'|'left'|'collapsed';
 widgets:Record<string,WidgetLayout>;
 blocks:TextBlock[];
 order:string[];                                  // widget and text block ids, across all pages
};
export type LayoutItem={type:'widget';id:string;widget:DashboardWidget}|{type:'block';id:string;block:TextBlock};

export const WIDTH_PRESETS=[{span:3,label:'¼'},{span:4,label:'⅓'},{span:6,label:'½'},{span:8,label:'⅔'},{span:9,label:'¾'},{span:12,label:'Full'}];
export const HEIGHT_PRESETS:{label:string;value?:number}[]=[{label:'Auto'},{label:'S',value:240},{label:'M',value:320},{label:'L',value:420},{label:'XL',value:540}];
export const GAP_PX={compact:8,comfortable:16,spacious:24} as const;
export const GRID_COLUMNS=60; // divisible by 2–6 and 12, so every preset lands on whole columns
export const MAX_TEXT_BLOCKS=24;

const clampSpan=(value:unknown,fallback=6)=>{const n=Number(value);return Number.isFinite(n)&&value!==null&&value!==''?Math.min(12,Math.max(0.2,Math.round(n*5)/5)):fallback;};
const pick=<T extends string|number>(value:unknown,allowed:readonly T[],fallback:T)=>allowed.includes(value as T)?value as T:fallback;

export function defaultLayout():DashboardLayout{
 return {version:1,metrics_per_row:4,gap:'comfortable',card:'outlined',filter_position:'top',widgets:{},blocks:[],order:[]};
}

/** Fills defaults, drops settings for removed widgets and keeps every widget and block in the order exactly once. */
export function normalizeLayout(definition:Pick<DashboardDefinition,'widgets'>&{layout?:Partial<DashboardLayout>}):DashboardLayout{
 const raw=definition.layout||{},base=defaultLayout();
 const blocks=(Array.isArray(raw.blocks)?raw.blocks:[]).filter(b=>b&&typeof b.id==='string').slice(0,MAX_TEXT_BLOCKS).map(b=>({id:b.id,page_id:String(b.page_id||'overview'),title:String(b.title||'').slice(0,200),body:String(b.body||'').slice(0,1000),span:Math.max(1,Math.round(clampSpan(b.span,12))),align:pick(b.align,['left','center'] as const,'left')}));
 const ids=[...definition.widgets.map(w=>w.id),...blocks.map(b=>b.id)],known=new Set(ids);
 const order=[...new Set((Array.isArray(raw.order)?raw.order:[]).filter(id=>known.has(id)))];
 for(const id of ids)if(!order.includes(id))order.push(id);
 const widgets:Record<string,WidgetLayout>={};
 for(const w of definition.widgets){const v=raw.widgets?.[w.id];if(!v)continue;widgets[w.id]={
  ...(v.date_format?{date_format:pick(v.date_format,DATE_FORMATS.map(f=>f[0]),'auto')}:{}),
  ...(v.tooltip_title!=null?{tooltip_title:!!v.tooltip_title}:{}),
  ...(v.tooltip_series!=null?{tooltip_series:!!v.tooltip_series}:{}),
  ...(v.tooltip_label!=null?{tooltip_label:String(v.tooltip_label).slice(0,100)}:{}),
  ...(v.tooltip_decimals!=null&&Number.isFinite(v.tooltip_decimals)?{tooltip_decimals:Math.max(0,Math.min(6,Math.round(v.tooltip_decimals)))}:{}),
  ...(v.tooltip_prefix!=null?{tooltip_prefix:String(v.tooltip_prefix).slice(0,30)}:{}),
  ...(v.tooltip_suffix!=null?{tooltip_suffix:String(v.tooltip_suffix).slice(0,30)}:{}),
  ...(v.span!=null?{span:clampSpan(v.span)}:{}),
  ...(v.legend?{legend:pick(v.legend,['right','bottom','none'] as const,'right')}:{}),
  ...(v.labels!=null?{labels:!!v.labels}:{}),
  ...(v.kpi_style?{kpi_style:pick(v.kpi_style,['accent','tint','plain'] as const,'accent')}:{}),
 };}
 return {...base,
  metrics_per_row:pick(raw.metrics_per_row,[2,3,4,5,6] as const,base.metrics_per_row),
  gap:pick(raw.gap,['compact','comfortable','spacious'] as const,base.gap),
  card:pick(raw.card,['outlined','elevated','flat'] as const,base.card),
  filter_position:pick(raw.filter_position,['top','left','collapsed'] as const,base.filter_position),
  widgets,blocks,order};
}

/** Widgets and text blocks on one page, in layout order. */
export function pageItems(definition:Pick<DashboardDefinition,'widgets'>,layout:DashboardLayout,pageId:string):LayoutItem[]{
 const widgets=new Map(definition.widgets.map(w=>[w.id,w])),blocks=new Map(layout.blocks.map(b=>[b.id,b]));
 return layout.order.flatMap<LayoutItem>(id=>{
  const widget=widgets.get(id);if(widget)return (widget.page_id||'overview')===pageId?[{type:'widget',id,widget}]:[];
  const block=blocks.get(id);return block&&block.page_id===pageId?[{type:'block',id,block}]:[];
 });
}

/** Width in 60ths of the row. KPI cards without an explicit width follow metrics per row. */
export function widgetColumns(widget:Pick<DashboardWidget,'id'|'kind'|'width'>,layout:DashboardLayout){
 const span=layout.widgets[widget.id]?.span;
 if(span!==undefined)return span*5;
 if(widget.width==='full')return GRID_COLUMNS;
 return widget.kind==='kpi'?GRID_COLUMNS/layout.metrics_per_row:GRID_COLUMNS/2;
}
/** The width preset currently in effect, in twelfths. */
export const widgetSpan=(widget:Pick<DashboardWidget,'id'|'kind'|'width'>,layout:DashboardLayout)=>widgetColumns(widget,layout)/5;
/** Minimum readable card widths in pixels; cards only widen when they would be narrower. */
export const MIN_CARD_PX={kpi:170,chart:280,block:0} as const;
const WHOLE_FRACTIONS=[10,12,15,20,30,60]; // ⅙ ⅕ ¼ ⅓ ½ full of the 60-column grid
/** Widens a card to the smallest whole fraction of the row that keeps it at least `minPx` wide. */
export function responsiveColumns(columns:number,containerWidth:number,minPx:number=MIN_CARD_PX.chart){
 if(containerWidth<=0||columns/GRID_COLUMNS*containerWidth>=minPx)return columns;
 const needed=minPx/containerWidth*GRID_COLUMNS;
 return WHOLE_FRACTIONS.find(n=>n>=needed&&n>=columns)??GRID_COLUMNS;
}
export const minCardPx=(kind:DashboardWidget['kind']|'block')=>kind==='block'?MIN_CARD_PX.block:kind==='kpi'?MIN_CARD_PX.kpi:MIN_CARD_PX.chart;
/** Grid container style. A CSS column gap would repeat between all 60 columns (59 × gap) and
 *  overflow narrow grids, so horizontal spacing comes from cell margins instead. */
export const gridStyle=(gap:DashboardLayout['gap'])=>({gridTemplateColumns:`repeat(${GRID_COLUMNS},minmax(0,1fr))`,columnGap:0,rowGap:GAP_PX[gap],marginInline:-GAP_PX[gap]/2});
export const cellStyle=(columns:number,gap:DashboardLayout['gap'])=>({gridColumn:`span ${Math.round(columns)} / span ${Math.round(columns)}`,marginInline:GAP_PX[gap]/2});
/** Keeps the legacy half/full width in step so older clients still lay out sensibly. */
export const legacyWidth=(span:number):DashboardWidget['width']=>span>=12?'full':'half';
/** Nearest preset span for a dragged width, as a fraction of the grid. */
export function snapSpan(fraction:number){
 const target=Math.min(1,Math.max(0,fraction))*12;
 return WIDTH_PRESETS.reduce((best,p)=>Math.abs(p.span-target)<Math.abs(best-target)?p.span:best,WIDTH_PRESETS[0].span);
}

export function moveInOrder(order:string[],id:string,beforeId:string|null){
 const next=order.filter(x=>x!==id);
 const index=beforeId?next.indexOf(beforeId):-1;
 next.splice(index<0?next.length:index,0,id);
 return next;
}
/** Moves an item and keeps `definition.widgets` in the same relative order for older clients. */
export function reorderDefinition<T extends Pick<DashboardDefinition,'widgets'>&{layout?:Partial<DashboardLayout>}>(definition:T,id:string,beforeId:string|null):T{
 const layout=normalizeLayout(definition),order=moveInOrder(layout.order,id,beforeId),rank=new Map(order.map((x,i)=>[x,i]));
 const widgets=[...definition.widgets].sort((a,b)=>(rank.get(a.id)??0)-(rank.get(b.id)??0));
 return {...definition,widgets,layout:{...layout,order}};
}
/** Moves an item one place earlier or later among the items of its own page. */
export function stepInPage<T extends Pick<DashboardDefinition,'widgets'>&{layout?:Partial<DashboardLayout>}>(definition:T,pageId:string,id:string,offset:-1|1):T{
 const items=pageItems(definition,normalizeLayout(definition),pageId).map(i=>i.id),index=items.indexOf(id),target=index+offset;
 if(index<0||target<0||target>=items.length)return definition;
 return reorderDefinition(definition,id,offset<0?items[target]:items[target+1]??null);
}
/** Updates one widget's layout settings, keeping the legacy width in step. */
export function setWidgetLayout<T extends Pick<DashboardDefinition,'widgets'>&{layout?:Partial<DashboardLayout>}>(definition:T,id:string,patch:WidgetLayout):T{
 const layout=normalizeLayout(definition),current={...layout.widgets[id],...patch};
 const widgets=patch.span!==undefined?definition.widgets.map(w=>w.id===id?{...w,width:legacyWidth(patch.span!)}:w):definition.widgets;
 return {...definition,widgets,layout:{...layout,widgets:{...layout.widgets,[id]:current}}};
}
/** Removes the optional layout, for servers that do not accept it yet. */
export function withoutLayout<T extends {layout?:unknown}>(definition:T):Omit<T,'layout'>{const {layout:_,...rest}=definition;return rest;}

/** Use the same responsive sizing in the designer and published viewer. Explicit desktop
 * spans are authoritative; phones may widen cards to keep content readable. */
export function visualColumns(widget:DashboardWidget,layout:DashboardLayout,containerWidth:number){
 const columns=widgetColumns(widget,layout);
 if(layout.widgets[widget.id]?.span!=null&&containerWidth>=640)return columns;
 return responsiveColumns(columns,containerWidth,minCardPx(widget.kind));
}
