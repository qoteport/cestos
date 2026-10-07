const test=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const vm=require('node:vm');
const api={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/workbookDevice.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:api});
test('CSV preserves Unicode, quotes, commas, multiline values and empty middle rows',()=>{
 const csv=api.sheetCsv({cells:[['Name','Notes',''],['Éric','A, "quote"\nand line',''],['','',''],['End','',''],['','','']]});
 assert.equal(csv,'\ufeff"Name","Notes"\r\n"Éric","A, ""quote""\nand line"\r\n"",""\r\n"End",""');
});
test('CSV neutralizes formula-like text while preserving negative numbers',()=>{
 assert.equal(api.sheetCsv({cells:[['=1+1','+CMD','@SUM(A1)','-hello','-12.50']]}),'\ufeff"\'=1+1","\'+CMD","\'@SUM(A1)","\'-hello","-12.50"');
});
test('CSV refuses incomplete sheet exports',()=>{
 assert.throws(()=>api.sheetCsv({previewLimited:true,cells:[['partial']]}),/partially loaded/);
});
