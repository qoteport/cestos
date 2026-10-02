const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const XLSX = require('xlsx');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/timesheetFile.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: api, require });
const plain = (value) => JSON.parse(JSON.stringify(value));
function workbookFile(bookType, first, date1904 = false) {
  const book = XLSX.utils.book_new();
  book.Workbook = { WBProps: { date1904 } };
  XLSX.utils.book_append_sheet(book, first, 'Time sheet');
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['DO NOT IMPORT'], ['Wrong employee']]), 'Other');
  return new File([XLSX.write(book, { type: 'buffer', bookType })], `hours.${bookType}`);
}

test('CSV keeps quoted names, blank cells, zero and decimal hours', async () => {
  const result = await api.readTimesheetFile(new File(['NAME,SITE,1,2\r\n"Smith, Jane",,0,7.5\r\n'], 'hours.CSV'));
  assert.deepEqual(plain(result), [['NAME', 'SITE', '1', '2'], ['Smith, Jane', '', '0', '7.5']]);
});
for (const bookType of ['xlsx', 'xls']) {
  test(`${bookType} reads only the first worksheet and preserves dates, identifiers and formula results`, async () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['NAME', 'Employee Number', Date.UTC(2026, 9, 1) / 86400000 + 25569, Date.UTC(2026, 9, 2) / 86400000 + 25569],
      ['Jane Smith', 12, 0, 7.5],
    ]);
    sheet.C1.z = 'm/d/yyyy'; sheet.D1.z = 'dd-mmm-yy';
    sheet.B2.z = '0000'; sheet.D2.f = '15/2';
    const rows = plain(await api.readTimesheetFile(workbookFile(bookType, sheet)));
    assert.deepEqual(rows, [['NAME', 'Employee Number', '2026-10-01', '2026-10-02'], ['Jane Smith', '0012', '0', '7.5']]);
  });
}
test('1904 Excel date system produces the correct date', async () => {
  const sheet = XLSX.utils.aoa_to_sheet([['NAME', 0, 1], ['Jane', 8, 8]]);
  sheet.B1.z = 'm/d/yyyy'; sheet.C1.z = 'm/d/yyyy';
  const rows = plain(await api.readTimesheetFile(workbookFile('xlsx', sheet, true)));
  assert.deepEqual(rows[0], ['NAME', '1904-01-01', '1904-01-02']);
});
test('empty first worksheet is rejected instead of importing another worksheet', async () => {
  await assert.rejects(api.readTimesheetFile(workbookFile('xlsx', XLSX.utils.aoa_to_sheet([]))), /first Excel worksheet is empty/);
});
test('unsupported file types are rejected', async () => {
  await assert.rejects(api.readTimesheetFile(new File(['anything'], 'hours.pdf')), /Select a CSV or Excel file/);
});
