'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, Clock3, Pencil, Plus, RefreshCw, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import SearchableSelect from './SearchableSelect';
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
  employee_id: string;
  employee_name: string;
  employee_number?: string;
  period: string;
  site_name?: string | null;
  daily_hours: Record<number, number>;
  total_hours: number;
  days_worked: number;
  source_file?: string | null;
};

const accents = {
  emerald: { active: 'border-emerald-600 bg-emerald-50 text-emerald-800', action: 'bg-emerald-700 hover:bg-emerald-800 focus:ring-emerald-500', icon: 'text-emerald-700' },
  indigo: { active: 'border-indigo-600 bg-indigo-50 text-indigo-800', action: 'bg-indigo-700 hover:bg-indigo-800 focus:ring-indigo-500', icon: 'text-indigo-700' },
  orange: { active: 'border-orange-600 bg-orange-50 text-orange-800', action: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500', icon: 'text-orange-700' },
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function EmployeeTimesheetsWorkspace({
  employees,
  canReport = false,
  accent = 'emerald',
  projectId,
}: {
  employees: EmployeeOption[];
  canReport?: boolean;
  accent?: keyof typeof accents;
  projectId?: string;
}) {
  const colors = accents[accent];
  const [period, setPeriod] = useState('');
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<TimesheetRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [formPeriod, setFormPeriod] = useState(currentMonth());
  const [siteName, setSiteName] = useState('');
  const [dailyHours, setDailyHours] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const reload = useCallback(async (requestedPeriod: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (requestedPeriod) params.set('period', requestedPeriod);
      if (projectId) params.set('project_id', projectId);
      const query = params.size ? `?${params.toString()}` : '';
      const result = await apiFetch<{ period?: string; items?: TimesheetRow[] }>(`/api/v1/employees/timesheets${query}`);
      setRows(Array.isArray(result?.items) ? result.items : []);
      if (!requestedPeriod && result?.period) setPeriod(result.period);
      if (!requestedPeriod && !result?.period) setPeriod(currentMonth());
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : 'Could not load timesheets.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void reload(period); }, [period, refreshKey, reload]);

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
  const employeeOptions = useMemo(() => employees.map((employee) => ({
    value: String(employee.id),
    label: [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(' ') || 'Employee',
    sublabel: employee.employee_number || '',
  })), [employees]);

  function openNew() {
    setEditing(null);
    setEmployeeId('');
    setFormPeriod(currentMonth());
    setSiteName('');
    setDailyHours({});
    setFormError('');
    setShowForm(true);
  }

  function openEdit(row: TimesheetRow) {
    setEditing(row);
    setEmployeeId(row.employee_id);
    setFormPeriod(row.period);
    setSiteName(row.site_name || '');
    setDailyHours(Object.fromEntries(Object.entries(row.daily_hours || {}).map(([day, hours]) => [Number(day), String(hours)])));
    setFormError('');
    setShowForm(true);
  }

  async function saveTimesheet(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    if (!employeeId || !formPeriod) {
      setFormError('Select an employee and reporting month.');
      return;
    }
    const entries: { work_date: string; hours: number }[] = [];
    for (const [day, value] of Object.entries(dailyHours)) {
      if (!value.trim()) continue;
      const hours = Number(value);
      if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
        setFormError(`Hours for day ${day} must be between 0 and 24.`);
        return;
      }
      entries.push({ work_date: `${formPeriod}-${String(day).padStart(2, '0')}`, hours });
    }
    setSaving(true);
    try {
      const endpoint = editing ? `/api/v1/employees/timesheets/${editing.id}` : '/api/v1/employees/timesheets';
      await apiFetch(endpoint, {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({ employee_id: employeeId, project_id: projectId || null, period_start: `${formPeriod}-01`, site_name: siteName.trim() || null, entries }),
      });
      setShowForm(false);
      if (period !== formPeriod) setPeriod(formPeriod);
      else setRefreshKey((value) => value + 1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save this timesheet.');
    } finally {
      setSaving(false);
    }
  }

  const allHours = rows.reduce((sum, row) => sum + Number(row.total_hours || 0), 0);
  const activeRows = rows.length;

  return (
    <section className="space-y-4" aria-label="Employee timesheets">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-xl bg-slate-100 p-2 dark:bg-slate-800 ${colors.icon}`}><CalendarDays size={19} /></div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Monthly time sheet</h3>
            <p className="mt-0.5 text-xs text-slate-500">Daily reported hours by employee. Blank cells mean no hours were reported.</p>
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
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading} aria-label="Refresh time sheet" className="mb-0.5 rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
          {canReport && <button type="button" onClick={openNew} className={`mb-0.5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.action}`}><Plus size={16} /> Report hours</button>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Employee records</p><p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{activeRows}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Total reported hours</p><p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{allHours.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></div>
      </div>

      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"><AlertTriangle size={16} />{error}<button type="button" className="ml-auto font-bold underline" onClick={() => setRefreshKey((value) => value + 1)}>Retry</button></div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {loading ? <div role="status" className="p-8 text-center text-sm text-slate-500">Loading time sheet…</div> : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-max border-collapse text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-extrabold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr className="h-8">
                  <th className="sticky left-0 top-0 z-50 h-8 w-[210px] min-w-[210px] max-w-[210px] border-b border-r border-blue-800 bg-[#184877] px-3 text-white dark:border-slate-700" />
                  <th className="sticky left-[210px] top-0 z-50 h-8 w-[115px] min-w-[115px] max-w-[115px] border-b border-r border-blue-800 bg-[#184877] px-3 text-white dark:border-slate-700" />
                  {calendarDays.map(({ day, weekday, isoDate }) => <th key={day} className="sticky top-0 z-20 h-8 min-w-[48px] border-b border-r border-blue-800 bg-[#184877] px-2 text-center text-white" title={isoDate}>{weekday}</th>)}
                  <th className="sticky top-0 z-20 h-8 min-w-[88px] border-b border-l border-blue-800 bg-[#184877] px-3" />
                  <th className="sticky top-0 z-20 h-8 min-w-[85px] border-b border-l border-blue-800 bg-[#184877] px-3" />
                  {canReport && <th className="sticky right-0 top-0 z-50 h-8 min-w-[78px] border-b border-l border-blue-800 bg-[#184877] px-3" />}
                </tr>
                <tr className="h-10 bg-blue-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <th className="sticky left-0 top-8 z-40 h-10 w-[210px] min-w-[210px] max-w-[210px] border-b border-r border-slate-200 bg-blue-50 px-3 dark:border-slate-700 dark:bg-slate-800">Name</th>
                  <th className="sticky left-[210px] top-8 z-40 h-10 w-[115px] min-w-[115px] max-w-[115px] border-b border-r border-slate-200 bg-blue-50 px-3 dark:border-slate-700 dark:bg-slate-800">Site</th>
                  {calendarDays.map(({ day, dayMonth, isoDate }) => <th key={day} className="sticky top-8 z-20 h-10 min-w-[48px] border-b border-r border-slate-200 bg-blue-50 px-2 text-center dark:border-slate-700 dark:bg-slate-800" title={isoDate}>{dayMonth}</th>)}
                  <th className="sticky top-8 z-20 h-10 min-w-[88px] border-b border-l border-slate-200 bg-blue-50 px-3 text-right dark:border-slate-700 dark:bg-slate-800">Hrs</th>
                  <th className="sticky top-8 z-20 h-10 min-w-[85px] border-b border-l border-slate-200 bg-blue-50 px-3 text-right dark:border-slate-700 dark:bg-slate-800">Total days</th>
                  {canReport && <th className="sticky right-0 top-8 z-50 h-10 min-w-[78px] border-b border-l border-slate-200 bg-blue-50 px-3 text-center dark:border-slate-700 dark:bg-slate-800">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.length === 0 ? <tr><td colSpan={daysInPeriod + (canReport ? 5 : 4)} className="p-10 text-center text-sm text-slate-500">No time sheets have been reported for this month.</td></tr> : rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="sticky left-0 z-20 w-[210px] min-w-[210px] max-w-[210px] border-r border-slate-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"><span className="block truncate font-bold text-slate-900 dark:text-white">{row.employee_name}</span><span className="mt-0.5 block truncate font-mono text-[10px] text-slate-500">{row.employee_number || '—'}</span></td>
                    <td className="sticky left-[210px] z-20 w-[115px] min-w-[115px] max-w-[115px] border-r border-slate-100 bg-white px-3 py-2 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><span className="block truncate">{row.site_name || '—'}</span></td>
                    {calendarDays.map(({ day }) => {
                      const value = row.daily_hours?.[day];
                      return <td key={day} className={`px-2 py-2 text-center tabular-nums ${typeof value === 'number' && value > 0 ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>{typeof value === 'number' ? value : '—'}</td>;
                    })}
                    <td className="border-l border-slate-100 px-3 py-2 text-right font-extrabold tabular-nums text-slate-900 dark:border-slate-800 dark:text-white">{Number(row.total_hours || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{row.days_worked}</td>
                    {canReport && <td className="sticky right-0 border-l border-slate-100 bg-white px-2 py-2 text-center dark:border-slate-800 dark:bg-slate-900"><button type="button" onClick={() => openEdit(row)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Pencil size={12} /> Edit</button></td>}
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-400 bg-slate-100 font-extrabold text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                <tr>
                  <td className="sticky left-0 z-20 w-[210px] min-w-[210px] max-w-[210px] border-r border-slate-200 bg-slate-100 px-3 py-3 dark:border-slate-700 dark:bg-slate-800" />
                  <td className="sticky left-[210px] z-20 w-[115px] min-w-[115px] max-w-[115px] border-r border-slate-200 bg-slate-100 px-3 py-3 text-right dark:border-slate-700 dark:bg-slate-800">Hrs</td>
                  {dailyHourTotals.map((hours, index) => <td key={index + 1} className="border-r border-slate-200 px-2 py-3 text-center tabular-nums dark:border-slate-700">{hours.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>)}
                  <td className="border-l border-slate-200 px-3 py-3 text-right tabular-nums dark:border-slate-700">{allHours.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td className="border-l border-slate-200 px-3 py-3 text-right tabular-nums dark:border-slate-700">{totalDaysWorked}</td>
                  {canReport && <td className="sticky right-0 border-l border-slate-200 bg-slate-100 px-2 py-3 dark:border-slate-700 dark:bg-slate-800" />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-2 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="timesheet-form-title" className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div><h3 id="timesheet-form-title" className="font-bold text-slate-900 dark:text-white">{editing ? 'Edit employee time sheet' : 'Report employee hours'}</h3><p className="mt-1 text-xs text-slate-500">Enter hours for each day. Leave a cell blank when no hours were reported.</p></div>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
            </div>
            <form onSubmit={saveTimesheet} className="flex min-h-0 flex-1 flex-col">
              <div className="grid gap-3 overflow-y-auto p-5 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Employee <span className="text-red-600">*</span>
                  <div className="mt-1"><SearchableSelect value={employeeId} onChange={setEmployeeId} options={employeeOptions} placeholder="Search employee…" disabled={Boolean(editing)} searchable /></div>
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
                  <input value={siteName} onChange={(event) => setSiteName(event.target.value)} maxLength={200} placeholder="Enter the work site" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </label>
                <div className="sm:col-span-2">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300"><Clock3 size={14} className={colors.icon} /> Daily hours</div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-8">
                    {Array.from({ length: daysInForm }, (_, index) => {
                      const day = index + 1;
                      return <label key={day} className="text-[10px] font-bold text-slate-500">{day}
                        <input type="number" min="0" max="24" step="0.25" inputMode="decimal" value={dailyHours[day] ?? ''} onChange={(event) => setDailyHours((current) => ({ ...current, [day]: event.target.value }))} aria-label={`Hours for day ${day}`} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></label>;
                    })}
                  </div>
                </div>
              </div>
              {formError && <p role="alert" className="mx-5 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{formError}</p>}
              <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={saving} className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${colors.action}`}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Save time sheet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
