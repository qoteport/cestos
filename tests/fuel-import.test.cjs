const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const X = require('xlsx');
const api = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync('src/lib/fuelImport.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText,
  { exports: api, require, File }
);
const fixture = [
  ['Daily Fuel Consumption Sheet'],
  ['Date', 'Time', 'Equipment', 'Quantity (Lt)', 'Km / Hrs', 'Recievers name', 'Signature'],
  ['02/10/2026', '08:30', 'Rig-01', '150.5', '1200 hrs', 'Jane', 'JD'],
  ['', '9:00 AM', 'Truck 2', '1,250', '42000 km', 'Sam', 'S'],
  ['', '', 'Total', '1400.5'],
];
test('extracts all fuel rows and carries dates while skipping totals', () => {
  const result = api.extractFuelSheet(fixture);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[1].date, '2026-10-02');
  assert.equal(result.rows[1].time, '09:00');
  assert.equal(result.rows[1].quantity, '1250');
  assert.equal(result.rows[0].receiver, 'Jane');
  assert.equal(result.rows[0].signature, 'JD');
});
test('unique names and identifiers match despite punctuation; ambiguous names stay unmatched', () => {
  const assets = [
    { id: '1', name: 'Rig 01', asset_number: 'R-001' },
    { id: '2', name: 'Truck' },
  ];
  assert.equal(api.matchFuelAsset('rig-01', assets).id, '1');
  assert.equal(api.matchFuelAsset('R001', assets).id, '1');
  assert.equal(api.matchFuelAsset('Truck', [...assets, { id: '3', name: 'Truck' }]).id, '');
});
test('similar names are suggestions, never automatic matches', () => {
  const result = api.matchFuelAsset('Rig 02', [{ id: '1', name: 'Rig 01' }]);
  assert.equal(result.id, '');
  assert.equal(result.suggestions.length, 1);
});
for (const ext of ['csv', 'xlsx', 'xls'])
  test(`${ext} selects matching data and retains all assets`, async () => {
    const ws = X.utils.aoa_to_sheet(fixture);
    const book = X.utils.book_new();
    X.utils.book_append_sheet(book, X.utils.aoa_to_sheet([['Notes'], ['Read me']]), 'Cover');
    X.utils.book_append_sheet(book, ws, 'Fuel');
    const data =
      ext === 'csv' ? X.utils.sheet_to_csv(ws) : X.write(book, { type: 'buffer', bookType: ext });
    const matches = await api.readFuelImport(new File([data], `fuel.${ext}`));
    assert.equal(matches.length, 1);
    assert.equal(matches[0].rows.length, 2);
    assert.equal(matches[0].rows[0].equipment, 'Rig-01');
    assert.match(matches[0].csv, /Daily Fuel Consumption/);
  });
test('Excel serial date and time values are normalized', async () => {
  const ws = X.utils.aoa_to_sheet([fixture[1], [46297, 0.375, 'Rig', '10', '25', 'J', '']]);
  ws.A2.z = 'dd/mm/yyyy';
  ws.B2.z = 'hh:mm';
  const book = X.utils.book_new();
  X.utils.book_append_sheet(book, ws, 'Fuel');
  const result = await api.readFuelImport(
    new File([X.write(book, { type: 'buffer', bookType: 'xlsx' })], 'fuel.xlsx')
  );
  assert.match(result[0].rows[0].date, /^2026-\d{2}-\d{2}$/);
  assert.equal(result[0].rows[0].time, '09:00');
});
test('invalid dates and times remain visible for correction', () => {
  assert.equal(api.fuelDate('31/02/2026'), '31/02/2026');
  assert.equal(api.fuelTime('25:99'), '25:99');
});
test('unrelated uploads are rejected', async () => {
  await assert.rejects(
    api.readFuelImport(new File(['Name,Amount\nJane,8'], 'wrong.csv')),
    /No matching fuel sheet/
  );
});
