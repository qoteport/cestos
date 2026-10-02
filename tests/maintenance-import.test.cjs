const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const XLSX = require('xlsx');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/maintenanceImport.ts'), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, {exports:api,require,File});
const fixtures = {
 action: [['Date','Equipment / Area','Issue / Finding','Action Taken','Responsible'], ['02/10/2026','Truck','Leak, hose','Replaced','Jane']],
 pm: [['Equipment','Service Type','Due Date','PM Completed','Planned/Actual'],['Loader','Weekly','02/10/2026','No','Planned']],
 equipment: [['Equipment','Unit No.','Type','Open Defects','Action Required'],['Drill','0012','Rotary','Leak','Repair']],
 preventive: [['PREVENTIVE MAINTENANCE JOB CARD'],['PM Job Card No.','PM-001','PM Interval','250 Hours'],['Equipment','Loader','Date','02/10/2026'],['B. PM CHECKLIST & MEASUREMENTS'],['System / Component','Inspection / Service Task','Condition / Reading','Parts / Qty','Remarks'],['Engine','Check oil','Good','Filter x 1','Done'],['C. SERVICE & DEFECT CONTROL'],['PM Result','Passed'],['Defects / Recommendations'],['None']],
 assessment: [['MAINTENANCE ASSESSMENT REPORT'],['Prepared by','Jane','Report date','02/10/2026'],['1. Executive summary'],['All operational'],['2. Equipment fleet'],['Equipment','Quantity','Maintenance focus','Current approach'],['Drill','2','Hydraulics','Inspect'],['3. Maintenance assessment & corrective action'],['Area / Equipment','Observation / Failure','Action Taken / Response','Current Status'],['Drill','Leak','Hose replaced','Operational'],['Conclusion'],['Monitor monthly']],
};
for (const [kind, matrix] of Object.entries(fixtures)) {
 for (const extension of ['csv','xlsx','xls']) {
  test(`${kind}: ${extension} import extracts the correct form`, async () => {
   const sheet = XLSX.utils.aoa_to_sheet(matrix); let file;
   if (extension==='csv') file = new File([XLSX.utils.sheet_to_csv(sheet)],'data.csv');
   else {
    const book=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Unrelated'],['Do not import']]),'Cover');
    XLSX.utils.book_append_sheet(book,sheet,'Data');
    file=new File([XLSX.write(book,{type:'buffer',bookType:extension})],`data.${extension}`);
   }
   const matches=await api.readMaintenanceImport(file,kind);
   assert.equal(matches.length,1); assert.equal(matches[0].records.length,1);
   const row=matches[0].records[0];
   if(kind==='action') {assert.equal(row.issue_finding,'Leak, hose');assert.equal(row.action_date,'2026-10-02');}
   if(kind==='pm') {assert.equal(row.pm_completed,false);assert.equal(row.planned_actual,'PLANNED');}
   if(kind==='equipment') assert.equal(row.unit_number,'0012');
   if(kind==='preventive') {assert.equal(row.pm_control.equipment,'Loader');assert.equal(row.inspection_items.length,1);assert.equal(row.inspection_items[0].parts_text,'Filter x 1');assert.equal(row.service_defect_control.pm_result,'Passed');}
   if(kind==='assessment') {assert.equal(row.prepared_by_name,'Jane');assert.equal(row.equipment_fleet.length,1);assert.equal(row.maintenance_assessment.length,1);assert.equal(row.executive_summary,'All operational');assert.equal(row.conclusion,'Monitor monthly');}
   const files=api.maintenanceSourceFiles(file,matches[0]);
   assert.equal(files[0],file); // The exact uploaded File object, not a reconstruction.
   assert.equal(files.length,extension==='csv'?1:2);
   if(extension!=='csv') {
    assert.ok(files[1].name.endsWith('-Data-source.csv'));
    const csvBook=XLSX.read(await files[1].text(),{type:'string',raw:true});
    const rows=XLSX.utils.sheet_to_json(csvBook.Sheets[csvBook.SheetNames[0]],{header:1,defval:''});
    assert.equal(rows[0][0],matrix[0][0]);
   }
  });
 }
}
test('unrelated workbook has no false match for any form',async()=>{
 for(const kind of Object.keys(fixtures)) await assert.rejects(api.readMaintenanceImport(new File(['Name,Hours\nJane,8'],'file.csv'),kind),/No worksheet matches/);
});
test('invalid PM booleans do not silently become true',()=>{
 assert.throws(()=>api.extractMaintenanceSheet([['Equipment','Service Type','PM completed'],['Drill','Weekly','Maybe']],'pm'),/Yes or No/);
});
test('CSV source preserves exact bytes, quoted commas and newlines',async()=>{
 const original=new File(['"Name","Note"\r\n"A","line 1\nline 2, value"\r\n'],'source.csv');
 const [stored]=api.maintenanceSourceFiles(original,{name:'Sheet1',csv:'changed'});
 assert.equal(await stored.text(),await original.text());
});

for (const extension of ['csv', 'xlsx', 'xls']) {
 test(`equipment: ${extension} retains every equipment row`, async () => {
  const matrix = [...fixtures.equipment, ['Loader','0024','Wheel loader','Flat tyre','Replace'], ['Truck','0036','Haul truck','','Inspect']];
  const sheet = XLSX.utils.aoa_to_sheet(matrix);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Equipment');
  const file = new File([extension === 'csv' ? XLSX.utils.sheet_to_csv(sheet) : XLSX.write(book, {type:'buffer', bookType:extension})], `equipment.${extension}`);
  const matches = await api.readMaintenanceImport(file, 'equipment');
  assert.equal(matches[0].records.length, 3);
  assert.deepEqual(Array.from(matches[0].records, row => row.equipment), ['Drill','Loader','Truck']);
  assert.deepEqual(Array.from(matches[0].records, row => row.unit_number), ['0012','0024','0036']);
 });
}
