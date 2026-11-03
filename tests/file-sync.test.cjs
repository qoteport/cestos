const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const exportsObject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/fileSync.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsObject,require:()=>({}),crypto:require('node:crypto').webcrypto,Uint8Array,TextEncoder});
const {fileSyncAction,bytesHash}=exportsObject;
const cloud=hash=>({content_hash:hash});
test('three-way sync decisions never overwrite divergent versions',()=>{assert.equal(fileSyncAction('local',cloud('remote'),{baseRevision:1,baseHash:'base'}),'conflict');assert.equal(fileSyncAction('local',cloud('remote'),{baseRevision:1,baseHash:null}),'conflict');assert.equal(fileSyncAction('same',cloud('same'),{baseRevision:1,baseHash:'old'}),'ack');});
test('only one changed side transfers and cloud disappearance pauses sync',()=>{const base={baseRevision:1,baseHash:'base'};assert.equal(fileSyncAction('base',cloud('remote'),base),'download');assert.equal(fileSyncAction('local',cloud('base'),base),'upload');assert.equal(fileSyncAction('local',undefined,base),'missing');assert.equal(fileSyncAction('new',undefined,{baseRevision:0,baseHash:null}),'upload');});
test('content hashes are stable across byte buffers',async()=>{assert.equal(await bytesHash(new TextEncoder().encode('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');});
test('an account switch during source research stops linked-file uploads',async()=>{
 let account='old',writes=0;class ApiError extends Error{constructor(status,message){super(message);this.status=status;}}
 const api={ApiError,getAccessToken:()=>account,apiFetch:async(_path,options)=>{if(options.method==='PUT')writes++;account='new';return {revision:1,content_hash:'old'};}};
 const exported={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/fileSync.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exported,require:name=>name==='./api'?api:name==='./offlineAuth'?{tokenScope:t=>'org:'+t}:name==='./workbookDevice'?{readLinkedFileHead:async()=>undefined}:{},crypto:require('node:crypto').webcrypto,Uint8Array,TextEncoder,AbortController,setTimeout,clearTimeout});
 await assert.rejects(exported.syncLinkedWorkbook({sheets:[],fileLink:{cloud_id:'file',file_name:'file.csv',base_revision:1}},'old'),/account changed/);assert.equal(writes,0);
});
