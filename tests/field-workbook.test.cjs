const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const XLSX = require('xlsx');
function loadMappingModule(name){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,structuredClone,require:n=>loadMappingModule(n.replace('./',''))});return exports;}
const api = {};
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync('src/lib/fieldWorkbook.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText,
  {
    exports: api,
    require: (name) => {
      if(['./workbookMapping','./workbookMedia'].includes(name))return loadMappingModule(name.slice(2));
      if (['./workbookLimits','./workbookFormulas'].includes(name)) {
        const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/'+name.slice(2)+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date});return exports;
      }

      if (name !== './excelWorkbook' && name !== './workbookCellTypes') return require(name);
      const exports = {};
      vm.runInNewContext(
        ts.transpileModule(fs.readFileSync('src/lib/excelWorkbook.ts', 'utf8'), {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        }).outputText,
        {
          exports,
          require: name => { if(name==='./workbookMedia')return loadMappingModule('workbookMedia'); if(['./workbookLimits','./workbookFormulas'].includes(name)){const result={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/'+name.slice(2)+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:result,Date});return result;} if(name !== './workbookCellTypes') return require(name); const result={}; vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/workbookCellTypes.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:result,Date}); return result; },
          File,
          Blob,
          Uint8Array,
          btoa,
          atob,
          crypto: require('node:crypto').webcrypto,
        }
      );
      return exports;
    },
    File,
    Blob,
    crypto: require('node:crypto').webcrypto,
    structuredClone,
    TextEncoder,
    TextDecoder,
  }
);
const plain = (value) => JSON.parse(JSON.stringify(value));
test('all remaining templates have unique valid sheets and copies are independent', () => {
  assert.equal(api.workbookTemplates.length, 4);
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
  assert.throws(() => api.pasteCells(s, api.MAX_ROWS-1, 0, [['a'], ['b']]), /limit/);
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
  book.sheets.push(api.makeSheet('Additional sheet'));
  book.sheets[0].cells[1][0] = 'Card 1';
  book.sheets[0].widths[0] = 220;
  book.sheets[0].heights[1] = 65;
  book.sheets[0] = api.mergeCells(book.sheets[0], { r: 2, c: 1, er: 3, ec: 2 });
  const blob = await api.exportWorkbook(book);
  const imported = await api.importWorkbook(new File([blob], 'roundtrip.xlsx'));
  assert.equal(imported.sheets.length, book.sheets.length);
  assert.equal(imported.sheets[0].cells[1][0], 'Card 1');
  assert.deepEqual(plain(imported.sheets[0].merges), plain(book.sheets[0].merges));
  assert.ok(Math.abs(imported.sheets[0].widths[0] - 220) < 10);
  assert.equal(imported.sheets[0].heights[1], 65);
});
test('large XLSX sheets retain all data outside the editable preview', async () => {
  const Excel = require('exceljs');
  const source = new Excel.Workbook();
  source.addWorksheet('Large').getCell('CW2001').value = 'Outside preview';
  const bytes = await source.xlsx.writeBuffer();
  const book = await api.importWorkbook(new File([bytes], 'large.xlsx'));
  assert.equal(book.sheets[0].previewLimited, true);
  const output = await api.exportWorkbook(book);
  assert.deepEqual(Buffer.from(await output.arrayBuffer()), Buffer.from(bytes));
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
test('copyFormatRange copies formatting from source range to target range without altering target values', () => {
  const book = api.newWorkbook();
  const sheet = book.sheets[0];
  sheet.cells[1][0] = 'SourceVal';
  sheet.cells[2][0] = 'Target1';
  sheet.cells[3][0] = 'Target2';
  const styled = api.formatCells(sheet, { r: 1, c: 0, er: 1, ec: 0 }, { bold: true, italic: true, color: '#ff0000', align: 'center' });
  const painted = api.copyFormatRange(styled, { r: 1, c: 0, er: 1, ec: 0 }, { r: 2, c: 0, er: 3, ec: 0 });
  assert.equal(painted.cells[2][0], 'Target1');
  assert.equal(painted.cells[3][0], 'Target2');
  assert.equal(api.cellFormat(painted, 2, 0).bold, true);
  assert.equal(api.cellFormat(painted, 3, 0).color, '#ff0000');
  assert.equal(api.cellFormat(painted, 3, 0).align, 'center');
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

test('styled XLSX keeps every sheet and original bytes, and edited exports retain formulas and layout', async () => {
  const Excel = require('exceljs');
  const original = new Excel.Workbook();
  for (let i = 0; i < 32; i++) original.addWorksheet('Sheet ' + i);
  const ws = original.worksheets[0];
  ws.getCell('A1').value = 'Title';
  ws.mergeCells('A1:C1');
  ws.getCell('A1').font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FFFF0000' } };
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  ws.getCell('A2').value = 2;
  ws.getCell('B2').value = { formula: 'A2*2', result: 4 };
  ws.getColumn(1).width = 30;
  ws.getRow(1).height = 40;
  ws.getCell('A3').value = 'Hidden data';
  ws.getRow(3).hidden = true;
  ws.pageSetup.orientation = 'landscape';
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  original.worksheets[1].state = 'hidden';
  const bytes = await original.xlsx.writeBuffer();
  const book = await api.importWorkbook(new File([bytes], 'styled.xlsx'));
  assert.equal(book.sheets.length, 32);
  assert.equal(book.sheets[0].formats['0:0'].background, '#ffff00');
  assert.equal(book.sheets[0].formats['0:0'].fontSize, 18);
  assert.equal(book.sheets[1].hidden, true);
  assert.deepEqual(
    Buffer.from(await (await api.exportWorkbook(book)).arrayBuffer()),
    Buffer.from(bytes)
  );
  book.sheets[0].cells[1][0] = '3';
  const output = new Excel.Workbook();
  await output.xlsx.load(await (await api.exportWorkbook(book)).arrayBuffer());
  const edited = output.worksheets[0];
  assert.equal(edited.getCell('A2').value, 3);
  assert.equal(edited.getCell('B2').formula, 'A2*2');
  assert.equal(edited.getCell('A1').font.size, 18);
  assert.equal(edited.pageSetup.orientation, 'landscape');
  assert.equal(edited.views[0].ySplit, 1);
  assert.equal(edited.getRow(3).hidden, true);
  assert.equal(output.worksheets.length, 32);
});
test('range colors survive native and imported Excel exports and can be reset', async () => {
  const Excel = require('exceljs');
  const book = api.newWorkbook();
  const range = {r:1,c:0,er:2,ec:1};
  book.sheets[0] = api.formatCells(book.sheets[0],range,{color:'#ff0000',background:'#ffff00'});
  const blob = await api.exportWorkbook(book);
  const native = new Excel.Workbook(); await native.xlsx.load(await blob.arrayBuffer());
  assert.equal(native.worksheets[0].getCell('B3').font.color.argb,'FFff0000');
  assert.equal(native.worksheets[0].getCell('B3').fill.fgColor.argb,'FFffff00');
  const imported = await api.importWorkbook(new File([blob],'colors.xlsx'));
  imported.sheets[0] = api.formatCells(imported.sheets[0],range,{color:'#0000ff',background:'#00ff00'});
  const edited = new Excel.Workbook(); await edited.xlsx.load(await (await api.exportWorkbook(imported)).arrayBuffer());
  assert.equal(edited.worksheets[0].getCell('B3').font.color.argb,'FF0000ff');
  assert.equal(edited.worksheets[0].getCell('B3').fill.fgColor.argb,'FF00ff00');
  imported.sheets[0] = api.formatCells(imported.sheets[0],range,{color:'',background:''});
  const reset = new Excel.Workbook(); await reset.xlsx.load(await (await api.exportWorkbook(imported)).arrayBuffer());
  assert.equal(reset.worksheets[0].getCell('B3').fill.pattern,'none');
  assert.equal(reset.worksheets[0].getCell('B3').font.color.theme,1);
});
test('table designs style the selected range without changing data or merged header formatting', () => {
 const sheet = api.makeSheet(); sheet.cells[1][1] = 'Heading';
 const merged = api.mergeCells(sheet, {r:1,c:1,er:2,ec:2});
 const before = plain(merged);
 const styled = api.applyTableDesign(merged, {r:1,c:1,er:4,ec:3}, 0);
 assert.deepEqual(plain(styled.cells),before.cells);
 assert.deepEqual(plain(styled.merges),before.merges);
 assert.equal(styled.formats['1:1'].background,api.tableDesigns[0].header);
 assert.equal(styled.formats['1:1'].bold,true);
 assert.equal(styled.formats['4:3'].background,api.tableDesigns[0].stripe);
 assert.equal(styled.formats['3:3'].background,'#ffffff');
 assert.equal(styled.formats['0:0'],undefined);
 assert.equal(merged.formats?.['1:1']?.background,undefined);
});

test('typed cells export real numbers, dates and times with Excel number formats', async () => {
 const book=api.newWorkbook();
 const formats=[{dataType:'currency',currency:'GHS',decimals:2},{dataType:'percent',decimals:1},{dataType:'date'},{dataType:'time'},{dataType:'text'}];
 const values=['1234.5','0.25','2026-10-07','13:30','00123'];
 formats.forEach((format,c)=>{book.sheets[0].cells[1][c]=values[c];book.sheets[0]=api.formatCells(book.sheets[0],{r:1,c,er:1,ec:c},format);});
 const E=require('exceljs');const output=new E.Workbook();await output.xlsx.load(await (await api.exportWorkbook(book)).arrayBuffer());
 const ws=output.worksheets[0];assert.equal(ws.getCell('A2').value,1234.5);assert.equal(ws.getCell('A2').numFmt,'"GHS" #,##0.00');
 assert.equal(ws.getCell('B2').value,0.25);assert.equal(ws.getCell('B2').numFmt,'0.0%');
 assert.equal(ws.getCell('C2').value.toISOString(),'2026-10-07T00:00:00.000Z');
 assert.equal(ws.getCell('D2').numFmt,'hh:mm');assert.equal(ws.getCell('E2').value,'00123');
});

test('workbook copies retain mappings but isolate imports and discard previous record links', () => {
 const book=api.newWorkbook();
 book.sheets[0].connection={table:'/api/v1/equipment-register',mapping:{equipment:0},headerRow:0,validatedAt:'2026-10-07',importId:'original-import',writeMode:'insert',recordIds:['old-record'],completedRows:[1]};
 const copy=api.copyWorkbook(book);
 const connection=copy.sheets[0].connection;
 assert.equal(connection.table,book.sheets[0].connection.table);
 assert.deepEqual(plain(connection.mapping),{equipment:0});
 assert.equal(connection.writeMode,'insert');
 assert.notEqual(connection.importId,'original-import');
 assert.notEqual(connection.importId,api.copyWorkbook(book).sheets[0].connection.importId);
 assert.equal(connection.recordIds,undefined);assert.equal(connection.completedRows,undefined);
 assert.equal(connection.validatedAt,undefined);
 connection.mapping.equipment=1;
 assert.equal(book.sheets[0].connection.mapping.equipment,0);
 assert.deepEqual(book.sheets[0].connection.recordIds,['old-record']);
});


test('row and column deletion preserve complete snapshots for undo', () => {
  for (const axis of ['row', 'column']) {
    const original = api.makeSheet();
    original.cells[1][1] = 'Keep for undo';
    original.formats = {'1:1': {bold: true, background: '#ff0000'}};
    original.merges = [{r: 1, c: 1, er: 2, ec: 2}];
    const snapshot = plain(original);
    const changed = api.changeDimension(original, axis, 1, true);
    assert.deepEqual(plain(original), snapshot);
    assert.notEqual(changed, original);
    assert.equal(axis === 'row' ? changed.cells.length : changed.widths.length,
      (axis === 'row' ? original.cells.length : original.widths.length) - 1);
    assert.equal(original.cells[1][1], 'Keep for undo');
  }
});
test('database mappings track inserted and deleted columns and invalidate validation',()=>{
 const s=api.makeSheet();s.connection={table:'/api/v1/assets',mapping:{name:0,code:2},headerRow:1,validatedAt:'checked',importId:'same-import',writeMode:'insert'};
 const inserted=api.changeDimension(s,'column',1,false);
 assert.deepEqual(plain(inserted.connection.mapping),{name:0,code:3});
 assert.equal(inserted.connection.validatedAt,undefined);
 assert.equal(inserted.connection.importId,'same-import');
 const removed=api.changeDimension(inserted,'column',0,true);
 assert.deepEqual(plain(removed.connection.mapping),{code:2});
 assert.deepEqual(plain(s.connection.mapping),{name:0,code:2});
});
test('header row moves with structure and deleting it clears mappings for review',()=>{
 const s=api.makeSheet();s.connection={table:'/api/v1/assets',mapping:{name:0},headerRow:1,validatedAt:'checked'};
 const inserted=api.changeDimension(s,'row',0,false);
 assert.equal(inserted.connection.headerRow,2);
 const removed=api.changeDimension(inserted,'row',2,true);
 assert.deepEqual(plain(removed.connection.mapping),{});
 assert.equal(removed.connection.headerRow,2);
 assert.equal(removed.connection.validatedAt,undefined);
});
test('data edits invalidate database validation but view-only resizing does not',()=>{
 const s=api.makeSheet();s.connection={table:'/api/v1/assets',mapping:{name:0},headerRow:0,validatedAt:'checked'};
 const changed=structuredClone(s);changed.cells[1][0]='New value';
 assert.equal(api.invalidateMapping(s,changed).connection.validatedAt,undefined);
 assert.equal(s.connection.validatedAt,'checked');
 const resized={...s,widths:s.widths.map(w=>w+1)};
 assert.equal(api.invalidateMapping(s,resized).connection.validatedAt,'checked');
});
test('invalid or ambiguous imported database mappings are rejected',()=>{
 const b=api.newWorkbook();const s=b.sheets[0];
 for(const connection of [
  {table:'/api/v1/assets',headerRow:0,mapping:{name:0,code:0}},
  {table:'/api/v1/assets',headerRow:999,mapping:{}},
  {table:'/api/v1/assets',headerRow:0,mapping:{name:999}}
 ]) {s.connection=connection;assert.throws(()=>api.validateWorkbook(b),/Invalid database mapping/);}
});

test('new sheet capacity and view/print validation',()=>{assert.equal(api.MAX_ROWS,2000);assert.equal(api.MAX_COLS,100);const b=api.newWorkbook();b.sheets[0].view={freezeRows:1,freezeColumns:1};b.sheets[0].print={area:{r:0,c:0,er:2,ec:2},repeatRows:1,breakRows:[2]};api.validateWorkbook(b);b.sheets[0].view.freezeColumns=999;assert.throws(()=>api.validateWorkbook(b),/view settings/);});
test('Excel export writes live formulas, frozen panes and print settings',async()=>{const b=api.newWorkbook();const s=b.sheets[0];s.cells[1][0]='2';s.cells[2][0]='3';s.cells[3][0]='=SUM(A2:A3)';s.view={freezeRows:1,freezeColumns:1};s.print={area:{r:0,c:0,er:3,ec:2},orientation:'portrait',repeatRows:1,fit:'width',breakRows:[3]};const blob=await api.exportWorkbook(b);const Excel=require('exceljs'),book=new Excel.Workbook();await book.xlsx.load(await blob.arrayBuffer());const ws=book.worksheets[0];assert.equal(ws.getCell('A4').formula,'SUM(A2:A3)');assert.equal(ws.getCell('A4').result,5);assert.equal(ws.views[0].ySplit,1);assert.equal(ws.views[0].xSplit,1);assert.equal(ws.pageSetup.orientation,'portrait');assert.ok(ws.pageSetup.printArea.includes('A1'));assert.equal(ws.pageSetup.printTitlesRow,'1:1');const zip=XLSX.CFB.read(new Uint8Array(await blob.arrayBuffer()),{type:'buffer'});const xml=new TextDecoder().decode(XLSX.CFB.find(zip,'/xl/worksheets/sheet1.xml').content);assert.match(xml,/<rowBreaks[^>]*count="1"/);assert.match(xml,/<brk id="3"/);});

test('exporting reordered imported rows preserves borders, comments and native values',async()=>{const Excel=require('exceljs'),original=new Excel.Workbook(),ws=original.addWorksheet('Data');ws.addRows([['Name','Value'],['Z',2],['A',3]]);ws.getCell('B2').border={bottom:{style:'double'}};ws.getCell('B2').note='Keep me';const b=await api.importWorkbook(new File([await original.xlsx.writeBuffer()],'input.xlsx'));const s=b.sheets[0];s.cells=[s.cells[0],s.cells[2],s.cells[1]];s.heights=[s.heights[0],s.heights[2],s.heights[1]];s.rowOrigins=[1,3,2];s.formats={...s.formats,'1:0':s.formats['2:0'],'1:1':s.formats['2:1'],'2:0':s.formats['1:0'],'2:1':s.formats['1:1']};const out=new Excel.Workbook();await out.xlsx.load(await (await api.exportWorkbook(b)).arrayBuffer());assert.equal(out.worksheets[0].getCell('A3').value,'Z');assert.equal(out.worksheets[0].getCell('B3').value,2);assert.equal(out.worksheets[0].getCell('B3').border.bottom.style,'double');assert.ok(out.worksheets[0].getCell('B3').note);});

test('non-flat mappings survive duplication and require review after structural changes',()=>{const b=api.newWorkbook(),s=b.sheets[0];s.connection={table:'/api/v1/assets',mapping:{},headerRow:0,importId:'original',validatedAt:'before',layout:{version:1,mode:'form',headerRows:[0],labelColumn:0,start:0,end:2,blockSize:1,exclude:[],fields:{name:{kind:'cell',r:1,c:1}}}};const copy=api.copyWorkbook(b);assert.deepEqual(plain(copy.sheets[0].connection.layout),plain(s.connection.layout));assert.notEqual(copy.sheets[0].connection.importId,'original');assert.equal(copy.sheets[0].connection.validatedAt,undefined);const changed=api.changeDimension(s,'row',1,true);assert.equal(changed.connection.layout.needsReview,true);assert.equal(changed.connection.validatedAt,undefined);api.validateWorkbook({...b,sheets:[changed]});});

test('row edits and merges relocate media; workbook copies retain assets and folders',()=>{const b=api.newWorkbook(),s=b.sheets[0];b.assets={a:{id:'a',name:'a.txt',mime:'application/octet-stream',size:3,data:'YWJj'}};b.folders=[{id:'f',name:'Reports'}];s.folderId='f';s.media={'1:1':['a']};const inserted=api.changeDimension(s,'row',0,false);assert.equal(inserted.media['2:1'][0],'a');const removed=api.changeDimension(inserted,'row',2,true);assert.equal(Object.keys(removed.media).length,0);const merged=api.mergeCells(s,{r:1,c:0,er:1,ec:1});assert.equal(merged.media['1:0'][0],'a');const copy=api.copyWorkbook(b);assert.equal(copy.assets.a.data,'YWJj');assert.equal(copy.sheets[0].folderId,'f');api.validateWorkbook(copy);});
test('Excel export embeds PNG cell media and identifies file attachments in notes',async()=>{const b=api.newWorkbook(),s=b.sheets[0],png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1sAAAAASUVORK5CYII=';b.assets={image:{id:'image',name:'photo.png',mime:'image/png',size:Buffer.from(png,'base64').length,data:png},file:{id:'file',name:'manual.pdf',mime:'application/octet-stream',size:3,data:'YWJj'}};for(const a of Object.values(b.assets))a.documentId='11111111-1111-4111-8111-111111111111';s.media={'1:1':['image','file']};api.validateWorkbook(b);const Excel=require('exceljs'),out=new Excel.Workbook();await out.xlsx.load(await (await api.exportWorkbook(b)).arrayBuffer());assert.equal(out.worksheets[0].getImages().length,1);assert.ok(out.worksheets[0].getCell('B2').text.includes('/workbook-media?id='));assert.ok(JSON.stringify(out.worksheets[0].getCell('B2').note).includes('manual.pdf'));});

test('database workbook copies retain table links but clear update identities',()=>{
 const book=api.newWorkbook();const sheet=book.sheets[0];sheet.cells=[['id','name'],['original','Loader']];sheet.databaseSource={path:'/api/v1/assets',columns:['id','name'],loadedAt:'now',part:1,parts:1,mode:'update',baseline:{original:{id:'original',name:'Loader'}}};
 const copied=api.copyWorkbook(book).sheets[0];assert.equal(copied.databaseSource.path,sheet.databaseSource.path);assert.equal(copied.cells[1][0],'');assert.equal(Object.keys(copied.databaseSource.baseline).length,0);assert.equal(sheet.cells[1][0],'original');
});
