const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/workbookShortcuts.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api});
const key = (value, extra={}) => ({key:value,ctrlKey:false,metaKey:false,shiftKey:false,altKey:false,...extra});
test('undo, redo and save support Windows and Mac modifiers', () => {
  for (const modifier of ['ctrlKey','metaKey']) {
    assert.equal(api.workbookShortcut(key('z',{[modifier]:true}),false,false),'undo');
    assert.equal(api.workbookShortcut(key('Z',{[modifier]:true,shiftKey:true}),false,false),'redo');
    assert.equal(api.workbookShortcut(key('y',{[modifier]:true}),false,false),'redo');
    assert.equal(api.workbookShortcut(key('s',{[modifier]:true}),false,false),'save');
  }
});
test('formatting, filling and selection shortcuts require grid focus', () => {
  for (const [k,action] of Object.entries({b:'bold',i:'italic',u:'underline',d:'down',r:'right',a:'all',Home:'home',' ':'column'})) {
    assert.equal(api.workbookShortcut(key(k,{ctrlKey:true}),true,false),action);
    assert.equal(api.workbookShortcut(key(k,{ctrlKey:true}),false,false),null);
  }
  assert.equal(api.workbookShortcut(key(' ',{shiftKey:true}),true,false),'row');
});
test('normal typing, deletion and alternate browser commands remain native', () => {
  assert.equal(api.workbookShortcut(key('b'),true,false),null);
  assert.equal(api.workbookShortcut(key('Backspace'),true,false),null);
  assert.equal(api.workbookShortcut(key('Delete'),true,true),'clear');
  assert.equal(api.workbookShortcut(key('Backspace'),true,true),'clear');
  assert.equal(api.workbookShortcut(key('Delete'),false,true),null);
  assert.equal(api.workbookShortcut(key('r',{ctrlKey:true,shiftKey:true}),true,true),null);
  assert.equal(api.workbookShortcut(key('d',{ctrlKey:true,altKey:true}),true,true),null);
});
