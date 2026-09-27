'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import SearchableSelect from './SearchableSelect';
import AppDateTimePicker from './ui/AppDateTimePicker';

type Employee = { id: string; first_name?: string; middle_name?: string; last_name?: string; employee_number?: string; is_active?: boolean };
type Site = { id: string; name?: string; site_name?: string; code?: string; is_active?: boolean };
type CsvRow = { cells: string[]; employeeId: string; siteId: string; status: 'ready' | 'saved' | 'error'; error?: string; csvRow: number };

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

function normalize(value: string) { return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function monthFromName(fileName: string) {
  const match = fileName.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)[\s_-]+(20\d{2})\b/i);
  if (!match) return new Date().toISOString().slice(0, 7);
  const month = new Date(`${match[1]} 1, ${match[2]}`).getMonth() + 1;
  return `${match[2]}-${String(month).padStart(2, '0')}`;
}

function matchColumn(headers: string[], candidates: string[]) {
  const normalized = headers.map(normalize);
  const index = normalized.findIndex((header) => candidates.includes(header));
  return index;
}

function isDayHeader(value: string) { return /^(0?[1-9]|[12]\d|3[01])$/.test(value.trim()); }

export default function CommandCenterTimesheetCsvModal({ onClose }: { onClose: () => void }) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState('');
  const [sites, setSites] = useState<Site[]>([]);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiFetch<any>('/api/v1/employees?page_size=100'),
      apiFetch<any>('/api/v1/projects?page_size=100'),
    ]).then((results) => {
      if (!active) return;
      const items = (result: PromiseSettledResult<any>) => result.status === 'fulfilled' ? (Array.isArray(result.value) ? result.value : result.value?.items || []) : [];
      setEmployees(items(results[0])); setProjects(items(results[1])); setLoading(false);
      const failed = results.find((result) => result.status === 'rejected');
      if (failed?.status === 'rejected') setError(failed.reason?.message || 'Could not load employees or projects.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setSites([]);
    if (!projectId) return () => { active = false; };
    apiFetch<any>(`/api/v1/projects/${encodeURIComponent(projectId)}/sites`).then((result) => {
      if (active) setSites(Array.isArray(result) ? result : result?.items || []);
    }).catch((err) => { if (active) setError(err?.message || 'Could not load project sites.'); });
    return () => { active = false; };
  }, [projectId]);

  const employeeOptions = useMemo(() => employees.map((employee) => ({
    value: String(employee.id), label: [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(' ') || employee.employee_number || 'Employee', sublabel: employee.employee_number || '',
  })), [employees]);
  const siteOptions = useMemo(() => sites.filter((site) => site.is_active !== false).map((site) => ({
    value: String(site.id), label: site.name || site.site_name || site.code || 'Site', sublabel: site.code || '',
  })), [sites]);
  const employeeColumn = useMemo(() => matchColumn(headers, ['employee', 'employee name', 'name', 'staff', 'staff name', 'employee full name']), [headers]);
  const numberColumn = useMemo(() => matchColumn(headers, ['employee number', 'employee no', 'employee id', 'staff no', 'staff number']), [headers]);
  const siteColumn = useMemo(() => matchColumn(headers, ['site', 'site name', 'location', 'site location', 'work site']), [headers]);
  const dayColumns = useMemo(() => headers.map((header, index) => ({ day: Number(header), index })).filter(({ day }) => Number.isInteger(day) && day >= 1 && day <= 31), [headers]);
  useEffect(() => {
    if (siteColumn < 0 || !sites.length) return;
    setRows((current) => current.map((row) => {
      if (row.status === 'saved' || row.siteId) return row;
      const rawSite = row.cells[siteColumn] || '';
      const match = sites.find((site) => rawSite && normalize(site.name || site.site_name || '') === normalize(rawSite));
      return match ? { ...row, siteId: String(match.id) } : row;
    }));
  }, [siteColumn, sites]);
  const readyCount = rows.filter((row) => row.status !== 'saved' && row.employeeId && row.siteId).length;
  const unmatchedCount = rows.filter((row) => row.status !== 'saved' && (!row.employeeId || !row.siteId)).length;
  const savedCount = rows.filter((row) => row.status === 'saved').length;

  async function upload(file?: File) {
    if (!file) return;
    setError(''); setNotice('');
    try {
      const matrix = parseCsv(await file.text());
      if (matrix.length < 2) throw new Error('The CSV must include a header row and at least one employee row.');
      const nextHeaders = matrix[0].map((header) => header.trim());
      if (!nextHeaders.some((header) => isDayHeader(header))) throw new Error('Could not find daily hour columns. Use day numbers (1–31) as the CSV column headers.');
      const nextEmployeeCol = matchColumn(nextHeaders, ['employee', 'employee name', 'name', 'staff', 'staff name', 'employee full name']);
      const nextNumberCol = matchColumn(nextHeaders, ['employee number', 'employee no', 'employee id', 'staff no', 'staff number']);
      if (nextEmployeeCol < 0 && nextNumberCol < 0) throw new Error('Could not find an Employee or Employee Number column in this CSV.');
      const nextSiteCol = matchColumn(nextHeaders, ['site', 'site name', 'location', 'site location', 'work site']);
      const imported = matrix.slice(1).map((cells, index) => {
        const rawName = nextEmployeeCol >= 0 ? cells[nextEmployeeCol] || '' : '';
        const rawNumber = nextNumberCol >= 0 ? cells[nextNumberCol] || '' : '';
        const employee = employees.find((person) => rawNumber && normalize(person.employee_number || '') === normalize(rawNumber))
          || employees.find((person) => rawNumber && normalize(person.id) === normalize(rawNumber))
          || employees.find((person) => rawName && normalize([person.first_name, person.middle_name, person.last_name].filter(Boolean).join(' ')) === normalize(rawName));
        const rawSite = nextSiteCol >= 0 ? cells[nextSiteCol] || '' : '';
        const site = sites.find((item) => rawSite && normalize(item.name || item.site_name || '') === normalize(rawSite));
        return { cells, employeeId: employee ? String(employee.id) : '', siteId: site ? String(site.id) : '', status: 'ready' as const, csvRow: index + 2 };
      });
      setHeaders(nextHeaders); setRows(imported); setFileName(file.name); setPeriod(monthFromName(file.name));
    } catch (err: any) { setHeaders([]); setRows([]); setFileName(''); setError(err?.message || 'Could not read the selected CSV.'); }
  }

  function updateRow(index: number, key: 'employeeId' | 'siteId', value: string) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value, status: row.status === 'saved' ? 'saved' : 'ready', error: undefined } : row));
  }

  async function saveMatchedRows() {
    setError(''); setNotice('');
    if (!projectId) { setError('Select the project for these timesheets.'); return; }
    if (!period) { setError('Select the reporting month.'); return; }
    if (unmatchedCount) { setError(`Match an employee and site for all remaining rows before saving (${unmatchedCount} unmatched).`); return; }
    setSaving(true);
    let failures = 0;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]; if (row.status === 'saved') continue;
      const entries = dayColumns.flatMap(({ day, index: column }) => {
        const raw = (row.cells[column] || '').replace(/[$,\s]/g, '');
        if (!raw) return [];
        const hours = Number(raw);
        if (!Number.isFinite(hours) || hours < 0 || hours > 24) return [{ work_date: `${period}-${String(day).padStart(2, '0')}`, hours: Number.NaN }];
        return [{ work_date: `${period}-${String(day).padStart(2, '0')}`, hours }];
      });
      const invalid = entries.find((entry) => !Number.isFinite(entry.hours));
      if (invalid) {
        failures += 1; setRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, status: 'error', error: `Invalid hours for day ${Number(invalid.work_date.slice(-2))}; use a number from 0 to 24.` } : item)); continue;
      }
      const site = sites.find((item) => String(item.id) === row.siteId);
      try {
        await apiFetch('/api/v1/employees/timesheets', { method: 'POST', body: JSON.stringify({ employee_id: row.employeeId, project_id: projectId, period_start: `${period}-01`, site_name: site?.name || site?.site_name || site?.code || null, entries }) });
        setRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, status: 'saved', error: undefined } : item));
      } catch (err: any) {
        failures += 1; setRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, status: 'error', error: err?.message || 'Could not save this row.' } : item));
      }
    }
    setSaving(false);
    if (failures) setError(`${failures} row${failures === 1 ? '' : 's'} could not be saved. Review the row errors and retry.`);
    else setNotice(`Saved ${rows.length - savedCount} employee time sheet${rows.length - savedCount === 1 ? '' : 's'} for ${period}.`);
  }

  const tableRows = rows.map((row, rowIndex) => <tr key={row.csvRow} className="border-t border-slate-200 align-top hover:bg-slate-50">
    <td className="sticky left-0 z-10 min-w-14 border-r border-slate-200 bg-white px-2 py-2 text-center font-mono text-xs text-slate-500">{row.csvRow}</td>
    {headers.map((_, columnIndex) => <td key={columnIndex} className="min-w-20 border-r border-slate-100 px-2 py-2 text-xs text-slate-700">{row.cells[columnIndex] || ''}</td>)}
    <td className="min-w-56 border-r border-slate-100 p-2"><SearchableSelect value={row.employeeId} onChange={(value) => updateRow(rowIndex, 'employeeId', value)} options={employeeOptions} placeholder="Match employee…" searchable disabled={row.status === 'saved'} /></td>
    <td className="min-w-56 border-r border-slate-100 p-2"><SearchableSelect value={row.siteId} onChange={(value) => updateRow(rowIndex, 'siteId', value)} options={siteOptions} placeholder="Match project site…" searchable disabled={row.status === 'saved' || !projectId} /></td>
    <td className="sticky right-0 z-10 min-w-44 border-l border-slate-200 bg-white px-2 py-2 text-xs">{row.status === 'saved' ? <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 size={14} />Saved</span> : row.error ? <span className="inline-flex items-start gap-1 text-red-700"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{row.error}</span> : row.employeeId && row.siteId ? <span className="text-emerald-700">Ready</span> : <span className="text-amber-700">Needs matching</span>}</td>
  </tr>);

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-2 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <section className="flex max-h-[96vh] w-full max-w-[96vw] flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between bg-[#123f68] px-5 py-4 text-white"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-100">Command center</p><h2 className="mt-1 text-xl font-bold">Import employee time sheet</h2><p className="mt-1 text-sm text-blue-100">Review the CSV as supplied, then match each row to an employee and project site.</p></div><button type="button" disabled={saving} onClick={onClose} aria-label="Close" className="p-2 hover:bg-white/10"><X size={20} /></button></header>
      <div className="flex-1 space-y-4 overflow-auto p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(230px,1fr)_220px_auto]">
          <label className="block space-y-1"><span className="text-xs font-bold text-slate-700">Project *</span><select className="input-field w-full rounded-none" value={projectId} onChange={(event) => { setProjectId(event.target.value); setRows((current) => current.map((row) => ({ ...row, siteId: '', status: row.status === 'saved' ? 'saved' : 'ready' }))); }}><option value="">Select project to load sites…</option>{projects.filter((project) => project.is_active !== false).map((project) => <option key={project.id} value={project.id}>{project.name || project.project_name || project.project_number || project.id}</option>)}</select></label>
          <label className="block space-y-1"><span className="text-xs font-bold text-slate-700">Reporting month *</span><AppDateTimePicker mode="month" value={period} onChange={(value) => value && setPeriod(value)} placeholder="Select month" /></label>
          <label className={`inline-flex h-10 items-center justify-center gap-2 self-end px-4 text-sm font-bold text-white ${loading ? 'cursor-not-allowed bg-slate-400' : 'cursor-pointer bg-[#184877] hover:bg-[#123f68]'}`}><Upload size={16} />Upload CSV<input type="file" accept=".csv,text/csv" className="hidden" disabled={loading} onChange={(event) => void upload(event.target.files?.[0])} /></label>
        </div>
        <div className="border-l-4 border-blue-500 bg-blue-50 px-3 py-2 text-sm text-blue-950">CSV day columns should be numbered <b>1–31</b>. Employee and site names are matched automatically when exact matches are found; review or change each match before saving. A project is required so the API can validate field assignments.</div>
        {loading && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Loading employees and projects…</p>}
        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
        {fileName && <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="inline-flex items-center gap-2 font-semibold text-slate-800"><FileSpreadsheet size={17} className="text-emerald-700" />{fileName} · {rows.length} employee rows</span><span className="text-slate-600">{savedCount} saved · {readyCount} ready · {unmatchedCount} need matching</span></div>}
        {rows.length > 0 && <div className="max-h-[62vh] overflow-auto border border-slate-300"><table className="w-full border-collapse text-left"><thead className="sticky top-0 z-20 bg-slate-100"><tr><th className="sticky left-0 z-30 border-r border-slate-200 bg-slate-100 px-2 py-2 text-[10px] font-bold uppercase text-slate-600">Row</th>{headers.map((header, index) => <th key={index} className="min-w-20 border-r border-slate-200 px-2 py-2 text-[10px] font-bold uppercase text-slate-600">{header}</th>)}<th className="min-w-56 border-r border-slate-200 px-2 py-2 text-[10px] font-bold uppercase text-slate-600">Matched employee</th><th className="min-w-56 border-r border-slate-200 px-2 py-2 text-[10px] font-bold uppercase text-slate-600">Matched site</th><th className="sticky right-0 z-30 min-w-44 border-l border-slate-200 bg-slate-100 px-2 py-2 text-[10px] font-bold uppercase text-slate-600">Import status</th></tr></thead><tbody>{tableRows}</tbody></table></div>}
        {!rows.length && !fileName && <div className="flex min-h-48 flex-col items-center justify-center border border-dashed border-slate-300 text-slate-500"><FileSpreadsheet size={30} /><p className="mt-2 text-sm">Select the project and reporting month, then upload the original timesheet CSV.</p></div>}
        {(employeeColumn < 0 && headers.length > 0) && <p className="text-xs text-amber-700">Employee name column was not detected. Use Employee Number or manually match employee rows.</p>}
        {(siteColumn < 0 && headers.length > 0) && <p className="text-xs text-amber-700">No site column was detected; select a project site for each row.</p>}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3"><p className="text-xs text-slate-500">Rows save through the existing timesheet endpoint. Existing employee/month entries are reported for review, not overwritten.</p><div className="flex gap-2"><button type="button" disabled={saving} onClick={onClose} className="border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Close</button><button type="button" disabled={saving || !rows.length || unmatchedCount > 0 || readyCount === 0} onClick={() => void saveMatchedRows()} className="inline-flex items-center gap-2 bg-[#184877] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{saving && <Loader2 size={15} className="animate-spin" />}{saving ? 'Saving rows…' : `Save ${readyCount} matched row${readyCount === 1 ? '' : 's'}`}</button></div></footer>
    </section>
  </div>;
}
