import { calculateSheet, translateFormula } from './workbookFormulas';
import type { FieldSheet } from './fieldWorkbook';
export function sortSheet(
  sheet: FieldSheet,
  column: number,
  descending = false,
  headerRows = 1
): FieldSheet {
  if (sheet.previewLimited) throw Error('Fully load this sheet before sorting.');
  if (sheet.merges.some((m) => m.er >= headerRows))
    throw Error('Unmerge data rows before sorting; merged headers can stay.');
  const calculated = calculateSheet(sheet);
  const order = sheet.cells.map((_, r) => r);
  const data = order.splice(headerRows);
  data.sort((a, b) => {
    const x = calculated[a][column],
      y = calculated[b][column];
    if (!x && !y) return a - b;
    if (!x) return 1;
    if (!y) return -1;
    const comparison =
      x.trim() && y.trim() && Number.isFinite(Number(x)) && Number.isFinite(Number(y))
        ? Number(x) - Number(y)
        : x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' });
    return (descending ? -comparison : comparison) || a - b;
  });
  order.push(...data);
  const positions = new Map(order.map((old, index) => [old, index]));
  const formats: NonNullable<FieldSheet['formats']> = {};
  for (const [key, value] of Object.entries(sheet.formats || {})) {
    const [r, c] = key.split(':').map(Number);
    formats[`${positions.get(r)}:${c}`] = value;
  }
  return {
    ...sheet,
    cells: order.map((r, index) =>
      sheet.cells[r].map((value) => translateFormula(value, index - r, 0))
    ),
    ...(sheet.connection?.layout?{connection:{...sheet.connection,validatedAt:undefined,layout:{...sheet.connection.layout,needsReview:true}}}:{}),
    heights: order.map((r) => sheet.heights[r]),
    rowOrigins: sheet.rowOrigins ? order.map(r => sheet.rowOrigins![r]) : undefined,
    formats,
  };
}
export function replaceSheetText(
  sheet: FieldSheet,
  find: string,
  replacement: string,
  matchCase = false
): FieldSheet {
  if (!find) return sheet;
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(escaped, matchCase ? 'g' : 'gi');
  return {
    ...sheet,
    cells: sheet.cells.map((row) => row.map((value) => value.replace(pattern, () => replacement))),
  };
}

export function visibleSheetRows(sheet: FieldSheet, calculated = calculateSheet(sheet)): number[] {
  const header = Math.max(sheet.view?.freezeRows || 0, (sheet.connection?.headerRow ?? 0) + 1);
  return sheet.cells
    .map((_, r) => r)
    .filter(
      (r) =>
        sheet.heights[r] > 0 &&
        (r < header ||
          !sheet.view?.filterText ||
          calculated[r][sheet.view.filterColumn || 0]
            ?.toLowerCase()
            .includes(sheet.view.filterText.toLowerCase()))
    );
}
