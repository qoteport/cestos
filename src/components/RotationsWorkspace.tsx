'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RotateCcw, Calendar, Clock, Plus, Filter, Search, RefreshCw,
  CheckCircle, ArrowLeft, Users, Briefcase, AlertCircle, Eye, Edit, ChevronRight
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Row, display, Modal } from './DataUI';
import RecordForm from './RecordForm';

export default function RotationsWorkspace() {
  const [loading, setLoading] = useState(true);
  const [currentRotations, setCurrentRotations] = useState<Row[]>([]);
  const [upcomingRotations, setUpcomingRotations] = useState<Row[]>([]);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [projects, setProjects] = useState<Row[]>([]);
  const [version, setVersion] = useState(0);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'ALL' | 'ON_SITE' | 'OFF_SITE' | 'UPCOMING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingForEmployee, setCreatingForEmployee] = useState<string>('');

  const reload = () => setVersion(v => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<any>('/api/v1/rotations/current').catch(() => []),
      apiFetch<any>('/api/v1/rotations/upcoming?days=30').catch(() => []),
      apiFetch<any>('/api/v1/employees?page_size=100').catch(() => []),
      apiFetch<any>('/api/v1/projects?page_size=100').catch(() => []),
    ]).then(([currData, upData, empData, projData]) => {
      if (!active) return;
      setCurrentRotations(Array.isArray(currData) ? currData : currData?.items || []);
      setUpcomingRotations(Array.isArray(upData) ? upData : upData?.items || []);
      setEmployees(Array.isArray(empData) ? empData : empData?.items || []);
      setProjects(Array.isArray(projData) ? projData : projData?.items || []);
      setLoading(false);
    });

    return () => { active = false; };
  }, [version]);

  // Merge items with flag
  const allRotations: Row[] = [
    ...currentRotations.map((r: Row) => ({ ...r, category: 'current' })),
    ...upcomingRotations.map((r: Row) => ({ ...r, category: 'upcoming' })),
  ];

  // Unique deduplicated or filtered list
  const filteredList = allRotations.filter((item: Row) => {
    const searchStr = `${item.employee_name || ''} ${item.project_name || ''} ${item.pattern || ''} ${item.status || ''}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchQuery.toLowerCase());

    const isCurrentOnSite = item.status === 'ON_SITE' || item.status === 'ACTIVE' || item.status === 'ON_ROTATION';
    const isOffSite = item.status === 'OFF_SITE' || item.status === 'ON_REST' || item.status === 'REST';
    const isUpcoming = item.category === 'upcoming' || item.status === 'SCHEDULED';

    if (activeTab === 'ON_SITE') return matchesSearch && isCurrentOnSite;
    if (activeTab === 'OFF_SITE') return matchesSearch && isOffSite;
    if (activeTab === 'UPCOMING') return matchesSearch && isUpcoming;
    return matchesSearch;
  });

  // KPI Statistics
  const totalOnSite = allRotations.filter((r: Row) => r.status === 'ON_SITE' || r.status === 'ACTIVE').length;
  const totalOnRest = allRotations.filter((r: Row) => r.status === 'OFF_SITE' || r.status === 'ON_REST').length;
  const upcomingSwapsCount = upcomingRotations.length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
        <div>
          <Link href="/workforce-overview" className="text-xs text-primary flex items-center gap-1 mb-2 hover:underline">
            <ArrowLeft size={12} /> Workforce Overview
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Rotations & Shift Management Hub</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consolidated overview of active on-site rotations, upcoming crew swaps, and rest period schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={reload} className="btn-secondary text-xs p-2.5" title="Refresh rotations">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus size={14} /> Schedule New Rotation
          </button>
        </div>
      </div>

      {/* Rotation KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 space-y-1.5 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-muted-foreground block">Currently On Site / Shift</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-800">{loading ? '—' : totalOnSite}</span>
            <RotateCcw size={18} className="text-emerald-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Active personnel on active operational cycle</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-muted-foreground block">Currently On Rest Break</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-800">{loading ? '—' : totalOnRest}</span>
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Off-site personnel on rest break cycle</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-cyan-500">
          <span className="text-xs font-semibold text-muted-foreground block">Upcoming Swaps (Next 30 Days)</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-cyan-800">{loading ? '—' : upcomingSwapsCount}</span>
            <Calendar size={18} className="text-cyan-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Crew changes due for mobilization</p>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'ALL' ? 'bg-primary text-primary-foreground shadow-sm' : 'btn-secondary'
              }`}
            >
              All Rotations ({allRotations.length})
            </button>
            <button
              onClick={() => setActiveTab('ON_SITE')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'ON_SITE' ? 'bg-primary text-primary-foreground shadow-sm' : 'btn-secondary'
              }`}
            >
              On Site ({totalOnSite})
            </button>
            <button
              onClick={() => setActiveTab('OFF_SITE')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'OFF_SITE' ? 'bg-primary text-primary-foreground shadow-sm' : 'btn-secondary'
              }`}
            >
              On Rest ({totalOnRest})
            </button>
            <button
              onClick={() => setActiveTab('UPCOMING')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'UPCOMING' ? 'bg-primary text-primary-foreground shadow-sm' : 'btn-secondary'
              }`}
            >
              Upcoming Swaps ({upcomingSwapsCount})
            </button>
          </div>

          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search personnel, project, pattern..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-9 text-xs py-1.5"
            />
          </div>
        </div>

        {/* Table View */}
        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <RotateCcw size={32} className="mx-auto text-muted-foreground/50" />
            <p className="text-sm font-semibold">No rotation records found matching the filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Project / Site Location</th>
                  <th className="p-3">Rotation Pattern</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">Next Swap Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredList.map((item: Row, idx: number) => {
                  const empName = item.employee_name || item.employee?.first_name ? `${item.employee?.first_name} ${item.employee?.last_name}` : item.employee_id || 'Employee';
                  const projName = item.project_name || item.project?.name || item.project_id || 'General Operations';
                  const statusBadge =
                    item.status === 'ON_SITE' || item.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : item.status === 'OFF_SITE' || item.status === 'ON_REST'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-blue-100 text-blue-800 border-blue-300';

                  return (
                    <tr key={item.id || idx} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-semibold text-foreground">
                        {item.employee_id ? (
                          <Link href={`/workspace/employees/${item.employee_id}`} className="hover:text-primary transition-colors">
                            {display(empName)}
                          </Link>
                        ) : (
                          display(empName)
                        )}
                      </td>

                      <td className="p-3 text-foreground">{display(projName)}</td>

                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-muted border text-foreground">
                          {display(item.pattern || item.rotation_pattern || '28/28 Days')}
                        </span>
                      </td>

                      <td className="p-3 text-muted-foreground">{display(item.start_date || item.mobilization_date)}</td>

                      <td className="p-3 font-medium text-foreground">
                        {display(item.end_date || item.demobilization_date || item.next_swap_date)}
                      </td>

                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadge}`}>
                          {display(item.status || (item.category === 'upcoming' ? 'UPCOMING' : 'ON_SITE'))}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        {item.employee_id && (
                          <Link
                            href={`/workspace/employees/${item.employee_id}`}
                            className="btn-secondary py-1 px-2.5 text-[11px] inline-flex items-center gap-1"
                          >
                            <Eye size={12} /> View Profile
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Create New Rotation Schedule */}
      {showCreateModal && (
        <Modal name="Schedule New Employee Rotation" onClose={() => setShowCreateModal(false)}>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const empId = (form.elements.namedItem('rotation_employee_id') as HTMLSelectElement).value;
              const projId = (form.elements.namedItem('rotation_project_id') as HTMLSelectElement).value;
              const patternVal = (form.elements.namedItem('rotation_pattern') as HTMLInputElement).value;
              const startVal = (form.elements.namedItem('rotation_start') as HTMLInputElement).value;
              const endVal = (form.elements.namedItem('rotation_end') as HTMLInputElement).value;
              const statusVal = (form.elements.namedItem('rotation_status') as HTMLSelectElement).value;

              try {
                await apiFetch(`/api/v1/employees/${empId}/rotations`, {
                  method: 'POST',
                  body: JSON.stringify({
                    project_id: projId || undefined,
                    rotation_pattern: patternVal,
                    start_date: startVal,
                    end_date: endVal || undefined,
                    status: statusVal,
                  }),
                });

                setShowCreateModal(false);
                reload();
              } catch (err: any) {
                alert(err?.message || 'Failed to create rotation schedule.');
              }
            }}
          >
            <div>
              <label className="block text-xs font-semibold mb-1">Employee *</label>
              <select required name="rotation_employee_id" className="input-field">
                <option value="">Select Employee...</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {[e.first_name, e.last_name].filter(Boolean).join(' ') || e.name || e.employee_number} ({e.position_name || e.title || 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Project Assignment (Optional)</label>
              <select name="rotation_project_id" className="input-field">
                <option value="">Select Project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title || p.name || p.project_number}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Rotation Pattern *</label>
                <input required type="text" name="rotation_pattern" className="input-field" defaultValue="28/28 Days" placeholder="e.g. 28/28 Days, 14/14 Days" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Status *</label>
                <select name="rotation_status" className="input-field" defaultValue="ON_SITE">
                  <option value="ON_SITE">On Site (Active Shift)</option>
                  <option value="OFF_SITE">Off Site (Rest Break)</option>
                  <option value="SCHEDULED">Scheduled / Upcoming</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Start Date *</label>
                <input required type="date" name="rotation_start" className="input-field" defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">End / Next Swap Date</label>
                <input type="date" name="rotation_end" className="input-field" />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button type="button" className="btn-secondary text-xs" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary text-xs">Create Rotation</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
