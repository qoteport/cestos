export type CellRange = { r: number; c: number; er: number; ec: number };
export type FieldSheet = {
  id: string;
  name: string;
  cells: string[][];
  widths: number[];
  heights: number[];
  merges: CellRange[];
};
export type FieldWorkbook = {
  version: 1;
  id: string;
  name: string;
  sheets: FieldSheet[];
  template: boolean;
};
export const MAX_ROWS = 500;
export const MAX_COLS = 50;
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
    name: 'Breakdown / Daily Repair Job Card',
    description: 'Failures, repairs, parts and labour.',
    sheets: [
      [
        'Job cards',
        [
          'Job Card Number',
          'Date',
          'Project',
          'Site',
          'Equipment',
          'Unit Number',
          'Operator',
          'Hour Meter',
          'Reported Failure',
          'Diagnosis',
          'Corrective Action',
          'Status',
          'Technician',
          'Supervisor',
          'Remarks',
        ],
      ],
      [
        'Parts & labour',
        [
          'Job Card Number',
          'Date',
          'Part / Material',
          'Quantity',
          'Unit',
          'Technician',
          'Hours',
          'Remarks',
        ],
      ],
    ],
  },
  {
    name: 'Preventive Maintenance Job Card',
    description: 'Service intervals, inspections and release.',
    sheets: [
      [
        'PM job cards',
        [
          'Job Card Number',
          'Date',
          'Project',
          'Site',
          'Equipment',
          'Unit Number',
          'PM Interval',
          'Hour Meter',
          'Technician',
          'PM Result',
          'Defects / Recommendations',
          'Machine Status',
          'Supervisor',
          'Remarks',
        ],
      ],
      [
        'Checklist',
        [
          'Job Card Number',
          'System / Component',
          'Inspection / Service Task',
          'Condition / Reading',
          'Parts / Quantity',
          'Remarks',
        ],
      ],
    ],
  },
  {
    name: 'Maintenance Assessment Report',
    description: 'Fleet condition, actions and maintenance KPIs.',
    sheets: [
      [
        'Report',
        [
          'Report Number',
          'Report Date',
          'Project',
          'Site',
          'Prepared By',
          'Period Start',
          'Period End',
          'Executive Summary',
          'Manpower Requirements',
          'Conclusion',
        ],
      ],
      [
        'Fleet assessment',
        [
          'Equipment',
          'Unit Number',
          'Quantity',
          'Maintenance Focus',
          'Current Approach',
          'Observation / Failure',
          'Action Taken / Response',
          'Current Status',
        ],
      ],
      [
        'Preventive improvements',
        ['Equipment', 'Improvement', 'Action Required', 'Responsible', 'Target Date', 'Status'],
      ],
      [
        'Spare parts',
        ['Part / Material', 'Equipment', 'Quantity', 'Action Required', 'Priority', 'Remarks'],
      ],
      ['Control documents', ['Document', 'Purpose', 'Status', 'Responsible', 'Remarks']],
      ['Action plan', ['Action', 'Priority', 'Responsible', 'Target Date', 'Status', 'Remarks']],
      ['KPIs', ['KPI', 'Target', 'Actual', 'Remarks']],
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
    name: template?.name || 'Untitled workbook',
    template: false,
    sheets: template
      ? template.sheets.map(([name, headers]) => makeSheet(name, headers))
      : [makeSheet()],
  };
}
export function copyWorkbook(book: FieldWorkbook, template = false): FieldWorkbook {
  return {
    ...structuredClone(book),
    id: uid(),
    name: `${book.name}${template ? ' template' : ' copy'}`,
    template,
  };
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
  next.merges.push(range);
  return next;
}
export function changeDimension(
  sheet: FieldSheet,
  axis: 'row' | 'column',
  index: number,
  remove: boolean
): FieldSheet {
  const next = structuredClone(sheet);
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
  const start = axis === 'row' ? 'r' : 'c',
    end = axis === 'row' ? 'er' : 'ec';
  next.merges = next.merges.flatMap((m) => {
    if (remove && m[start] === index && m[end] > m[start])
      next.cells[axis === 'row' ? index : m.r]?.splice(
        axis === 'row' ? m.c : index,
        1,
        sheet.cells[m.r][m.c]
      );
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
  next.widths = Array.from({ length: cols }, (_, c) => next.widths[c] || 160);
  next.heights = Array.from({ length: rows }, (_, r) => next.heights[r] || 34);
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
    book.sheets.length > 30
  )
    throw new Error('This is not a supported Cestos workbook.');
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
      s.widths.some((n) => !Number.isFinite(n) || n < 60 || n > 600) ||
      s.heights.some((n) => !Number.isFinite(n) || n < 26 || n > 300)
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
  const XLSX = await import('xlsx');
  const output = XLSX.utils.book_new();
  for (const sheet of book.sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.cells);
    ws['!merges'] = sheet.merges.map((m) => ({ s: { r: m.r, c: m.c }, e: { r: m.er, c: m.ec } }));
    ws['!cols'] = sheet.widths.map((wpx) => ({ wpx }));
    ws['!rows'] = sheet.heights.map((hpx) => ({ hpx }));
    XLSX.utils.book_append_sheet(output, ws, sheet.name);
  }
  return new Blob([XLSX.write(output, { type: 'array', bookType: 'xlsx' })], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
