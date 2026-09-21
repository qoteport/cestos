const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function load(name) {
  const api = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/lib/' + name + '.ts'),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports:api});
  return api;
}
const {hasSupervisorRole,canOpenFieldTab} = load('fieldPortalAccess');
test('only the exact Supervisor role unlocks planning, shifts and stores', () => {
  for(const roles of [[], ['Project Manager'], ['Maintenance Manager'], ['Administrator'], ['Assistant Supervisor']]) {
    assert.equal(hasSupervisorRole({roles}),false);
    for(const tab of ['SHIFT_LOGS','DRILL_HOLES','WORK_ORDERS','STORES']) assert.equal(canOpenFieldTab({roles},tab),false);
    assert.equal(canOpenFieldTab({roles},'MY_WORK'),true);
    assert.equal(canOpenFieldTab({roles},'EQUIPMENT'),true);
  }
  assert.equal(hasSupervisorRole({roles:[' Supervisor ']}),true);
  assert.equal(canOpenFieldTab({roles:['Supervisor']},'WORK_ORDERS'),true);
});
test('expiry register reads real nested document and countdown', () => {
  const {normalizeExpiringDocument} = load('expiringDocuments');
  const actual=normalizeExpiringDocument({employee_name:'Nyahn Flomo',days_until_expiry:10,document:{id:'document-id',employee_id:'employee-id',title:'Full-Time Employment Agreement',document_type:'EMPLOYMENT_CONTRACT',expiry_date:'2026-09-30'}});
  assert.equal(actual.title,'Full-Time Employment Agreement');
  assert.equal(actual.expiry_date,'2026-09-30');
  assert.equal(actual.days_until_expiry,10);
  assert.equal(actual.employee_name,'Nyahn Flomo');
  assert.equal(actual.employee_id,'employee-id');
});
