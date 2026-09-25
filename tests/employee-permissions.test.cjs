const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/lib/employeePermissions.ts'), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports:api});
const check = (roles, permissions=[], is_superuser=false) => api.employeePermissions({roles, permissions, is_superuser});
test('operational managers with basic read have no sensitive actions', () => {
  const result = check(['Supervisor', 'Maintenance Manager', 'Project Manager'], ['employees.read_basic']);
  for (const value of Object.values(result)) assert.equal(value, false);
});
test('employee update cannot grant archive or contract attachment', () => {
  const result = check(['Project Manager'], ['employees.update', 'employees.documents.manage']);
  assert.equal(result.archive, false); assert.equal(result.contracts, false);
});
test('HR/Admin contract attachments still require document permission', () => {
  for (const role of ['HR','Admin','Administrator']) {
    assert.equal(check([role]).contracts, false);
    assert.equal(check([role], ['employees.documents.manage']).contracts, true);
  }
});
test('account and archive use their explicit API grants', () => {
  assert.equal(check([], ['users.update']).account, true);
  assert.equal(check([], ['employees.archive']).archive, true);
  assert.ok(Object.values(check([], [], true)).every(Boolean));
});
