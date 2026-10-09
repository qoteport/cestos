import {WORKBOOK_MAX_ROWS,WORKBOOK_MAX_COLS} from './workbookLimits';
import {calculateSheet} from './workbookFormulas';
import { typedCellValue, cellNumberFormat } from './workbookCellTypes';
import type { FieldWorkbook, FieldSheet, CellFormat } from './fieldWorkbook';
import type { Workbook, Worksheet, Cell, Color } from 'exceljs';
const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export function encodeOriginal(bytes: Uint8Array): string {
  let text = '';
  for (let i = 0; i < bytes.length; i += 32768)
    text += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(text);
}
export function originalBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
export function sheetSnapshot(sheet: FieldSheet): string {
  return JSON.stringify({
    name: sheet.name,
    media:sheet.media,
    view: sheet.view,
    print: sheet.print,
    cells: sheet.cells,
    widths: sheet.widths,
    heights: sheet.heights,
    merges: sheet.merges,
    formats: sheet.formats,
    rowOrigins: sheet.rowOrigins,
    columnOrigins: sheet.columnOrigins,
  });
}
function color(value: Partial<Color> | undefined, theme: string[]): string | undefined {
  if (!value) return;
  const rgb = value.argb?.slice(-6) || theme[value.theme ?? -1];
  if (!rgb || !/^[0-9a-f]{6}$/i.test(rgb)) return;
  const tint = (value as Partial<Color> & { tint?: number }).tint || 0;
  return (
    '#' +
    rgb
      .match(/../g)!
      .map((hex) => {
        const n = parseInt(hex, 16);
        return Math.round(tint < 0 ? n * (1 + tint) : n + (255 - n) * tint)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
}
function themeColors(book: Workbook): string[] {
  const defaults = [
    'FFFFFF',
    '000000',
    'EEECE1',
    '1F497D',
    '4F81BD',
    'C0504D',
    '9BBB59',
    '8064A2',
    '4BACC6',
    'F79646',
  ];
  const themes = (book.model as any).themes;
  const xml = typeof themes?.theme1 === 'string' ? themes.theme1 : '';
  return [
    'lt1',
    'dk1',
    'lt2',
    'dk2',
    'accent1',
    'accent2',
    'accent3',
    'accent4',
    'accent5',
    'accent6',
  ].map((key, i) => {
    const body = xml.match(new RegExp(`<a:${key}>([\\s\\S]*?)</a:${key}>`))?.[1];
    return body?.match(/(?:lastClr|val)="([A-Fa-f0-9]{6})"/)?.[1] || defaults[i];
  });
}
function format(cell: Cell, theme: string[]): CellFormat {
  const font = cell.font || {},
    alignment = cell.alignment || {},
    fill = cell.fill;
  const borders: Record<string, string> = {};
  for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
    const border = cell.border?.[edge];
    if (border?.style) {
      const thickness = /thick/.test(border.style) ? 3 : /medium|double/.test(border.style) ? 2 : 1;
      const style =
        border.style === 'double'
          ? 'double'
          : /dash/i.test(border.style)
            ? 'dashed'
            : border.style === 'dotted'
              ? 'dotted'
              : 'solid';
      borders[edge] = `${thickness}px ${style} ${color(border.color, theme) || '#334155'}`;
    }
  }
  return {
    bold: Boolean(font.bold),
    italic: Boolean(font.italic),
    align:
      alignment.horizontal === 'center' || alignment.horizontal === 'right'
        ? alignment.horizontal
        : 'left',
    fontName: font.name,
    fontSize: font.size,
    color: color(font.color, theme),
    background:
      fill?.type === 'pattern' && fill.pattern === 'solid' ? color(fill.fgColor, theme) : undefined,
    underline: Boolean(font.underline),
    strike: Boolean(font.strike),
    wrap: Boolean(alignment.wrapText),
    vertical:
      alignment.vertical === 'top' || alignment.vertical === 'bottom'
        ? alignment.vertical
        : 'middle',
    borders,
  };
}
export async function importStyledWorkbook(file: File): Promise<FieldWorkbook> {
  const Excel = await import('exceljs');
  const X = await import('xlsx');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const original = new Excel.Workbook();
  original.calcProperties.fullCalcOnLoad=true;
  if (bytes.length) await original.xlsx.load(bytes as any);
  const values = X.read(bytes, { type: 'array', cellStyles: true, raw: true });
  const theme = themeColors(original);
  const sheets: FieldSheet[] = original.worksheets.map((ws) => {
    const rows = Math.max(1, Math.min(WORKBOOK_MAX_ROWS, ws.rowCount)),
      cols = Math.max(1, Math.min(WORKBOOK_MAX_COLS, ws.columnCount));
    const sheet: FieldSheet = {
      id: crypto.randomUUID(),
      name: ws.name,
      imported: true,
      excelId: ws.id,
      hidden: ws.state !== 'visible',
      previewLimited: ws.rowCount > WORKBOOK_MAX_ROWS || ws.columnCount > WORKBOOK_MAX_COLS,
      cells: Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const cell = values.Sheets[ws.name]?.[X.utils.encode_cell({ r, c })];
          return cell?.f ? '=' + cell.f : cell ? X.utils.format_cell(cell) : '';
        })
      ),
      widths: Array.from({ length: cols }, (_, c) =>
        ws.getColumn(c + 1).hidden
          ? 0
          : Math.max(
              1,
              values.Sheets[ws.name]?.['!cols']?.[c]?.wpx ||
                (ws.getColumn(c + 1).width || ws.properties.defaultColWidth || 8.43) * 7 + 5
            )
      ),
      heights: Array.from({ length: rows }, (_, r) =>
        ws.getRow(r + 1).hidden
          ? 0
          : Math.max(1, ((ws.getRow(r + 1).height || ws.properties.defaultRowHeight || 15) * 4) / 3)
      ),
      merges: [],
      formats: {},
      rowOrigins: Array.from({ length: rows }, (_, r) => r + 1),
      columnOrigins: Array.from({ length: cols }, (_, c) => c + 1),
    };
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        sheet.formats![`${r}:${c}`] = format(ws.getCell(r + 1, c + 1), theme);
    for (const address of ws.model.merges || []) {
      const range = X.utils.decode_range(address);
      if (range.e.r < rows && range.e.c < cols)
        sheet.merges.push({ r: range.s.r, c: range.s.c, er: range.e.r, ec: range.e.c });
    }
    return sheet;
  });
  if (!sheets.length) throw new Error('No worksheets found in this workbook.');
  return {
    version: 1,
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, ''),
    template: false,
    sheets,
    source: {
      name: file.name,
      base64: encodeOriginal(bytes),
      sheets: Object.fromEntries(
        sheets.map((s) => [s.id, { excelId: s.excelId!, snapshot: sheetSnapshot(s) }])
      ),
    },
  };
}
function reshape(ws: Worksheet, origins: (number | null)[], count: number, axis: 'row' | 'column') {
  if(axis==='row') {
    // Snapshot before moving rows so sorting retains borders, comments and native cell types.
    const models=Array.from({length:count},(_,i)=>ws.getRow(i+1).model);
    for(let i=0;i<origins.length;i++) {
      const source=origins[i]===null?undefined:models[origins[i]!-1];
      const row=ws.getRow(i+1);
      if(source)row.model={...source,number:i+1,cells:(source.cells||[]).map(cell=>({...cell,address:String(cell.address).replace(/\d+$/,String(i+1)) as unknown as typeof cell.address}))};
      else row.model={number:i+1,cells:[],style:{},hidden:false} as typeof row.model;
    }
    if(count>origins.length)ws.spliceRows(origins.length+1,count-origins.length);
    return;
  }
  const remaining: (number | null)[] = Array.from({ length: count }, (_, i) => i + 1);
  const splice = (position: number, remove: boolean) => {
    ws.spliceColumns(position + 1, remove ? 1 : 0, ...(remove ? [] : [[]]));
  };
  for (let i = 0; i < origins.length; i++) {
    if (origins[i] === null) {
      splice(i, false);
      remaining.splice(i, 0, null);
    } else
      while (remaining[i] !== origins[i] && i < remaining.length) {
        splice(i, true);
        remaining.splice(i, 1);
      }
  }
  while (remaining.length > origins.length) {
    splice(origins.length, true);
    remaining.splice(origins.length, 1);
  }
}
export async function exportStyledWorkbook(book: FieldWorkbook): Promise<Blob> {
  const source = book.source || {base64:'', sheets:{} as Record<string,{excelId:number;snapshot:string}>};
  const bytes = originalBytes(source.base64);
  if (
    book.sheets.length === Object.keys(source.sheets).length &&
    book.sheets.every((s) => source.sheets[s.id]?.snapshot === sheetSnapshot(s))
  )
    return new Blob([bytes as BlobPart], { type: MIME });
  const Excel = await import('exceljs');
  const X = await import('xlsx');
  const original = new Excel.Workbook();
  if (bytes.length) await original.xlsx.load(bytes as any);
  const retainedIds = new Set(book.sheets.map((s) => source.sheets[s.id]?.excelId));
  for (const ws of [...original.worksheets])
    if (!retainedIds.has(ws.id)) original.removeWorksheet(ws.id);
  for (const sheet of book.sheets) {
    const calculated=calculateSheet(sheet);
    const baseline = source.sheets[sheet.id];
    const previous = baseline ? JSON.parse(baseline.snapshot) : null;
    const ws =
      (baseline ? original.getWorksheet(baseline.excelId) : undefined) ||
      original.addWorksheet(sheet.name);
    ws.name = sheet.name;
    if(sheet.view)ws.views=[{state:'frozen',xSplit:sheet.view.freezeColumns||0,ySplit:sheet.view.freezeRows||0}];
    if(sheet.print){ws.pageSetup.orientation=sheet.print.orientation||'landscape';ws.pageSetup.fitToPage=sheet.print.fit!=='actual';ws.pageSetup.fitToWidth=1;ws.pageSetup.fitToHeight=0;
      ws.pageSetup.printArea=sheet.print.area?X.utils.encode_range({s:{r:sheet.print.area.r,c:sheet.print.area.c},e:{r:sheet.print.area.er,c:sheet.print.area.ec}}):'';
      ws.pageSetup.printTitlesRow=sheet.print.repeatRows?`${(sheet.print.area?.r||0)+1}:${(sheet.print.area?.r||0)+sheet.print.repeatRows}`:'';
      (ws as Worksheet & {rowBreaks:unknown[]}).rowBreaks=[];
      for(const row of sheet.print.breakRows||[])if(row>0)ws.getRow(row).addPageBreak();
    }

    if (baseline?.snapshot === sheetSnapshot(sheet)) continue;
    const shapeChanged =
      previous &&
      (JSON.stringify(sheet.rowOrigins) !== JSON.stringify(previous.rowOrigins) ||
        JSON.stringify(sheet.columnOrigins) !== JSON.stringify(previous.columnOrigins));
    if (
      sheet.previewLimited &&
      (shapeChanged || JSON.stringify(previous?.merges) !== JSON.stringify(sheet.merges))
    )
      throw new Error(
        'This large worksheet is only partially shown. Download the original to change its row/column structure in Excel.'
      );
    const mergeChanged =
      shapeChanged || JSON.stringify(previous?.merges) !== JSON.stringify(sheet.merges);
    if (mergeChanged) for (const merge of [...(ws.model.merges || [])]) ws.unMergeCells(merge);
    if (shapeChanged) {
      reshape(ws, sheet.rowOrigins || [], previous.cells.length, 'row');
      reshape(ws, sheet.columnOrigins || [], previous.widths.length, 'column');
    }
    for (let r = 0; r < sheet.cells.length; r++)
      for (let c = 0; c < sheet.widths.length; c++) {
        const originalRow = shapeChanged ? (sheet.rowOrigins?.[r] ?? 0) - 1 : r,
          originalCol = shapeChanged ? (sheet.columnOrigins?.[c] ?? 0) - 1 : c;
        const cell = ws.getCell(r + 1, c + 1);
        const value = sheet.cells[r][c];
        if (!previous || value !== previous.cells[originalRow]?.[originalCol])
          cell.value =
            value === ''
              ? null
              : typeof cell.value === 'number' && /^[-+]?\d+(\.\d+)?$/.test(value)
                ? Number(value)
                : value;
        const style = {...(!previous ? {bold: !sheet.imported && r === 0, italic: false, align: 'left' as const} : {}), ...sheet.formats?.[`${r}:${c}`]};
        const oldStyle = previous?.formats?.[`${originalRow}:${originalCol}`];
        if (style.dataType) {
          cell.numFmt = cellNumberFormat(style);
          if (!previous || value !== previous.cells[originalRow]?.[originalCol] || style.dataType !== oldStyle?.dataType) {
            // Preserve existing formulas when only their display format changes.
            if (!cell.formula || value !== previous?.cells[originalRow]?.[originalCol]) cell.value = typedCellValue(value, style);
          }
        }
        if(value.startsWith('='))cell.value={formula:value.slice(1),result:Number.isFinite(Number(calculated[r][c]))?Number(calculated[r][c]):undefined};
        if (style && JSON.stringify(style) !== JSON.stringify(oldStyle)) {
          cell.font = { ...cell.font, bold: style.bold, italic: style.italic };
          if (!previous) {
            cell.font = {
              ...cell.font,
              name: style.fontName,
              size: style.fontSize,
              underline: style.underline,
              strike: style.strike,
              ...(style.color ? { color: { argb: 'FF' + style.color.slice(1) } } : {}),
            };
            if (style.background)
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF' + style.background.slice(1) },
              };
            cell.alignment = { ...cell.alignment, wrapText: style.wrap, vertical: style.vertical };
          }
          if (style.color !== oldStyle?.color) cell.font = {...cell.font, color: style.color ? {argb: 'FF' + style.color.slice(1)} : {theme: 1}};
          if (style.background !== oldStyle?.background) cell.fill = style.background ? {type:'pattern', pattern:'solid', fgColor:{argb:'FF'+style.background.slice(1)}} : {type:'pattern', pattern:'none'};
          cell.alignment = { ...cell.alignment, horizontal: style.align || 'left' };
        }
      }
    sheet.widths.forEach((width, c) => {
      if (
        !previous ||
        width !== previous.widths[shapeChanged ? (sheet.columnOrigins?.[c] ?? 0) - 1 : c]
      ) {
        ws.getColumn(c + 1).hidden = width === 0;
        if (width > 0) ws.getColumn(c + 1).width = Math.max(0.1, (width - 5) / 7);
      }
    });
    sheet.heights.forEach((height, r) => {
      if (
        !previous ||
        height !== previous.heights[shapeChanged ? (sheet.rowOrigins?.[r] ?? 0) - 1 : r]
      ) {
        ws.getRow(r + 1).hidden = height === 0;
        if (height > 0) ws.getRow(r + 1).height = (height * 3) / 4;
      }
    });
    if (mergeChanged)
      for (const m of sheet.merges)
        ws.mergeCells(X.utils.encode_range({ s: { r: m.r, c: m.c }, e: { r: m.er, c: m.ec } }));
  }
  // Native workbook backups retain every attachment. Excel embeds supported images;
  // other attachments are identified in notes and available in the attachment ZIP.
  for(const sheet of book.sheets){const ws=original.getWorksheet(sheet.name);if(!ws)continue;
    for(const [key,ids] of Object.entries(sheet.media||{})){const [r,c]=key.split(':').map(Number);const assets=ids.map(id=>book.assets?.[id]).filter((a):a is NonNullable<typeof a>=>!!a);
      const embedded=assets.find(a=>['image/png','image/jpeg','image/gif'].includes(a.mime));
      if(embedded){const imageId=original.addImage({base64:embedded.data,extension:embedded.mime.split('/')[1] as 'png'|'jpeg'|'gif'});ws.addImage(imageId,{tl:{col:c,row:r},ext:{width:Math.max(30,sheet.widths[c]-10),height:Math.max(30,sheet.heights[r]-25)},editAs:'oneCell'});}
      const cell=ws.getCell(r+1,c+1);const old=typeof cell.note==='string'?cell.note:cell.note?.texts?.map(t=>t.text||'').join('')||'';
      cell.note=[old,`Workbook attachments: ${assets.map(a=>a.name).join(', ')}. Download the attachments ZIP or use the Cestos backup for all original files.`].filter(Boolean).join('\n');
    }
  }
  original.calcProperties.fullCalcOnLoad = true;
  return new Blob([(await original.xlsx.writeBuffer()) as BlobPart], { type: MIME });
}
