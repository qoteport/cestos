const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(name){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,structuredClone,require:n=>load(n.replace('./',''))});return exports;}
const api=load('workbookDashboard');
test('related names preserve ID groups and do not multiply totals',()=>{
 const w=widget({label_lookup:{dataset_id:'vendors',key:'id',label:'name'}});
 const source=data([{project:'a',amount:10},{project:'b',amount:20},{project:'c',amount:5}]);
 const lookup=data([{id:'a',name:'Vendor'},{id:'b',name:'Vendor'}]);
 const result=api.widgetValues(w,source,lookup);
 assert.equal(result.total,35);
 assert.deepEqual(Array.from(result.points,p=>[p.name,p.value]),[['Vendor (b)',20],['Vendor (a)',10],['c',5]]);
 assert.equal(source.rows[0].project,'a');
});
test('ambiguous or unavailable relationships fall back to original IDs',()=>{
 const w=widget({label_lookup:{dataset_id:'vendors',key:'id',label:'name'}}),source=data([{project:'a',amount:10}]);
 const lookup=data([{id:'a',name:'One'},{id:'a',name:'Two'}]);
 assert.equal(api.widgetValues(w,source,lookup).points[0].name,'a');
 assert.equal(api.widgetValues(w,source,{...lookup,error:'Forbidden'}).points[0].name,'a');
 assert.equal(api.widgetValues(w,source).points[0].name,'a');
});
const widget=changes=>({id:'w',title:'Cost',dataset_id:'d',kind:'bar',group_by:'project',measure:'amount',aggregation:'sum',filter_column:'',filter_value:'',color:'blue',width:'half',...changes});
const data=rows=>({rows,columns:[{name:'project'},{name:'amount'},{name:'currency'}],partial:false,total:rows.length,loadedAt:'2026-01-01'});
test('grouped sums, averages and numeric exclusions are correct',()=>{const d=data([{project:'A',amount:'0.1'},{project:'A',amount:'0.2'},{project:'B',amount:''},{project:'B',amount:false}]);let r=api.widgetValues(widget(),d);assert.equal(r.points.find(p=>p.name==='A').value,0.3);assert.equal(r.points.find(p=>p.name==='B').value,null);assert.equal(r.excluded,2);assert.equal(api.widgetValues(widget({aggregation:'average'}),d).total,0.15);});
test('filters apply before counts and totals and removed columns fail explicitly',()=>{const d=data([{project:'Solway',amount:10},{project:'Bomi',amount:20}]);assert.equal(api.widgetValues(widget({filter_column:'project',filter_value:'sol'}),d).total,10);assert.equal(api.widgetValues(widget({aggregation:'count'}),d).total,2);assert.throws(()=>api.widgetValues(widget({measure:'gone'}),d),/no longer available/);});
test('different currencies are not silently added',()=>{const d=data([{project:'A',amount:10,currency:'USD'},{project:'A',amount:20,currency:'GHS'}]);assert.throws(()=>api.widgetValues(widget(),d),/Mixed currencies/);assert.equal(api.widgetValues(widget({group_by:'currency'}),d).points.length,2);});
test('worksheet headers are unique, formulas calculated, partial status retained',()=>{const d=api.worksheetData({id:'s',name:'S',cells:[['Name','Name'],['Alpha','=1+2']],widths:[100,100],heights:[25,25],merges:[],previewLimited:true},0);assert.deepEqual(Array.from(d.columns,c=>c.name),['Name','Name [2]']);assert.equal(d.rows[0]['Name [2]'],'3');assert.equal(d.partial,true);});
test('chart group caps do not truncate the dataset or KPI total',()=>{const d=data(Array.from({length:40},(_,i)=>({project:String(i),amount:1})));const r=api.widgetValues(widget(),d);assert.equal(r.points.length,30);assert.equal(r.hiddenGroups,10);assert.equal(r.total,40);assert.equal(r.rows.length,40);});
test('CSV exports escape values and neutralize spreadsheet formula injection',()=>{const csv=api.dashboardCsv([{name:'=WEBSERVICE("secret")',amount:-12}],['name','amount']);assert.ok(csv.includes("'=WEBSERVICE"));assert.ok(csv.includes('"-12"'));assert.ok(csv.includes('""secret""'));});
test('dataset cache keys change for header and sheet selections',()=>{const d={kind:'workbook',source:'b',sheet_id:'s',header_row:0};assert.notEqual(api.datasetKey(d),api.datasetKey({...d,header_row:1}));assert.notEqual(api.datasetKey(d),api.datasetKey({...d,sheet_id:'other'}));});
test('numeric columns and suggested visualizations come from the data',()=>{const d={rows:[{site:'A',cost:'10',ref:'x1'},{site:'B',cost:'5.5',ref:'x2'},{site:'A',cost:'',ref:'x3'}],columns:[{name:'site'},{name:'cost'},{name:'ref'}],partial:false,total:3,loadedAt:''};assert.deepEqual(Array.from(api.numericColumns(d)),['cost']);const w=api.suggestWidget(widget({group_by:'',measure:'',aggregation:'count',title:'New'}),d);assert.equal(w.group_by,'site');assert.equal(w.measure,'cost');assert.equal(w.aggregation,'sum');assert.equal(w.title,'Sum of cost by site');assert.equal(api.widgetTitle({aggregation:'count',measure:'',group_by:''}),'Record count');});
test('search filters rows across columns without changing columns',()=>{const d=data([{project:'Solway',amount:1},{project:'Bomi',amount:2}]);const r=api.searchData(d,'bom');assert.equal(r.rows.length,1);assert.equal(r.total,1);assert.equal(api.searchData(d,'  ').rows.length,2);});
test('table sorting is numeric-aware and keeps blanks last',()=>{const rows=[{v:'10'},{v:''},{v:'9'},{v:'100'}];assert.deepEqual(Array.from(api.sortRows(rows,'v','asc'),r=>r.v),['9','10','100','']);assert.deepEqual(Array.from(api.sortRows(rows,'v','desc'),r=>r.v),['100','10','9','']);assert.equal(api.formatNumber(null),'—');});

test('dashboard filters combine categories and inclusive date ranges across mapped datasets',()=>{
 const source=data([{project:'A',day:'2026-11-03T23:59:00Z',amount:10},{project:'A',day:'2026-11-04',amount:20},{project:'B',day:'2026-11-03',amount:30}]);
 const filters=[{id:'f',name:'Project',kind:'category',columns:{d:'project',other:'project_name'},widget_ids:[],value:'A',end:''},{id:'date',name:'Date',kind:'date',columns:{d:'day'},widget_ids:[],value:'2026-11-03',end:'2026-11-03'}];
 const result=api.filterDashboardData(source,widget(),filters);
 assert.equal(result.rows.length,1);assert.equal(result.rows[0].amount,10);assert.equal(source.rows.length,3);
 assert.equal(api.filterDashboardData(source,widget({dataset_id:'unlinked'}),filters).rows.length,3);
 assert.equal(api.filterDashboardData(data([{project_name:'A'},{project_name:'B'}]),widget({dataset_id:'other'}),filters).rows.length,1);
});
test('numeric filters preserve zero, exclude blanks and respect selected visuals',()=>{
 const source=data([{amount:0},{amount:5},{amount:''},{amount:null},{amount:'bad'}]);
 const filters=[{id:'f',name:'Amount',kind:'number',columns:{d:'amount'},widget_ids:['w'],value:'0',end:'4'}];
 assert.equal(api.filterDashboardData(source,widget(),filters).rows.length,1);
 assert.equal(api.filterDashboardData(source,widget({id:'other'}),filters).rows.length,5);
 assert.equal(api.filterDashboardData(source,widget(),[{...filters[0],value:'',end:''}]).rows.length,5);
});

test('tab duplication retains connections and remaps visual filter scope',()=>{const d={datasets:[{id:'d'}],widgets:[widget({page_id:'overview',label_lookup:{dataset_id:'related',key:'id',label:'name'}})],filters:[{id:'f',page_ids:['overview'],widget_ids:['w']}],refresh_seconds:60};const copy=api.duplicateDashboardPage(d,'overview','new',()=>'copy');assert.equal(copy.widgets[1].id,'copy');assert.equal(copy.widgets[1].dataset_id,'d');assert.equal(copy.widgets[1].label_lookup.dataset_id,'related');assert.ok(copy.filters[0].widget_ids.includes('copy'));assert.equal(d.widgets.length,1);const removed=api.removeDashboardPage(copy,'new');assert.equal(removed.widgets.length,1);assert.ok(!removed.filters[0].widget_ids.includes('copy'));});
test('tab filters do not affect other tabs',()=>{const rows=data([{project:'A'},{project:'B'}]);const f={id:'f',page_ids:['other'],widget_ids:[],columns:{d:'project'},kind:'category',value:'A',end:''};assert.equal(api.filterDashboardData(rows,widget(),[f]).rows.length,2);assert.equal(api.filterDashboardData(rows,widget({page_id:'other'}),[f]).rows.length,1);});

test('explicit axes override automatic layout for all Cartesian charts',()=>{for(const kind of ['bar','line','area']){assert.equal(api.horizontalDashboardAxes(widget({kind,axis_orientation:'horizontal'}),[{name:'A'}]),true);assert.equal(api.horizontalDashboardAxes(widget({kind,axis_orientation:'vertical'}),[{name:'Long category label'}]),false);}assert.equal(api.horizontalDashboardAxes(widget(),[{name:'Long category label'}]),true);assert.equal(api.horizontalDashboardAxes(widget({kind:'pie',axis_orientation:'horizontal'}),[]),false);});

test('legacy heights are normalized without mutating the device draft',()=>{const d={widgets:[widget({height:140}),widget({height:320.7}),widget({height:1200}),widget()],datasets:[],refresh_seconds:60};const result=api.normalizeDashboardHeights(d);assert.deepEqual(Array.from(result.widgets,w=>w.height),[240,321,1000,undefined]);assert.equal(d.widgets[0].height,140);});

test("small KPI heights survive saving",()=>{const d={widgets:[widget({kind:"kpi",height:1}),widget({kind:"kpi",height:90})]};assert.deepEqual(Array.from(api.normalizeDashboardHeights(d).widgets,w=>w.height),[1,90]);});
