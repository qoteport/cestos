const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function setup({fail,status=0,changeAccount=false,offline=false}={}) {
 let identity='org:user';const calls=[],done=[],failed=[];
 class ApiError extends Error {constructor(status,message){super(message);this.status=status;}}
 const entries=[{scope:'cestos-field-workbook:user',book:{id:'book'},operationId:'op',baseVersion:'base',state:'pending'}];
 const api={};
 const deps={
 './api':{ApiError,getAccessToken:()=>identity,apiFetch:async(path,options)=>{calls.push({path,options});if(path.endsWith('/me')){if(changeAccount)identity='org:other';return {id:'user'};}if(fail)throw new ApiError(status,'Failed');return {version:'new'};}},
 './offlineAuth':{offlineAccessActive:()=>offline,tokenScope:token=>token},
 './workbookDevice':{listWorkbookSync:async()=>entries,finishWorkbookSync:async(...args)=>done.push(args),failWorkbookSync:async(...args)=>failed.push(args),workbookWasDeleted:async()=>false}
 };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/workbookSync.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:api,require:name=>deps[name],navigator:{onLine:true}});
 return {api,calls,done,failed};
}
test('sync verifies identity then sends version and stable operation ID',async()=>{const x=setup();await x.api.syncWorkbooks('cestos-field-workbook:user');assert.equal(x.calls[0].path,'/api/v1/auth/me');const body=JSON.parse(x.calls[1].options.body);assert.equal(body.base_version,'base');assert.equal(body.operation_id,'op');assert.equal(x.done[0][1],'new');});
test('account switches, other account scopes, and offline identities never send workbook writes',async()=>{for(const options of [{changeAccount:true},{offline:true}]){const x=setup(options);await x.api.syncWorkbooks('cestos-field-workbook:user');assert.ok(x.calls.every(c=>c.path!='/api/v1/workbook-sync'));}const x=setup();await x.api.syncWorkbooks('cestos-field-workbook:other');assert.equal(x.calls.length,0);});
test('conflicts stop automatic overwrites, network errors remain queued, denied writes are blocked',async()=>{for(const [status,state] of [[409,'conflict'],[503,'pending'],[403,'blocked'],[404,'pending']]){const x=setup({fail:true,status});await x.api.syncWorkbooks('cestos-field-workbook:user');assert.equal(x.failed[0][1],state);assert.equal(x.done.length,0);}});
