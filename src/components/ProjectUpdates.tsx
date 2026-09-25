import { Download, Eye, Pencil } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import { openUniversalFileViewer } from '@/lib/fileViewer';
import { useAuth } from './AuthProvider';
import { Modal, Row, State, display, rows, title, useData } from './DataUI';
import { number } from './ProjectDashboard';
import SearchableSelect from './SearchableSelect';
import AppDateTimePicker from './ui/AppDateTimePicker';

const types: Record<string, string> = {
  DRILLING_UPDATE: 'Drilling update',
  PROGRESS_UPDATE: 'Progress update',
  SAFETY_REPORT: 'Safety report',
  SITE_ISSUE: 'Site issue',
};
const today = () => new Date().toISOString().slice(0, 10);

function ReportForm({
  projectId,
  sites,
  initial,
  onClose,
  onSaved,
}: {
  projectId: string;
  sites: Row[];
  initial?: Row | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState(initial?.report_type || 'DRILLING_UPDATE');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [siteId, setSiteId] = useState(initial?.site_id || (sites.find((s) => s.is_active && s.location_type === 'PROJECT_SITE')?.id || ''));
  const [reportDate, setReportDate] = useState(initial?.report_date || today());
  const [titleText, setTitleText] = useState(initial?.title || '');
  const [metresVal, setMetresVal] = useState(initial?.metres != null ? String(initial.metres) : '');
  const [holesVal, setHolesVal] = useState(initial?.drill_holes != null ? String(initial.drill_holes) : '');
  const [avgDepthVal, setAvgDepthVal] = useState(initial?.average_depth != null ? String(initial.average_depth) : '');
  const [notesText, setNotesText] = useState(initial?.notes || '');
  const [selectedShiftId, setSelectedShiftId] = useState('');

  const shiftsRes = useData<any[]>('/api/v1/drilling/shifts?project_id=' + projectId);
  const shifts = rows(shiftsRes.data);

  function handleImportShift(shiftId: string) {
    setSelectedShiftId(shiftId);
    if (!shiftId) return;
    const s = shifts.find((shift: any) => String(shift.id) === shiftId);
    if (!s) return;

    const m = s.total_metres ?? s.total_metres_drilled ?? s.metres_drilled ?? 0;
    const hCount = Array.isArray(s.intervals) && s.intervals.length > 0 ? s.intervals.length : 1;
    const hasIntervals = Array.isArray(s.intervals) && s.intervals.length > 0;
    const avgD = hasIntervals ? s.intervals[s.intervals.length - 1].to_depth_m : (s.end_depth_m ?? m);
    const dateStr = s.date || s.shift_date || (s.created_at ? s.created_at.slice(0, 10) : today());
    const shiftNum = s.report_number || s.shift_number || (s.id ? `DR-${s.id.slice(0, 8).toUpperCase()}` : '');
    const titleStr = `Daily Shift Report ${shiftNum} (${s.shift_type || 'DAY'} Shift)`;
    const coreRec = s.avg_core_recovery_pct ?? s.core_recovery_pct ?? 0;
    const notesStr = `[Shift Production Report ${shiftNum}]: Core Recovery: ${coreRec}%. ${s.notes || ''}`.trim();

    setReportDate(dateStr);
    setTitleText(titleStr);
    setMetresVal(String(m));
    setHolesVal(String(hCount));
    setAvgDepthVal(String(avgD));
    setNotesText(notesStr);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!siteId) {
      setError('Please select a project site.');
      return;
    }
    setBusy(true);
    setError('');
    const values = new FormData(event.currentTarget);
    const report: Row = {
      site_id: siteId,
      report_type: type,
      report_date: reportDate,
      title: titleText.trim(),
      notes: notesText || null,
    };
    if (type === 'DRILLING_UPDATE') {
      Object.assign(report, {
        metres: metresVal ? Number(metresVal) : 0,
        drill_holes: holesVal ? Number(holesVal) : 0,
        average_depth: avgDepthVal ? Number(avgDepthVal) : 0,
      });
    }
    const payload = new FormData();
    payload.set('report', JSON.stringify(report));
    const file = values.get('file') as File;
    if (file?.name) payload.set('file', file);

    try {
      const isEdit = !!initial?.id;
      const url = isEdit
        ? '/api/v1/projects/' + projectId + '/reports/' + initial.id
        : '/api/v1/projects/' + projectId + '/reports';
      await apiFetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        body: payload,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save report.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      name={initial ? 'Edit project update' : 'Add project update'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {initial
            ? 'Update measurements or notes for this report entry.'
            : 'Record work for this reporting period. Enter additional meters and holes, or import directly from Daily Shift Production Reports.'}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold mb-1 block">
              Project site *
            </label>
            <SearchableSelect
              options={sites
                .filter((s) => s.is_active && s.location_type === 'PROJECT_SITE')
                .map((s) => ({ value: s.id, label: s.name }))}
              value={siteId}
              onChange={(val) => setSiteId(val)}
              placeholder="Select project site..."
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block">
              Report type *
            </label>
            <SearchableSelect
              options={Object.entries(types).map(([value, label]) => ({
                value,
                label,
              }))}
              value={type}
              onChange={(val) => setType(val)}
              searchable={false}
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block">
              Reporting date *
            </label>
            <AppDateTimePicker
              mode="date"
              required
              max={today()}
              value={reportDate}
              onChange={(val) => setReportDate(val)}
              placeholder="Select reporting date"
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block">
              Report title *
            </label>
            <input
              name="title"
              required
              maxLength={200}
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
              className="input-field"
              placeholder="e.g. Day shift drilling progress"
            />
          </div>
        </div>

        {type === 'DRILLING_UPDATE' && (
          <div className="space-y-3 border rounded-lg p-4 bg-muted/10">
            {shifts.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-1">
                <label className="text-xs font-bold text-amber-800 dark:text-amber-300 block mb-1">
                  ⚡ Import Data from Daily Shift Production Report
                </label>
                <SearchableSelect
                  options={[
                    { value: '', label: '-- Select a shift report to auto-populate --' },
                    ...shifts.map((s: any) => ({
                      value: String(s.id),
                      label: `Shift #${s.report_number || s.shift_number || s.id?.slice(0, 8)} | ${s.date || s.shift_date} (${s.shift_type || 'DAY'}) | ${s.total_metres ?? s.total_metres_drilled ?? s.metres_drilled ?? 0}m drilled`,
                    })),
                  ]}
                  value={selectedShiftId}
                  onChange={(val) => handleImportShift(val)}
                  placeholder="Select a shift report..."
                />
              </div>
            )}

            <fieldset>
              <legend className="text-sm font-semibold mb-2">Drilling measurements</legend>
              <div className="grid sm:grid-cols-3 gap-3">
                <label className="text-sm">
                  Meters covered
                  <input
                    className="input-field mt-1"
                    type="number"
                    required
                    name="metres"
                    min="0"
                    step="0.01"
                    value={metresVal}
                    onChange={(e) => setMetresVal(e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  Number of drill holes
                  <input
                    className="input-field mt-1"
                    type="number"
                    required
                    name="drill_holes"
                    min="0"
                    step="1"
                    value={holesVal}
                    onChange={(e) => setHolesVal(e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  Average depth reached (m)
                  <input
                    className="input-field mt-1"
                    type="number"
                    required
                    name="average_depth"
                    min="0"
                    step="0.01"
                    value={avgDepthVal}
                    onChange={(e) => setAvgDepthVal(e.target.value)}
                  />
                </label>
              </div>
            </fieldset>
          </div>
        )}
        <label className="block text-sm">
          Notes, conditions and blockers
          <textarea
            name="notes"
            maxLength={20000}
            rows={4}
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            className="input-field mt-1"
          />
        </label>
        <label className="block text-sm">
          {initial?.file_name ? `Replace file (${initial.file_name})` : 'Attach a file (optional)'}
          <input type="file" name="file" className="block mt-2 text-sm" />
        </label>
        {error && (
          <p role="alert" className="text-red-700 text-sm">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={busy} className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Saving update…' : initial ? 'Save changes' : 'Submit update'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectUpdates({
  projectId,
  sites,
  onSaved,
}: {
  projectId: string;
  sites: Row[];
  onSaved: () => void;
}) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Row | null>(null);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [site, setSite] = useState('');
  const [error, setError] = useState('');
  const params = new URLSearchParams({ page: String(page) });
  if (type) params.set('report_type', type);
  if (site) params.set('site_id', site);
  const data = useData('/api/v1/projects/' + projectId + '/reports?' + params);

  async function download(r: Row) {
    try {
      downloadBlob(
        await apiFetchBlob('/api/v1/projects/' + projectId + '/reports/' + r.id + '/attachment'),
        r.file_name
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    }
  }

  async function viewFile(r: Row) {
    try {
      const rawBlob = await apiFetchBlob(
        '/api/v1/projects/' + projectId + '/reports/' + r.id + '/attachment?inline=true'
      );
      openUniversalFileViewer({ blob: rawBlob, fileName: r.file_name || 'Attachment', title: 'Project report attachment' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to view file');
    }
  }

  const canReport = sites.some((s) => s.is_active && s.location_type === 'PROJECT_SITE');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Project updates</h2>
          <p className="text-sm text-muted-foreground">
            Field reports and drilling performance, with a traceable author and reporting date.
          </p>
        </div>
        {auth.can('projects.update') && (
          <button className="btn-primary" disabled={!canReport} onClick={() => setOpen(true)}>
            Add update
          </button>
        )}
      </div>
      {!canReport && (
        <p className="text-sm text-muted-foreground">
          Add an active project site in the Sites tab to submit updates.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[170px]">
          <label className="text-xs font-semibold mb-1 block">
            Report type
          </label>
          <SearchableSelect
            options={[
              { value: '', label: 'All report types' },
              ...Object.entries(types).map(([v, l]) => ({ value: v, label: l })),
            ]}
            value={type}
            onChange={(val) => {
              setType(val);
              setPage(1);
            }}
            searchable={false}
          />
        </div>
        <div className="min-w-[170px]">
          <label className="text-xs font-semibold mb-1 block">
            Site
          </label>
          <SearchableSelect
            options={[
              { value: '', label: 'All sites' },
              ...sites.map((s) => ({ value: s.id, label: s.name })),
            ]}
            value={site}
            onChange={(val) => {
              setSite(val);
              setPage(1);
            }}
            placeholder="All sites"
            searchable={sites.length > 5}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <State loading={data.loading} error={data.error} retry={data.reload}>
        <div className="space-y-3">
          {rows(data.data).map((r) => (
            <article key={r.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div>
                  <h3 className="font-semibold text-base">{r.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.site_name} · Reporting date: {r.report_date} · Submitted by {r.author_name}{' '}
                    on {display(r.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-neutral">{types[r.report_type]}</span>
                  {auth.can('projects.update') && (
                    <button
                      className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                      onClick={() => setEditingReport(r)}
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {r.report_type === 'DRILLING_UPDATE' && (
                <dl className="grid grid-cols-3 gap-3 text-sm border-t border-b border-border py-2.5 my-2">
                  {[
                    ['Meters', r.metres],
                    ['Drill holes', r.drill_holes],
                    ['Average depth (m)', r.average_depth],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground font-600">{label}</dt>
                      <dd className="font-bold text-foreground mt-0.5">{number(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {r.notes && (
                <p className="text-sm whitespace-pre-wrap text-foreground/90">{r.notes}</p>
              )}

              {r.file_name && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border mt-2">
                  <button
                    className="btn-secondary text-xs flex items-center gap-1.5"
                    onClick={() => void download(r)}
                  >
                    <Download size={13} />
                    Download ({r.file_name})
                  </button>
                  <button
                    className="btn-secondary text-xs flex items-center gap-1.5"
                    onClick={() => void viewFile(r)}
                  >
                    <Eye size={13} />
                    View File
                  </button>
                </div>
              )}
            </article>
          ))}
          {!rows(data.data).length && (
            <p className="py-10 text-center text-muted-foreground">
              No project updates match these filters.
            </p>
          )}
        </div>
        <div className="flex justify-between text-xs mt-4">
          <span>
            {data.data?.total || 0} updates · Page {page}
          </span>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <button
              className="btn-secondary"
              disabled={page >= (data.data?.pages || 0)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </State>
      {open && (
        <ReportForm
          projectId={projectId}
          sites={sites}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            setPage(1);
            data.reload();
            onSaved();
          }}
        />
      )}
      {editingReport && (
        <ReportForm
          projectId={projectId}
          sites={sites}
          initial={editingReport}
          onClose={() => setEditingReport(null)}
          onSaved={() => {
            setEditingReport(null);
            data.reload();
            onSaved();
          }}
        />
      )}
    </div>
  );
}

// ── Action label map ─────────────────────────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  'project.created': 'Project created',
  'project.updated': 'Project updated',
  'project.report_created': 'Report submitted',
  'project.report_updated': 'Report updated',
  'employee_assignment.created': 'Employee assigned',
  'employee_assignment.updated': 'Assignment updated',
  'employee_assignment.ended': 'Assignment ended',
  'asset.assigned': 'Asset assigned',
  'asset.unassigned': 'Asset unassigned',
  'location.created': 'Site added',
  'location.updated': 'Site updated',
};

function actionLabel(action: string): string {
  return title(ACTION_LABELS[action] ?? action.replace(/[._]/g, ' '));
}

// ── Resolve a raw blob into key/value pairs, filtering UUIDs and nulls ────────
function fieldLabel(key: string): string {
  const labels: Record<string, string> = {
    employee_id: 'Employee',
    project_id: 'Project',
    asset_id: 'Asset',
    supervisor_id: 'Supervisor',
    project_manager_id: 'Project Manager',
    site_id: 'Site',
    location_id: 'Location',
    transfer_to: 'Transferred To',
    role_on_project: 'Project Role',
    metres: 'Meters Drilled',
    average_depth: 'Average Depth (m)',
    drill_holes: 'Drill Holes',
  };
  return labels[key] ?? title(key);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SKIP_KEYS = new Set(['id', 'organization_id', 'created_by_id', 'updated_by_id']);

function isUUID(v: unknown): boolean {
  return typeof v === 'string' && UUID_RE.test(v);
}

function isRenderable(v: unknown): boolean {
  if (v == null) return false;
  if (isUUID(v)) return false;
  if (typeof v === 'object') return false;
  return true;
}

function resolvedEntries(blob: Record<string, unknown> | null | undefined): [string, string][] {
  if (!blob || typeof blob !== 'object') return [];
  return Object.entries(blob)
    .filter(([k, v]) => !SKIP_KEYS.has(k) && isRenderable(v))
    .map(([k, v]) => [fieldLabel(k), display(v)]);
}

// ── Diff between previous and details ────────────────────────────────────────
function changedFields(
  prev: Record<string, unknown> | null | undefined,
  next: Record<string, unknown> | null | undefined
): { label: string; before: string; after: string }[] {
  if (!prev || !next) return [];
  return Object.keys(next)
    .filter((k) => {
      if (SKIP_KEYS.has(k) || !(k in prev)) return false;
      const before = prev[k];
      const after = next[k];
      if (!isRenderable(before) && !isRenderable(after)) return false;
      return String(before ?? '') !== String(after ?? '');
    })
    .map((k) => ({
      label: fieldLabel(k),
      before: prev[k] == null ? 'Not set' : display(prev[k]),
      after: next[k] == null ? 'Not set' : display(next[k]),
    }));
}

// ── Highlighted key sets per action type ─────────────────────────────────────
const HIGHLIGHT_KEYS: Record<string, string[]> = {
  'project.report_created': [
    'title',
    'report_type',
    'site_name',
    'author_name',
    'report_date',
    'metres',
    'drill_holes',
    'average_depth',
  ],
  'project.report_updated': ['title', 'report_type', 'site_name', 'author_name', 'report_date'],
  'employee_assignment.created': [
    'employee_name',
    'role',
    'start_date',
    'end_date',
    'rotation_pattern',
  ],
  'employee_assignment.updated': ['employee_name', 'role', 'start_date', 'end_date'],
  'employee_assignment.ended': ['employee_name', 'end_date', 'reason'],
  'location.created': ['name', 'location_type', 'address'],
  'location.updated': ['name', 'location_type'],
};

function ActivityDetails({
  action,
  details,
  previous,
}: {
  action: string;
  details: Record<string, unknown> | null | undefined;
  previous: Record<string, unknown> | null | undefined;
}) {
  if (!details && !previous) return null;
  const isUpdate = action.includes('updated');

  // For update actions show before → after diffs
  if (isUpdate && previous) {
    const diffs = changedFields(previous, details ?? {});
    if (diffs.length > 0) {
      return (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Changed fields
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {diffs.map(({ label, before, after }) => (
              <div key={label} className="border border-border p-2">
                <p className="text-xs text-muted-foreground font-semibold mb-1">{label}</p>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="line-through text-muted-foreground">{before}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold text-foreground">{after}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return <p className="text-xs text-muted-foreground mt-2">No field changes recorded.</p>;
  }

  // For create / other actions, show key fields first then remaining
  if (!details) return null;
  const highlightKeys = HIGHLIGHT_KEYS[action] ?? [];
  const highlighted: [string, string][] = highlightKeys
    .filter((k) => details[k] != null && !isUUID(details[k]))
    .map((k) => [fieldLabel(k), display(details[k])]);

  const shownKeys = new Set(highlightKeys);
  const remaining = resolvedEntries(details).filter(([lbl]) => {
    const orig = lbl.toLowerCase().replace(/ /g, '_');
    return !shownKeys.has(orig);
  });

  const all = [...highlighted, ...remaining];
  if (!all.length) return null;

  return (
    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
      {all.map(([label, value]) => (
        <div key={label} className="border border-border p-2">
          <p className="text-xs text-muted-foreground font-semibold">{label}</p>
          <p className="text-xs text-foreground mt-0.5 break-words">{value}</p>
        </div>
      ))}
    </div>
  );
}

export function ProjectActivity({ projectId }: { projectId: string }) {
  const [page, setPage] = useState(1);
  const data = useData('/api/v1/projects/' + projectId + '/activity?page=' + page);
  return (
    <State loading={data.loading} error={data.error} retry={data.reload}>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Project activity</h2>
        {rows(data.data).map((r) => (
          <article className="border rounded-lg p-4" key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold text-sm">{r.title || actionLabel(r.action)}</p>
            </div>
            {r.summary && <p className="text-sm mt-1">{r.summary}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Recorded by {r.author_name} · {display(r.created_at)}
            </p>
            <ActivityDetails action={r.action} details={r.details} previous={r.previous} />
          </article>
        ))}
        {!rows(data.data).length && (
          <p className="text-sm text-muted-foreground py-8">No activity yet.</p>
        )}
        <div className="flex justify-between items-center text-xs mt-4">
          <span>
            {data.data?.total || 0} events · Page {page}
          </span>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <button
              className="btn-secondary"
              disabled={page * 20 >= (data.data?.total || 0)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </State>
  );
}
