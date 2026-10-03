const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const XLSX = require('xlsx');
const api = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync('src/lib/fieldWorkbook.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText,
  {
    exports: api,
    require,
    File,
    Blob,
    crypto: require('node:crypto').webcrypto,
    structuredClone,
    TextEncoder,
    TextDecoder,
  }
);
const plain = (value) => JSON.parse(JSON.stringify(value));
test('all seven templates have unique valid sheets and copies are independent', () => {
  assert.equal(api.workbookTemplates.length, 7);
  api.workbookTemplates.forEach((_, i) => {
    const book = api.newWorkbook(i);
    api.validateWorkbook(book);
    assert.equal(new Set(book.sheets.map((s) => s.name)).size, book.sheets.length);
    const copy = api.copyWorkbook(book, true);
    assert.notEqual(copy.id, book.id);
    assert.equal(copy.template, true);
    copy.sheets[0].cells[0][0] = 'Changed';
    assert.notEqual(copy.sheets[0].cells[0][0], book.sheets[0].cells[0][0]);
  });
});
test('merges preserve a single value and reject destructive or overlapping merges', () => {
  const s = api.makeSheet();
  s.cells[1][1] = 'Pump';
  const merged = api.mergeCells(s, { r: 0, c: 0, er: 1, ec: 1 });
  assert.equal(merged.cells[0][0], 'Pump');
  assert.equal(merged.cells[1][1], '');
  assert.equal(s.cells[1][1], 'Pump');
  assert.throws(() => api.mergeCells(merged, { r: 0, c: 0, er: 2, ec: 2 }), /Unmerge/);
  s.cells[0][0] = 'Other';
  assert.throws(() => api.mergeCells(s, { r: 0, c: 0, er: 1, ec: 1 }), /more than one/);
});
test('inserting and deleting rows adjusts merged coordinates and retains anchor values', () => {
  let s = api.makeSheet();
  s.cells[1][1] = 'Keep';
  s = api.mergeCells(s, { r: 1, c: 1, er: 3, ec: 2 });
  s = api.changeDimension(s, 'row', 0, false);
  assert.deepEqual(plain(s.merges[0]), { r: 2, c: 1, er: 4, ec: 2 });
  s = api.changeDimension(s, 'row', 3, false);
  assert.equal(s.merges[0].er, 5);
  s = api.changeDimension(s, 'row', 2, true);
  assert.equal(s.cells[2][1], 'Keep');
  assert.equal(s.merges[0].er, 4);
});
test('deleting the complete merged row does not overwrite the following row', () => {
  let s = api.makeSheet();
  s.cells[0][0] = 'Delete';
  s.cells[1][0] = 'Keep';
  s = api.mergeCells(s, { r: 0, c: 0, er: 0, ec: 2 });
  s = api.changeDimension(s, 'row', 0, true);
  assert.equal(s.cells[0][0], 'Keep');
  assert.equal(s.merges.length, 0);
});
test('column deletion retains merged anchors without shifting unrelated values', () => {
  let s = api.makeSheet();
  s.cells[0][1] = 'Keep';
  s.cells[0][4] = 'Outside';
  s = api.mergeCells(s, { r: 0, c: 1, er: 2, ec: 3 });
  s = api.changeDimension(s, 'column', 1, true);
  assert.equal(s.cells[0][1], 'Keep');
  assert.equal(s.cells[0][3], 'Outside');
  assert.equal(s.merges[0].ec, 2);
});
test('paste expands the grid, preserves blank cells and rejects merged destinations and limits', () => {
  let s = api.makeSheet();
  s = api.pasteCells(s, 24, 7, [
    ['A', '', 'B'],
    ['0012', '8', ''],
  ]);
  assert.equal(s.cells.length, 26);
  assert.equal(s.widths.length, 10);
  assert.equal(s.cells[25][7], '0012');
  assert.throws(() => api.pasteCells(s, 499, 0, [['a'], ['b']]), /limit/);
  s = api.mergeCells(s, { r: 0, c: 0, er: 0, ec: 1 });
  assert.throws(() => api.pasteCells(s, 0, 0, [['a', 'b']]), /Unmerge/);
});
test('suggestions use known headings and do not constrain custom values', () => {
  assert.deepEqual(
    plain(api.suggestionsFor('Project', [{ name: 'North' }, { name: 'North' }], [], [], [])),
    ['North']
  );
  assert.deepEqual(
    plain(api.suggestionsFor('Technician', [], [], [{ first_name: 'Jane', last_name: 'Doe' }], [])),
    ['Jane Doe']
  );
  assert.deepEqual(plain(api.suggestionsFor('Unknown', [], [], [], [])), []);
});
test('validation rejects corrupted dimensions and overlapping merges', () => {
  const b = api.newWorkbook();
  b.sheets[0].cells[0].push('extra');
  assert.throws(() => api.validateWorkbook(b), /cells/);
  const c = api.newWorkbook();
  c.sheets[0].merges = [
    { r: 0, c: 0, er: 1, ec: 1 },
    { r: 1, c: 1, er: 2, ec: 2 },
  ];
  assert.throws(() => api.validateWorkbook(c), /merged/);
});
for (const ext of ['xlsx', 'xls', 'csv'])
  test(`${ext} import preserves basic values and Excel sheets`, async () => {
    const source = XLSX.utils.book_new();
    const s = XLSX.utils.aoa_to_sheet([
      ['Equipment', 'Unit'],
      ['Drill', '0012'],
    ]);
    XLSX.utils.book_append_sheet(source, s, 'Equipment');
    XLSX.utils.book_append_sheet(
      source,
      XLSX.utils.aoa_to_sheet([['Project'], ['North']]),
      'Projects'
    );
    const contents =
      ext === 'csv'
        ? XLSX.utils.sheet_to_csv(s)
        : XLSX.write(source, { type: 'buffer', bookType: ext });
    const b = await api.importWorkbook(new File([contents], `test.${ext}`));
    assert.equal(b.sheets.length, ext === 'csv' ? 1 : 2);
    assert.equal(b.sheets[0].cells[1][1], '0012');
  });
test('Excel export round trips sheets, merges, values, widths and heights', async () => {
  const book = api.newWorkbook(1);
  book.sheets[0].cells[1][0] = 'Card 1';
  book.sheets[0].widths[0] = 220;
  book.sheets[0].heights[1] = 65;
  book.sheets[0] = api.mergeCells(book.sheets[0], { r: 2, c: 1, er: 3, ec: 2 });
  const blob = await api.exportWorkbook(book);
  const imported = await api.importWorkbook(new File([blob], 'roundtrip.xlsx'));
  assert.equal(imported.sheets.length, 2);
  assert.equal(imported.sheets[0].cells[1][0], 'Card 1');
  assert.deepEqual(plain(imported.sheets[0].merges), plain(book.sheets[0].merges));
  assert.equal(imported.sheets[0].widths[0], 220);
  assert.equal(imported.sheets[0].heights[1], 65);
});
test('import rejects sheets exceeding the editor bounds', async () => {
  const source = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(source, { '!ref': 'A1:AZ501' }, 'Large');
  await assert.rejects(
    api.importWorkbook(
      new File([XLSX.write(source, { type: 'buffer', bookType: 'xlsx' })], 'large.xlsx')
    ),
    /exceeds/
  );
});

test('formatting applies to a range and survives copy and dimension edits', () => {
  const book = api.newWorkbook();
  const original = book.sheets[0];
  const styled = api.formatCells(
    original,
    { r: 1, c: 1, er: 2, ec: 2 },
    { bold: true, italic: true, align: 'center' }
  );
  assert.equal(api.cellFormat(original, 1, 1).bold, false);
  assert.equal(api.cellFormat(styled, 2, 2).align, 'center');
  book.sheets[0] = styled;
  api.validateWorkbook(book);
  const copied = api.copyWorkbook(book);
  assert.equal(api.cellFormat(copied.sheets[0], 2, 2).italic, true);
  const moved = api.changeDimension(styled, 'row', 1, false);
  assert.equal(api.cellFormat(moved, 3, 2).bold, true);
  const removed = api.changeDimension(moved, 'column', 0, true);
  assert.equal(api.cellFormat(removed, 3, 1).italic, true);
});
test('Excel export contains font and alignment styles for selected cells', async () => {
  const book = api.newWorkbook();
  book.sheets[0].cells[1][1] = 'Formatted';
  book.sheets[0] = api.formatCells(
    book.sheets[0],
    { r: 1, c: 1, er: 1, ec: 1 },
    { bold: true, italic: true, align: 'right' }
  );
  const blob = await api.exportWorkbook(book);
  const zip = XLSX.CFB.read(new Uint8Array(await blob.arrayBuffer()), { type: 'buffer' });
  const styles = new TextDecoder().decode(XLSX.CFB.find(zip, '/xl/styles.xml').content);
  const sheet = new TextDecoder().decode(XLSX.CFB.find(zip, '/xl/worksheets/sheet1.xml').content);
  assert.match(styles, /<b\/><i\/>/);
  assert.match(styles, /horizontal="right"/);
  assert.match(sheet, /<c[^>]*r="B2"[^>]*s="11"/);
});
