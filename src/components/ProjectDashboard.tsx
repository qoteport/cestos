'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Download, RefreshCw, Filter, X } from 'lucide-react';
import { downloadBlob } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { useData, rows, State, Table, Row } from './DataUI';
import RecordForm from './RecordForm';
import { operation } from './ResourceWorkspace';
import SearchableSelect from './SearchableSelect';

export const number = (value: unknown) =>
  value == null ? '—' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });

export function ReportMetrics({ data }: { data: Row }) {
  const stats = [
    ['Meters reported', number(data.metres)],
    ['Drill holes', number(data.drill_holes)],
    ['Average depth (m)', number(data.average_depth)],
    ['Reports submitted', number(data.reports)],
    ...(data.target_metres != null
      ? [
          [
            'Target achieved',
            data.target_progress == null ? 'No target set' : number(data.target_progress) + '%',
          ],
        ]
      : []),
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(([label, value]) => (
          <div className="kpi-card" key={label}>
            <p className="kpi-value-sm">{value}</p>
            <p className="kpi-label">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Cumulative drilling reports · Average depth weighted by reported hole count · Latest report:{' '}
        {data.last_report_date || 'No reports yet'}
      </p>
    </div>
  );
}

const PROJECT_STATUSES = ['PLANNING', 'MOBILIZING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CLOSED', 'CANCELLED'];

export function ProjectRegister({ dashboard = false, onSelectProject, readOnly }: { dashboard?: boolean; onSelectProject?: (id: string) => void; readOnly?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('search') || '';
  const auth = useAuth();
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    const q = searchParams?.get('search') || '';
    setSearch(q);
  }, [searchParams]);

  const params = new URLSearchParams({ page: String(page), page_size: '20', search });
  if (status) params.set('status', status);
  const data = useData('/api/v1/projects?' + params);
  const list = [...rows(data.data)].sort((a, b) =>
    String(a[sort] || '').localeCompare(String(b[sort] || ''))
  );

  function exportPage() {
    const fields = ['project_number', 'name', 'status', 'start_date', 'expected_end_date', 'target_metres'];
    const cell = (v: unknown) =>
      '"' +
      String(v ?? '')
        .replace(/^[=+@-]/, "'$&")
        .replace(/"/g, '""') +
      '"';
    const csv = [fields, ...list.map((r) => fields.map((k) => r[k]))]
      .map((row) => row.map(cell).join(','))
      .join('\r\n');
    downloadBlob(
      new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }),
      'projects-page-' + page + '.csv'
    );
  }

  const hasActiveFilter = !!status;

  return (
    <section className="card p-5 space-y-4">
      <div className="flex flex-wrap justify-between gap-3 items-center">
        <div>
          <h2 className="text-lg font-semibold">{dashboard ? 'Projects register' : 'All projects'}</h2>
          <p className="text-xs text-muted-foreground">
            Open a project to manage its team, sites and updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`btn-secondary text-xs flex items-center gap-1 ${hasActiveFilter ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : ''}`}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <Filter size={14} /> Filters
          </button>
          {!readOnly && (
            <button className="btn-secondary text-xs flex items-center gap-1" onClick={exportPage}>
              <Download size={14} /> Export CSV
            </button>
          )}
          <button className="btn-secondary text-xs flex items-center gap-1" onClick={data.reload}>
            <RefreshCw size={14} />
          </button>
          {auth?.can('projects.create') && !dashboard && !readOnly && (
            <button className="btn-primary text-xs flex items-center gap-1" onClick={() => setCreating(true)}>
              <Plus size={14} /> Create project
            </button>
          )}
        </div>
      </div>

      <label className="text-xs">
        Search projects
        <input
          type="search"
          placeholder="Name, number or contract…"
          className="input-field mt-1 w-full"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </label>

      {/* Collapsible filter panel */}
      {filterOpen && (
        <div className="border border-border p-4 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-600 uppercase tracking-widest text-muted-foreground">Filters</p>
            {hasActiveFilter && (
              <button
                className="text-xs text-primary font-600 hover:underline flex items-center gap-1"
                onClick={() => { setStatus(''); setPage(1); }}
              >
                <X size={12} /> Clear filters
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="block text-xs mb-1">Status</span>
              <SearchableSelect
                value={status}
                onChange={(val) => { setStatus(val); setPage(1); }}
                options={[
                  { value: '', label: 'All statuses' },
                  ...PROJECT_STATUSES.map((s) => ({
                    value: s,
                    label: s.charAt(0) + s.slice(1).toLowerCase(),
                  })),
                ]}
                searchable={false}
                ariaLabel="Status"
              />
            </div>
            <div>
              <span className="block text-xs mb-1">Sort this page</span>
              <SearchableSelect
                value={sort}
                onChange={(val) => setSort(val)}
                options={[
                  { value: 'name', label: 'Name' },
                  { value: 'expected_end_date', label: 'Expected end date' },
                  { value: 'status', label: 'Status' },
                ]}
                searchable={false}
                ariaLabel="Sort this page"
              />
            </div>
          </div>
        </div>
      )}

      <State loading={data.loading} error={data.error} retry={data.reload}>
        <Table
          data={list}
          columns={[
            'project_number',
            'name',
            'status',
            'start_date',
            'expected_end_date',
            'target_metres',
          ]}
          onSelect={(r) => {
            if (onSelectProject) {
              onSelectProject(r.id);
            } else {
              router.push('/project-command-center?project=' + r.id);
            }
          }}
        />
        <div className="flex justify-between items-center text-xs mt-4">
          <span>
            {data.data?.total || 0} projects · Page {page} of {Math.max(1, data.data?.pages || 0)}
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

      {creating && (
        <RecordForm
          resource="projects"
          path="/api/v1/projects"
          operation={operation('/api/v1/projects', 'POST') || {}}
          onClose={() => setCreating(false)}
          onSaved={(r) => {
            setCreating(false);
            router.push('/project-command-center?project=' + r.id);
          }}
        />
      )}
    </section>
  );
}

/**
 * ProjectDashboard — used by ProjectCommand when no project is selected.
 * The /projects-overview page uses its own page-level header/KPI/charts,
 * so this component is now only used from the project command center.
 */
export default function ProjectDashboard() {
  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between gap-3 items-center">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-2">
            Operations portfolio
          </p>
          <h1 className="text-2xl font-bold">Projects dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Delivery, drilling performance and projects that need attention.
          </p>
        </div>
        <Link href="/projects-overview" className="btn-secondary">
          Projects overview
        </Link>
      </div>
      <ProjectRegister dashboard />
    </div>
  );
}
