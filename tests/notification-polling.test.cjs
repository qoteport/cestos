const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/notificationPolling.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function setup(fetcher) {
  const api = {};
  const window = new EventTarget();
  const document = Object.assign(new EventTarget(), { hidden: false });
  const navigator = { onLine: true };
  const timers = new Map();
  let id = 0;
  vm.runInNewContext(compiled, {
    exports: api, window, document, navigator, AbortController, Error,
    setTimeout(fn, ms) { timers.set(++id, { fn, ms }); return id; },
    clearTimeout(key) { timers.delete(key); },
  });
  const poller = api.createNotificationPoller(fetcher);
  return { poller, window, document, navigator, timers };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('multiple consumers share requests; mutation during a request queues one refresh', async () => {
  const pending = [];
  const { poller, window } = setup(signal => new Promise(resolve => pending.push({ signal, resolve })));
  const stopA = poller.subscribe(() => {});
  const stopB = poller.subscribe(() => {});
  assert.equal(pending.length, 1);
  window.dispatchEvent(new Event('focus'));
  window.dispatchEvent(new Event('cestos:notifications-changed'));
  window.dispatchEvent(new Event('cestos:notifications-changed'));
  assert.equal(pending.length, 1);
  pending[0].resolve({ total: 4 });
  await flush();
  assert.equal(pending.length, 2);
  assert.equal(poller.getSnapshot().data.total, 4);
  stopA();
  assert.equal(pending[1].signal.aborted, false);
  stopB();
  assert.equal(pending[1].signal.aborted, true);
  pending[1].resolve({ total: 9 });
  await flush();
  assert.equal(poller.getSnapshot().data.total, 4);
});

test('background refresh keeps visible data and survives failure', async () => {
  let calls = 0;
  const { poller, timers } = setup(async () => {
    if (++calls === 1) return { total: 7 };
    throw new Error('offline');
  });
  const stop = poller.subscribe(() => {});
  await flush();
  poller.refresh();
  assert.equal(poller.getSnapshot().data.total, 7);
  assert.equal(poller.getSnapshot().loading, false);
  await flush();
  assert.equal(poller.getSnapshot().data.total, 7);
  assert.equal(poller.getSnapshot().error, '');
  assert.equal([...timers.values()].filter(t => t.ms === 30000).length, 1);
  stop();
  assert.equal(timers.size, 0);
});

test('slow sync aborts after eight seconds and can retry', async () => {
  let calls = 0;
  const { poller, timers } = setup(signal => new Promise((resolve, reject) => {
    calls++;
    signal.addEventListener('abort', () => reject(new Error('timed out')));
  }));
  const stop = poller.subscribe(() => {});
  [...timers.values()].find(t => t.ms === 8000).fn();
  await flush();
  assert.equal(poller.getSnapshot().loading, false);
  assert.equal(poller.getSnapshot().error, 'timed out');
  poller.refresh();
  assert.equal(calls, 2);
  stop();
  await flush();
});

test('hidden and offline tabs skip sync, visibility resumes it', async () => {
  let calls = 0;
  const { poller, document, navigator, window } = setup(async () => { calls++; return { total: 1 }; });
  document.hidden = true;
  const stop = poller.subscribe(() => {});
  assert.equal(calls, 0);
  document.hidden = false;
  navigator.onLine = false;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(calls, 0);
  navigator.onLine = true;
  window.dispatchEvent(new Event('online'));
  await flush();
  assert.equal(calls, 1);
  stop();
});
