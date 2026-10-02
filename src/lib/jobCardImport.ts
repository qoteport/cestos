export type JobCardDraft = {
  control: Record<string, string>;
  failure: string;
  action: string;
  parts: Record<string, string>[];
  labour: Record<string, string>[];
  release: string;
  signatures: Record<string, string>;
};
export type JobCardSheet = { name: string; score: number; csv?: string; records: JobCardDraft[] };
export const jobCardLabel = (value: unknown) => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const aliases: Record<string, string[]> = {
  date: ['date', 'job date', 'job control date'],
  equipment: ['equipment', 'machine', 'asset', 'equipment name', 'job control equipment'],
  asset_id: ['asset id'],
  fleet_unit_id: ['fleet unit id', 'fleet unit no', 'fleet no', 'unit no', 'unit number', 'fleet number', 'job control fleet unit id'],
  location: ['location', 'site', 'site name', 'job control location'],
  hour_km: ['hour km', 'hour meter km', 'hour meter', 'odometer', 'job control hour km'],
  operator_driver: ['operator driver', 'operator', 'driver', 'job control operator driver'],
  department: ['department', 'job control department'],
  time_reported: ['time reported', 'reported time', 'job control time reported'],
  time_attended: ['time attended', 'attended time', 'job control time attended'],
  failure: ['reported failure request', 'reported failure', 'failure description', 'fault description', 'breakdown description'],
  action: ['corrective action work completed', 'corrective action', 'work completed', 'repair details'],
  release: ['test release remarks', 'test release', 'release remarks'],
  technician_sign: ['technician sign', 'technician signature'],
  supervisor_sign: ['supervisor sign', 'supervisor signature'],
  operator_sign: ['operator sign', 'operator signature'],
  parts: ['parts materials'],
  labour: ['labour downtime', 'labor downtime'],
};
const fields = new Map(Object.entries(aliases).flatMap(([key, names]) => names.map((name) => [name, key] as const)));
const partFields: Record<string, string> = { description: 'description', 'part description': 'description', 'part no': 'part_no', 'part number': 'part_no', qty: 'qty', quantity: 'qty', unit: 'unit', source: 'source', condition: 'condition', 'old part returned': 'old_returned', 'old returned': 'old_returned', remarks: 'remarks' };
const labourFields: Record<string, string> = { technician: 'technician', 'technician name': 'technician', start: 'start', 'start time': 'start', finish: 'finish', 'finish time': 'finish', 'labour hrs': 'labour_hours', 'labour hours': 'labour_hours', 'labor hours': 'labour_hours', 'machine down hrs': 'machine_down_hours', 'machine down hours': 'machine_down_hours', 'work hrs': 'work_hours', 'work hours': 'work_hours', remarks: 'remarks' };
const emptyDraft = (): JobCardDraft => ({ control: {}, failure: '', action: '', parts: [], labour: [], release: '', signatures: {} });
const field = (value: string) => fields.get(jobCardLabel(value.replace(/^\s*\d+[.)]\s*/, '')));
function assign(draft: JobCardDraft, key: string, value: string) {
  if (!value.trim()) return;
  if (key.endsWith('_sign')) {
    draft.signatures[key.replace('_sign', '')] = value.trim();
  } else if (key === 'failure' || key === 'action' || key === 'release') {
    if (key === 'release' && value.trim().startsWith('{')) {
      try { draft.release = String(JSON.parse(value)['Test, release & remarks'] || ''); return; } catch { /* plain text */ }
    }
    draft[key] = value.trim();
  } else if (key === 'parts' || key === 'labour') {
    try {
      const parsed = JSON.parse(value);
      const allowed = new Set(Object.values(key === 'parts' ? partFields : labourFields));
      if (Array.isArray(parsed)) draft[key] = parsed.filter((row) => row && typeof row === 'object' && !Array.isArray(row)).map((row) => Object.fromEntries(Object.entries(row).filter(([name]) => allowed.has(name)).map(([name, cell]) => [name, String(cell ?? '')])));
    } catch { throw new Error(`The ${key} cell must contain a JSON array, or use a separate ${key} table.`); }
  } else {
    if (key === 'date') {
      const dayFirst = value.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
      if (dayFirst) value = `${dayFirst[3]}-${dayFirst[2].padStart(2, '0')}-${dayFirst[1].padStart(2, '0')}`;
    }
    draft.control[key] = value.trim();
  }
}
function score(draft: JobCardDraft, title: boolean) {
  const specific = Number(Boolean(draft.failure)) + Number(Boolean(draft.action)) + Number(Boolean(draft.parts.length)) + Number(Boolean(draft.labour.length)) + Number(Boolean(draft.release));
  const count = Object.values(draft.control).filter(Boolean).length;
  return count >= 1 && (specific > 0 || title && count >= 3) ? count + specific * 4 + Number(title) * 2 : 0;
}
/** Recognize both row-based exports and the labelled paper job-card layout. */
export function extractJobCardSheet(matrix: string[][], name: string): JobCardSheet | null {
  const title = matrix.some((row) => row.some((cell) => /(?:breakdown|maintenance).*job card/.test(jobCardLabel(cell))));
  const heading = matrix.findIndex((row) => {
    const nonempty = row.filter((cell) => cell.trim());
    return nonempty.length >= 2 && nonempty.some((cell) => ['failure', 'action', 'parts', 'labour', 'release'].includes(field(cell) || '')) && nonempty.filter((cell) => field(cell)).length / nonempty.length >= 0.8;
  });
  if (heading >= 0) {
    const keys = matrix[heading].map(field);
    const records = matrix.slice(heading + 1).filter((row) => row.some((cell) => cell.trim())).map((row) => {
      const draft = emptyDraft();
      keys.forEach((key, column) => { if (key) assign(draft, key, row[column] || ''); });
      return draft;
    }).filter((draft) => score(draft, title) > 0);
    if (records.length) return { name, score: Math.max(...records.map((draft) => score(draft, title))), records };
  }
  const draft = emptyDraft();
  let narrative: 'failure' | 'action' | 'release' | null = null;
  let table: { key: 'parts' | 'labour'; columns: (string | undefined)[] } | null = null;
  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex];
    const labels = row.map(jobCardLabel);
    const partColumns = labels.map((label) => partFields[label]);
    const labourColumns = labels.map((label) => labourFields[label]);
    if (partColumns.includes('description') && (partColumns.includes('part_no') || partColumns.includes('qty'))) {
      table = { key: 'parts', columns: partColumns }; narrative = null; continue;
    }
    if (labourColumns.includes('technician') && labourColumns.filter(Boolean).length >= 2) {
      table = { key: 'labour', columns: labourColumns }; narrative = null; continue;
    }
    const section = labels.find((label) => /^(parts consumables materials|parts and materials|parts materials|labour downtime|labor downtime|job control machine identification|signatures)$/.test(label));
    if (section && row.filter((cell) => cell.trim()).length === 1) { table = null; narrative = null; continue; }
    let found = false;
    for (let column = 0; column < row.length; column += 1) {
      const inline = row[column].match(/^([^:]+):\s*(.+)$/);
      const key = field(inline ? inline[1] : row[column]);
      if (!key) continue;
      found = true; table = null; narrative = null;
      let value = inline?.[2] || '';
      if (!value) {
        const following = row.slice(column + 1);
        const boundary = following.findIndex((cell) => field(cell) || field(cell.split(':')[0]));
        value = (boundary < 0 ? following : following.slice(0, boundary)).filter((cell) => cell.trim()).join(' ');
      }
      if (key === 'failure' || key === 'action' || key === 'release') narrative = key;
      if (!value && !narrative) {
        const below = matrix[rowIndex + 1]?.[column] || '';
        if (!field(below)) value = below;
      }
      assign(draft, key, value);
    }
    if (found) continue;
    if (table) {
      const entry = Object.fromEntries(table.columns.flatMap((key, column) => key ? [[key, row[column] || '']] : []));
      if (Object.values(entry).some((value) => value.trim())) draft[table.key].push(entry);
    } else if (narrative) {
      const text = row.filter((cell) => cell.trim()).join(' ');
      if (text) draft[narrative] = [draft[narrative], text].filter(Boolean).join('\n');
    }
  }
  const matchScore = score(draft, title);
  return matchScore ? { name, score: matchScore, records: [draft] } : null;
}
export async function readJobCardFile(file: File): Promise<JobCardSheet[]> {
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) throw new Error('Choose a CSV or Excel file (.csv, .xlsx, or .xls).');
  const XLSX = await import('xlsx');
  const workbook = /\.csv$/i.test(file.name)
    ? XLSX.read(await file.text(), { type: 'string', raw: true })
    : XLSX.read(await file.arrayBuffer(), { type: 'array', cellNF: true, cellFormula: false });
  const matches: JobCardSheet[] = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet?.['!ref']) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet);
    for (const address of Object.keys(sheet)) {
      if (address.startsWith('!')) continue;
      const cell = sheet[address];
      const format = String(cell.z || '').replace(/"[^"\n]*"/g, '');
      if (cell.t === 'n' && XLSX.SSF.is_date(format) && /[dy]/i.test(format)) {
        const date = XLSX.SSF.parse_date_code(cell.v, { date1904: workbook.Workbook?.WBProps?.date1904 });
        if (date) { cell.t = 's'; cell.v = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`; delete cell.w; delete cell.z; }
      }
    }
    const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '', blankrows: true }).map((row) => row.map((cell) => String(cell ?? '').trim()));
    const match = extractJobCardSheet(matrix, name);
    if (match) matches.push({ ...match, csv });
  }
  if (!matches.length) throw new Error('No worksheet matches this job card. Include equipment or unit details and reported failure, corrective action, parts, or labour fields.');
  return matches.sort((a, b) => b.score - a.score);
}
