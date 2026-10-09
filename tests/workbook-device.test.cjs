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
const stores = new Map();
const db = {
  objectStoreNames: {contains: name => stores.has(name)},
  createObjectStore: name => stores.set(name, new Map()),
  close() {},
  transaction(names) {
    const tx = {}; let pending = 0;
    const request = operation => {
      const req = {}; pending++;
      setImmediate(() => {
        req.result = structuredClone(operation());
        req.onsuccess?.(); pending--;
        setImmediate(() => {if (!pending && tx.oncomplete) {const done=tx.oncomplete;tx.oncomplete=null;done();}});
      });
      return req;
    };
    tx.objectStore = name => ({
      get: key => request(() => stores.get(name).get(key)),
      getAll: () => request(() => [...stores.get(name).values()]),
      put: (value,key) => request(() => {stores.get(name).set(key ?? value.key,structuredClone(value));return key ?? value.key;}),
      delete: key => request(() => stores.get(name).delete(key)),
    });
    return tx;
  }
};
const storageApi={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/workbookDevice.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{
  exports:storageApi, indexedDB:{open(){const req={};setImmediate(()=>{req.result=db;req.onupgradeneeded?.();req.onsuccess();});return req;}},Date
});
const workbook = (id,name) => ({version:1,id,name,sheets:[]});
test('downloaded workbooks persist by account, refresh remotely and retain recovery history', async()=>{
  await storageApi.saveDeviceWorkbook('user-a',workbook('shared-id','Server one'),'doc-1');
  await storageApi.saveDeviceWorkbook('user-b',workbook('shared-id','Other account'),'doc-b');
  await storageApi.saveDeviceWorkbook('user-a',workbook('shared-id','Server two'),'doc-2');
  assert.equal((await storageApi.readDeviceWorkbook('user-a','shared-id')).book.name,'Server two');
  assert.equal((await storageApi.listDeviceWorkbooks('user-b'))[0].book.name,'Other account');
  assert.equal((await storageApi.deviceRevisions('user-a','shared-id'))[0].book.name,'Server one');
});
test('background refresh never overwrites local edits or local-only workbooks', async()=>{
  const first=workbook('protected','Downloaded');
  await storageApi.saveDeviceWorkbook('user-c',first,'doc-1');
  await storageApi.saveDeviceWorkbook('user-c',first);
  assert.equal((await storageApi.readDeviceWorkbook('user-c','protected')).remoteVersion,'doc-1');
  await storageApi.saveDeviceWorkbook('user-c',workbook('protected','Offline edits'));
  await storageApi.saveDeviceWorkbook('user-c',workbook('protected','New server version'),'doc-2');
  assert.equal((await storageApi.readDeviceWorkbook('user-c','protected')).book.name,'Offline edits');
  await storageApi.saveDeviceWorkbook('user-c',workbook('local','Local only'));
  await storageApi.saveDeviceWorkbook('user-c',workbook('local','Remote'),'doc-3');
  assert.equal((await storageApi.readDeviceWorkbook('user-c','local')).book.name,'Local only');
});
test('library metadata survives reload independently of open tabs and other accounts', async()=>{
  await storageApi.saveDeviceLibrary('library-a',[{id:'doc-1',title:'Unopened template'}]);
  await storageApi.saveDeviceSession('library-a',{openBooks:[],activeId:null});
  assert.equal((await storageApi.readDeviceLibrary('library-a'))[0].title,'Unopened template');
  assert.equal(await storageApi.readDeviceLibrary('library-b'),undefined);
});
