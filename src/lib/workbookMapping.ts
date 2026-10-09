import type { FieldSheet } from './fieldWorkbook';
import { calculateSheet, referencePosition } from './workbookFormulas';
export type MappingField = { kind: 'column' | 'row' | 'cell' | 'block'; r: number; c: number };
export type MappingLayout = {
  version: 1;
  mode: 'rows' | 'columns' | 'form' | 'blocks';
  headerRows: number[];
  labelColumn: number;
  start: number;
  end: number;
  blockSize: number;
  exclude: number[];
  fields: Record<string, MappingField>;
  needsReview?: boolean;
};
export type MappingTable = {
  id: string;
  name: string;
  validationAvailable?: boolean;
  columns: { name: string; required: boolean; nullable: boolean; type: string; schema?: unknown }[];
};
export function cellAddress(r: number, c: number) {
  let text = '',
    n = c + 1;
  while (n) {
    text = String.fromCharCode(65 + ((n - 1) % 26)) + text;
    n = Math.floor((n - 1) / 26);
  }
  return text + (r + 1);
}
export function parseCellAddress(value: string) {
  if (!/^\$?[a-z]+\$?[1-9]\d*$/i.test(value.trim())) throw Error('Use a cell address such as B4.');
  return referencePosition(value.trim());
}
export function defaultLayout(sheet: FieldSheet): MappingLayout {
  return sheet.connection?.layout
    ? structuredClone(sheet.connection.layout)
    : {
        version: 1,
        mode: 'rows',
        headerRows: [sheet.connection?.headerRow || 0],
        labelColumn: 0,
        start: (sheet.connection?.headerRow || 0) + 1,
        end: sheet.cells.length - 1,
        blockSize: 1,
        exclude: [],
        fields: Object.fromEntries(
          Object.entries(sheet.connection?.mapping || {}).map(([name, c]) => [
            name,
            { kind: 'column' as const, r: 0, c },
          ])
        ),
      };
}
export function assertLayout(sheet: FieldSheet, l: MappingLayout, allowReview = false) {
  if (
    !l ||
    l.version !== 1 ||
    !['rows', 'columns', 'form', 'blocks'].includes(l.mode) ||
    !l.fields ||
    typeof l.fields !== 'object' ||
    Array.isArray(l.fields) ||
    Object.keys(l.fields).length > 100
  )
    throw Error('Invalid mapping layout.');
  const integer = (n: unknown) => Number.isInteger(n) && Number(n) >= 0;
  if (
    ![l.start, l.end, l.labelColumn].every(integer) ||
    !Number.isInteger(l.blockSize) ||
    l.blockSize < 1 ||
    l.start > l.end ||
    !Array.isArray(l.headerRows) ||
    !Array.isArray(l.exclude) ||
    ![...l.headerRows, ...l.exclude].every(integer)
  )
    throw Error('Check the mapping ranges and header rows.');
  if (l.needsReview && !allowReview)
    throw Error(
      'Sheet structure changed. Review the ranges and cell references, then confirm the layout.'
    );
  if (l.needsReview !== undefined && typeof l.needsReview !== 'boolean')
    throw Error('Invalid mapping review status.');
  const bounds = !(allowReview && l.needsReview);
  if (
    bounds &&
    (l.end >= (l.mode === 'columns' ? sheet.widths.length : sheet.cells.length) ||
      l.labelColumn >= sheet.widths.length ||
      l.headerRows.some((r) => r >= sheet.cells.length) ||
      l.exclude.some((i) => i >= (l.mode === 'columns' ? sheet.widths.length : sheet.cells.length)))
  )
    throw Error('The mapping range is outside this sheet.');
  for (const f of Object.values(l.fields)) {
    if (
      f &&
      f.kind !== 'cell' &&
      f.kind !==
        ({ rows: 'column', columns: 'row', blocks: 'block', form: 'cell' } as const)[l.mode]
    )
      throw Error('A mapped source does not match the record layout.');
    if (
      !f ||
      !['column', 'row', 'cell', 'block'].includes(f.kind) ||
      !integer(f.r) ||
      !integer(f.c) ||
      (bounds && (f.r >= sheet.cells.length || f.c >= sheet.widths.length))
    )
      throw Error('A mapped cell is outside this sheet.');
    if (f.kind === 'block' && (f.r < l.start || f.r >= l.start + l.blockSize))
      throw Error('Map cells inside the first repeated block.');
  }
}
export function sourceCell(sheet: FieldSheet, r: number, c: number) {
  const merge = sheet.merges.find((m) => r >= m.r && r <= m.er && c >= m.c && c <= m.ec);
  return merge ? { r: merge.r, c: merge.c } : { r, c };
}
export function headerNames(sheet: FieldSheet, l: MappingLayout) {
  return sheet.widths.map((_, c) =>
    [
      ...new Set(
        l.headerRows
          .map((r) => {
            const p = sourceCell(sheet, r, c);
            return sheet.cells[p.r]?.[p.c]?.trim() || '';
          })
          .filter(Boolean)
      ),
    ].join(' / ')
  );
}
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
export function suggestFields(
  sheet: FieldSheet,
  l: MappingLayout,
  table: MappingTable
): MappingLayout['fields'] {
  const fields: MappingLayout['fields'] = {};
  const headers = headerNames(sheet, l);
  for (const f of table.columns) {
    const aliases = [f.name, f.name.replace(/_number$/, '')].map(normalize);
    const matches = (s: string) => aliases.includes(normalize(s));
    if (l.mode === 'rows') {
      const candidates = headers
        .map((h, c) => ({ h, c }))
        .filter(
          ({ h, c }) => matches(h) || l.headerRows.some((r) => matches(sheet.cells[r]?.[c] || ''))
        );
      if (candidates.length === 1) fields[f.name] = { kind: 'column', r: 0, c: candidates[0].c };
    } else if (l.mode === 'columns') {
      const candidates = sheet.cells
        .map((row, r) => ({ r, value: row[l.labelColumn] }))
        .filter(({ value }) => matches(value));
      if (candidates.length === 1) fields[f.name] = { kind: 'row', r: candidates[0].r, c: 0 };
    } else {
      const matchesAt: { r: number; c: number }[] = [];
      for (
        let r = l.start;
        r <= Math.min(l.end, l.mode === 'blocks' ? l.start + l.blockSize - 1 : l.end);
        r++
      )
        for (let c = 0; c < sheet.widths.length; c++)
          if (matches(sheet.cells[r][c])) {
            const merge = sheet.merges.find((m) => m.r === r && m.c === c);
            const next = (merge?.ec ?? c) + 1;
            if (next < sheet.widths.length) matchesAt.push({ r, c: next });
          }
      if (matchesAt.length === 1)
        fields[f.name] = { kind: l.mode === 'blocks' ? 'block' : 'cell', ...matchesAt[0] };
    }
  }
  return fields;
}
export function extractMapping(sheet: FieldSheet, l: MappingLayout) {
  assertLayout(sheet, l);
  if (sheet.previewLimited) throw Error('Fully load the sheet before mapping.');
  if (l.mode === 'blocks' && (l.end - l.start + 1) % l.blockSize !== 0)
    throw Error('The last form block is incomplete. Adjust the data range.');
  const fields = Object.keys(l.fields);
  if (l.mode !== 'form' && fields.length && !Object.values(l.fields).some((f) => f.kind !== 'cell'))
    throw Error('Map a value from each record, or choose Single form for fixed cells only.');
  if (!fields.length) throw Error('Map at least one database field.');
  const calculated = calculateSheet(sheet),
    rows: string[][] = [],
    locations: Record<string, { r: number; c: number }>[] = [],
    issues: { row: number; field: string; message: string }[] = [];
  const step = l.mode === 'blocks' ? l.blockSize : 1;
  for (let index = l.start; index <= l.end; index += step) {
    if (l.exclude.includes(index)) continue;
    if (l.mode === 'rows' && l.headerRows.includes(index)) continue;
    const places: Record<string, { r: number; c: number }> = {};
    const values = fields.map((name) => {
      const f = l.fields[name];
      let r = f.r,
        c = f.c;
      if (f.kind === 'column') r = index;
      if (f.kind === 'row') c = index;
      if (f.kind === 'block') r = f.r + index - l.start;
      if (r >= sheet.cells.length || c >= sheet.widths.length || (f.kind === 'block' && r > l.end))
        throw Error('The last form block is incomplete. Adjust the data range.');
      const p = sourceCell(sheet, r, c);
      places[name] = p;
      return calculated[p.r][p.c];
    });
    // Fixed report metadata alone must not produce records for empty detail rows.
    const variable = fields
      .map((name, i) => (l.fields[name].kind !== 'cell' ? i : -1))
      .filter((i) => i >= 0);
    const active = variable.length ? variable : fields.map((_, i) => i);
    if (active.some((i) => values[i].trim())) {
      rows.push(values);
      locations.push(places);
      values.forEach((v, i) => {
        if (/^#(REF!|VALUE!|DIV\/0!|CYCLE!|NAME\?|LIMIT!)/.test(v))
          issues.push({
            row: rows.length,
            field: fields[i],
            message: 'Fix the formula error before validation.',
          });
      });
    }
    if (l.mode === 'form') break;
  }
  return {
    rows,
    locations,
    mapping: Object.fromEntries(fields.map((name, i) => [name, i])),
    issues,
  };
}
