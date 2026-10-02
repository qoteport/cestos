'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { readTimesheetFile } from '@/lib/timesheetFile';
import SearchableSelect from './SearchableSelect';
import AppDateTimePicker from './ui/AppDateTimePicker';

type Employee = { id: string; first_name?: string; middle_name?: string; last_name?: string; employee_number?: string; is_active?: boolean };
type Site = { id: string; name?: string; location_number?: string; project_id?: string | null; project_name?: string | null; is_active?: boolean };
type CsvRow = { cells: string[]; employeeId: string; siteId: string; projectMatchId: string; status: 'ready' | 'saved' | 'error' | 'summary'; error?: string; csvRow: number };


function normalize(value: string) { return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function monthFromName(fileName: string) {
  const match = fileName.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)[\s_-]+(20\d{2})\b/i);
  if (!match) return '';
  const month = new Date(`${match[1]} 1, ${match[2]}`).getMonth() + 1;
  return `${match[2]}-${String(month).padStart(2, '0')}`;
}

function matchColumn(headers: string[], candidates: string[]) {
  const normalized = headers.map(normalize);
  const index = normalized.findIndex((header) => candidates.includes(header));
  return index;
}

const monthIndex: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function parseDateHeader(value: string, defaultPeriod: string): { day: number; month?: number; year?: number } | null {
  const text = value.trim();
  if (/^(0?[1-9]|[12]\d|3[01])$/.test(text)) return { day: Number(text) };
  const dayFirst = text.match(/^(\d{1,2})[-/\s]([a-z]{3,9})(?:[-/\s](\d{2,4}))?$/i);
  const monthFirst = text.match(/^([a-z]{3,9})[-/\s](\d{1,2})(?:[-/\s](\d{2,4}))?$/i);
  const iso = text.match(/^(20\d{2})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
  const match = dayFirst || monthFirst;
  if (!match) return null;
  const day = Number(dayFirst ? match[1] : match[2]);
  const monthText = (dayFirst ? match[2] : match[1]).slice(0, 3).toLowerCase();
  const month = monthIndex[monthText];
  const yearText = match[3];
  if (!month || day < 1 || day > 31) return null;
  const year = yearText ? Number(yearText.length === 2 ? `20${yearText}` : yearText) : Number(defaultPeriod.slice(0, 4));
  return { day, month, year };
}

export default function CommandCenterTimesheetCsvModal({ onClose, onSaved, heading = 'Command center' }: { onClose: () => void; onSaved?: (period: string) => void; heading?: string }) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [sourceHeaderRows, setSourceHeaderRows] = useState<string[][]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [fileName, setFileName] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiFetch<any>('/api/v1/employees?page_size=100'),
      apiFetch<any>('/api/v1/projects?page_size=100'),
      apiFetch<any>('/api/v1/locations?page_size=100'),
    ]).then((results) => {
      if (!active) return;
      const items = (result: PromiseSettledResult<any>) => result.status === 'fulfilled' ? (Array.isArray(result.value) ? result.value : result.value?.items || []) : [];
      setEmployees(items(results[0])); setProjects(items(results[1])); setSites(items(results[2]).filter((site: Site) => site.is_active !== false && site.project_id)); setLoading(false);
      const failed = results.find((result) => result.status === 'rejected');
      if (failed?.status === 'rejected') setError(failed.reason?.message || 'Could not load employees or projects.');
    });
    return () => { active = false; };
  }, []);

  const employeeOptions = useMemo(() => employees.map((employee) => ({
    value: String(employee.id), label: [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(' ') || employee.employee_number || 'Employee', sublabel: employee.employee_number || '',
  })), [employees]);
  const siteOptions = useMemo(() => sites.filter((site) => site.is_active !== false).map((site) => ({
    value: String(site.id), label: site.name || 'Site', sublabel: site.project_name || '',
  })), [sites]);
  const projectOptions = useMemo(() => projects.filter((project) => project.is_active !== false).map((project) => ({
    value: String(project.id), label: project.name || project.project_name || project.project_number || 'Project', sublabel: project.project_number || '',
  })), [projects]);
  const employeeColumn = useMemo(() => matchColumn(headers, ['employee', 'employee name', 'name', 'staff', 'staff name', 'employee full name']), [headers]);
  const numberColumn = useMemo(() => matchColumn(headers, ['employee number', 'employee no', 'employee id', 'staff no', 'staff number']), [headers]);
  const siteColumn = useMemo(() => matchColumn(headers, ['site', 'site name', 'location', 'site location', 'work site']), [headers]);
  const projectColumn = useMemo(() => matchColumn(headers, ['project', 'project name', 'project site', 'project location']), [headers]);
  const dayColumns = useMemo(() => headers.map((header, index) => {
    const parsed = parseDateHeader(header, period);
    return parsed ? { day: parsed.day, month: parsed.month, index } : null;
  }).filter((column): column is { day: number; month: number | undefined; index: number } => Boolean(column)), [headers, period]);
  useEffect(() => {
    if (siteColumn < 0 || !sites.length) return;
    setRows((current) => current.map((row) => {
      if (row.status === 'saved' || row.siteId) return row;
      const rawSite = row.cells[siteColumn] || '';
      const namedSites = sites.filter((site) => rawSite && normalize(site.name || '') === normalize(rawSite));
      const match = namedSites.find((site) => row.projectMatchId && row.projectMatchId !== 'custom' && String(site.project_id) === row.projectMatchId) || (namedSites.length === 1 ? namedSites[0] : undefined);
      if (!match) return { ...row, siteId: rawSite ? 'custom' : '' };
      const inferredProject = projects.find((project) => String(project.id) === String(match.project_id));
      return { ...row, siteId: String(match.id), projectMatchId: inferredProject ? String(inferredProject.id) : row.projectMatchId };
    }));
  }, [siteColumn, sites, projects]);
  useEffect(() => {
    if (projectColumn < 0) return;
    setRows((current) => current.map((row) => {
      if (row.status === 'saved' || row.projectMatchId) return row;
      const rawProject = row.cells[projectColumn] || '';
      const match = projects.find((item) => rawProject && normalize(item.name || item.project_name || '') === normalize(rawProject));
      if (match) return { ...row, projectMatchId: String(match.id) };
      const siteText = siteColumn >= 0 ? normalize(row.cells[siteColumn] || '') : '';
      const siteMatches = sites.filter((site) => siteText && normalize(site.name || '') === siteText);
      const inferred = siteMatches.length === 1 ? projects.find((project) => String(project.id) === String(siteMatches[0].project_id)) : null;
      return { ...row, projectMatchId: rawProject ? 'custom' : inferred ? String(inferred.id) : '' };
    }));
  }, [projectColumn, projects, sites, siteColumn]);
  const rawEmployee = (row: CsvRow) => employeeColumn >= 0 ? (row.cells[employeeColumn] || '').trim() : '';
  const readyCount = rows.filter((row) => row.status !== 'saved' && row.status !== 'summary' && (row.employeeId || rawEmployee(row))).length;
  const unmatchedCount = rows.filter((row) => row.status !== 'saved' && row.status !== 'summary' && !(row.employeeId || rawEmployee(row))).length;
  const savedCount = rows.filter((row) => row.status === 'saved').length;
  const summaryCount = rows.filter((row) => row.status === 'summary').length;

  async function upload(file?: File) {
    if (!file) return;
    setError(''); setNotice(''); setReading(true);
    try {
      const matrix = await readTimesheetFile(file);
      if (matrix.length < 2) throw new Error('The file must include a header row and at least one employee row.');
      const detectedHeaderRow = matrix.slice(0, Math.min(matrix.length, 8)).findIndex((candidate) => candidate.filter((value) => parseDateHeader(value, period)).length >= 2);
      if (detectedHeaderRow < 0) throw new Error('Could not find the date heading row. Upload the time sheet as CSV or Excel with its weekday and date headings.');
      const columnCount = matrix.reduce((width, row) => Math.max(width, row.length), 0);
      const nextHeaderRows = matrix.slice(0, detectedHeaderRow + 1).map((line) => Array.from({ length: columnCount }, (_, column) => (line[column] || '').trim()));
      const nextHeaders = Array.from({ length: columnCount }, (_, column) => [...nextHeaderRows].reverse().map((line) => line[column] || '').find(Boolean) || '');
      const explicitHeaderDate = nextHeaders.map((header) => parseDateHeader(header, period)).find((header) => header?.month);
      const filenamePeriod = monthFromName(file.name);
      const inferredPeriod = filenamePeriod || (explicitHeaderDate?.month ? `${explicitHeaderDate.year || new Date().getFullYear()}-${String(explicitHeaderDate.month).padStart(2, '0')}` : period);
      if (!nextHeaders.some((header) => parseDateHeader(header, inferredPeriod))) throw new Error('Could not find daily date columns in the heading row.');
      const nextEmployeeCol = matchColumn(nextHeaders, ['employee', 'employee name', 'name', 'staff', 'staff name', 'employee full name']);
      const nextNumberCol = matchColumn(nextHeaders, ['employee number', 'employee no', 'employee id', 'staff no', 'staff number']);
      if (nextEmployeeCol < 0 && nextNumberCol < 0) throw new Error('Could not find an Employee or Employee Number column in this file.');
      const nextSiteCol = matchColumn(nextHeaders, ['site', 'site name', 'location', 'site location', 'work site']);
      const nextProjectCol = matchColumn(nextHeaders, ['project', 'project name', 'project site', 'project location']);
      const nextDayColumns = nextHeaders.map((header, column) => parseDateHeader(header, inferredPeriod) ? column : -1).filter((column) => column >= 0);
      const imported = matrix.slice(detectedHeaderRow + 1).map((cells, index) => {
        const rawName = nextEmployeeCol >= 0 ? cells[nextEmployeeCol] || '' : '';
        const rawNumber = nextNumberCol >= 0 ? cells[nextNumberCol] || '' : '';
        const employee = employees.find((person) => rawNumber && normalize(person.employee_number || '') === normalize(rawNumber))
          || employees.find((person) => rawNumber && normalize(person.id) === normalize(rawNumber))
          || employees.find((person) => rawName && normalize([person.first_name, person.middle_name, person.last_name].filter(Boolean).join(' ')) === normalize(rawName));
        const rawSite = nextSiteCol >= 0 ? cells[nextSiteCol] || '' : '';
        const rawProject = nextProjectCol >= 0 ? cells[nextProjectCol] || '' : '';
        const summaryLabel = /(^|\s)(hrs?|hours?|grand total|total)(\s|$)/.test(normalize(rawName));
        const hasAggregateHours = nextDayColumns.some((column) => {
          const value = Number((cells[column] || '').replace(/[$,\s]/g, ''));
          return Number.isFinite(value) && value > 24;
        });
        const isSummary = summaryLabel || (!rawName.trim() && !rawNumber.trim() && hasAggregateHours);
        const project = projects.find((item) => rawProject && normalize(item.name || item.project_name || '') === normalize(rawProject));
        const siteMatches = sites.filter((item) => rawSite && normalize(item.name || '') === normalize(rawSite));
        const site = siteMatches.find((item) => project && String(item.project_id) === String(project.id)) || (siteMatches.length === 1 ? siteMatches[0] : undefined);
        const inferredProject = site ? projects.find((item) => String(item.id) === String(site.project_id)) : undefined;
        return { cells, employeeId: employee ? String(employee.id) : '', siteId: site ? String(site.id) : rawSite ? 'custom' : '', projectMatchId: project ? String(project.id) : rawProject ? 'custom' : inferredProject ? String(inferredProject.id) : '', status: isSummary ? 'summary' as const : 'ready' as const, csvRow: detectedHeaderRow + index + 2 };
      });
      setHeaders(nextHeaders); setSourceHeaderRows(nextHeaderRows); setRows(imported); setFileName(file.name); setSourceFile(file); setPeriod(inferredPeriod);
    } catch (err: any) { setHeaders([]); setSourceHeaderRows([]); setRows([]); setFileName(''); setSourceFile(null); setError(err?.message || 'Could not read the selected file.'); }
    finally { setReading(false); }
  }

  function updateRow(index: number, key: 'employeeId' | 'siteId' | 'projectMatchId', value: string) {
    setRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      if (key === 'siteId') {
        const selectedSite = sites.find((site) => String(site.id) === value);
        return { ...row, siteId: value, projectMatchId: selectedSite?.project_id ? String(selectedSite.project_id) : row.projectMatchId, status: row.status === 'saved' ? 'saved' : 'ready', error: undefined };
      }
      const selectedValue = key === 'employeeId' && value.startsWith(`csv-employee-${row.csvRow}`) ? '' : value;
      return { ...row, [key]: selectedValue, ...(key === 'projectMatchId' ? { siteId: '' } : {}), status: row.status === 'saved' ? 'saved' : 'ready', error: undefined };
    }));
  }

  async function saveMatchedRows() {
    setError(''); setNotice('');
    if (!period) { setError('Select the reporting month.'); return; }
    if (unmatchedCount) { setError(`Enter or match an employee name for each employee row (${unmatchedCount} incomplete). Blank-name totals are skipped; project and site assignments may be left blank.`); return; }
    setSaving(true);
    const pendingRows = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.status !== 'saved' && row.status !== 'summary');
    const mismatchedMonth = dayColumns.find((column) => column.month && column.month !== Number(period.slice(5, 7)));
    if (mismatchedMonth) {
      setError('The selected month does not match the month shown in the file date headings.');
      setSaving(false);
      return;
    }
    const batch: any[] = [];
    let invalidRows = 0;
    const invalidByIndex = new Map<number, string>();
    for (const { row, index } of pendingRows) {
      const entries = dayColumns.flatMap(({ day, index: column }) => {
        const raw = (row.cells[column] || '').replace(/[$,\s]/g, '');
        if (!raw) return [];
        const hours = Number(raw);
        if (!Number.isFinite(hours) || hours < 0 || hours > 24) return [{ work_date: `${period}-${String(day).padStart(2, '0')}`, hours: Number.NaN }];
        return [{ work_date: `${period}-${String(day).padStart(2, '0')}`, hours }];
      });
      const invalid = entries.find((entry) => !Number.isFinite(entry.hours));
      if (invalid) {
        invalidRows += 1;
        invalidByIndex.set(index, `Invalid hours for day ${Number(invalid.work_date.slice(-2))}; use a number from 0 to 24.`);
        continue;
      }
      const site = sites.find((item) => String(item.id) === row.siteId && String(item.project_id) === row.projectMatchId);
      const matchedProject = projects.find((item) => String(item.id) === row.projectMatchId);
      const employeeName = rawEmployee(row);
      const projectName = projectColumn >= 0 ? (row.cells[projectColumn] || '').trim() : '';
      const rawSite = siteColumn >= 0 ? (row.cells[siteColumn] || '').trim() : '';
      batch.push({
        employee_id: row.employeeId || null,
        employee_name: employeeName || null,
        project_id: row.projectMatchId === 'custom' ? null : matchedProject?.id || null,
        project_name: row.projectMatchId === 'custom' ? projectName || null : matchedProject?.name || matchedProject?.project_name || projectName || null,
        scope_project_id: matchedProject?.id || null,
        period_start: `${period}-01`,
        site_name: site ? site.name || null : rawSite || null,
        // One import has one source file. Store the filename once and link its
        // document to the first saved timesheet.
        source_file: batch.length === 0 ? sourceFile?.name || null : null,
        entries,
      });
    }
    if (invalidRows) {
      setRows((current) => current.map((row, index) => invalidByIndex.has(index) ? { ...row, status: 'error', error: invalidByIndex.get(index) } : row));
      setError(`${invalidRows} row${invalidRows === 1 ? '' : 's'} contain invalid daily hours. Correct them before saving the batch.`);
      setSaving(false);
      return;
    }
    try {
      const result = await apiFetch<{ items: any[]; saved_count: number }>('/api/v1/employees/timesheets/batch', {
        method: 'POST',
        body: JSON.stringify({ items: batch }),
      });
      const savedRows = result.items || [];
      setRows((current) => current.map((row) => row.status === 'summary' || row.status === 'saved' ? row : { ...row, status: 'saved', error: undefined }));

      // Keep one copy of the source file for this batch instead of duplicating
      // the same file for every employee row.
      let attachmentFailures = 0;
      if (sourceFile && savedRows[0]?.id) {
        const form = new FormData();
        form.append('file', sourceFile);
        form.append('title', `Imported time sheet ${period} — ${sourceFile.name}`.slice(0, 250));
        form.append('category', 'Workforce');
        form.append('tags', 'timesheet,import');
        form.append('source_type', 'employee_timesheet_import');
        form.append('source_id', String(savedRows[0].id));
        form.append('visibility', 'PUBLIC');
        try { await apiFetch('/api/v1/documents', { method: 'POST', body: form }); }
        catch { attachmentFailures = 1; }
      }
      const savedCount = result.saved_count ?? savedRows.length;
      if (savedCount > 0) onSaved?.(period);
      setNotice(`Saved ${savedCount} employee time sheet${savedCount === 1 ? '' : 's'} for ${period}.${attachmentFailures ? ` ${attachmentFailures} source file attachment${attachmentFailures === 1 ? '' : 's'} could not be uploaded.` : ''}`);
    } catch (err: any) {
      const message = err?.message || 'Could not save the time sheet batch.';
      setRows((current) => current.map((row) => row.status === 'summary' || row.status === 'saved' ? row : { ...row, status: 'error', error: message }));
      setError(`No rows were saved. ${message}`);
    } finally {
      setSaving(false);
    }
  }

  const tableRows = rows.map((row, rowIndex) => <tr key={row.csvRow} className="border-t border-slate-200 align-top hover:bg-slate-50">
    <td className="sticky left-0 z-10 min-w-14 border-r border-slate-200 bg-white px-2 py-2 text-center font-mono text-xs text-slate-500">{row.csvRow}</td>
    {headers.map((_, columnIndex) => <td key={columnIndex} className="min-w-20 border-r border-slate-100 px-2 py-2 text-xs text-slate-700">{row.cells[columnIndex] || ''}</td>)}
    <td className="min-w-56 border-r border-slate-100 p-2"><SearchableSelect key={`employee-${row.csvRow}`} value={row.employeeId} onChange={(value) => updateRow(rowIndex, 'employeeId', value)} options={[{ value: `csv-employee-${row.csvRow}`, label: `Keep original employee: ${rawEmployee(row) || '(blank)'}` }, ...employeeOptions]} placeholder={rawEmployee(row) || 'Keep original employee name'} searchable disabled={row.status === 'saved' || row.status === 'summary'} /></td>
    <td className="min-w-56 border-r border-slate-100 p-2"><SearchableSelect value={row.projectMatchId} onChange={(value) => updateRow(rowIndex, 'projectMatchId', value)} options={[{ value: 'custom', label: `Keep original project: ${projectColumn >= 0 ? row.cells[projectColumn] || '(blank)' : 'Select a project'}` }, ...projectOptions]} placeholder="Select project for this row" searchable disabled={row.status === 'saved' || row.status === 'summary'} /></td>
    <td className="min-w-56 border-r border-slate-100 p-2"><SearchableSelect value={row.siteId} onChange={(value) => updateRow(rowIndex, 'siteId', value)} options={[{ value: 'custom', label: `Keep original site: ${siteColumn >= 0 ? row.cells[siteColumn] || '(blank)' : 'No site'}` }, ...siteOptions.filter((option) => !row.projectMatchId || row.projectMatchId === 'custom' || sites.some((site) => String(site.id) === option.value && String(site.project_id) === row.projectMatchId))]} placeholder="Select site for this row" searchable disabled={row.status === 'saved' || row.status === 'summary'} /></td>
    <td className="sticky right-0 z-10 min-w-44 border-l border-slate-200 bg-white px-2 py-2 text-xs">{row.status === 'saved' ? <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 size={14} />Saved</span> : row.status === 'summary' ? <span className="text-slate-500">Summary row · not imported</span> : row.error ? <span className="inline-flex items-start gap-1 text-red-700"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{row.error}</span> : (row.employeeId || rawEmployee(row)) ? <span className="text-emerald-700">Ready</span> : <span className="text-amber-700">Needs employee</span>}</td>
  </tr>);

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-2 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <section className="flex max-h-[96vh] w-full max-w-[96vw] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between rounded-t-3xl bg-[#123f68] px-6 py-4 text-white"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-100">{heading}</p><h2 className="mt-1 text-xl font-bold">Import employee time sheet</h2><p className="mt-1 text-sm text-blue-100">Review the CSV or Excel file as supplied, then match each row to an employee and project site.</p></div><button type="button" disabled={saving} onClick={onClose} aria-label="Close" className="rounded-full p-2 text-blue-100 transition hover:bg-white/10 hover:text-white"><X size={20} /></button></header>
      <div className="flex-1 space-y-4 overflow-auto p-4 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(230px,1fr)_auto]">
          <label className="block space-y-1"><span className="text-xs font-bold text-slate-700">Reporting month *</span><AppDateTimePicker mode="month" value={period} onChange={(value) => value && setPeriod(value)} placeholder="Select month" /></label>
          <label className={`inline-flex h-10 items-center justify-center gap-2 self-end rounded-xl px-5 text-sm font-bold text-white transition ${loading || reading || saving ? 'cursor-not-allowed bg-slate-400' : 'cursor-pointer bg-[#184877] hover:bg-[#123f68]'}`}><Upload size={16} />{reading ? 'Reading file…' : 'Upload CSV or Excel'}<input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" disabled={loading || reading || saving} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void upload(file); }} /></label>
        </div>
        <div className="rounded-2xl border-l-4 border-blue-500 bg-blue-50 p-4 text-sm text-blue-950 shadow-xs">Upload a CSV or Excel file (.xlsx or .xls). Excel imports read the first worksheet only. It can include employees from multiple projects and sites. The preview keeps its weekday/date heading rows, NAME and SITE columns, daily hours, Hrs, and Total Days in their original order. Match each row to its employee and project; selecting a site linked to a project can fill the project automatically. The monthly total is recalculated from the daily hours.</div>
        {loading && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Loading employees and projects…</p>}
        {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
        {fileName && <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="inline-flex items-center gap-2 font-semibold text-slate-800"><FileSpreadsheet size={17} className="text-emerald-700" />{fileName} · {rows.length - summaryCount} employee rows · {summaryCount} summary rows skipped</span><span className="text-slate-600">{savedCount} saved · {readyCount} ready · {unmatchedCount} need matching</span></div>}
        {rows.length > 0 && <div className="max-h-[62vh] overflow-auto rounded-2xl border border-slate-300 shadow-xs"><table className="w-full border-collapse text-left"><thead className="sticky top-0 z-20 bg-slate-100">{sourceHeaderRows.map((headerRow, rowIndex) => <tr key={rowIndex} className="bg-slate-100">{rowIndex === 0 && <th rowSpan={sourceHeaderRows.length} className="sticky left-0 z-30 min-w-14 border-r border-slate-200 bg-slate-100 px-2 py-2 text-[10px] font-bold uppercase text-slate-600">Row</th>}{headerRow.map((header, columnIndex) => <th key={columnIndex} className="min-w-20 border-r border-slate-200 px-2 py-2 text-[10px] font-bold uppercase text-slate-600">{header}</th>)}{rowIndex === sourceHeaderRows.length - 1 && <><th className="min-w-56 border-r border-slate-200 px-2 py-2 text-[10px] font-bold uppercase text-slate-600">Matched employee</th><th className="min-w-56 border-r border-slate-200 px-2 py-2 text-[10px] font-bold uppercase text-slate-600">Matched project</th><th className="min-w-56 border-r border-slate-200 px-2 py-2 text-[10px] font-bold uppercase text-slate-600">Matched site</th><th className="sticky right-0 z-30 min-w-44 border-l border-slate-200 bg-slate-100 px-2 py-2 text-[10px] font-bold uppercase text-slate-600">Import status</th></>}</tr>)}</thead><tbody>{tableRows}</tbody></table></div>}
        {!rows.length && !fileName && <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center text-slate-500"><FileSpreadsheet size={36} className="text-slate-400" /><p className="mt-3 font-semibold text-slate-700">No timesheet uploaded yet</p><p className="mt-1 text-xs text-slate-500">Select the reporting month, then upload the original timesheet CSV or Excel file.</p></div>}
        {(employeeColumn < 0 && headers.length > 0) && <p className="text-xs text-amber-700">Employee name column was not detected. Use Employee Number or manually match employee rows.</p>}
        {(siteColumn < 0 && headers.length > 0) && <p className="text-xs text-amber-700">No site column was detected; select a project site for each row.</p>}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-b-3xl border-t border-slate-200 bg-slate-50 px-6 py-4"><p className="text-xs text-slate-500">All matched employee rows are saved together. Reimporting the same employee and month updates that time sheet instead of creating a duplicate.</p><div className="flex gap-2"><button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Close</button><button type="button" disabled={saving || reading || !rows.length || unmatchedCount > 0 || readyCount === 0} onClick={() => void saveMatchedRows()} className="inline-flex items-center gap-2 rounded-xl bg-[#184877] px-5 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-[#123f68] disabled:cursor-not-allowed disabled:bg-slate-300">{saving && <Loader2 size={15} className="animate-spin" />}{saving ? 'Saving all rows…' : `Save ${readyCount} matched row${readyCount === 1 ? '' : 's'}`}</button></div></footer>
    </section>
  </div>;
}
