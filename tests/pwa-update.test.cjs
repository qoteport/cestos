const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

test('online navigation bypasses HTTP cache and refreshes offline page', async () => {
  const handlers = {};
  let options, saved;
  const response = {ok:true, clone:()=> 'fresh page'};
  vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'), {
    URL, self:{location:{origin:'https://example.test'},addEventListener:(name, handler)=>handlers[name]=handler},
    fetch:async (_request, init)=>{options=init;return response;},
    caches:{open:async()=>({put:async (_request,value)=>{saved=value;}})},
  });
  let result;
  handlers.fetch({request:{method:'GET',url:'https://example.test/workbooks',mode:'navigate'},respondWith:promise=>{result=promise;}});
  assert.equal(await result,response);
  assert.equal(options.cache,'no-store');
  assert.equal(saved,'fresh page');
});

test('navigation still opens saved page offline', async () => {
  const handlers = {};
  const saved = {};
  vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'), {
    URL, self:{location:{origin:'https://example.test'},addEventListener:(name, handler)=>handlers[name]=handler},
    fetch:async()=>{throw Error('offline');}, caches:{match:async()=>saved},
  });
  let result;
  handlers.fetch({request:{method:'GET',url:'https://example.test/workbooks',mode:'navigate'},respondWith:promise=>{result=promise;}});
  assert.equal(await result,saved);
});
