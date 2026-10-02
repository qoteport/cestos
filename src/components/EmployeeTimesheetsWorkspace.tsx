'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle, CalendarDays, Check, Clock3, Maximize2, Minimize2, Paperclip, Pencil, Plus, X } from 'lucide-react';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import { openUniversalFileViewer } from '@/lib/fileViewer';
import SearchableSelect from './SearchableSelect';
import CommandCenterTimesheetCsvModal from './CommandCenterTimesheetCsvModal';
import AppDateTimePicker from './ui/AppDateTimePicker';

type EmployeeOption = {
  id: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  employee_number?: string;
  is_active?: boolean;
  employment_status?: string;
};

type TimesheetRow = {
  id: string;
  employee_id: string | null;
  employee_name: string;
  employee_number?: string;
  period: string;
  site_name?: string | null;
  project_id?: string | null;
  scope_project_id?: string | null;
  project_name?: string | null;
  daily_hours: Record<number, number>;
  total_hours: number;
  days_worked: number;
  source_file?: string | null;
};
type SiteOption = { id: string; name?: string; project_name?: string | null; is_active?: boolean };
const CUSTOM_EMPLOYEE_VALUE = '__CUSTOM_EMPLOYEE__';

const accents = {
  emerald: {
    active: 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    action: 'bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-500',
    icon: 'text-emerald-700 dark:text-emerald-400',
    headerPrimary: 'bg-emerald-900 border-emerald-950 text-white dark:bg-emerald-950 dark:border-slate-700',
    headerSecondary: 'bg-emerald-100 text-emerald-950 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-100 dark:border-slate-700',
    activeDay: 'bg-emerald-50/70 text-emerald-900 font-bold dark:bg-emerald-950/40 dark:text-emerald-200',
    bulkSelectedCard: 'border-emerald-500 bg-emerald-50/80 shadow-xs ring-2 ring-emerald-200 dark:border-emerald-500 dark:bg-emerald-950/40 dark:ring-emerald-900',
    bulkCheckbox: 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-slate-950 focus-visible:ring-emerald-500',
    bulkText: 'text-emerald-800 dark:text-emerald-200',
  },
  indigo: {
    active: 'border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
    action: 'bg-indigo-700 hover:bg-indigo-800 focus:ring-indigo-500',
    icon: 'text-indigo-700 dark:text-indigo-400',
    headerPrimary: 'bg-indigo-900 border-indigo-950 text-white dark:bg-indigo-950 dark:border-slate-700',
    headerSecondary: 'bg-indigo-100 text-indigo-950 border-indigo-200 dark:bg-indigo-900/60 dark:text-indigo-100 dark:border-slate-700',
    activeDay: 'bg-indigo-50/70 text-indigo-900 font-bold dark:bg-indigo-950/40 dark:text-indigo-200',
    bulkSelectedCard: 'border-indigo-500 bg-indigo-50/80 shadow-xs ring-2 ring-indigo-200 dark:border-indigo-500 dark:bg-indigo-950/40 dark:ring-indigo-900',
    bulkCheckbox: 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-400 dark:text-slate-950 focus-visible:ring-indigo-500',
    bulkText: 'text-indigo-800 dark:text-indigo-200',
  },
  orange: {
    active: 'border-orange-600 bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300',
    action: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500',
    icon: 'text-orange-700 dark:text-orange-400',
    headerPrimary: 'bg-orange-800 border-orange-950 text-white dark:bg-orange-950 dark:border-slate-700',
    headerSecondary: 'bg-orange-100 text-orange-950 border-orange-200 dark:bg-orange-900/60 dark:text-orange-100 dark:border-slate-700',
    activeDay: 'bg-orange-50/70 text-orange-900 font-bold dark:bg-orange-950/40 dark:text-orange-200',
    bulkSelectedCard: 'border-orange-500 bg-orange-50/80 shadow-xs ring-2 ring-orange-200 dark:border-orange-500 dark:bg-orange-950/40 dark:ring-orange-900',
    bulkCheckbox: 'border-orange-600 bg-orange-600 text-white dark:border-orange-400 dark:bg-orange-400 dark:text-slate-950 focus-visible:ring-orange-500',
    bulkText: 'text-orange-800 dark:text-orange-200',
  },
  violet: {
    active: 'border-violet-600 bg-violet-50 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300',
    action: 'bg-violet-700 hover:bg-violet-800 focus:ring-violet-500',
    icon: 'text-violet-700 dark:text-violet-400',
    headerPrimary: 'bg-violet-900 border-violet-950 text-white dark:bg-violet-950 dark:border-slate-700',
    headerSecondary: 'bg-violet-100 text-violet-950 border-violet-200 dark:bg-violet-900/60 dark:text-violet-100 dark:border-slate-700',
    activeDay: 'bg-violet-50/70 text-violet-900 font-bold dark:bg-violet-950/40 dark:text-violet-200',
    bulkSelectedCard: 'border-violet-500 bg-violet-50/80 shadow-xs ring-2 ring-violet-200 dark:border-violet-500 dark:bg-violet-950/40 dark:ring-violet-900',
    bulkCheckbox: 'border-violet-600 bg-violet-600 text-white dark:border-violet-400 dark:bg-violet-400 dark:text-slate-950 focus-visible:ring-violet-500',
    bulkText: 'text-violet-800 dark:text-violet-200',
  },
  amber: {
    active: 'border-amber-600 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    action: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    icon: 'text-amber-700 dark:text-amber-400',
    headerPrimary: 'bg-amber-800 border-amber-950 text-white dark:bg-amber-950 dark:border-slate-700',
    headerSecondary: 'bg-amber-100 text-amber-950 border-amber-200 dark:bg-amber-900/60 dark:text-amber-100 dark:border-slate-700',
    activeDay: 'bg-amber-50/70 text-amber-900 font-bold dark:bg-amber-950/40 dark:text-amber-200',
    bulkSelectedCard: 'border-amber-500 bg-amber-50/80 shadow-xs ring-2 ring-amber-200 dark:border-amber-500 dark:bg-amber-950/40 dark:ring-amber-900',
    bulkCheckbox: 'border-amber-600 bg-amber-600 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-slate-950 focus-visible:ring-amber-500',
    bulkText: 'text-amber-800 dark:text-amber-200',
  },
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function EmployeeTimesheetsWorkspace({
  employees,
  canReport = false,
  accent,
  projectId,
}: {
  employees: EmployeeOption[];
  canReport?: boolean;
  accent?: keyof typeof accents;
  projectId?: string;
}) {
  const pathname = usePathname() || '';
  const effectiveAccent: keyof typeof accents = (
    accent && accents[accent] ? accent : (
      pathname.includes('/hr-portal') ? 'emerald' :
      pathname.includes('/executive-portal') ? 'indigo' :
      pathname.includes('/finance-portal') ? 'violet' :
      pathname.includes('/field-admin-portal') ? 'orange' :
      'emerald'
    )
  );
  const colors = accents[effectiveAccent] || accents.emerald;
  const [period, setPeriod] = useState('');
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<TimesheetRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [customEmployee, setCustomEmployee] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [formPeriod, setFormPeriod] = useState(currentMonth());
  const [siteName, setSiteName] = useState('');
  const [dailyHours, setDailyHours] = useState<Record<number, string>>({});
  const [bulkHours, setBulkHours] = useState('');
  const [bulkDays, setBulkDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [savedForAnother, setSavedForAnother] = useState(false);
  const formScrollRef = useRef<HTMLDivElement>(null);
  const [attachmentBusy, setAttachmentBusy] = useState<string | null>(null);
  const [fullView, setFullView] = useState(false);

  const reload = useCallback(async (requestedPeriod: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (requestedPeriod) params.set('period', requestedPeriod);
      const query = params.size ? `?${params.toString()}` : '';
      const result = await apiFetch<{ period?: string; items?: TimesheetRow[] }>(
        `/api/v1/employees/timesheets${query}`,
        {},
        true,
        { bypassMemoryRead: true },
      );
      setRows(Array.isArray(result?.items) ? result.items : []);
      if (!requestedPeriod && result?.period) setPeriod(result.period);
      if (!requestedPeriod && !result?.period) setPeriod(currentMonth());
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : 'Could not load timesheets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(period); }, [period, refreshKey, reload]);

  useEffect(() => {
    if (!fullView) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullView(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullView]);

  useEffect(() => {
    let active = true;
    const path = projectId
      ? `/api/v1/projects/${encodeURIComponent(projectId)}/sites`
      : '/api/v1/locations?page_size=100';
    apiFetch<any>(path).then((result) => {
      if (!active) return;
      const items = Array.isArray(result) ? result : result?.items || [];
      setSites(items.filter((site: SiteOption) => site.is_active !== false));
    }).catch(() => { if (active) setSites([]); });
    return () => { active = false; };
  }, [projectId]);

  const daysInPeriod = useMemo(() => {
    const [year, month] = (period || currentMonth()).split('-').map(Number);
    return new Date(year, month, 0).getDate();
  }, [period]);
  const calendarDays = useMemo(() => {
    const [year, month] = (period || currentMonth()).split('-').map(Number);
    return Array.from({ length: daysInPeriod }, (_, index) => {
      const day = index + 1;
      const date = new Date(year, month - 1, day);
      return {
        day,
        weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
        dayMonth: `${day}-${new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date)}`,
        isoDate: `${period || currentMonth()}-${String(day).padStart(2, '0')}`,
      };
    });
  }, [daysInPeriod, period]);
  const dailyHourTotals = useMemo(() => calendarDays.map(({ day }) => rows.reduce((sum, row) => sum + Number(row.daily_hours?.[day] || 0), 0)), [calendarDays, rows]);
  const totalDaysWorked = useMemo(() => rows.reduce((sum, row) => sum + Number(row.days_worked || 0), 0), [rows]);
  const daysInForm = useMemo(() => {
    const [year, month] = (formPeriod || currentMonth()).split('-').map(Number);
    return new Date(year, month, 0).getDate();
  }, [formPeriod]);
  const employeeOptions = useMemo(() => [{ value: CUSTOM_EMPLOYEE_VALUE, label: 'Enter a custom employee name…' }, ...employees.map((employee) => ({
    value: String(employee.id),
    label: [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(' ') || 'Employee',
    sublabel: employee.employee_number || '',
  }))], [employees]);
  const siteOptions = useMemo(() => {
    const options = sites.map((site) => ({
      value: site.name || '',
      label: site.name || 'Site',
      sublabel: site.project_name || '',
    })).filter((option) => option.value);
    if (siteName && !options.some((option) => option.value === siteName)) {
      options.unshift({ value: siteName, label: siteName, sublabel: 'Current value' });
    }
    return [{ value: '', label: 'Blank (Sab Leave)' }, ...options];
  }, [sites, siteName]);

  function openNew() {
    setEditing(null);
    setEmployeeId('');
    setCustomEmployee(false);
    setEmployeeName('');
    setFormPeriod(currentMonth());
    setSiteName('');
    setDailyHours({});
    setBulkHours('');
    setBulkDays([]);
    setFormError('');
    setSavedForAnother(false);
    setShowForm(true);
  }

  function openEdit(row: TimesheetRow) {
    setEditing(row);
    setEmployeeId(row.employee_id || '');
    setCustomEmployee(!row.employee_id);
    setEmployeeName(row.employee_id ? '' : row.employee_name || '');
    setFormPeriod(row.period);
    setSiteName(row.site_name || '');
    setDailyHours(Object.fromEntries(Object.entries(row.daily_hours || {}).map(([day, hours]) => [Number(day), String(hours)])));
    setBulkHours('');
    setBulkDays([]);
    setFormError('');
    setSavedForAnother(false);
    setShowForm(true);
  }

  async function saveTimesheet(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    const enteredEmployeeName = customEmployee ? employeeName.trim() : '';
    if ((!employeeId && !enteredEmployeeName) || !formPeriod) {
      setFormError('Select an employee and reporting month.');
      return;
    }
    const entries: { work_date: string; hours: number }[] = [];
    for (const [day, value] of Object.entries(dailyHours)) {
      if (!value.trim()) continue;
      const hours = Number(value);
      if (!Number.isFinite(hours) || hours < 0 || hours > 15) {
        setFormError(`Hours for day ${day} must be between 0 and 15.`);
        return;
      }
      entries.push({ work_date: `${formPeriod}-${String(day).padStart(2, '0')}`, hours });
    }
    setSaving(true);
    try {
      const endpoint = editing ? `/api/v1/employees/timesheets/${editing.id}` : '/api/v1/employees/timesheets';
      await apiFetch(endpoint, {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({ employee_id: customEmployee ? null : employeeId, employee_name: enteredEmployeeName || null, project_id: editing ? editing.project_id || null : projectId || null, scope_project_id: editing ? editing.scope_project_id || null : projectId || null, project_name: editing?.project_name || null, period_start: `${formPeriod}-01`, site_name: siteName.trim() || null, entries }),
      });
      if (editing) {
        setShowForm(false);
      } else {
        setEditing(null);
        setEmployeeId('');
        setCustomEmployee(false);
        setEmployeeName('');
        setSiteName('');
        setDailyHours({});
        setBulkHours('');
        setBulkDays([]);
        setSavedForAnother(true);
      }
      if (period !== formPeriod) setPeriod(formPeriod);
      else setRefreshKey((value) => value + 1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save this timesheet.');
    } finally {
      setSaving(false);
    }
  }

  function applyHoursToSelectedDays() {
    const value = Number(bulkHours);
    if (!bulkHours.trim() || !Number.isFinite(value) || value < 0 || value > 15) {
      setFormError('Enter a number from 0 to 15 hours to apply.');
      return;
    }
    if (!bulkDays.length) {
      setFormError('Select at least one day to apply the hours to.');
      return;
    }
    setDailyHours((current) => ({
      ...current,
      ...Object.fromEntries(bulkDays.map((day) => [day, bulkHours])),
    }));
    setBulkDays([]);
    setFormError('');
  }

  async function viewSourceFile(row: TimesheetRow, download = false) {
    setAttachmentBusy(row.id);
    try {
      const result = await apiFetch<any>(`/api/v1/documents?view=all&page_size=10&source_type=employee_timesheet_import&source_id=${encodeURIComponent(row.id)}`);
      const file = (Array.isArray(result) ? result : result?.items || [])[0];
      if (!file) throw new Error('No source file is attached to this time sheet.');
      const blob = await apiFetchBlob(`/api/v1/documents/${file.id}/${download ? 'download' : 'view?disposition=inline'}`);
      const name = file.file_name || file.title || 'timesheet-import.csv';
      if (download) downloadBlob(blob, name);
      else openUniversalFileViewer({ blob, fileName: name, title: 'Imported time sheet source' });
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not open the imported source file.'); }
    finally { setAttachmentBusy(null); }
  }

  const allHours = rows.reduce((sum, row) => sum + Number(row.total_hours || 0), 0);
  const activeRows = rows.length;
  const sourceCsvRow = rows.find((row) => row.source_file);

  return (
    <section className="space-y-4" aria-label="Employee timesheets">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-xl bg-slate-100 p-2 dark:bg-slate-800 ${colors.icon}`}><CalendarDays size={19} /></div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Monthly time sheet</h3>
            <p className="mt-0.5 text-xs text-slate-500">Daily reported hours across accessible projects. Blank cells mean no hours were reported.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>Reporting month</span>
            <div className="mt-1 w-44">
              <AppDateTimePicker
                mode="month"
                value={period || currentMonth()}
                onChange={(val) => val && setPeriod(val)}
                placeholder="Select month..."
              />
            </div>
          </div>
          {sourceCsvRow && <button type="button" onClick={() => void viewSourceFile(sourceCsvRow)} disabled={attachmentBusy === sourceCsvRow.id} className="mb-0.5 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Paperclip size={15} />{attachmentBusy === sourceCsvRow.id ? 'Opening source…' : 'Source File'}</button>}
          {canReport && <button type="button" onClick={openNew} className={`mb-0.5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.action}`}><Plus size={16} /> Log time sheet</button>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Employee records across accessible projects</p><p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{activeRows}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Total reported hours</p><p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{allHours.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></div>
      </div>

      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"><AlertTriangle size={16} />{error}<button type="button" className="ml-auto font-bold underline" onClick={() => setRefreshKey((value) => value + 1)}>Retry</button></div>}

      <div className={`${fullView ? 'fixed inset-2 z-[90] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:inset-4' : 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900'}`} role={fullView ? 'dialog' : undefined} aria-modal={fullView || undefined} aria-label={fullView ? 'Monthly time sheet full view' : undefined}>
        {fullView && <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"><div><p className="text-sm font-bold text-slate-900 dark:text-white">Monthly time sheet</p><p className="text-xs text-slate-500">{period || currentMonth()}</p></div><button type="button" onClick={() => setFullView(false)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" aria-label="Exit full view"><Minimize2 size={15} /> Exit full view</button></div>}
        {loading ? <div role="status" className="p-8 text-center text-sm text-slate-500">Loading time sheet…</div> : (
          <div className={`${fullView ? 'min-h-0 flex-1 overflow-auto' : 'max-h-[70vh] overflow-auto'}`}>
            <table className="min-w-max border-separate border-spacing-0 text-left text-xs">
              <thead className="text-[10px] font-extrabold uppercase tracking-wide">
                <tr className="h-8">
                  <th className={`md:sticky md:left-0 md:top-0 z-20 md:z-50 h-8 w-[210px] min-w-[210px] max-w-[210px] border-b-2 border-r px-3 text-white shadow-[0_2px_3px_rgba(15,23,42,0.16)] ${colors.headerPrimary}`} />
                  <th className={`md:sticky md:left-[210px] md:top-0 z-20 md:z-50 h-8 w-[115px] min-w-[115px] max-w-[115px] border-b-2 border-r px-3 text-white shadow-[0_2px_3px_rgba(15,23,42,0.16)] ${colors.headerPrimary}`} />
                  {calendarDays.map(({ day, weekday, isoDate }) => <th key={day} className={`md:sticky md:top-0 z-10 md:z-40 h-8 min-w-[48px] border-b-2 border-r px-2 text-center text-white shadow-[0_2px_3px_rgba(15,23,42,0.16)] ${colors.headerPrimary}`} title={isoDate}>{weekday}</th>)}
                  <th className={`md:sticky md:top-0 z-10 md:z-40 h-8 min-w-[88px] border-b-2 border-l px-3 shadow-[0_2px_3px_rgba(15,23,42,0.16)] ${colors.headerPrimary}`} />
                  <th className={`md:sticky md:top-0 z-10 md:z-40 h-8 min-w-[85px] border-b-2 border-l px-3 shadow-[0_2px_3px_rgba(15,23,42,0.16)] ${colors.headerPrimary}`} />
                  <th className={`md:sticky md:right-0 md:top-0 z-20 md:z-50 h-8 min-w-[78px] border-b-2 border-l px-3 shadow-[0_2px_3px_rgba(15,23,42,0.16)] ${colors.headerPrimary}`} />
                </tr>
                <tr className={`h-10 ${colors.headerSecondary}`}>
                  <th className={`md:sticky md:left-0 md:top-8 z-20 md:z-50 h-10 w-[210px] min-w-[210px] max-w-[210px] border-b-2 border-r px-3 shadow-[0_2px_3px_rgba(15,23,42,0.12)] ${colors.headerSecondary}`}>Name</th>
                  <th className={`md:sticky md:left-[210px] md:top-8 z-20 md:z-50 h-10 w-[115px] min-w-[115px] max-w-[115px] border-b-2 border-r px-3 shadow-[0_2px_3px_rgba(15,23,42,0.12)] ${colors.headerSecondary}`}>Site</th>
                  {calendarDays.map(({ day, dayMonth, isoDate }) => <th key={day} className={`md:sticky md:top-8 z-10 md:z-40 h-10 min-w-[48px] border-b-2 border-r px-2 text-center shadow-[0_2px_3px_rgba(15,23,42,0.12)] ${colors.headerSecondary}`} title={isoDate}>{dayMonth}</th>)}
                  <th className={`md:sticky md:top-8 z-10 md:z-40 h-10 min-w-[88px] border-b-2 border-l px-3 text-right shadow-[0_2px_3px_rgba(15,23,42,0.12)] ${colors.headerSecondary}`}>Hrs</th>
                  <th className={`md:sticky md:top-8 z-10 md:z-40 h-10 min-w-[85px] border-b-2 border-l px-3 text-right shadow-[0_2px_3px_rgba(15,23,42,0.12)] ${colors.headerSecondary}`}>Total days</th>
                  <th className={`md:sticky md:right-0 md:top-8 z-20 md:z-50 h-10 min-w-[78px] border-b-2 border-l px-2 text-center shadow-[0_2px_3px_rgba(15,23,42,0.12)] ${colors.headerSecondary}`}><div className="flex items-center justify-center gap-1"><span>Action</span><button type="button" onClick={() => setFullView(true)} aria-label="View time sheet in full screen" title="Full view" className="rounded p-1 text-slate-600 hover:bg-black/10 dark:text-slate-300"><Maximize2 size={14} /></button></div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.length === 0 ? <tr><td colSpan={daysInPeriod + 5} className="p-10 text-center text-sm text-slate-500">No time sheets have been reported for this month.</td></tr> : rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="md:sticky md:left-0 z-20 w-[210px] min-w-[210px] max-w-[210px] border-r border-slate-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"><span className="block truncate font-bold text-slate-900 dark:text-white">{row.employee_name}</span><span className="mt-0.5 block truncate font-mono text-[10px] text-slate-500">{row.employee_number || '—'}</span></td>
                    <td className="md:sticky md:left-[210px] z-20 w-[115px] min-w-[115px] max-w-[115px] border-r border-slate-100 bg-white px-3 py-2 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><span className="block truncate">{row.site_name || '—'}</span>{row.project_name && <span className="block truncate text-[10px] text-slate-400" title={row.project_name}>{row.project_name}</span>}</td>
                    {calendarDays.map(({ day }) => {
                      const value = row.daily_hours?.[day];
                      return <td key={day} className={`px-2 py-2 text-center tabular-nums ${typeof value === 'number' && value > 0 ? `font-semibold ${colors.activeDay}` : 'text-slate-400'}`}>{typeof value === 'number' ? value : '—'}</td>;
                    })}
                    <td className="border-l border-slate-100 px-3 py-2 text-right font-extrabold tabular-nums text-slate-900 dark:border-slate-800 dark:text-white">{Number(row.total_hours || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{row.days_worked}</td>
                    <td className="md:sticky md:right-0 border-l border-slate-100 bg-white px-2 py-2 text-center dark:border-slate-800 dark:bg-slate-900">{canReport && row.employee_id && <button type="button" onClick={() => openEdit(row)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Pencil size={12} /></button>}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className={`border-t-2 font-extrabold ${colors.headerSecondary}`}>
                <tr>
                  <td className={`md:sticky md:left-0 z-20 w-[210px] min-w-[210px] max-w-[210px] border-r px-3 py-3 ${colors.headerSecondary}`} />
                  <td className={`md:sticky md:left-[210px] z-20 w-[115px] min-w-[115px] max-w-[115px] border-r px-3 py-3 text-right ${colors.headerSecondary}`}>Hrs</td>
                  {dailyHourTotals.map((hours, index) => <td key={index + 1} className="border-r border-slate-200 px-2 py-3 text-center tabular-nums dark:border-slate-700">{hours.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>)}
                  <td className="border-l border-slate-200 px-3 py-3 text-right tabular-nums dark:border-slate-700">{allHours.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td className="border-l border-slate-200 px-3 py-3 text-right tabular-nums dark:border-slate-700">{totalDaysWorked}</td>
                  <td className={`md:sticky md:right-0 border-l px-2 py-3 ${colors.headerSecondary}`} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showImport && <CommandCenterTimesheetCsvModal heading="Report employee hours" theme={accent === 'orange' ? 'orange' : accent === 'emerald' ? 'emerald' : 'blue'} onClose={() => setShowImport(false)} onSaved={(importedPeriod) => { setPeriod(importedPeriod); setRefreshKey((value) => value + 1); }} />}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-2 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="timesheet-form-title" className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div><h3 id="timesheet-form-title" className="font-bold text-slate-900 dark:text-white">{editing ? 'Edit employee time sheet' : 'Report employee hours'}</h3><p className="mt-1 text-xs text-slate-500">Upload a CSV or Excel file, or enter employees one after another. Leave a day blank when no hours were reported.</p></div>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
            </div>
            <form onSubmit={saveTimesheet} className="flex min-h-0 flex-1 flex-col">
              <div ref={formScrollRef} className="grid gap-3 overflow-y-auto p-5 sm:grid-cols-2">
                {!editing && <div className="rounded-xl border border-dashed border-slate-300 p-4 sm:col-span-2 dark:border-slate-600"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">Import hours from a file</p><p className="mt-1 text-xs text-slate-500">Upload CSV, XLSX or XLS and review the extracted employee rows. Excel uses the first worksheet.</p></div><button type="button" disabled={saving} onClick={() => setShowImport(true)} className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${colors.action}`}>Upload CSV or Excel</button></div><p className="mt-3 text-xs text-slate-500">Or fill in the fields below, save, then select Log another to enter the next employee.</p></div>}
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Employee <span className="text-red-600">*</span>
                  <div className="mt-1">
                    {customEmployee
                      ? <div className="flex gap-2"><input autoFocus value={employeeName} onChange={(event) => setEmployeeName(event.target.value)} placeholder="Enter employee name" maxLength={200} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /><button type="button" onClick={() => { setCustomEmployee(false); setEmployeeName(''); }} className="shrink-0 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Select employee</button></div>
                      : <SearchableSelect value={employeeId} onChange={(value) => { if (value === CUSTOM_EMPLOYEE_VALUE) { setCustomEmployee(true); setEmployeeId(''); } else setEmployeeId(value); }} options={employeeOptions} placeholder="Search employee…" disabled={Boolean(editing)} searchable />}
                  </div>
                </label>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Reporting month <span className="text-red-600">*</span></span>
                  <div className="mt-1">
                    <AppDateTimePicker
                      mode="month"
                      value={formPeriod}
                      disabled={Boolean(editing)}
                      onChange={(val) => val && setFormPeriod(val)}
                      placeholder="Select reporting month..."
                    />
                  </div>
                </div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 sm:col-span-2">Site / location
                  <div className="mt-1"><SearchableSelect value={siteName} onChange={setSiteName} options={siteOptions} placeholder="Select site / location" searchable /></div>
                </label>
                <div className="sm:col-span-2">
                  <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300"><Clock3 size={14} className={colors.icon} /> Daily hours (maximum 15 per day)</div>
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Hours to apply
                        <input type="number" min="0" max="15" step="0.25" inputMode="decimal" value={bulkHours} onChange={(event) => setBulkHours(event.target.value)} className="ml-2 w-24 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                      </label>
                      <button type="button" onClick={applyHoursToSelectedDays} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Apply to selected days ({bulkDays.length})</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-8">
                    {Array.from({ length: daysInForm }, (_, index) => {
                      const day = index + 1;
                      const [formYear, formMonth] = (formPeriod || currentMonth()).split('-').map(Number);
                      const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(formYear, formMonth - 1, day));
                      const selected = bulkDays.includes(day);
                      const inputId = `timesheet-hours-${day}`;
                      return <div key={day} className={`overflow-hidden rounded-xl border transition-all ${selected ? colors.bulkSelectedCard : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-500'}`}>
                        <div className="flex items-center justify-between px-2.5 py-2">
                          <label htmlFor={inputId} className={`cursor-pointer text-[10px] font-bold uppercase tracking-wide ${selected ? colors.bulkText : 'text-slate-500 dark:text-slate-400'}`}>Day {day} <span className="ml-1 normal-case opacity-75">· {weekday}</span></label>
                          <button type="button" role="checkbox" aria-checked={selected} aria-label={`Select day ${day} for bulk hours`} onClick={() => setBulkDays((current) => selected ? current.filter((item) => item !== day) : [...current, day])} className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${selected ? colors.bulkCheckbox : 'border-slate-300 bg-white text-transparent hover:border-slate-400 dark:border-slate-600 dark:bg-slate-900'}`}>
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          </button>
                        </div>
                        <div className="border-none">
                          <input id={inputId} type="number" min="0" max="15" step="0.25" inputMode="decimal" value={dailyHours[day] ?? ''} onChange={(event) => setDailyHours((current) => ({ ...current, [day]: event.target.value }))} aria-label={`Hours for day ${day}`} className="block w-full border-0 bg-transparent px-2.5 py-2 text-sm font-semibold text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:ring-0 dark:text-white" />
                        </div>
                      </div>;
                    })}
                  </div>
                </div>
              </div>
              {savedForAnother && <p role="status" className="mx-5 mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">Time sheet saved. Select another employee and site to continue.</p>}
              {formError && <p role="alert" className="mx-5 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{formError}</p>}
              <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</button>
                {savedForAnother
                  ? <button type="button" onClick={() => { formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); setSavedForAnother(false); }} className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${colors.action}`}>Log another</button>
                  : <button type="submit" disabled={saving} className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${colors.action}`}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Save time sheet'}</button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
