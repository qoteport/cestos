function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell.trim()); cell = ''; }
    else if (char === '\n') { row.push(cell.trim()); if (row.some((value) => value !== '')) rows.push(row); row = []; cell = ''; }
    else if (char !== '\r') cell += char;
  }
  row.push(cell.trim()); if (row.some((value) => value !== '')) rows.push(row);
  return rows;
}


/** Read the original table; Excel imports deliberately use only the first sheet. */
export async function readTimesheetFile(file: File): Promise<string[][]> {
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text());
  if (!/\.xlsx?$/i.test(file.name)) {
    throw new Error('Select a CSV or Excel file (.csv, .xlsx, or .xls).');
  }
  const XLSX = await import('xlsx');
  let workbook: import('xlsx').WorkBook;
  try {
    workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellNF: true, cellFormula: false });
  } catch {
    throw new Error('Could not read this Excel file. Check that it is a valid, unencrypted workbook.');
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet || !sheet['!ref']) throw new Error('The first Excel worksheet is empty.');

  // Convert Excel serial dates to unambiguous headings, including 1904 workbooks.
  // Keep formatted employee numbers (e.g. 0012) and cached formula results.
  for (const address of Object.keys(sheet)) {
    if (address.startsWith('!')) continue;
    const cell = sheet[address];
    const format = String(cell.z || '').replace(/"[^"\n]*"/g, '');
    if (cell.t === 'n' && XLSX.SSF.is_date(format) && /[dy]/i.test(format)) {
      const date = XLSX.SSF.parse_date_code(cell.v, { date1904: workbook.Workbook?.WBProps?.date1904 });
      if (date) {
        cell.t = 's';
        cell.v = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        delete cell.w;
        delete cell.z;
      }
    }
  }
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '', blankrows: false })
    .map((row) => row.map((cell) => String(cell ?? '').trim()))
    .filter((row) => row.some(Boolean));
  if (!rows.length) throw new Error('The first Excel worksheet is empty.');
  return rows;
}
