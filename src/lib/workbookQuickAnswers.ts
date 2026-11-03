import type { FieldWorkbook } from './fieldWorkbook';
import { calculateSheet } from './workbookFormulas';

export type AnswerSheet = { id: string; name: string; row_count: number; column_count: number; incomplete: boolean; cells: { r: number; c: number; text: string; formula?: string }[] };
export type AnswerContext = { workbook_name: string; sheets: AnswerSheet[]; omitted_sheets: number };

/** Share cell text only, never original files, images, saved baselines or connection credentials. */
export function quickAnswerContext(book?: FieldWorkbook, activeSheetId?: string, scope: 'sheet' | 'workbook' | 'platform' = 'workbook'): AnswerContext {
  if (!book || scope === 'platform') return { workbook_name: '', sheets: [], omitted_sheets: 0 };
  const candidates = scope === 'sheet' ? book.sheets.filter(s => s.id === activeSheetId) : [...book.sheets].sort((a, b) => Number(b.id === activeSheetId) - Number(a.id === activeSheetId));
  const sheets: AnswerSheet[] = [];
  let budget = 180000, count = 0;
  for (const sheet of candidates.slice(0, 12)) {
    const calculated = sheet.cells.length * sheet.widths.length <= 20000 ? calculateSheet(sheet) : null;
    const result: AnswerSheet = { id: sheet.id, name: sheet.name.slice(0, 200), row_count: sheet.cells.length, column_count: sheet.widths.length, incomplete: !!sheet.previewLimited, cells: [] };
    for (let r = 0; r < sheet.cells.length; r++) {
      for (let c = 0; c < sheet.cells[r].length; c++) {
        const raw = sheet.cells[r][c];
        if (!raw.trim()) continue;
        const value = raw.startsWith('=') && calculated ? calculated[r][c] : raw;
        const text = value.slice(0, 8000), formula = raw.startsWith('=') ? raw.slice(0, 8000) : undefined;
        const size = text.length + (formula?.length || 0);
        if (count >= 6000 || size > budget) { result.incomplete = true; continue; }
        result.cells.push({ r, c, text, ...(formula ? { formula } : {}) });
        count++; budget -= size;
        if (text !== value || raw.length > 8000) result.incomplete = true;
      }
    }
    sheets.push(result);
  }
  return { workbook_name: book.name.slice(0, 200), sheets, omitted_sheets: Math.max(0, candidates.length - sheets.length) };
}
