import type { FieldSheet, CellRange } from './fieldWorkbook';
import { displayCellValue } from './workbookCellTypes';

export function autofillRange(
  sheet: FieldSheet,
  range: CellRange,
  direction: 'down' | 'right',
  series = false
): FieldSheet {
  if (
    sheet.merges.some(
      (m) => !(m.er < range.r || m.r > range.er || m.ec < range.c || m.c > range.ec)
    )
  )
    throw new Error('Unmerge this selection before filling it.');
  const next = {
    ...sheet,
    cells: sheet.cells.map((row) => [...row]),
    formats: { ...sheet.formats },
  };
  const length = direction === 'down' ? range.er - range.r + 1 : range.ec - range.c + 1;
  const lanes = direction === 'down' ? range.ec - range.c + 1 : range.er - range.r + 1;
  if (length < 2) throw new Error('Select at least two cells in the fill direction.');
  for (let lane = 0; lane < lanes; lane++) {
    const position = (offset: number) =>
      direction === 'down'
        ? [range.r + offset, range.c + lane]
        : [range.r + lane, range.c + offset];
    const [r, c] = position(0),
      [r2, c2] = position(1);
    const first = sheet.cells[r][c],
      second = sheet.cells[r2][c2];
    const numeric = /^-?\d+(\.\d+)?$/;
    const date = /^\d{4}-\d{2}-\d{2}$/;
    const isNumber = numeric.test(first) && numeric.test(second);
    const date1 = Date.parse(first + 'T00:00:00Z'),
      date2 = Date.parse(second + 'T00:00:00Z');
    const isDate =
      date.test(first) &&
      date.test(second) &&
      Number.isFinite(date1) &&
      Number.isFinite(date2) &&
      new Date(date1).toISOString().slice(0, 10) === first &&
      new Date(date2).toISOString().slice(0, 10) === second;
    if (series && ((!isNumber && !isDate) || length < 3))
      throw new Error(
        'Select two starting numbers or ISO dates (YYYY-MM-DD), followed by the cells to fill.'
      );
    for (let index = series ? 2 : 1; index < length; index++) {
      const [tr, tc] = position(index);
      next.cells[tr][tc] = series
        ? isNumber
          ? String(Number((Number(first) + (Number(second) - Number(first)) * index).toFixed(10)))
          : new Date(date1 + (date2 - date1) * index).toISOString().slice(0, 10)
        : first;
      if (sheet.formats?.[`${r}:${c}`])
        next.formats[`${tr}:${tc}`] = { ...sheet.formats[`${r}:${c}`] };
      else delete next.formats[`${tr}:${tc}`];
    }
  }
  return next;
}
export function commonColumnValues(
  sheets: FieldSheet[],
  heading: string,
  current: FieldSheet,
  column: number
): string[] {
  const normalized = heading.trim().toLowerCase();
  const counts = new Map<string, number>();
  for (const sheet of [current, ...sheets.filter((sheet) => sheet.id !== current.id)]) {
    const c =
      sheet === current
        ? column
        : normalized
          ? (sheet.cells[0]?.findIndex((value) => value.trim().toLowerCase() === normalized) ?? -1)
          : -1;
    if (c < 0) continue;
    for (const row of sheet.cells.slice(1)) {
      const value = row[c]?.trim();
      if (value && value.length <= 200) counts.set(value, (counts.get(value) || 0) + 1);
    }
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([value]) => value);
}
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
  );
export function printableSheetHtml(sheet: FieldSheet, workbookName: string): string {
  if (sheet.previewLimited)
    throw new Error('This sheet is partially loaded. Export Excel to print every row.');
  const cells = sheet.cells
    .map(
      (row, r) =>
        `<tr style="height:${sheet.heights[r]}px;${sheet.heights[r] === 0 ? 'display:none' : ''}">${row
          .map((value, c) => {
            if (sheet.widths[c] === 0) return '';
            const merge = sheet.merges.find((m) => r >= m.r && r <= m.er && c >= m.c && c <= m.ec);
            if (merge && (r !== merge.r || c !== merge.c)) return '';
            const f = { bold: !sheet.imported && r === 0, ...(sheet.formats?.[`${r}:${c}`] || {}) };
            const css = `font-weight:${f.bold ? 'bold' : 'normal'};font-style:${f.italic ? 'italic' : 'normal'};text-align:${['left', 'center', 'right'].includes(f.align || '') ? f.align : 'left'};color:${/^#[0-9a-f]{6}$/i.test(f.color || '') ? f.color : '#000'};background:${/^#[0-9a-f]{6}$/i.test(f.background || '') ? f.background : '#fff'};`;
            return `<td ${merge ? `rowspan="${merge.er - merge.r + 1}" colspan="${merge.ec - merge.c + 1}"` : ''} style="${css}">${escape(displayCellValue(value, f)) || '&nbsp;'}</td>`;
          })
          .join('')}</tr>`
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(workbookName + ' — ' + sheet.name)}</title><style>@page{size:landscape;margin:12mm}body{font:11px Arial;color:#000}h1{font-size:16px}table{border-collapse:collapse;width:100%;table-layout:fixed}td{border:1px solid #777;padding:4px;white-space:pre-wrap;overflow-wrap:anywhere;vertical-align:middle;print-color-adjust:exact}tr{break-inside:avoid}</style></head><body><h1>${escape(workbookName)} — ${escape(sheet.name)}</h1><table><colgroup>${sheet.widths.map((w) => `<col style="width:${(100 * w) / (sheet.widths.reduce((sum, width) => sum + width, 0) || 1)}%;${w === 0 ? 'display:none' : ''}">`).join('')}</colgroup><tbody>${cells}</tbody></table></body></html>`;
}
export function printSheet(sheet: FieldSheet, workbookName: string) {
  const html = printableSheetHtml(sheet, workbookName);
  const frame = document.createElement('iframe');
  frame.title = 'Print active worksheet';
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0';
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
  const remove = () => frame.remove();
  frame.contentWindow?.addEventListener('afterprint', remove, { once: true });
  window.setTimeout(remove, 120000);
}
