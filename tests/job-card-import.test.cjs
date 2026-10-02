const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const XLSX = require('xlsx');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/jobCardImport.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: api, require });
const plain = (value) => JSON.parse(JSON.stringify(value));
const layout = [
  ['DAILY MAINTENANCE / BREAKDOWN REPAIR JOB CARD'],
  ['Job control & machine identification'],
  ['Equipment', 'Excavator', 'Fleet / Unit ID', 'EX-01'],
  ['Date', '02/10/2026', 'Location', 'North site'],
  ['Operator / Driver', 'Jane Doe', 'Department', 'Workshop'],
  ['Time Reported', '08:30', 'Time Attended', '09:00'],
  ['REPORTED FAILURE / REQUEST'],
  ['Hydraulic hose leaking'],
  ['CORRECTIVE ACTION / WORK COMPLETED'],
  ['Replaced hose'], ['Tested under load'],
  ['Parts, consumables & materials'],
  ['Description', 'Part No.', 'Qty', 'Unit', 'Source', 'Condition', 'Old Part Returned', 'Remarks'],
  ['Hose', '0012', '2', 'each', 'Main store', 'New', 'Yes', 'Checked'],
  ['Seal', '0013', '1', 'each', '', '', '', ''],
  ['Labour & downtime'],
  ['Technician', 'Start', 'Finish', 'Labour Hrs', 'Machine Down Hrs', 'Work Hrs', 'Remarks'],
  ['Jane Doe', '09:00', '11:00', '2', '2.5', '2', 'Completed'],
  ['Test, release & remarks'], ['Released to service'],
];
test('paper job card extracts control, narratives, parts and labour without mixing sections', () => {
  const match = api.extractJobCardSheet(layout, 'Card');
  assert.ok(match);
  const card = plain(match.records[0]);
  assert.equal(card.control.equipment, 'Excavator');
  assert.equal(card.control.fleet_unit_id, 'EX-01');
  assert.equal(card.control.date, '2026-10-02');
  assert.equal(card.control.operator_driver, 'Jane Doe');
  assert.equal(card.failure, 'Hydraulic hose leaking');
  assert.equal(card.action, 'Replaced hose\nTested under load');
  assert.equal(card.parts.length, 2);
  assert.equal(card.parts[0].part_no, '0012');
  assert.equal(card.labour.length, 1);
  assert.equal(card.labour[0].machine_down_hours, '2.5');
  assert.equal(card.release, 'Released to service');
});
for (const bookType of ['xlsx', 'xls']) {
  test(`${bookType} scans all sheets and selects the data sheet rather than the first sheet`, async () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Equipment', 'Date', 'Location'], ['Other asset', '2026-10-01', 'Elsewhere']]), 'Equipment register');
    const sheet = XLSX.utils.aoa_to_sheet(layout);
    sheet.B4 = { t: 'n', v: Date.UTC(2026, 9, 2) / 86400000 + 25569, z: 'dd/mm/yyyy' };
    XLSX.utils.book_append_sheet(book, sheet, 'Daily repair');
    const matches = await api.readJobCardFile(new File([XLSX.write(book, { type: 'buffer', bookType })], `repair.${bookType}`));
    assert.equal(matches.length, 1);
    assert.equal(matches[0].name, 'Daily repair');
    assert.equal(matches[0].records[0].control.date, '2026-10-02');
  });
}
test('CSV row exports support nested headers, quoted narratives and multiple cards', async () => {
  const file = new File(['job_control.equipment,job_control.date,reported_failure,corrective_action\nExcavator,2026-10-02,"Leak, hose",Replaced\nTruck,2026-10-02,Tyre,Changed'], 'cards.csv');
  const matches = await api.readJobCardFile(file);
  assert.equal(matches[0].records.length, 2);
  assert.equal(matches[0].records[0].failure, 'Leak, hose');
  assert.equal(matches[0].records[1].control.equipment, 'Truck');
});
test('two-column job-card exports and inline labels are recognized', () => {
  assert.equal(api.extractJobCardSheet([['Equipment', 'Reported failure'], ['Truck', 'Leak']], 'Cards').records[0].failure, 'Leak');
  const match = api.extractJobCardSheet([['Equipment: Truck'], ['Reported failure: Leak']], 'Card');
  assert.equal(match.records[0].control.equipment, 'Truck');
  assert.equal(match.records[0].failure, 'Leak');
});
test('unrelated and empty uploads fail instead of enabling Continue', async () => {
  await assert.rejects(api.readJobCardFile(new File(['Name,Hours\nJane,8'], 'times.csv')), /No worksheet matches/);
  await assert.rejects(api.readJobCardFile(new File([''], 'empty.csv')), /No worksheet matches/);
  await assert.rejects(api.readJobCardFile(new File([''], 'card.pdf')), /Choose a CSV or Excel/);
});

test('headings above values remain one paper card and signature names do not enter release remarks', () => {
  const match = api.extractJobCardSheet([
    ['DAILY MAINTENANCE / BREAKDOWN REPAIR JOB CARD'],
    ['Equipment', 'Date', 'Fleet / Unit ID'],
    ['Loader', '02/10/2026', 'L-01'],
    ['Reported failure / request'], ['Leak'],
    ['Test, release & remarks'], ['Tested'],
    ['Technician Sign', 'Supervisor Sign', 'Operator Sign'],
    ['Jane', 'John', 'Pat'],
  ], 'Form');
  assert.equal(match.records.length, 1);
  assert.equal(match.records[0].control.equipment, 'Loader');
  assert.equal(match.records[0].control.date, '2026-10-02');
  assert.equal(match.records[0].release, 'Tested');
  assert.deepEqual(plain(match.records[0].signatures), { technician: 'Jane', supervisor: 'John', operator: 'Pat' });
});
test('multiple matching worksheets are ranked by populated job-card fields', async () => {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Equipment', 'Reported failure'], ['Truck', 'Leak']]), 'Brief');
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(layout), 'Full card');
  const matches = await api.readJobCardFile(new File([XLSX.write(book, {type:'buffer', bookType:'xlsx'})], 'cards.xlsx'));
  assert.equal(matches.length, 2);
  assert.equal(matches[0].name, 'Full card');
});
