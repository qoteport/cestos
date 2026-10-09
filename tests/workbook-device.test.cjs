const test=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const vm=require('node:vm');
const api={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/workbookDevice.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:api});
test('CSV preserves Unicode, quotes, commas, multiline values and empty middle rows',()=>{
 const csv=api.sheetCsv({cells:[['Name','Notes',''],['Ãƒâ€°ric','A, "quote"\nand line',''],['','',''],['End','',''],['','','']]});
 assert.equal(csv,'\ufeff"Name","Notes"\r\n"Ãƒâ€°ric","A, ""quote""\nand line"\r\n"",""\r\n"End",""');
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
  exports:storageApi, crypto:require('node:crypto').webcrypto, indexedDB:{open(){const req={};setImmediate(()=>{req.result=db;req.onupgradeneeded?.();req.onsuccess();});return req;}},Date
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

test('sync queue survives retries, rebases newer edits after acknowledgement, and keeps conflicts',async()=>{
 const scope='sync-test',first=workbook('w','First');
 await storageApi.saveDeviceWorkbook(scope,first,'server-1');
 await storageApi.queueWorkbookSync(scope,first);
 const sent=(await storageApi.listWorkbookSync(scope))[0];
 assert.equal(sent.baseVersion,'server-1');
 await storageApi.queueWorkbookSync(scope,first);
 assert.equal((await storageApi.listWorkbookSync(scope))[0].operationId,sent.operationId);
 await storageApi.queueWorkbookSync(scope,workbook('w','Edited while sending'));
 await storageApi.finishWorkbookSync(sent,'server-2');
 let next=(await storageApi.listWorkbookSync(scope))[0];
 assert.equal(next.state,'pending');assert.equal(next.baseVersion,'server-2');
 assert.equal(next.book.name,'Edited while sending');
 await storageApi.failWorkbookSync(next,'conflict','Other device edited');
 await storageApi.queueWorkbookSync(scope,workbook('w','More local edits'));
 next=(await storageApi.listWorkbookSync(scope))[0];
 assert.equal(next.state,'conflict');assert.equal(next.book.name,'More local edits');
 await storageApi.finishWorkbookSync(next,'server-3');
 assert.equal((await storageApi.listWorkbookSync(scope))[0].state,'synced');
 await storageApi.removeWorkbookSync(scope,'w');assert.equal((await storageApi.listWorkbookSync(scope)).length,0);
});
test('another browser tab cannot overwrite newer device edits; its candidate is recoverable',async()=>{
 const original=workbook('tab-book','Original');
 await storageApi.saveDeviceWorkbook('tabs',original,'remote');
 await storageApi.saveDeviceWorkbook('tabs',workbook('tab-book','First tab edit'),undefined,{id:'tab-1',baseline:original});
 await assert.rejects(storageApi.saveDeviceWorkbook('tabs',workbook('tab-book','Second tab edit'),undefined,{id:'tab-2',baseline:original}),/Another tab/);
 assert.equal((await storageApi.readDeviceWorkbook('tabs','tab-book')).book.name,'First tab edit');
 assert.equal((await storageApi.deviceRevisions('tabs','tab-book'))[0].book.name,'Second tab edit');
 await storageApi.saveDeviceWorkbook('tabs',workbook('tab-book','First tab continues'),undefined,{id:'tab-1',baseline:original});
 assert.equal((await storageApi.readDeviceWorkbook('tabs','tab-book')).book.name,'First tab continues');
});

test('frequent saves retain older quarter-hour checkpoints within the history cap',()=>{const end=Date.parse('2026-10-09T12:00:00Z');let history=[];for(let i=0;i<1000;i++)history=api.recoveryCheckpoints([{book:{id:'b',cells:[String(i)]},savedAt:new Date(end+i*60000).toISOString()},...history]);assert.ok(history.length<=60);assert.ok(history.length>40);assert.ok(Date.parse(history.at(-1).savedAt)<end+240*60000);assert.equal(history[0].book.cells[0],'999');assert.equal(history[2].book.cells[0],'997');});


test('deletion clears offline copies, recovery, sessions and pending uploads and prevents resurrection',async()=>{
 const scope='delete-test',book={id:'gone',name:'Delete me',sheets:[]};
 await storageApi.saveDeviceWorkbook(scope,book);
 await storageApi.saveDeviceWorkbook(scope,{...book,name:'Changed'});
 await storageApi.saveDeviceSession(scope,{openBooks:[{book,dirty:true}],activeId:book.id});
 await storageApi.saveDeviceLibrary(scope,[{id:'doc',tags:['wb-gone']}]);
 await storageApi.queueWorkbookSync(scope,book);
 await storageApi.deleteDeviceWorkbook(scope,book.id);
 await storageApi.saveDeviceWorkbook(scope,book);
 await storageApi.queueWorkbookSync(scope,book);
 await storageApi.saveDeviceSession(scope,{openBooks:[{book,dirty:true}],activeId:book.id});
 assert.equal((await storageApi.listDeviceWorkbooks(scope)).length,0);
 assert.equal((await storageApi.deviceRevisions(scope,book.id)).length,0);
 assert.equal((await storageApi.listWorkbookSync(scope)).length,0);
 assert.equal((await storageApi.readDeviceLibrary(scope)).length,0);
 const session=await storageApi.readDeviceSession(scope);
 assert.equal(session.openBooks.length,0);assert.equal(session.activeId,null);
});

test('keeping the server clears local edits and pending uploads while allowing future saves',async()=>{
 const scope='replace-test',local={id:'replace',name:'Local',sheets:[]},server={...local,name:'Server'};
 await storageApi.saveDeviceWorkbook(scope,local);await storageApi.queueWorkbookSync(scope,local);
 await storageApi.deleteDeviceWorkbook(scope,local.id,false,{book:server,version:'v2'});
 assert.equal((await storageApi.readDeviceWorkbook(scope,local.id)).book.name,'Server');
 assert.equal((await storageApi.listWorkbookSync(scope)).length,0);
 assert.equal(await storageApi.workbookWasDeleted(scope,local.id),undefined);
 await storageApi.saveDeviceWorkbook(scope,{...server,name:'Next edit'});
 assert.equal((await storageApi.readDeviceWorkbook(scope,local.id)).book.name,'Next edit');
});
