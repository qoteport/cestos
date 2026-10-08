const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),ts=require('typescript');
const token=user=>'x.'+Buffer.from(JSON.stringify({sub:user,org:'org'})).toString('base64url')+'.x';
function setup(mode){
 const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
 const localStorage=storage(),sessionStorage=storage(),calls=[],removed=[];let session;
 const rows=[{id:'queued',scope:'org:a',path:'/api/v1/assets/rig/logs',method:'POST',headers:[],authenticated:true,state:'pending',bodyType:'json',body:'{}',attempts:0}];
 const cache={};
 const offlineStore={currentOfflineScope:async t=>load('offlineAuth').tokenScope(t),listOfflineWrites:async scope=>rows.filter(r=>r.scope===scope),restoreOfflineBody:r=>r.body,removeOfflineWrite:async id=>removed.push(id),updateOfflineWrite:async()=>{},cacheApiResponse:async()=>{},readCachedApiResponse:async()=>undefined};
 async function fetcher(url){calls.push(url);if(mode==='switch-during-request'&&url.endsWith('/assets/rig/logs')){session.setTokens(token('b'),'rb',true);return new Response('{}',{status:401});}if(url.endsWith('/health'))return new Response('{}');if(url.endsWith('/refresh'))return new Response('{}',{status:401});if(url.endsWith('/auth/me')){if(mode==='switch')session.setTokens(token('b'),'rb',true);if(mode==='reject')return new Response('{}',{status:401});}return new Response('{}',{headers:{'content-type':'application/json'}});}
 const window={addEventListener(){},dispatchEvent(){},setTimeout,clearTimeout,location:{pathname:'/sign-up-login'}};
 function load(name){if(cache[name])return cache[name];if(name==='offlineStore')return offlineStore;if(name==='operationalDataSync')return{notifyOperationalDataUpdated(){}};const exports={};cache[name]=exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/lib/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:n=>load(n.replace('./','')),window,navigator:{onLine:true},localStorage,sessionStorage,fetch:fetcher,Response,Headers,FormData,Event,CustomEvent:class extends Event{},AbortController,atob});return exports;}
 const api=load('api');session=load('session');session.setTokens(token('a'),'ra',true);return{api,session,offline:load('offlineAuth'),calls,removed};
}
test('sync checks fresh server identity before sending queued work',async()=>{const x=setup('ok');await x.api.syncOfflineWriteQueue();assert.ok(x.calls.indexOf('/api/v1/auth/me')<x.calls.indexOf('/api/v1/assets/rig/logs'));assert.deepEqual(x.removed,['queued']);});
test('account change during verification prevents a different account sending queued work',async()=>{const x=setup('switch');await x.api.syncOfflineWriteQueue();assert.ok(!x.calls.includes('/api/v1/assets/rig/logs'));assert.equal(x.removed.length,0);});
test('server rejection keeps queued work and does not send it',async()=>{const x=setup('reject');await x.api.syncOfflineWriteQueue();assert.ok(!x.calls.includes('/api/v1/assets/rig/logs'));assert.equal(x.removed.length,0);});
test('offline identity never starts network synchronization',async()=>{const x=setup('ok');x.offline.rememberVerifiedSession({id:'a'},{roles:[],permissions:[],is_superuser:false},token('a'),true);x.offline.enterOfflineAccess();await x.api.syncOfflineWriteQueue();assert.equal(x.calls.length,0);});

test('an in-flight request is not retried under a newly signed-in account',async()=>{const x=setup('switch-during-request');await assert.rejects(x.api.apiFetch('/api/v1/assets/rig/logs',{method:'POST',body:'{}'},true,{queueWhenOffline:false}),/account changed/);assert.equal(x.calls.filter(path=>path.endsWith('/assets/rig/logs')).length,1);});
