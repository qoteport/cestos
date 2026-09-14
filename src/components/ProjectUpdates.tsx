import { Download, Eye, Pencil } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { Modal, Row, State, display, rows, title, useData } from './DataUI';
import { number } from './ProjectDashboard';

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const values = new FormData(event.currentTarget);
    const report: Row = {
      site_id: values.get('site_id'),
      report_type: type,
      report_date: values.get('report_date'),
      title: String(values.get('title')).trim(),
      notes: values.get('notes') || null,
    };
    if (type === 'DRILLING_UPDATE') {
      Object.assign(report, {
        metres: values.get('metres'),
        drill_holes: Number(values.get('drill_holes')),
        average_depth: values.get('average_depth'),
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
            : 'Record work for this reporting period. Enter additional meters and holes, rather than project-to-date totals.'}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm">
            Project site
            <select
              name="site_id"
              required
              className="input-field mt-1"
              defaultValue={initial?.site_id || ''}
            >
              <option value="" disabled>
                Select project site
              </option>
              {sites
                .filter((s) => s.is_active && s.location_type === 'PROJECT_SITE')
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm">
            Report type
            <select
              className="input-field mt-1"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {Object.entries(types).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Reporting date
            <input
              name="report_date"
              type="date"
              required
              max={today()}
              defaultValue={initial?.report_date || today()}
              className="input-field mt-1"
            />
          </label>
          <label className="text-sm">
            Report title
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={initial?.title || ''}
              className="input-field mt-1"
              placeholder="e.g. Day shift drilling progress"
            />
          </label>
        </div>
        {type === 'DRILLING_UPDATE' && (
          <fieldset className="border rounded-lg p-4">
            <legend className="text-sm font-semibold px-2">Drilling measurements</legend>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                ['metres', 'Meters covered', '0.01', initial?.metres],
                ['drill_holes', 'Number of drill holes', '1', initial?.drill_holes],
                ['average_depth', 'Average depth reached (m)', '0.01', initial?.average_depth],
              ].map(([name, label, step, defaultVal]) => (
                <label key={name} className="text-sm">
                  {label}
                  <input
                    className="input-field mt-1"
                    type="number"
                    required
                    name={name}
                    min="0"
                    step={step}
                    defaultValue={defaultVal != null ? String(defaultVal) : ''}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <label className="block text-sm">
          Notes, conditions and blockers
          <textarea
            name="notes"
            maxLength={20000}
            rows={4}
            defaultValue={initial?.notes || ''}
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

function getMimeType(fileName?: string, mimeType?: string): string {
  if (mimeType && mimeType !== 'application/octet-stream') return mimeType;
  if (!fileName) return 'application/octet-stream';
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'txt':
      return 'text/plain';
    case 'csv':
      return 'text/csv';
    case 'html':
      return 'text/html';
    case 'json':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}

function FilePreviewModal({
  file,
  onClose,
}: {
  file: { url: string; name: string; mimeType: string };
  onClose: () => void;
}) {
  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';
  const isText = file.mimeType.startsWith('text/') || file.mimeType === 'application/json';

  return (
    <Modal name={`Preview: ${file.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="border border-border rounded p-2 bg-muted/20 min-h-[300px] flex items-center justify-center">
          {isImage ? (
            <img
              src={file.url}
              alt={file.name}
              className="max-h-[60vh] max-w-full object-contain mx-auto"
            />
          ) : isPdf || isText ? (
            <iframe src={file.url} className="w-full h-[65vh] border-0 rounded" title={file.name} />
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-foreground font-600 mb-2">{file.name}</p>
              <p className="text-xs text-muted-foreground mb-4">
                Preview not directly embeddable for format ({file.mimeType})
              </p>
              <a href={file.url} download={file.name} className="btn-primary text-xs">
                Download file
              </a>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground font-500">{file.name}</span>
          <div className="flex gap-2">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs"
            >
              Open in new window
            </a>
            <button className="btn-primary text-xs" onClick={onClose}>
              Close preview
            </button>
          </div>
        </div>
      </div>
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
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    name: string;
    mimeType: string;
  } | null>(null);
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
      const mimeType = getMimeType(r.file_name, r.mime_type);
      const typedBlob = new Blob([rawBlob], { type: mimeType });
      const url = URL.createObjectURL(typedBlob);
      setPreviewFile({ url, name: r.file_name || 'Attachment', mimeType });
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
        <label className="text-xs">
          Report type
          <select
            className="input-field mt-1"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All report types</option>
            {Object.entries(types).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Site
          <select
            className="input-field mt-1"
            value={site}
            onChange={(e) => {
              setSite(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
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
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
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
