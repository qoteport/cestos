export type FuelImportRow = {
  date: string;
  time: string;
  equipment: string;
  quantity: string;
  meter: string;
  receiver: string;
  signature: string;
};
export type FuelImportSheet = { name: string; rows: FuelImportRow[]; csv: string; score: number };
export const normalizeFuelName = (value: string) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
const aliases: Record<keyof FuelImportRow, string[]> = {
  date: ['date', 'allocation date', 'fuel date'],
  time: ['time', 'allocation time'],
  equipment: [
    'equipment',
    'asset',
    'rig',
    'equipment name',
    'asset name',
    'unit',
    'unit number',
    'fleet number',
  ],
  quantity: [
    'quantity lt',
    'quantity litres',
    'quantity liters',
    'quantity l',
    'quantity',
    'litres',
    'liters',
    'fuel consumed',
    'fuel consumption',
  ],
  meter: ['km hrs', 'km hours', 'km hr', 'meter reading', 'odometer', 'hour meter', 'hours', 'km'],
  receiver: ['recievers name', 'receivers name', 'receiver name', 'receiver', 'received by'],
  signature: ['signature', 'signed by', 'acknowledgement'],
};
export function fuelDate(text: string): string {
  const value = text.trim();
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
  const local = value.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (!iso && !local) return value;
  const [year, month, day] = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : [Number(local![3]), Number(local![2]), Number(local![1])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return value;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
export function fuelTime(text: string): string {
  const match = text.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return text.trim();
  let h = Number(match[1]);
  const m = Number(match[2]);
  if (match[3]) {
    if (h < 1 || h > 12) return text;
    h = (h % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  }
  if (h > 23 || m > 59) return text;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
export function extractFuelSheet(matrix: string[][]): Omit<FuelImportSheet, 'name' | 'csv'> | null {
  let best:
    | { index: number; columns: Partial<Record<keyof FuelImportRow, number>>; score: number }
    | undefined;
  matrix.slice(0, 50).forEach((row, index) => {
    const columns: Partial<Record<keyof FuelImportRow, number>> = {};
    for (const [key, names] of Object.entries(aliases)) {
      const c = row.findIndex((value) =>
        names.some((name) => normalizeFuelName(name) === normalizeFuelName(value))
      );
      if (c >= 0) columns[key as keyof FuelImportRow] = c;
    }
    if (
      columns.date === undefined ||
      columns.equipment === undefined ||
      columns.quantity === undefined
    )
      return;
    const score = Object.keys(columns).length;
    if (!best || score > best.score) best = { index, columns, score };
  });
  if (!best) return null;
  const { index, columns, score } = best;
  let lastDate = '';
  const rows: FuelImportRow[] = [];
  for (const cells of matrix.slice(index + 1)) {
    if (!cells.some((v) => v.trim())) continue;
    const read = (key: keyof FuelImportRow) =>
      columns[key] === undefined ? '' : String(cells[columns[key]!] || '').trim();
    const equipment = read('equipment'),
      quantity = read('quantity');
    if (/^(grand\s*)?total(?:s)?\s*:?$/i.test(equipment)) continue;
    if (
      normalizeFuelName(equipment) === 'equipment' &&
      normalizeFuelName(quantity).startsWith('quantity')
    )
      continue;
    if (!equipment && !quantity) continue;
    const date = read('date');
    if (date) lastDate = fuelDate(date);
    rows.push({
      date: lastDate,
      time: fuelTime(read('time')),
      equipment,
      quantity: quantity.replace(/,(?=\d{3}(?:\D|$))/g, ''),
      meter: read('meter'),
      receiver: read('receiver'),
      signature: read('signature'),
    });
  }
  if (rows.length > 500)
    throw new Error(
      'This import contains more than 500 entries. Split the sheet into smaller files before uploading.'
    );
  return rows.length ? { rows, score } : null;
}
export function matchFuelAsset(name: string, assets: any[]): { id: string; suggestions: any[] } {
  const key = normalizeFuelName(name);
  if (!key) return { id: '', suggestions: [] };
  const exact = assets.filter((a) =>
    [a.name, a.asset_name, a.asset_number, a.unit_number, a.code].some(
      (value) => value && normalizeFuelName(value) === key
    )
  );
  if (exact.length === 1) return { id: String(exact[0].id), suggestions: exact };
  if (exact.length > 1) return { id: '', suggestions: exact };
  const words = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);
  const suggestions = assets
    .map((a) => ({
      asset: a,
      score: words.filter((w) =>
        `${a.name || a.asset_name || ''} ${a.asset_number || a.unit_number || ''}`
          .toLowerCase()
          .includes(w)
      ).length,
    }))
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((a) => a.asset);
  return { id: '', suggestions };
}
export async function readFuelImport(file: File): Promise<FuelImportSheet[]> {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error('Choose a CSV, XLSX or XLS file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Choose a file smaller than 15 MB.');
  const X = await import('xlsx');
  const wb = X.read(await file.arrayBuffer(), { type: 'array', cellNF: true, raw: true });
  const results: FuelImportSheet[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws['!ref']) continue;
    const bounds = X.utils.decode_range(ws['!ref']);
    if (bounds.e.r > 10000 || bounds.e.c > 100) continue;
    const csv = X.utils.sheet_to_csv(ws);
    for (const address of Object.keys(ws)) {
      if (address.startsWith('!')) continue;
      const cell = ws[address];
      if (cell.t === 'n' && cell.z && X.SSF.is_date(String(cell.z))) {
        const date = X.SSF.parse_date_code(cell.v, { date1904: wb.Workbook?.WBProps?.date1904 });
        if (date) {
          const fmt = String(cell.z).replace(/"[^"\n]*"/g, '');
          cell.t = 's';
          cell.v = /[dy]/i.test(fmt)
            ? `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
            : `${String(date.H).padStart(2, '0')}:${String(date.M).padStart(2, '0')}`;
          delete cell.w;
          delete cell.z;
        }
      }
    }
    const matrix = X.utils
      .sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: '' })
      .map((row) => row.map((value) => String(value ?? '')));
    const match = extractFuelSheet(matrix);
    if (match) results.push({ name, csv, ...match });
  }
  if (!results.length)
    throw new Error(
      'No matching fuel sheet found. Include Date, Equipment and Quantity columns. You can still enter the rows manually.'
    );
  return results.sort((a, b) => b.score - a.score || b.rows.length - a.rows.length);
}
