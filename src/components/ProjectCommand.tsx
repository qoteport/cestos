'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Plus, Users, Wrench, MapPin, Activity } from 'lucide-react';
import ProjectRecords from './ProjectRecords';
import ProjectAssetActions from './ProjectAssetActions';
import { useData, State, rows, Table, Facts, Row, display } from './DataUI';
import { ProjectRegister, ReportMetrics } from './ProjectDashboard';
import ProjectUpdates, { ProjectActivity } from './ProjectUpdates';
import ProjectWorkforce from './ProjectWorkforce';
import RecordForm from './RecordForm';
import { operation } from './ResourceWorkspace';
import { useAuth } from './AuthProvider';
import DrillingPerformanceChart from '@/app/components/DrillingPerformanceChart';

export default function ProjectCommand({
  projectId,
  onBack,
  readOnly = false,
}: {
  projectId?: string;
  onBack?: () => void;
  readOnly?: boolean;
} = {}) {
  const router = useRouter();
  const [id, setId] = useState('');
  const [tab, setTab] = useState('overview');
  const auth = useAuth();
  const [editing, setEditing] = useState(false);
  const [addingSite, setAddingSite] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const requested = projectId || new URLSearchParams(window.location.search).get('project');
    if (requested) setId(requested);
    setReady(true);
  }, []);

  const detail = useData(id ? '/api/v1/projects/' + id + '/overview' : null);
  const metrics = useData(id ? '/api/v1/projects/' + id + '/report-metrics' : null);
  const summary = useData(
    id && tab === 'inventory' ? '/api/v1/projects/' + id + '/inventory-summary' : null
  );
  const d = detail.data;

  if (!ready) return <p role="status" className="p-8 text-center text-muted-foreground">Loading project command center…</p>;

  // If no project selected in URL, render the clean project selector register
  if (!id) {
    return (
      <div className="space-y-6 fade-in">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary mb-1">Operations portfolio</p>
          <h1 className="text-2xl font-bold tracking-tight">Project Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a project from the register below to launch its command center.
          </p>
        </div>
        <ProjectRegister dashboard />
      </div>
    );
  }

  return (
    <div className="space-y-5 fade-in">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/projects-overview"
          className="inline-flex items-center gap-1.5 text-xs text-primary font-600 hover:underline mb-1 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Projects overview
        </Link>
        <div className="flex flex-wrap justify-between gap-4 items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{d?.project?.name || 'Project Command Center'}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {d?.client?.name ? `${d.client.name} · ` : ''}
              Project #{d?.project?.project_number || '—'}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="px-3.5 py-2 bg-secondary hover:bg-muted text-foreground font-semibold rounded-lg text-xs border transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              onClick={() => setEditing(true)}
            >
              <Edit size={14} className="text-primary" />
              Edit Project
            </button>
            {d?.project?.status && (
              <span
                className={`badge ${
                  d.project.status === 'ACTIVE'
                    ? 'badge-active'
                    : d.project.status === 'MOBILIZING'
                      ? 'badge-mobilizing'
                      : 'badge-neutral'
                }`}
              >
                {d.project.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Project detail container */}
      <State loading={detail.loading} error={detail.error} retry={detail.reload}>
        {d && (
          <>
            {/* Executive KPI Summary Strip */}
            <section className="card p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="kpi-card">
                  <div className="flex items-center justify-between">
                    <span className="kpi-label">Workforce</span>
                    <Users size={16} className="text-primary" />
                  </div>
                  <div className="kpi-value-sm">{d.employee_count ?? 0}</div>
                  <span className="kpi-sub">Assigned people</span>
                </div>
                <div className="kpi-card">
                  <div className="flex items-center justify-between">
                    <span className="kpi-label">Equipment</span>
                    <Wrench size={16} className="text-primary" />
                  </div>
                  <div className="kpi-value-sm">{d.asset_count ?? 0}</div>
                  <span className="kpi-sub">Assigned assets</span>
                </div>
                <div className="kpi-card">
                  <div className="flex items-center justify-between">
                    <span className="kpi-label">Project Sites</span>
                    <MapPin size={16} className="text-primary" />
                  </div>
                  <div className="kpi-value-sm">{d.sites?.length ?? 0}</div>
                  <span className="kpi-sub">Active drill sites</span>
                </div>
                <div className="kpi-card">
                  <div className="flex items-center justify-between">
                    <span className="kpi-label">Metres Target</span>
                    <Activity size={16} className="text-primary" />
                  </div>
                  <div className="kpi-value-sm">
                    {d.project?.target_metres != null ? Number(d.project.target_metres).toLocaleString() : '—'}
                  </div>
                  <span className="kpi-sub">Target metres</span>
                </div>
              </div>
            </section>

            {/* Drilling Metrics Panel */}
            <State loading={metrics.loading} error={metrics.error} retry={metrics.reload}>
              {metrics.data && <ReportMetrics data={metrics.data} />}
            </State>

            {/* Tab navigation */}
            <nav className="tab-nav overflow-x-auto" aria-label="Project sections">
              {[
                'overview',
                'workforce',
                'equipment',
                'inventory',
                'sites',
                'updates',
                'files & notes',
                'activity',
              ].map((t) => (
                <button
                  key={t}
                  className={'tab-item ' + (tab === t ? 'active' : '')}
                  onClick={() => setTab(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </nav>

            {/* Tab content */}
            <section className="card p-5">
              {tab === 'overview' && (
                <div className="space-y-6">
                  {/* Executive Quick Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                    <div>
                      <p className="text-sm font-700 text-foreground">Project Overview & Control Hub</p>
                      <p className="text-xs text-muted-foreground">Key specs, drilling trends, and quick management controls</p>
                    </div>
                    {!readOnly && (
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-secondary text-xs flex items-center gap-1 font-semibold" onClick={() => setEditing(true)}>
                          <Edit size={13} className="text-primary" />
                          Edit Project
                        </button>
                        <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => setTab('updates')}>
                          <Plus size={13} />
                          Submit field update
                        </button>
                        <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => setTab('workforce')}>
                          <Users size={13} />
                          Assign workforce
                        </button>
                        <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => setTab('equipment')}>
                          <Wrench size={13} />
                          Allocate equipment
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Drilling Performance Chart */}
                  <div className="border border-border p-4 rounded-lg bg-muted/20">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-700 text-foreground uppercase tracking-widest">Project Drilling Performance</p>
                      <span className="text-xs text-muted-foreground">Monthly metres & holes</span>
                    </div>
                    <DrillingPerformanceChart projectId={id} />
                  </div>

                  {/* Project Specifications */}
                  <div>
                    <h3 className="text-xs font-700 uppercase tracking-widest text-muted-foreground mb-3">Project Specifications</h3>
                    <Facts data={{ ...d.project, client: d.client, project_manager: d.project_manager }} />
                  </div>

                  {/* Sites & Team Snapshots */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="border border-border p-4 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-700 uppercase tracking-widest text-muted-foreground">Active Sites ({d.sites?.length || 0})</p>
                        <button className="text-xs text-primary font-600 hover:underline" onClick={() => setTab('sites')}>Manage sites</button>
                      </div>
                      {d.sites?.length ? (
                        <div className="divide-y divide-border">
                          {d.sites.slice(0, 4).map((s: Row) => (
                            <div key={s.id} className="py-2 flex items-center justify-between text-xs">
                              <span className="font-600 text-foreground">{s.name}</span>
                              <span className="text-muted-foreground">{s.location_type || 'Site'}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground py-4 text-center">No active sites added yet.</p>
                      )}
                    </div>

                    <div className="border border-border p-4 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-700 uppercase tracking-widest text-muted-foreground">Assigned Team ({d.current_employees?.length || 0})</p>
                        <button className="text-xs text-primary font-600 hover:underline" onClick={() => setTab('workforce')}>Manage team</button>
                      </div>
                      {d.current_employees?.length ? (
                        <div className="divide-y divide-border">
                          {d.current_employees.slice(0, 4).map((e: Row) => (
                            <div key={e.id} className="py-2 flex items-center justify-between text-xs">
                              <span className="font-600 text-foreground">{display(e)}</span>
                              <span className="text-muted-foreground">{e.employee_number || 'Team member'}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground py-4 text-center">No employees assigned yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'workforce' && (() => {
                // Build a map: employee_id → their active assignment on this project
                // so we can inject assignment-level supervisor_id + role_on_project.
                // EmployeeRead only carries org-level HR supervisor_id, not the
                // project-assignment supervisor — this enrichment fixes the badge.
                const assignmentMap: Record<string, Row> = {};
                (d.recent_employee_assignments || []).forEach((a: Row) => {
                  if (a.status === 'ACTIVE' && String(a.project_id) === id) {
                    assignmentMap[String(a.employee_id)] = a;
                  }
                });
                const enrichedEmployees = (d.current_employees || []).map((emp: Row) => {
                  const asgn = assignmentMap[String(emp.id)];
                  if (!asgn) return emp;
                  return {
                    ...emp,
                    assignment_supervisor_id: asgn.supervisor_id ?? null,
                    role_on_project: asgn.role_on_project ?? emp.role_on_project ?? null,
                    is_supervisor: asgn.is_supervisor ?? emp.is_supervisor ?? false,
                  };
                });
                return (
                  <ProjectWorkforce
                    key={id}
                    projectId={id}
                    employees={enrichedEmployees}
                    assignments={d.recent_employee_assignments || []}
                    onSaved={detail.reload}
                  />
                );
              })()}

              {tab === 'updates' && (
                <ProjectUpdates
                  key={id}
                  projectId={id}
                  sites={d.sites || []}
                  onSaved={metrics.reload}
                />
              )}

              {tab === 'activity' && <ProjectActivity key={id} projectId={id} />}

              {tab === 'equipment' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <ProjectAssetActions projectId={id} onSaved={detail.reload} />
                  </div>
                  <Table
                    data={d.current_assets || []}
                    onSelect={(row) => router.push('/workspace/assets/' + row.id)}
                  />
                </div>
              )}

              {tab === 'files & notes' && <ProjectRecords key={id} projectId={id} />}

              {tab === 'sites' && (
                <div className="space-y-4 ml-auto">
                  {auth.can('locations.create') && (
                    <button className="btn-primary ml-auto" onClick={() => setAddingSite(true)}>
                      Add project site
                    </button>
                  )}
                  <Table data={d.sites || []} />
                </div>
              )}

              {tab === 'inventory' && (
                <State loading={summary.loading} error={summary.error} retry={summary.reload}>
                  <Facts data={summary.data || {}} />
                  {Object.entries(summary.data || {})
                    .filter(([, v]) => Array.isArray(v) || (v as Row)?.items)
                    .map(([k, v]) => (
                      <div key={k} className="mt-5">
                        <h3 className="font-semibold mb-3 section-header">
                          {k.replace(/_/g, ' ')}
                        </h3>
                        <Table data={rows(v)} />
                      </div>
                    ))}
                </State>
              )}
            </section>
          </>
        )}
      </State>

      {editing && d && (
        <RecordForm
          resource="projects"
          path={'/api/v1/projects/' + id}
          operation={operation('/api/v1/projects/' + id, 'PATCH') || {}}
          initial={d.project}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            detail.reload();
            metrics.reload();
          }}
        />
      )}

      {addingSite && (
        <RecordForm
          resource="locations"
          path="/api/v1/locations"
          operation={operation('/api/v1/locations', 'POST') || {}}
          initial={{ project_id: id, location_type: 'PROJECT_SITE' }}
          onClose={() => setAddingSite(false)}
          onSaved={() => {
            setAddingSite(false);
            detail.reload();
          }}
        />
      )}
    </div>
  );
}
