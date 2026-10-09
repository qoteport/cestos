const test=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm');
const api={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/workbookFormulaSuggestions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:api});
test('equals suggests supported functions and prefixes ignore case',()=>{
 assert.equal(api.formulaCompletion('=',1).items.length,7);
 assert.equal(api.formulaCompletion('=su',3).items[0].name,'SUM');
 assert.equal(api.formulaCompletion('=xyz',4),null);
});
test('plain text and cell references do not suggest functions',()=>{
 for(const value of ['SUM','=A2','=SUM(A2:A10)','=A2:'])assert.equal(api.formulaCompletion(value,value.length),null);
});
test('completion preserves formula context and existing parentheses',()=>{
 let next=api.insertFormulaFunction('=su',3,'SUM');assert.equal(next.value,'=SUM(');assert.equal(next.caret,5);
 next=api.insertFormulaFunction('=SUM(A2)+av',11,'AVERAGE');assert.equal(next.value,'=SUM(A2)+AVERAGE(');
 next=api.insertFormulaFunction('=su(A2:A10)',3,'SUM');assert.equal(next.value,'=SUM(A2:A10)');assert.equal(next.caret,5);
});
