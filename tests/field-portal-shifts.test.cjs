const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/fieldPortalShifts.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api });
const { projectShiftReports, shiftReportsUrl } = api;

test('selected project uses a server filter; All removes the filter', () => {
  assert.equal(shiftReportsUrl('project-b'), '/api/v1/drilling/shifts?project_id=project-b');
  assert.equal(shiftReportsUrl('ALL'), '/api/v1/drilling/shifts');
});

test('project switching excludes foreign and unassigned reports before pagination', () => {
  const reports = [
    ...Array.from({ length: 7 }, (_, i) => ({ id: `a-${i}`, project_id: 'a' })),
    { id: 'b-1', project_id: 'b', project_name: 'Same name' },
    { id: 'unknown', project_name: 'Same name' },
  ];
  assert.equal(projectShiftReports(reports, 'a').length, 7);
  const selected = projectShiftReports(reports, 'b');
  assert.equal(selected.length, 1);
  assert.equal(selected.slice(0, 5)[0].id, 'b-1');
  assert.equal(projectShiftReports(reports, 'empty').length, 0);
  assert.equal(projectShiftReports([], 'a').length, 0);
  assert.equal(projectShiftReports(reports, 'ALL').length, 9);
});

test('backend shift fields and worked hole intervals are displayed without fabricated totals', () => {
  const [report] = projectShiftReports([{
    project_id: 'a', date: '2026-09-20', total_metres: 0,
    avg_core_recovery_pct: 0, total_productive_hours: 0,
    intervals: [{ hole_number: 'A-001' }, { hole_number: 'A-002' }],
  }], 'a');
  assert.equal(report.shift_date, '2026-09-20');
  assert.equal(report.total_metres_drilled, 0);
  assert.equal(report.core_recovery_pct, 0);
  assert.equal(report.productive_hours, 0);
  assert.equal(report.hole_numbers, 'A-001, A-002');
});

test('interval IDs resolve only against holes belonging to the report project', () => {
  const [report] = projectShiftReports([
    { project_id: 'a', intervals: [{ drill_hole_id: 'h1' }, { drill_hole_id: 'h2' }] },
  ], 'a', [
    { id: 'h1', project_id: 'a', hole_number: 'A-001' },
    { id: 'h2', project_id: 'b', hole_number: 'B-001' },
  ]);
  assert.equal(report.hole_numbers, 'A-001');
});
