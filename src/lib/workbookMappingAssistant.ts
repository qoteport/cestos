import type { FieldSheet } from './fieldWorkbook';
import {
  assertLayout,
  type MappingLayout,
  type MappingTable,
  type MappingField,
} from './workbookMapping';
export type MappingProposal = {
  mode: MappingLayout['mode'];
  headerRows: number[];
  labelColumn: number;
  start: number;
  end: number;
  blockSize: number;
  exclude: number[];
  fields: (MappingField & {
    field: string;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
  })[];
  summary: string;
  warnings: string[];
};
/** Limit external analysis to bounded, representative cells, not the original workbook file. */
export function mappingSample(sheet: FieldSheet) {
  if (sheet.previewLimited) throw Error('Fully load the sheet before asking for a mapping.');
  const nonempty = sheet.cells
    .map((row, r) => ({ r, row }))
    .filter(({ row }) => row.some((v) => v.trim()));
  const picked = new Set<number>();
  nonempty.slice(0, 40).forEach(({ r }) => picked.add(r));
  nonempty.slice(-12).forEach(({ r }) => picked.add(r));
  for (let i = 0; i < Math.min(60, nonempty.length); i++)
    picked.add(
      nonempty[
        Math.floor((i * (nonempty.length - 1)) / Math.max(1, Math.min(60, nonempty.length) - 1))
      ].r
    );
  const cells: { r: number; c: number; text: string; bold: boolean }[] = [];
  const total = nonempty.reduce((n, { row }) => n + row.filter((v) => v.trim()).length, 0);
  let truncated = false;
  const chosen = nonempty.filter(({ r }) => picked.has(r));
  chosen.forEach(({ r, row }, position) => {
    const entries = row.map((text, c) => ({ text, c })).filter(({ text }) => text.trim());
    const budget = Math.min(
      entries.length,
      Math.floor((1200 - cells.length) / (chosen.length - position))
    );
    const indexes = new Set<number>();
    if (budget > 1) indexes.add(entries.length - 1);
    for (let i = 0; i < Math.min(4, budget - (budget > 1 ? 1 : 0)); i++) indexes.add(i);
    for (let i = 0; indexes.size < budget && i < budget * 2; i++)
      indexes.add(
        Math.min(
          entries.length - 1,
          Math.floor((i * (entries.length - 1)) / Math.max(1, budget - 1))
        )
      );
    for (let i = 0; indexes.size < budget; i++) indexes.add(i);
    for (const i of [...indexes].sort((a, b) => a - b)) {
      const { text, c } = entries[i];
      cells.push({ r, c, text: text.slice(0, 160), bold: !!sheet.formats?.[`${r}:${c}`]?.bold });
      if (text.length > 160) truncated = true;
    }
  });
  return {
    rowCount: sheet.cells.length,
    columnCount: sheet.widths.length,
    cells,
    merges: sheet.merges.slice(0, 500).map(({ r, c, er, ec }) => ({ r, c, er, ec })),
    sampled: truncated || cells.length < total || sheet.merges.length > 500,
  };
}
export function proposalLayout(
  sheet: FieldSheet,
  table: MappingTable,
  p: MappingProposal,
  selected: string[]
): MappingLayout {
  if (!p || !Array.isArray(p.fields) || !Array.isArray(p.warnings) || typeof p.summary !== 'string')
    throw Error('The assistant returned an invalid proposal.');
  const seen = new Set<string>();
  for (const f of p.fields) {
    if (
      !table.columns.some((c) => c.name === f.field) ||
      seen.has(f.field) ||
      !['high', 'medium', 'low'].includes(f.confidence) ||
      typeof f.reason !== 'string'
    )
      throw Error('The assistant returned an unknown or duplicate field.');
    seen.add(f.field);
  }
  const layout: MappingLayout = {
    version: 1,
    mode: p.mode,
    headerRows: p.headerRows,
    labelColumn: p.labelColumn,
    start: p.start,
    end: p.end,
    blockSize: p.blockSize,
    exclude: p.exclude,
    fields: Object.fromEntries(
      p.fields
        .filter((f) => selected.includes(f.field))
        .map(({ field, kind, r, c }) => [field, { kind, r, c }])
    ),
  };
  assertLayout(sheet, layout);
  return layout;
}
export function compatibleLayout(a: MappingLayout, b: MappingLayout) {
  return (
    JSON.stringify({ ...a, fields: {}, needsReview: false }) ===
    JSON.stringify({ ...b, fields: {}, needsReview: false })
  );
}
