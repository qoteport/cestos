'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Upload,
  Truck,
  MapPin,
  Activity,
  Gauge,
  Fuel,
  Wrench,
  FileText,
  History,
  Plus,
  RefreshCw,
  Archive,
  Shield,
  ArrowRightLeft,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { apiFetch, apiFetchBlob, downloadBlob } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { useData, State, Row, rows, Table, Facts, Modal, display, title } from './DataUI';
import { operation } from './ResourceWorkspace';
import RecordForm from './RecordForm';
import AssetAssignmentModal from './AssetAssignmentModal';
import OperationalUpload from './OperationalUpload';
const tabs = [
  ['overview', 'Overview', Activity],
  ['maintenance', 'Maintenance', Wrench],
  ['fuel-logs', 'Fuel logs', Fuel],
  ['meter-readings', 'Meter readings', Gauge],
  ['assignments', 'Assignments', ArrowRightLeft],
  ['inspections', 'Inspections', Shield],
  ['defects', 'Defects', Wrench],
  ['components', 'Components', Truck],
  ['documents', 'Documents', FileText],
  ['insurance', 'Insurance', Shield],
  ['registrations', 'Registrations', FileText],
  ['location-history', 'Location history', MapPin],
  ['status-history', 'Status history', History],
  ['activity', 'Activity', Activity],
] as const;
export default function AssetDetailView({ assetId }: { assetId: string }) {
  const auth = useAuth();
  const root = '/api/v1/assets/' + assetId;
  const overview = useData(root + '/overview');
  const metrics = useData(root + '/operating-metrics');
  const [tab, setTab] = useState('overview');
  const [page, setPage] = useState(1);
  const path = root + '/' + tab;
  const allowed = (p: string, method = 'GET') => {
    const op = operation(p, method);
    return !!op && (op.permissions || []).every((code: string) => auth.can(code));
  };
  const records = useData(
    tab !== 'overview' && allowed(path)
      ? path +
          (tab === 'maintenance' || tab === 'fuel-logs' ? '?page=' + page + '&page_size=20' : '')
      : null
  );
  const meters = useData(allowed(root + '/meter-readings') ? root + '/meter-readings' : null);
  const [form, setForm] = useState<{
    path: string;
    name: string;
    operation?: Row;
    initial?: Row;
    method?: 'POST' | 'PATCH';
  } | null>(null);
  const [transfer, setTransfer] = useState(false);
  const [upload, setUpload] = useState<'photo' | 'document' | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState('');
  const d = overview.data;
  const asset = d?.asset;
  const primary = d?.latest_photos?.find((r: Row) => r.is_primary) || d?.latest_photos?.[0];
  useEffect(() => {
    let active = true;
    let url = '';
    setPhoto('');
    if (primary?.id) {
      apiFetchBlob('/api/v1/asset-media/' + primary.id + '/download')
        .then((blob) => {
          url = URL.createObjectURL(blob);
          if (active) setPhoto(url);
          else URL.revokeObjectURL(url);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [primary?.id]);
  function reload() {
    overview.reload();
    metrics.reload();
    records.reload();
    meters.reload();
  }
  function openForm(p: string, name: string, initial?: Row, op?: Row) {
    setSelected(null);
    const isEdit = !!initial;
    const defaults: Row = {};
    if (d?.current_project?.id) defaults.project_id = d.current_project.id;
    if (d?.current_location?.id) defaults.location_id = d.current_location.id;
    const mergedInitial = initial ? { ...defaults, ...initial } : defaults;
    setForm({
      path: p,
      name,
      initial: Object.keys(mergedInitial).length ? mergedInitial : undefined,
      operation: op,
      method: isEdit ? 'PATCH' : 'POST',
    });
  }

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [assignmentSummaryData, setAssignmentSummaryData] = useState<Row | null>(null);
  const [logFiles, setLogFiles] = useState<Row[]>([]);
  const [logFileUpload, setLogFileUpload] = useState<boolean>(false);
  const [logFileTitle, setLogFileTitle] = useState('');
  const [logFile, setLogFile] = useState<File | null>(null);
  const [logFileBusy, setLogFileBusy] = useState(false);

  useEffect(() => {
    if (selected && ['maintenance', 'fuel-logs', 'inspections', 'meter-readings'].includes(tab)) {
      const typeMap: Record<string, string> = {
        maintenance: 'MAINTENANCE',
        'fuel-logs': 'FUEL',
        inspections: 'INSPECTION',
        'meter-readings': 'METER',
      };
      apiFetch<Row[]>('/api/v1/assets/' + assetId + '/logs/' + typeMap[tab] + '/' + selected.id + '/files')
        .then((f) => setLogFiles(f || []))
        .catch(() => setLogFiles([]));
    } else {
      setLogFiles([]);
    }
  }, [selected, tab, assetId]);

  useEffect(() => {
    if (tab === 'assignments' && selectedAssignmentId) {
      apiFetch<Row>('/api/v1/assets/' + assetId + '/assignments/' + selectedAssignmentId + '/summary')
        .then((s) => setAssignmentSummaryData(s))
        .catch(() => setAssignmentSummaryData(null));
    } else {
      setAssignmentSummaryData(null);
    }
  }, [tab, selectedAssignmentId, assetId]);

  async function handleLogFileUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !logFile) return;
    setLogFileBusy(true);
    const typeMap: Record<string, string> = {
      maintenance: 'MAINTENANCE',
      'fuel-logs': 'FUEL',
      inspections: 'INSPECTION',
      'meter-readings': 'METER',
    };
    try {
      const fd = new FormData();
      fd.append('title', (logFileTitle.trim() || logFile.name));
      fd.append('file', logFile);
      await apiFetch('/api/v1/assets/' + assetId + '/logs/' + typeMap[tab] + '/' + selected.id + '/files', {
        method: 'POST',
        body: fd,
      });
      setLogFileUpload(false);
      setLogFileTitle('');
      setLogFile(null);
      const f = await apiFetch<Row[]>('/api/v1/assets/' + assetId + '/logs/' + typeMap[tab] + '/' + selected.id + '/files');
      setLogFiles(f || []);
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setLogFileBusy(false);
    }
  }

  async function handleLogFileDownload(fileId: string, filename: string) {
    try {
      const blob = await apiFetchBlob('/api/v1/assets/' + assetId + '/log-files/' + fileId + '/download');
      downloadBlob(blob, filename);
    } catch (err: any) {
      setError(err.message || 'Download failed');
    }
  }
  async function download(row: Row) {
    setError('');
    try {
      downloadBlob(
        await apiFetchBlob(root + '/documents/' + row.id + '/download'),
        row.file_name || row.title || 'document'
      );
    } catch (e: any) {
      setError(e.message);
    }
  }
  const meterRows = rows(meters.data)
    .filter((r) => r.reading_type === asset?.meter_type)
    .slice()
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    .map((r) => ({
      date: new Date(r.recorded_at).toLocaleDateString(),
      reading: Number(r.reading),
    }));
  const monthly = (metrics.data?.fuel_by_month || []).map((r: Row) => ({
    month: new Date(r.month).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }),
    litres: Number(r.litres),
  }));
  const activeMaintenance = (metrics.data?.maintenance_by_status || [])
    .filter((r: Row) => ['OPEN', 'IN_PROGRESS'].includes(r.status))
    .reduce((sum: number, r: Row) => sum + Number(r.count), 0);
  return (
    <div className="space-y-5 fade-in">
      <Link className="text-xs text-primary flex gap-1 items-center" href="/workspace/assets">
        <ArrowLeft size={13} />
        Back to assets
      </Link>
      <State loading={overview.loading} error={overview.error} retry={overview.reload}>
        {asset && (
          <>
            <div className="flex justify-between gap-4 flex-wrap items-center">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-widest">
                  {asset.asset_number}
                </p>
                <h1 className="text-2xl font-bold tracking-tight mt-1">{asset.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {d.category?.name} · {asset.manufacturer} {asset.model}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary text-xs" onClick={reload}>
                  <RefreshCw size={14} />
                  Refresh
                </button>
                {allowed(root, 'PATCH') && (
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => openForm(root, 'Edit asset', asset)}
                  >
                    <Edit size={14} />
                    Edit asset
                  </button>
                )}
                {asset.is_active &&
                  allowed(root + (d.current_assignment ? '/transfer' : '/assignments'), 'POST') && (
                    <button className="btn-primary text-xs" onClick={() => setTransfer(true)}>
                      <ArrowRightLeft size={14} />
                      {d.current_assignment ? 'Transfer asset' : 'Assign to project'}
                    </button>
                  )}
              </div>
            </div>
            <section className="card p-5">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-48 shrink-0">
                  <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                    {photo ? (
                      <img src={photo} alt={asset.name} className="w-full h-full object-cover" />
                    ) : (
                      <Truck size={48} className="text-muted-foreground/50" />
                    )}
                  </div>
                  {allowed(root + '/media/upload', 'POST') && (
                    <button
                      className="btn-secondary text-xs w-full mt-2"
                      onClick={() => setUpload('photo')}
                    >
                      <Upload size={13} />
                      Upload photo
                    </button>
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="badge badge-neutral">{asset.status?.replace(/_/g, ' ')}</span>
                    <span
                      className={'badge ' + (d.is_deployable ? 'badge-active' : 'badge-neutral')}
                    >
                      {d.is_deployable
                        ? 'Available for deployment'
                        : d.operational_availability?.replace(/_/g, ' ') || 'Unavailable'}
                    </span>
                    {!asset.is_active && (
                      <span className="badge badge-neutral">Archived from active fleet</span>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Current project</p>
                      {d.current_project ? (
                        <Link
                          className="text-sm font-semibold text-primary"
                          href={'/project-command-center?project=' + d.current_project.id}
                        >
                          {d.current_project.name}
                        </Link>
                      ) : (
                        <p className="text-sm mt-1">Unassigned</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Current location</p>
                      <p className="text-sm mt-1">{d.current_location?.name || 'Not recorded'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Primary operator</p>
                      <p className="text-sm mt-1">
                        {d.primary_operator
                          ? [d.primary_operator.first_name, d.primary_operator.last_name].join(' ')
                          : 'Not assigned'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Responsible employee</p>
                      <p className="text-sm mt-1">
                        {d.responsible_employee
                          ? [
                              d.responsible_employee.first_name,
                              d.responsible_employee.last_name,
                            ].join(' ')
                          : 'Not assigned'}
                      </p>
                    </div>
                  </div>
                  {d.reasons?.length > 0 && (
                    <div className="rounded bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                      <strong>Readiness checks</strong>
                      <ul className="list-disc pl-4 mt-1">
                        {d.reasons.map((r: string) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {asset.is_active && allowed(root + '/status', 'POST') && (
                      <button
                        className="btn-secondary text-xs"
                        onClick={() => openForm(root + '/status', 'Change asset status')}
                      >
                        Change status
                      </button>
                    )}
                    {asset.is_active &&
                      auth.can('assets.archive') &&
                      auth.can('assets.status.change') && (
                        <button
                          className="btn-secondary text-xs text-red-700"
                          onClick={() =>
                            openForm(
                              root + '/retire',
                              'Retire asset — close assignments and maintenance first'
                            )
                          }
                        >
                          <Archive size={13} />
                          Retire asset
                        </button>
                      )}
                  </div>
                </div>
              </div>
            </section>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                [
                  'Current meter',
                  asset.current_meter_reading ?? '—',
                  asset.meter_type?.replace(/_/g, ' '),
                ],
                [
                  'Fuel logged',
                  metrics.loading ? '…' : metrics.error ? '—' : (metrics.data?.fuel_litres ?? 0),
                  'Litres · all recorded logs',
                ],
                [
                  'Open maintenance',
                  metrics.loading ? '…' : metrics.error ? '—' : activeMaintenance,
                  'Open or in progress',
                ],
                [
                  'Open defects',
                  d.open_defects?.length ?? 0,
                  d.meter_status === 'STALE' ? 'Meter reading is stale' : 'Equipment readiness',
                ],
              ].map(([label, value, sub]) => (
                <div className="kpi-card" key={String(label)}>
                  <div className="kpi-label">{label}</div>
                  <div className="kpi-value-sm">{value}</div>
                  <div className="kpi-sub">{sub}</div>
                </div>
              ))}
            </div>
            {metrics.error && (
              <p role="alert" className="text-sm text-red-700">
                Operating metrics: {metrics.error}
              </p>
            )}
            <nav className="tab-nav overflow-x-auto" aria-label="Asset sections">
              {tabs
                .filter(([key]) => key === 'overview' || allowed(root + '/' + key))
                .map(([key, label, Icon]) => (
                  <button
                    key={key}
                    className={
                      'tab-item flex gap-2 items-center whitespace-nowrap ' +
                      (tab === key ? 'active' : '')
                    }
                    onClick={() => {
                      setTab(key);
                      setPage(1);
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
            </nav>
            {tab === 'overview' ? (
              <>
                <div className="grid lg:grid-cols-2 gap-5">
                  <section className="card p-5">
                    <h2 className="section-header mb-4">
                      Meter trend · {asset.meter_type?.replace(/_/g, ' ')}
                    </h2>
                    {meterRows.length ? (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={meterRows}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="reading"
                              stroke="#1B4F8A"
                              strokeWidth={2}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-16 text-center">
                        No meter readings recorded.
                      </p>
                    )}
                  </section>
                  <section className="card p-5">
                    <h2 className="section-header mb-4">Fuel logged by month · litres</h2>
                    {monthly.length ? (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthly}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="litres" fill="#E8530A" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-16 text-center">
                        No fuel logs recorded.
                      </p>
                    )}
                  </section>
                </div>
                <section className="card p-5">
                  <h2 className="section-header mb-5">Asset specifications & ownership</h2>
                  <Facts
                    data={Object.fromEntries(
                      Object.entries(asset).filter(
                        ([k]) => !['photo_url', 'profile_photo_url'].includes(k)
                      )
                    )}
                  />
                </section>
              </>
            ) : (
              <section className="card overflow-hidden">
                <header className="flex justify-between p-4 border-b gap-2 flex-wrap items-center">
                  <h2 className="section-header">{title(tab)}</h2>
                  <div className="flex gap-2 flex-wrap items-center">
                    {tab === 'fuel-logs' && allowed(root + '/fuel-reductions', 'POST') && (
                      <button
                        className="btn-secondary text-xs"
                        onClick={() => openForm(root + '/fuel-reductions', 'Record fuel reduction / daily consumption')}
                      >
                        <Fuel size={13} />
                        Record fuel reduction
                      </button>
                    )}
                    {tab === 'documents'
                      ? allowed(root + '/documents/upload', 'POST') && (
                          <button
                            className="btn-primary text-xs"
                            onClick={() => setUpload('document')}
                          >
                            <Upload size={13} />
                            Upload document
                          </button>
                        )
                      : tab === 'assignments'
                        ? d.current_assignment &&
                          allowed(
                            '/api/v1/asset-assignments/' + d.current_assignment.id + '/complete',
                            'POST'
                          ) && (
                            <button
                              className="btn-secondary text-xs"
                              onClick={() =>
                                openForm(
                                  '/api/v1/asset-assignments/' +
                                    d.current_assignment.id +
                                    '/complete',
                                  'Complete assignment'
                                )
                              }
                            >
                              Complete assignment
                            </button>
                          )
                        : asset.is_active &&
                          allowed(path, 'POST') && (
                            <button
                              className="btn-primary text-xs"
                              onClick={() => openForm(path, 'Add ' + title(tab).toLowerCase())}
                            >
                              <Plus size={13} />
                              Add record
                            </button>
                          )}
                  </div>
                </header>
                <State loading={records.loading} error={records.error} retry={records.reload}>
                  {tab === 'assignments' && rows(records.data).length > 0 && (
                    <div className="p-4 border-b bg-muted/30 space-y-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="text-xs font-semibold text-muted-foreground">Filter operational costs by assignment:</label>
                        <select
                          className="input-field text-xs max-w-md"
                          value={selectedAssignmentId}
                          onChange={(e) => setSelectedAssignmentId(e.target.value)}
                        >
                          <option value="">All assignments (Select to view site costs)</option>
                          {rows(records.data).map((a: Row) => (
                            <option key={a.id} value={a.id}>
                              {a.project_id || 'Project'} ({a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : ''} - {a.returned_at ? new Date(a.returned_at).toLocaleDateString() : 'Present'})
                            </option>
                          ))}
                        </select>
                      </div>
                      {assignmentSummaryData && (
                        <div className="card p-4 bg-white border border-primary/20 space-y-3">
                          <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Assignment Site Cost Summary</h3>
                            <span className="badge badge-active text-xs">Selected Assignment Period</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="bg-muted/40 p-2.5 rounded">
                              <span className="text-muted-foreground block">Fuel Consumed</span>
                              <strong className="text-sm font-semibold">{assignmentSummaryData.fuel_litres || 0} Litres</strong>
                              {assignmentSummaryData.fuel_cost != null && (
                                <span className="block text-muted-foreground mt-0.5">${Number(assignmentSummaryData.fuel_cost).toFixed(2)}</span>
                              )}
                            </div>
                            <div className="bg-muted/40 p-2.5 rounded">
                              <span className="text-muted-foreground block">Maintenance Cost</span>
                              <strong className="text-sm font-semibold">{assignmentSummaryData.maintenance_count || 0} Jobs</strong>
                              {assignmentSummaryData.maintenance_cost != null && (
                                <span className="block text-muted-foreground mt-0.5">${Number(assignmentSummaryData.maintenance_cost).toFixed(2)}</span>
                              )}
                            </div>
                            <div className="bg-muted/40 p-2.5 rounded">
                              <span className="text-muted-foreground block">Meter Usage</span>
                              <strong className="text-sm font-semibold">Start: {assignmentSummaryData.start_meter ?? '—'}</strong>
                              <span className="block text-muted-foreground mt-0.5">End: {assignmentSummaryData.end_meter ?? 'Current'}</span>
                            </div>
                            <div className="bg-muted/40 p-2.5 rounded">
                              <span className="text-muted-foreground block">Inspections Done</span>
                              <strong className="text-sm font-semibold">{assignmentSummaryData.inspections_count || 0} Inspections</strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <Table
                    data={rows(records.data)}
                    columns={
                      tab === 'fuel-logs'
                        ? [
                            'recorded_at',
                            'fuel_type',
                            'quantity_litres',
                            'meter_reading',
                            'supplier',
                          ]
                        : tab === 'maintenance'
                          ? ['title', 'maintenance_type', 'priority', 'status', 'scheduled_date']
                          : tab === 'meter-readings'
                            ? ['recorded_at', 'reading_type', 'reading', 'source']
                            : undefined
                    }
                    onSelect={setSelected}
                  />
                  {['maintenance', 'fuel-logs'].includes(tab) && (
                    <div className="flex justify-between p-4 border-t text-xs">
                      <span>
                        {records.data?.total || 0} records · Page {page}
                      </span>
                      <div className="flex gap-2">
                        <button
                          className="btn-secondary text-xs"
                          disabled={page === 1}
                          onClick={() => setPage(page - 1)}
                        >
                          Previous
                        </button>
                        <button
                          className="btn-secondary text-xs"
                          disabled={page * 20 >= (records.data?.total || 0)}
                          onClick={() => setPage(page + 1)}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </State>
              </section>
            )}
          </>
        )}
      </State>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {selected && (
        <Modal
          name={tab === 'activity' ? 'Activity Detail · ' + (selected.action || 'Action') : selected.title || selected.name || title(tab) + ' record'}
          onClose={() => {
            setSelected(null);
            setLogFileUpload(false);
          }}
        >
          {tab === 'activity' ? (
            <div className="space-y-4">
              <div className="bg-muted/30 p-3 rounded space-y-1 text-xs border">
                <div><strong>Action:</strong> <span className="badge badge-active ml-2">{selected.action}</span></div>
                <div><strong>Occurred At:</strong> {selected.occurred_at ? new Date(selected.occurred_at).toLocaleString() : '—'}</div>
                <div><strong>Entity Type:</strong> {selected.entity_type || 'Asset'}</div>
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recorded Changes</h4>
              <div className="border rounded overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted border-b">
                    <tr>
                      <th className="p-2 font-semibold">Field</th>
                      <th className="p-2 font-semibold">Previous Value</th>
                      <th className="p-2 font-semibold">New Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Array.from(new Set([...Object.keys(selected.old_values || {}), ...Object.keys(selected.new_values || {})])).map((key) => {
                      const oldVal = selected.old_values?.[key];
                      const newVal = selected.new_values?.[key];
                      return (
                        <tr key={key}>
                          <td className="p-2 font-mono text-[11px] text-muted-foreground">{key}</td>
                          <td className="p-2 text-red-700 bg-red-50/50">{oldVal != null ? String(oldVal) : '—'}</td>
                          <td className="p-2 text-green-700 bg-green-50/50 font-semibold">{newVal != null ? String(newVal) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <Facts data={selected} />
          )}
          {['maintenance', 'fuel-logs', 'inspections', 'meter-readings'].includes(tab) && (
            <div className="mt-5 border-t pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Attached Receipts & Files</h3>
                {!logFileUpload && (
                  <button className="btn-secondary text-xs" onClick={() => setLogFileUpload(true)}>
                    <Upload size={12} />
                    Attach file
                  </button>
                )}
              </div>
              {logFileUpload && (
                <form onSubmit={handleLogFileUpload} className="p-3 bg-muted/40 rounded space-y-3 border">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Select File *</label>
                    <input
                      className="input-field text-xs p-1"
                      type="file"
                      required
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setLogFile(file);
                        if (file && !logFileTitle) {
                          setLogFileTitle(file.name);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">File Title / Description (Optional)</label>
                    <input
                      className="input-field text-xs"
                      placeholder="e.g. Service Receipt, Evidence Photo"
                      value={logFileTitle}
                      onChange={(e) => setLogFileTitle(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" className="btn-secondary text-xs" onClick={() => setLogFileUpload(false)}>
                      Cancel
                    </button>
                    <button disabled={logFileBusy} className="btn-primary text-xs">
                      {logFileBusy ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>
                </form>
              )}
              {logFiles.length > 0 ? (
                <ul className="divide-y border rounded bg-white text-xs">
                  {logFiles.map((f: Row) => (
                    <li key={f.id} className="p-2.5 flex justify-between items-center">
                      <div>
                        <strong className="block font-medium">{f.title || f.file_name}</strong>
                        <span className="text-muted-foreground text-[11px]">{f.file_name} · {f.size_bytes ? Math.round(f.size_bytes / 1024) + ' KB' : ''}</span>
                      </div>
                      <button className="btn-secondary text-xs" onClick={() => handleLogFileDownload(f.id, f.file_name || 'file')}>
                        <Download size={12} />
                        Download
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">No attached files or receipts yet.</p>
              )}
            </div>
          )}
          <div className="flex gap-2 mt-5 border-t pt-4 flex-wrap">
            {tab === 'documents' && (
              <button className="btn-primary text-xs" onClick={() => void download(selected)}>
                <Download size={13} />
                Download
              </button>
            )}
            {tab === 'maintenance' && (
              <button
                className="btn-secondary text-xs"
                onClick={() => openForm(root + '/maintenance/' + selected.id, 'Edit maintenance job', selected)}
              >
                <Edit size={13} />
                Edit job
              </button>
            )}
            {tab === 'fuel-logs' && (
              <button
                className="btn-secondary text-xs"
                onClick={() => openForm(root + '/fuel-logs/' + selected.id, 'Edit fuel log', selected)}
              >
                <Edit size={13} />
                Edit fuel log
              </button>
            )}
            {tab === 'inspections' && (
              <button
                className="btn-secondary text-xs"
                onClick={() => openForm('/api/v1/assets/' + assetId + '/inspections/' + selected.id, 'Edit inspection', selected)}
              >
                <Edit size={13} />
                Edit inspection
              </button>
            )}
            {tab === 'assignments' && (
              <button
                className="btn-secondary text-xs"
                onClick={() => openForm('/api/v1/asset-assignments/' + selected.id, 'Edit assignment', selected)}
              >
                <Edit size={13} />
                Edit assignment
              </button>
            )}
            {tab === 'maintenance' &&
              ['OPEN', 'IN_PROGRESS'].includes(selected.status) &&
              auth.can('assets.update') && (
                <button
                  className="btn-primary text-xs"
                  onClick={() => {
                    const next =
                      selected.status === 'OPEN'
                        ? ['IN_PROGRESS', 'COMPLETED', 'CANCELLED']
                        : ['COMPLETED', 'CANCELLED'];
                    openForm(
                      root + '/maintenance/' + selected.id + '/status',
                      'Update maintenance status',
                      undefined,
                      {
                        schema: {
                          type: 'object',
                          required: ['status', 'notes'],
                          properties: {
                            status: { type: 'string', enum: next },
                            notes: { type: 'string', minLength: 1, maxLength: 20000 },
                          },
                        },
                      }
                    );
                  }}
                >
                  Update maintenance status
                </button>
              )}
            {tab === 'defects' &&
              selected.status !== 'RESOLVED' &&
              allowed('/api/v1/asset-defects/' + selected.id + '/resolve', 'POST') && (
                <button
                  className="btn-primary text-xs"
                  onClick={() =>
                    openForm('/api/v1/asset-defects/' + selected.id + '/resolve', 'Resolve defect')
                  }
                >
                  Resolve defect
                </button>
              )}
          </div>
        </Modal>
      )}
      {form && (
        <RecordForm
          resource={form.path.slice(8)}
          path={form.path}
          operation={form.operation || operation(form.path, form.method || 'POST') || {}}
          initial={form.initial}
          title={form.name}
          method={form.method}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
          }}
        />
      )}
      {transfer && asset && (
        <AssetAssignmentModal
          asset={asset}
          currentProject={d.current_project}
          onClose={() => setTransfer(false)}
          onSaved={() => {
            setTransfer(false);
            reload();
          }}
        />
      )}
      {upload && (
        <OperationalUpload
          path={root + (upload === 'photo' ? '/media/upload' : '/documents/upload')}
          photo={upload === 'photo'}
          onClose={() => setUpload(null)}
          onSaved={() => {
            setUpload(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
