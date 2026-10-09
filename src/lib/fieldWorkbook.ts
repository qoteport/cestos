import {validateMedia,type WorkbookAsset,type SheetFolder} from './workbookMedia';
import {assertLayout, type MappingLayout} from './workbookMapping';
import {shiftReferences} from './workbookFormulas';
import {WORKBOOK_MAX_ROWS,WORKBOOK_MAX_COLS} from './workbookLimits';
import { importStyledWorkbook, exportStyledWorkbook } from './excelWorkbook';
export type CellFormat = {
  dataType?: 'general' | 'text' | 'number' | 'currency' | 'percent' | 'date' | 'time' | 'datetime';
  decimals?: number; currency?: string;
  dateOrder?: 'ymd' | 'dmy' | 'mdy';
  dateSeparator?: '-' | '/' | '.';
  timeClock?: '12' | '24';
  showSeconds?: boolean;
  fontName?: string;
  fontSize?: number;
  color?: string;
  background?: string;
  underline?: boolean;
  strike?: boolean;
  wrap?: boolean;
  vertical?: 'top' | 'middle' | 'bottom';
  borders?: Record<string, string>;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
};
export type CellRange = { r: number; c: number; er: number; ec: number };
export type FieldSheet = {
  folderId?:string;
  media?:Record<string,string[]>;
  view?: {freezeRows?:number;freezeColumns?:number;filterColumn?:number;filterText?:string};
  print?: {area?:CellRange;orientation?:'landscape'|'portrait';repeatRows?:number;fit?:'width'|'actual';breakRows?:number[]};
  databaseSource?: {path:string; loadedAt:string; columns:string[]; part:number; parts:number; mode?:'update'|'insert'; baseline?:Record<string,Record<string,unknown>>};
  connection?: { table: string; mapping: Record<string, number>; headerRow: number; validatedAt?: string; importId?: string; writeMode?: 'insert'; layout?: MappingLayout };
  id: string;
  name: string;
  cells: string[][];
  widths: number[];
  heights: number[];
  merges: CellRange[];
  formats?: Record<string, CellFormat>;
  imported?: boolean;
  excelId?: number;
  hidden?: boolean;
  previewLimited?: boolean;
  rowOrigins?: (number | null)[];
  columnOrigins?: (number | null)[];
};
export type FieldWorkbook = {
  folders?:SheetFolder[];
  assets?:Record<string,WorkbookAsset>;
  version: 1;
  createdAt?: string;
  id: string;
  name: string;
  sheets: FieldSheet[];
  template: boolean;
  source?: {
    name: string;
    base64: string;
    sheets: Record<string, { excelId: number; snapshot: string }>;
  };
};
export const MAX_ROWS = WORKBOOK_MAX_ROWS;
export const MAX_COLS = WORKBOOK_MAX_COLS;
const uid = () => crypto.randomUUID();
export function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n; n = Math.floor((n - 1) / 26))
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}
export function makeSheet(name = 'Sheet 1', headers: string[] = []): FieldSheet {
  const cols = Math.max(8, headers.length);
  return {
    id: uid(),
    name,
    cells: Array.from({ length: 25 }, (_, r) =>
      Array.from({ length: cols }, (_, c) => (r === 0 ? headers[c] || '' : ''))
    ),
    widths: Array(cols).fill(160),
    heights: Array(25).fill(34),
    merges: [],
  };
}
export const workbookTemplates: {
  name: string;
  description: string;
  sheets: [string, string[]][];
}[] = [
  {
    name: 'Daily Fuel Consumption Sheet',
    description: 'Daily fuel issues, meter readings, receivers and acknowledgements.',
    sheets: [
      [
        'Daily fuel consumption',
        ['Date', 'Time', 'Equipment', 'Quantity (Lt)', 'Km / Hrs', 'Receivers name', 'Signature'],
      ],
    ],
  },
  {
    name: 'Action Tracker',
    description: 'Findings, owners, priorities and completion.',
    sheets: [
      [
        'Actions',
        [
          'Date',
          'Project',
          'Site',
          'Equipment / Area',
          'Issue / Finding',
          'Action Taken',
          'Parts Required',
          'Responsible',
          'Priority',
          'Status',
          'Completion Date',
          'Remarks',
        ],
      ],
    ],
  },
  {
    name: 'PM Tracker',
    description: 'Planned services and completed maintenance.',
    sheets: [
      [
        'PM tracker',
        [
          'Project',
          'Site',
          'Equipment',
          'Unit Number',
          'Service Type',
          'Due Date',
          'Planned / Actual',
          'PM Completed',
          'Defects Found',
          'Parts Required',
          'Technician',
          'Remarks',
        ],
      ],
    ],
  },
  {
    name: 'Equipment Register',
    description: 'Equipment, condition and required actions.',
    sheets: [
      [
        'Equipment register',
        [
          'Project',
          'Site',
          'Equipment',
          'Unit Number',
          'Type',
          'Status',
          'Open Defects',
          'Action Required',
          'Priority',
          'Remarks',
        ],
      ],
    ],
  },
];
export function newWorkbook(templateIndex?: number): FieldWorkbook {
  const template = templateIndex === undefined ? undefined : workbookTemplates[templateIndex];
  return {
    version: 1,
    id: uid(),
    createdAt: new Date().toISOString(),
    name: template?.name || 'Untitled workbook',
    template: false,
    sheets: template
      ? template.sheets.map(([name, headers]) => makeSheet(name, headers))
      : [makeSheet()],
  };
}
export function copyWorkbook(book: FieldWorkbook, template = false): FieldWorkbook {
  const copy = structuredClone(book);
  // Copy mapping configuration only, never record identities or prior import state.
  copy.sheets = copy.sheets.map(sheet => ({
    ...sheet,
    ...(sheet.databaseSource ? {databaseSource:{...sheet.databaseSource,mode:'update' as const,baseline:{}},cells:sheet.cells.map((row,r)=>r?row.map((value,c)=>sheet.cells[0][c]==='id'?'':value):row)} : {}),
    ...(sheet.connection ? {connection: {
      table: sheet.connection.table,
      mapping: {...sheet.connection.mapping},
      headerRow: sheet.connection.headerRow,
      ...(sheet.connection.layout?{layout:structuredClone(sheet.connection.layout)}:{}),
      importId: uid(),
      writeMode: 'insert' as const,
    }} : {}),
  }));
  return {
    ...copy,
    id: uid(),
    createdAt: new Date().toISOString(),
    name: `${book.name}${template ? ' template' : ' copy'}`,
    template,
  };
}
/** Validation applies to exact sheet data, never to a later edit. */
export function invalidateMapping(previous: FieldSheet, next: FieldSheet): FieldSheet {
  if (!next.connection?.validatedAt) return next;
  if (JSON.stringify(previous.cells) === JSON.stringify(next.cells) &&
      JSON.stringify(previous.formats) === JSON.stringify(next.formats) &&
      JSON.stringify(previous.merges) === JSON.stringify(next.merges)) return next;
  const connection = {...next.connection};
  delete connection.validatedAt;
  return {...next, connection};
}
export function rangeBetween(a: { r: number; c: number }, b = a): CellRange {
  return {
    r: Math.min(a.r, b.r),
    c: Math.min(a.c, b.c),
    er: Math.max(a.r, b.r),
    ec: Math.max(a.c, b.c),
  };
}
export function overlaps(a: CellRange, b: CellRange) {
  return a.r <= b.er && a.er >= b.r && a.c <= b.ec && a.ec >= b.c;
}
export function mergeCells(sheet: FieldSheet, range: CellRange): FieldSheet {
  if (range.r === range.er && range.c === range.ec) return sheet;
  const values: string[] = [];
  for (let r = range.r; r <= range.er; r++)
    for (let c = range.c; c <= range.ec; c++) if (sheet.cells[r][c]) values.push(sheet.cells[r][c]);
  if (values.length > 1)
    throw new Error(
      'This selection has more than one filled cell. Move the extra values before merging so no data is lost.'
    );
  if (sheet.merges.some((m) => overlaps(m, range)))
    throw new Error('Unmerge the existing merged cells before making a new merge.');
  const next = structuredClone(sheet);
  for (let r = range.r; r <= range.er; r++)
    for (let c = range.c; c <= range.ec; c++) next.cells[r][c] = '';
  next.cells[range.r][range.c] = values[0] || '';
  const attachments:string[]=[];for(const [key,ids] of Object.entries(next.media||{})){const [r,c]=key.split(':').map(Number);if(r>=range.r&&r<=range.er&&c>=range.c&&c<=range.ec){attachments.push(...ids);delete next.media![key];}}
  if(attachments.length>10)throw Error('A merged cell can hold up to 10 attachments.');
  if(attachments.length)next.media={...next.media,[`${range.r}:${range.c}`]:[...new Set(attachments)]};
  next.merges.push(range);
  return next;
}
export function cellFormat(sheet: FieldSheet, r: number, c: number): CellFormat {
  return {
    bold: !sheet.imported && r === 0,
    italic: false,
    align: 'left',
    ...sheet.formats?.[`${r}:${c}`],
  };
}
export function formatCells(sheet: FieldSheet, range: CellRange, format: CellFormat): FieldSheet {
  const formats = { ...sheet.formats };
  for (let r = range.r; r <= range.er; r++)
    for (let c = range.c; c <= range.ec; c++) {
      const merged = sheet.merges.find((m) => r >= m.r && r <= m.er && c >= m.c && c <= m.ec);
      const key = merged ? `${merged.r}:${merged.c}` : `${r}:${c}`;
      formats[key] = { ...formats[key], ...format };
    }
  return { ...sheet, formats };
}
export const tableDesigns = [
  { name: 'Emerald', header: '#065f46', stripe: '#ecfdf5', text: '#064e3b' },
  { name: 'Ocean', header: '#1e40af', stripe: '#eff6ff', text: '#172554' },
  { name: 'Slate', header: '#334155', stripe: '#f1f5f9', text: '#0f172a' },
  { name: 'Plum', header: '#6b21a8', stripe: '#faf5ff', text: '#3b0764' },
  { name: 'Amber', header: '#92400e', stripe: '#fffbeb', text: '#451a03' },
] as const;

export function applyTableDesign(sheet: FieldSheet, range: CellRange, designIndex: number): FieldSheet {
  const design = tableDesigns[designIndex];
  if (!design) throw new Error('Choose a table design.');
  const formats = {...sheet.formats};
  const visited = new Set<string>();
  for (let r = range.r; r <= range.er; r++) {
    for (let c = range.c; c <= range.ec; c++) {
      const merged = sheet.merges.find(m => r >= m.r && r <= m.er && c >= m.c && c <= m.ec);
      const row = merged?.r ?? r;
      const key = `${row}:${merged?.c ?? c}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const header = row === range.r;
      formats[key] = {...formats[key], bold: header, color: header ? '#ffffff' : design.text,
        background: header ? design.header : (row - range.r) % 2 ? design.stripe : '#ffffff'};
    }
  }
  return {...sheet, formats};
}

export function changeDimension(
  sheet: FieldSheet,
  axis: 'row' | 'column',
  index: number,
  remove: boolean
): FieldSheet {
  if (sheet.previewLimited) throw new Error('Change this large sheet structure in Excel.');
  const next = structuredClone(sheet);
  if (next.connection) {
    delete next.connection.validatedAt;
    if(next.connection.layout)next.connection.layout.needsReview=true;
    if (axis === 'column') {
      next.connection.mapping = Object.fromEntries(Object.entries(next.connection.mapping)
        .filter(([, column]) => !remove || column !== index)
        .map(([field, column]) => [field, column >= index ? column + (remove ? -1 : 1) : column]));
    } else if (remove && index === next.connection.headerRow) {
      next.connection.mapping = {};
      next.connection.headerRow = Math.min(index, next.cells.length - 2);
    } else if (index <= next.connection.headerRow) {
      next.connection.headerRow += remove ? -1 : 1;
    }
  }
  if(next.media){const moved:Record<string,string[]>={};for(const [key,ids] of Object.entries(next.media)){let [r,c]=key.split(':').map(Number);const pos=axis==='row'?r:c;const merge=sheet.merges.find(m=>m.r===r&&m.c===c);if(remove&&pos===index){if(!merge||(axis==='row'?merge.er===r:merge.ec===c))continue;}else if(pos>=index){if(axis==='row')r+=remove?-1:1;else c+=remove?-1:1;}moved[`${r}:${c}`]=ids;}next.media=moved;}
  const origins = axis === 'row' ? next.rowOrigins : next.columnOrigins;
  origins?.splice(index, remove ? 1 : 0, ...(remove ? [] : [null]));
  const count = axis === 'row' ? next.cells.length : next.widths.length;
  if (remove && count === 1) throw new Error('Keep at least one row and one column.');
  if (!remove && count >= (axis === 'row' ? MAX_ROWS : MAX_COLS))
    throw new Error(
      `This editor supports up to ${MAX_ROWS} rows and ${MAX_COLS} columns per sheet.`
    );
  if (axis === 'row') {
    next.cells.splice(
      index,
      remove ? 1 : 0,
      ...(remove ? [] : [Array(next.widths.length).fill('')])
    );
    next.heights.splice(index, remove ? 1 : 0, ...(remove ? [] : [34]));
  } else {
    next.cells.forEach((row) => row.splice(index, remove ? 1 : 0, ...(remove ? [] : [''])));
    next.widths.splice(index, remove ? 1 : 0, ...(remove ? [] : [160]));
  }
  next.cells=next.cells.map(row=>row.map(value=>shiftReferences(value,axis,index,remove)));
  // Structural edits invalidate positional view/print settings instead of pointing at the wrong cells.
  if(next.view)next.view={};
  if(next.print)next.print={orientation:next.print.orientation,fit:next.print.fit};
  next.formats = {};
  for (const [key, format] of Object.entries(sheet.formats || {})) {
    let [r, c] = key.split(':').map(Number);
    const position = axis === 'row' ? r : c;
    if (remove && position === index) continue;
    if (position >= index) {
      if (axis === 'row') r += remove ? -1 : 1;
      else c += remove ? -1 : 1;
    }
    next.formats[`${r}:${c}`] = format;
  }
  const start = axis === 'row' ? 'r' : 'c',
    end = axis === 'row' ? 'er' : 'ec';
  next.merges = next.merges.flatMap((m) => {
    if (remove && m[start] === index && m[end] > m[start]) {
      next.formats![`${axis === 'row' ? index : m.r}:${axis === 'row' ? m.c : index}`] = cellFormat(
        sheet,
        m.r,
        m.c
      );
      next.cells[axis === 'row' ? index : m.r]?.splice(
        axis === 'row' ? m.c : index,
        1,
        sheet.cells[m.r][m.c]
      );
    }
    if (remove) {
      if (index < m[start]) {
        m[start]--;
        m[end]--;
      } else if (index <= m[end]) m[end]--;
    } else {
      if (index <= m[start]) {
        m[start]++;
        m[end]++;
      } else if (index <= m[end]) m[end]++;
    }
    return m[start] > m[end] || (m.r === m.er && m.c === m.ec) ? [] : [m];
  });
  return next;
}
export function pasteCells(
  sheet: FieldSheet,
  row: number,
  col: number,
  values: string[][]
): FieldSheet {
  const rows = Math.max(sheet.cells.length, row + values.length),
    cols = Math.max(sheet.widths.length, col + Math.max(...values.map((r) => r.length)));
  if (rows > MAX_ROWS || cols > MAX_COLS)
    throw new Error(`Paste exceeds the ${MAX_ROWS} row / ${MAX_COLS} column limit.`);
  const target = {
    r: row,
    c: col,
    er: row + values.length - 1,
    ec: col + Math.max(...values.map((r) => r.length)) - 1,
  };
  if (sheet.merges.some((m) => overlaps(m, target)))
    throw new Error('Unmerge the destination cells before pasting a table.');
  const next = structuredClone(sheet);
  next.cells = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => next.cells[r]?.[c] || '')
  );
  if (next.rowOrigins)
    next.rowOrigins = Array.from({ length: rows }, (_, r) => next.rowOrigins?.[r] ?? null);
  if (next.columnOrigins)
    next.columnOrigins = Array.from({ length: cols }, (_, c) => next.columnOrigins?.[c] ?? null);
  next.widths = Array.from({ length: cols }, (_, c) => next.widths[c] ?? 160);
  next.heights = Array.from({ length: rows }, (_, r) => next.heights[r] ?? 34);
  values.forEach((line, r) =>
    line.forEach((value, c) => {
      next.cells[row + r][col + c] = value;
    })
  );
  return next;
}
export function suggestionsFor(
  header: string,
  projects: any[],
  assets: any[],
  employees: any[],
  sites: any[]
): string[] {
  const key = header
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  let values: string[] = [];
  if (['project', 'project name'].includes(key))
    values = projects.map((p) => p.name || p.project_name);
  else if (['site', 'site location', 'location'].includes(key)) values = sites.map((s) => s.name);
  else if (['equipment', 'equipment area', 'asset'].includes(key))
    values = assets.map((a) => a.name || a.asset_name || a.asset_number);
  else if (['unit number', 'unit no', 'fleet unit id'].includes(key))
    values = assets.map((a) => a.asset_number || a.unit_number || a.fleet_number);
  else if (
    ['employee', 'technician', 'responsible', 'prepared by', 'operator', 'supervisor'].includes(key)
  )
    values = employees.map(
      (e) => [e.first_name, e.middle_name, e.last_name].filter(Boolean).join(' ') || e.name
    );
  else if (key === 'priority') values = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  else if (key === 'status' || key === 'current status' || key === 'machine status')
    values = [
      'Open',
      'In progress',
      'Completed',
      'Operational',
      'Under assessment',
      'Out of service',
    ];
  else if (key === 'pm completed') values = ['Yes', 'No'];
  else if (key === 'planned actual') values = ['Planned', 'Actual'];
  return [...new Set(values.filter(Boolean))];
}
export function validateWorkbook(value: unknown): FieldWorkbook {
  const book = value as FieldWorkbook;
  if (
    book?.version !== 1 ||
    typeof book.id !== 'string' ||
    typeof book.name !== 'string' ||
    !Array.isArray(book.sheets) ||
    !book.sheets.length ||
    (!book.source && book.sheets.length > 30)
  )
    throw new Error('This is not a supported Cestos workbook.');
  validateMedia(book);
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const s of book.sheets) {
    if (
      !s ||
      typeof s.id !== 'string' ||
      ids.has(s.id) ||
      typeof s.name !== 'string' ||
      !Array.isArray(s.cells) ||
      !s.cells.length ||
      s.cells.length > MAX_ROWS ||
      !Array.isArray(s.widths) ||
      !s.widths.length ||
      s.widths.length > MAX_COLS ||
      !Array.isArray(s.heights) ||
      s.heights.length !== s.cells.length ||
      !Array.isArray(s.merges)
    )
      throw new Error('Invalid worksheet dimensions.');
    const integerWithin=(v:unknown,max:number)=>Number.isInteger(v)&&Number(v)>=0&&Number(v)<=max;
    if(s.view && (typeof s.view!=='object'||Array.isArray(s.view)||
      (s.view.freezeRows!==undefined&&!integerWithin(s.view.freezeRows,s.cells.length))||
      (s.view.freezeColumns!==undefined&&!integerWithin(s.view.freezeColumns,s.widths.length))||
      (s.view.filterColumn!==undefined&&!integerWithin(s.view.filterColumn,s.widths.length-1))||
      (s.view.filterText!==undefined&&typeof s.view.filterText!=='string')))
      throw new Error('Invalid worksheet view settings.');
    if(s.print){const p=s.print,a=p.area;
      if(typeof p!=='object'||Array.isArray(p)||
        (p.orientation!==undefined&&!['portrait','landscape'].includes(p.orientation))||
        (p.fit!==undefined&&!['width','actual'].includes(p.fit))||
        (p.repeatRows!==undefined&&!integerWithin(p.repeatRows,20))||
        (p.breakRows!==undefined&&(!Array.isArray(p.breakRows)||p.breakRows.some(r=>!integerWithin(r,s.cells.length-1))))||
        (a&&(!integerWithin(a.r,s.cells.length-1)||!integerWithin(a.er,s.cells.length-1)||!integerWithin(a.c,s.widths.length-1)||!integerWithin(a.ec,s.widths.length-1)||a.r>a.er||a.c>a.ec)))
        throw new Error('Invalid worksheet print settings.');
    }
    if (s.connection) {
      const link = s.connection;
      if(link.layout)assertLayout(s,link.layout,true);
      if (typeof link.table !== 'string' || !link.table.startsWith('/api/v1/') ||
          !Number.isInteger(link.headerRow) || link.headerRow < 0 || link.headerRow >= s.cells.length ||
          !link.mapping || typeof link.mapping !== 'object' || Array.isArray(link.mapping) ||
          Object.values(link.mapping).some(c => !Number.isInteger(c) || c < 0 || c >= s.widths.length) ||
          new Set(Object.values(link.mapping)).size !== Object.values(link.mapping).length ||
          (link.writeMode !== undefined && link.writeMode !== 'insert'))
        throw new Error('Invalid database mapping. Review the connected sheet before importing.');
    }
    if (s.formats)
      for (const [key, format] of Object.entries(s.formats)) {
        const [r, c] = key.split(':').map(Number);
        if (
          !/^\d+:\d+$/.test(key) ||
          r >= s.cells.length ||
          c >= s.widths.length ||
          !format ||
          typeof format !== 'object' ||
          (format.bold !== undefined && typeof format.bold !== 'boolean') ||
          (format.italic !== undefined && typeof format.italic !== 'boolean') ||
          (format.align !== undefined && !['left', 'center', 'right'].includes(format.align))
        )
          throw new Error('Invalid cell formatting.');
      }
    ids.add(s.id);
    if (
      !s.name.trim() ||
      s.name.length > 31 ||
      /[\\/?*\[\]:]/.test(s.name) ||
      names.has(s.name.toLowerCase())
    )
      throw new Error('Invalid or duplicate worksheet names.');
    names.add(s.name.toLowerCase());
    if (
      s.cells.some(
        (r) =>
          !Array.isArray(r) ||
          r.length !== s.widths.length ||
          r.some((c) => typeof c !== 'string' || c.length > 32767)
      )
    )
      throw new Error('Invalid worksheet cells.');
    if (
      s.widths.some((n) => !Number.isFinite(n) || n < (s.imported ? 0 : 60) || n > 10000) ||
      s.heights.some((n) => !Number.isFinite(n) || n < (s.imported ? 0 : 26) || n > 10000)
    )
      throw new Error('Invalid worksheet sizes.');
    s.merges.forEach((m, i) => {
      if (
        !m ||
        ![m.r, m.c, m.er, m.ec].every(Number.isInteger) ||
        m.r < 0 ||
        m.c < 0 ||
        m.er >= s.cells.length ||
        m.ec >= s.widths.length ||
        m.r > m.er ||
        m.c > m.ec ||
        s.merges.slice(0, i).some((other) => overlaps(other, m))
      )
        throw new Error('Invalid merged cells.');
    });
  }
  return book;
}
export async function importWorkbook(file: File): Promise<FieldWorkbook> {
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) throw new Error('Choose a CSV, XLSX or XLS file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Choose a file smaller than 15 MB.');
  if (/\.xlsx$/i.test(file.name)) return validateWorkbook(await importStyledWorkbook(file));
  const XLSX = await import('xlsx');
  const source = XLSX.read(await file.arrayBuffer(), {
    type: 'array',
    cellStyles: true,
    raw: true,
  });
  if (source.SheetNames.length > 30)
    throw new Error('This editor supports up to 30 sheets per workbook.');
  const book = newWorkbook();
  book.name = file.name.replace(/\.[^.]+$/, '');
  book.sheets = source.SheetNames.map((name) => {
    const ws = source.Sheets[name];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    if (range.e.r >= MAX_ROWS || range.e.c >= MAX_COLS)
      throw new Error(
        `“${name}” exceeds ${MAX_ROWS} rows or ${MAX_COLS} columns. Reduce the used range before importing.`
      );
    const rows = Math.max(range.e.r + 1, 25),
      cols = Math.max(range.e.c + 1, 8);
    return {
      id: uid(),
      name,
      cells: Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          return cell ? XLSX.utils.format_cell(cell) : '';
        })
      ),
      widths: Array.from({ length: cols }, (_, c) =>
        Math.max(60, Math.min(600, ws['!cols']?.[c]?.wpx || 160))
      ),
      heights: Array.from({ length: rows }, (_, r) =>
        Math.max(26, Math.min(300, ws['!rows']?.[r]?.hpx || 34))
      ),
      merges: (ws['!merges'] || []).map((m) => ({ r: m.s.r, c: m.s.c, er: m.e.r, ec: m.e.c })),
    };
  });
  return validateWorkbook(book);
}
export async function exportWorkbook(book: FieldWorkbook): Promise<Blob> {
  if (Object.keys(book.assets||{}).length || book.source || book.sheets.some(s => s.view || s.print || s.cells.some(row=>row.some(value=>value.startsWith('='))) || Object.values(s.formats || {}).some(f => f.color || f.background || f.dataType))) return exportStyledWorkbook(book);
  const XLSX = await import('xlsx');
  const output = XLSX.utils.book_new();
  for (const sheet of book.sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.cells);
    ws['!merges'] = sheet.merges.map((m) => ({ s: { r: m.r, c: m.c }, e: { r: m.er, c: m.ec } }));
    ws['!cols'] = sheet.widths.map((wpx) => ({ wpx }));
    ws['!rows'] = sheet.heights.map((hpx) => ({ hpt: (hpx * 3) / 4 }));
    XLSX.utils.book_append_sheet(output, ws, sheet.name);
  }
  // The installed SheetJS writer does not write custom fonts/alignment, so add
  // these basic OOXML styles to the generated archive without another dependency.
  const zip = XLSX.CFB.read(
    new Uint8Array(XLSX.write(output, { type: 'array', bookType: 'xlsx' })),
    { type: 'buffer' }
  );
  const fonts = Array.from(
    { length: 4 },
    (_, i) =>
      `<font><sz val="11"/><name val="Calibri"/>${i & 1 ? '<b/>' : ''}${i & 2 ? '<i/>' : ''}</font>`
  ).join('');
  const styles = Array.from(
    { length: 12 },
    (_, i) =>
      `<xf numFmtId="0" fontId="${Math.floor(i / 3)}" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="${['left', 'center', 'right'][i % 3]}" vertical="center"/></xf>`
  ).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4">${fonts}</fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="12">${styles}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  XLSX.CFB.utils.cfb_add(zip, '/xl/styles.xml', new TextEncoder().encode(xml));
  book.sheets.forEach((sheet, index) => {
    const path = `/xl/worksheets/sheet${index + 1}.xml`;
    const entry = XLSX.CFB.find(zip, path);
    if (!entry) throw new Error('Could not export worksheet formatting.');
    const source = new TextDecoder().decode(entry.content);
    const styled = source.replace(/<c\b([^>]*?)>/g, (tag: string, attributes: string) => {
      const address = attributes.match(/\br="([A-Z]+\d+)"/)?.[1];
      if (!address) return tag;
      const { r, c } = XLSX.utils.decode_cell(address);
      const format = cellFormat(sheet, r, c);
      const style =
        ((format.bold ? 1 : 0) + (format.italic ? 2 : 0)) * 3 +
        ['left', 'center', 'right'].indexOf(format.align || 'left');
      return `<c${attributes.replace(/\s+s="\d+"/, '')} s="${style}">`;
    });
    XLSX.CFB.utils.cfb_add(zip, path, new TextEncoder().encode(styled));
  });
  return new Blob([XLSX.CFB.write(zip, { type: 'array', fileType: 'zip' })], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
