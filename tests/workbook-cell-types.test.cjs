const test=require('node:test'), assert=require('node:assert/strict'), vm=require('node:vm'),fs=require('node:fs'),ts=require('typescript');
const api={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/workbookCellTypes.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api,Date,Intl});
test('date order and separators affect display and Excel formats without changing values',()=>{
 for(const [dateOrder,parts,excel] of [['dmy',['09','10','2026'],['dd','mm','yyyy']],['mdy',['10','09','2026'],['mm','dd','yyyy']],['ymd',['2026','10','09'],['yyyy','mm','dd']]]) {
  for(const dateSeparator of ['-','/','.']) {
   const format={dataType:'date',dateOrder,dateSeparator};
   assert.equal(api.displayCellValue('2026-10-09',format),parts.join(dateSeparator));
   assert.equal(api.cellNumberFormat(format),excel.join(dateSeparator));
   assert.equal(api.typedCellValue('2026-10-09',format).toISOString(),'2026-10-09T00:00:00.000Z');
  }
 }
});
test('time and combined formats handle midnight, noon, seconds and preserve invalid data',()=>{
 const format={dataType:'time',timeClock:'12',showSeconds:true};
 assert.equal(api.displayCellValue('00:05',format),'12:05:00 AM');
 assert.equal(api.displayCellValue('12:30:45',format),'12:30:45 PM');
 assert.equal(api.displayCellValue('23:59:01',format),'11:59:01 PM');
 assert.equal(api.displayCellValue('invalid',format),'invalid');
 assert.equal(api.displayCellValue('2026-02-30',{dataType:'date',dateOrder:'dmy'}),'2026-02-30');
 const combined={...format,dataType:'datetime',dateOrder:'dmy',dateSeparator:'/'};
 assert.equal(api.displayCellValue('2026-10-09T14:30:45',combined),'09/10/2026 02:30:45 PM');
 assert.equal(api.cellNumberFormat(combined),'dd/mm/yyyy hh:mm:ss AM/PM');
 assert.equal(api.displayCellValue('14:30:45',{dataType:'time'}),'14:30');
});
