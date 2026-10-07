const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
test('background updates coalesce into a transition and clean up on unmount', () => {
  const listeners = new Map(), timers = new Map(), cleanups = [];
  let next = 0, calls = 0, transitions = 0;
  const api = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/apiDataRefresh.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {
    exports: api,
    require: name => name === 'react' ? {
      useRef: current => ({current}),
      useEffect: fn => { const cleanup = fn(); if(cleanup) cleanups.push(cleanup); },
      startTransition: fn => {transitions++; fn();}
    } : {API_DATA_REFRESHED_EVENT:'refresh'},
    window: {
      addEventListener: (name, fn) => listeners.set(name, fn),
      removeEventListener: name => listeners.delete(name),
      setTimeout: fn => {timers.set(++next, fn); return next;},
      clearTimeout: id => timers.delete(id)
    }
  });
  api.useApiDataRefresh(() => calls++);
  listeners.get('refresh')(); listeners.get('refresh')();
  assert.equal(timers.size,1); assert.equal(calls,0);
  const callback=[...timers.values()][0];timers.clear();callback();
  assert.equal(calls,1);assert.equal(transitions,1);
  listeners.get('refresh')();cleanups.forEach(fn=>fn());
  assert.equal(timers.size,0);assert.equal(listeners.size,0);
});
