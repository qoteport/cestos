'use client';

import React, { useEffect, useState } from 'react';
import { Edit, ChevronRight, MapPin, User, Calendar, Target, SlidersHorizontal, Filter, X } from 'lucide-react';
import Link from 'next/link';
import { apiFetch, getProjects, getProjectOverview, type ProjectOverview } from '@/lib/api';
import { Modal, useData, rows, display } from '@/components/DataUI';
import SearchableSelect, { SearchableSelectOption } from '@/components/SearchableSelect';

function formatDate(d?: string): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

export default function ProjectHeader() {
  const [project, setProject] = useState<ProjectOverview | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Project State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    status: 'ACTIVE',
    location: '',
    contract_number: '',
    target_metres: 0,
    start_date: '',
    end_date: '',
    description: '',
  });

  // Filter States
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Draft state
  const [draftProject, setDraftProject] = useState(selectedProjectId);
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draftClient, setDraftClient] = useState(clientId);
  const [draftDateFrom, setDraftDateFrom] = useState(dateFrom);
  const [draftDateTo, setDraftDateTo] = useState(dateTo);

  // Lookup options
  const projectsRes = useData('/api/v1/projects?page_size=100');
  const projectList = rows(projectsRes.data);

  const clientsRes = useData('/api/v1/clients?page_size=100');
  const clientList = rows(clientsRes.data);

  const commercialContractsRes = useData('/api/v1/commercial/contracts?page_size=100');
  const commercialContractsList = rows(commercialContractsRes.data);

  const commercialContractOptions: SearchableSelectOption[] = commercialContractsList.map((c: any) => {
    const num = c.contract_number || c.number || c.code || c.title || String(c.id);
    const client = c.client?.name || c.client_name || '';
    const titleText = c.title || c.name || '';
    return {
      value: num,
      label: client ? `${display(num)} — ${display(client)} (${display(titleText)})` : display(num),
      raw: c,
    };
  });

  useEffect(() => {
    if (project) {
      setEditForm({
        name: project.name || '',
        status: project.status || 'ACTIVE',
        location: (project.location as string) || '',
        contract_number: (project as any).contract_number || '',
        target_metres: (project as any).target_metres || 0,
        start_date: project.start_date ? project.start_date.slice(0, 10) : '',
        end_date: project.end_date ? project.end_date.slice(0, 10) : '',
        description: (project as any).description || '',
      });
    }
  }, [project]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page_size: '1' };
    if (statusFilter) params.status = statusFilter;
    if (clientId) params.client_id = clientId;

    let fetchPromise;
    if (selectedProjectId) {
      fetchPromise = getProjectOverview(selectedProjectId);
    } else {
      fetchPromise = getProjects(params).then(async (res) => {
        const first = res?.items?.[0];
        if (first?.id) return await getProjectOverview(first.id);
        return null;
      });
    }

    fetchPromise
      .then((overview) => setProject(overview))
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, [selectedProjectId, statusFilter, clientId]);

  const activeCount =
    (selectedProjectId ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (clientId ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedProjectId(draftProject);
    setStatusFilter(draftStatus);
    setClientId(draftClient);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setFilterModalOpen(false);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/projects/${project.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name,
          status: editForm.status,
          location: editForm.location,
          contract_number: editForm.contract_number || undefined,
          target_metres: Number(editForm.target_metres) || undefined,
          start_date: editForm.start_date || undefined,
          end_date: editForm.end_date || undefined,
          description: editForm.description,
        }),
      });
      setEditModalOpen(false);
      if (selectedProjectId) {
        const overview = await getProjectOverview(selectedProjectId);
        setProject(overview);
      } else {
        const res = await getProjects({ page_size: '1' });
        const first = res?.items?.[0];
        if (first?.id) {
          const overview = await getProjectOverview(first.id);
          setProject(overview);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const managerName = project?.project_manager
    ? ((project.project_manager as { full_name?: string; first_name?: string; last_name?: string })?.full_name ||
       `${(project.project_manager as { first_name?: string })?.first_name ?? ''} ${(project.project_manager as { last_name?: string })?.last_name ?? ''}`.trim())
    : '—';
  const clientName = (project?.client as { name?: string })?.name ?? '—';
  const status = project?.status ?? '—';
  const statusClass = status === 'ACTIVE' ? 'badge-active' : status === 'MOBILIZING' ? 'badge-mobilizing' : 'badge-neutral';

  const targetMetres = (project as Record<string, unknown>)?.target_metres as number | undefined;
  const drilledMetres = (project as Record<string, unknown>)?.drilled_metres as number | undefined;
  const progress = targetMetres && drilledMetres ? Math.round((drilledMetres / targetMetres) * 100) : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Dashboard</Link>
          <ChevronRight size={12} />
          <span className="hover:text-primary cursor-pointer transition-colors">Projects</span>
          <ChevronRight size={12} />
          <span className="text-foreground font-500">{project?.name || 'Project Command Center'}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditModalOpen(true)}
            className="px-3 py-2 bg-secondary text-foreground font-semibold rounded-lg text-xs hover:bg-muted border transition flex items-center gap-1.5 shadow-sm"
          >
            <Edit size={14} className="text-primary" />
            Edit Project
          </button>
          <button
            type="button"
            onClick={() => setFilterModalOpen(true)}
            className="px-3 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90 transition flex items-center gap-1.5 shadow-sm"
          >
            <SlidersHorizontal size={14} />
            Filter Data
            {activeCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-primary font-bold">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active Filter Pills */}
      {activeCount > 0 && (
        <div className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg border text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-primary" />
            <span className="font-semibold text-foreground">Active DB Query Filters:</span>
            {selectedProjectId && (
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium border">
                Project ID: {selectedProjectId.substring(0, 8)}...
              </span>
            )}
            {dateFrom && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200">
                From: {dateFrom}
              </span>
            )}
            {dateTo && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200">
                To: {dateTo}
              </span>
            )}
            {statusFilter && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200">
                Status: {statusFilter}
              </span>
            )}
            {clientId && (
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[11px] font-medium border border-purple-200">
                Client ID: {clientId.substring(0, 8)}...
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setSelectedProjectId('');
              setStatusFilter('');
              setClientId('');
              setDateFrom('');
              setDateTo('');
            }}
            className="text-xs text-rose-600 font-semibold hover:underline flex items-center gap-1"
          >
            <X size={12} /> Clear DB Filters
          </button>
        </div>
      )}

      {loading ? (
        <div className="card p-5">
          <div className="h-6 bg-muted animate-pulse rounded w-1/3 mb-3" />
          <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
        </div>
      ) : !project ? (
        <div className="card p-5">
          <p className="text-sm text-muted-foreground">No project found matching the database filters.</p>
        </div>
      ) : (
        <div className="card p-5">
          <div className="flex flex-col lg:flex-row lg:items-start gap-4 justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {project?.project_number && (
                  <span className="text-xs font-600 text-muted-foreground">{project.project_number}</span>
                )}
                <span className={`badge ${statusClass}`}>{status}</span>
              </div>
              <h1 className="page-title mb-3">{project.name}</h1>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User size={13} className="text-primary flex-shrink-0" />
                  <span>Client:</span>
                  <span className="font-600 text-foreground">{clientName}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User size={13} className="text-primary flex-shrink-0" />
                  <span>PM:</span>
                  <span className="font-600 text-foreground">{managerName}</span>
                </div>
                {project?.start_date && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar size={13} className="text-primary flex-shrink-0" />
                    <span>Start:</span>
                    <span className="font-600 text-foreground">{formatDate(project.start_date)}</span>
                  </div>
                )}
                {project?.end_date && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar size={13} className="text-primary flex-shrink-0" />
                    <span>Target End:</span>
                    <span className="font-600 text-foreground">{formatDate(project.end_date)}</span>
                  </div>
                )}
                {project?.location && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin size={13} className="text-primary flex-shrink-0" />
                    <span>Location:</span>
                    <span className="font-600 text-foreground">{project.location as string}</span>
                  </div>
                )}
                {targetMetres !== undefined && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Target size={13} className="text-primary flex-shrink-0" />
                    <span>Target:</span>
                    <span className="font-600 text-foreground">{targetMetres.toLocaleString()} m</span>
                  </div>
                )}
                {drilledMetres !== undefined && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Target size={13} className="text-primary flex-shrink-0" />
                    <span>Drilled:</span>
                    <span className="font-600 text-foreground">{drilledMetres.toLocaleString()} m</span>
                  </div>
                )}
                {progress !== undefined && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Target size={13} className="text-primary flex-shrink-0" />
                    <span>Progress:</span>
                    <span className="font-600 text-green-700">{progress}%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <Edit size={14} />
                Edit Project
              </button>
              <button className="btn-primary text-sm">
                Assign Resources
              </button>
            </div>
          </div>

          {progress !== undefined && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Drilling Progress</span>
                <span className="text-xs font-600 text-foreground tabular-nums">
                  {drilledMetres?.toLocaleString()} m / {targetMetres?.toLocaleString()} m
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* FILTER POPUP MODAL */}
      {filterModalOpen && (
        <Modal name="Filter Project Command Center Database Data" onClose={() => setFilterModalOpen(false)}>
          <form onSubmit={handleApply} className="space-y-4 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg border text-muted-foreground">
              <p className="font-semibold text-foreground text-xs">Database Level Filtering</p>
              <p className="text-[11px] mt-0.5">
                Applies directly to backend SQL queries fetching project overview, target metrics, and site status.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-foreground">Start Date (Date From)</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs"
                  value={draftDateFrom}
                  onChange={(e) => setDraftDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">End Date (Date To)</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs"
                  value={draftDateTo}
                  onChange={(e) => setDraftDateTo(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Select Project</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background text-xs"
                value={draftProject}
                onChange={(e) => setDraftProject(e.target.value)}
              >
                <option value="">Default Active Project</option>
                {projectList.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.code ? `(${p.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Project Operational Status</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background text-xs"
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
              >
                <option value="">All Operational Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="MOBILIZING">Mobilizing</option>
                <option value="PLANNING">Planning</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Client Organization</label>
              <select
                className="w-full px-3 py-2 border rounded-lg bg-background text-xs"
                value={draftClient}
                onChange={(e) => setDraftClient(e.target.value)}
              >
                <option value="">All Client Accounts</option>
                {clientList.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.code ? `(${c.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                className="px-4 py-2 text-xs border rounded-lg hover:bg-muted font-medium"
                onClick={() => setFilterModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90"
              >
                Apply Database Filters
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT PROJECT POPUP MODAL */}
      {editModalOpen && project && (
        <Modal name={`Edit Project: ${project.name}`} onClose={() => setEditModalOpen(false)}>
          <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-foreground">Project Name *</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border rounded-lg bg-background text-xs font-semibold"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-foreground">Operational Status *</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs font-medium"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="MOBILIZING">Mobilizing</option>
                  <option value="PLANNING">Planning</option>
                  <option value="PAUSED">Paused</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">Target Metres (m)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs font-mono font-bold"
                  value={editForm.target_metres}
                  onChange={(e) => setEditForm({ ...editForm, target_metres: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Commercial Contract</label>
              <SearchableSelect
                options={commercialContractOptions}
                value={editForm.contract_number}
                onChange={(val) => setEditForm({ ...editForm, contract_number: val })}
                placeholder="Select commercial contract..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-foreground">Start Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs"
                  value={editForm.start_date}
                  onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">Target End Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs"
                  value={editForm.end_date}
                  onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Site Location / Territory</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg bg-background text-xs"
                placeholder="e.g. Drill Pad B-14, Solway Site"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Description / Notes</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border rounded-lg bg-background text-xs resize-y"
                placeholder="Project overview, scope of work, or contract notes..."
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                className="px-4 py-2 text-xs border rounded-lg hover:bg-muted font-medium"
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition"
              >
                {saving ? 'Saving...' : 'Save Project Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}