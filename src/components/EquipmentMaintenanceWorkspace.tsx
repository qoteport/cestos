'use client';
import WorkCompletionDetails from './WorkCompletionDetails';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wrench, ArrowLeft, RefreshCw, Plus, Search, Filter, CheckCircle, Clock, Calendar, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Row, display, Modal } from './DataUI';
import RecordForm from './RecordForm';

export default function EquipmentMaintenanceWorkspace() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Row[]>([]);
  const [assets, setAssets] = useState<Row[]>([]);
  const [version, setVersion] = useState(0);

  // Filters & Tabs
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'ALL' | 'UPCOMING' | 'OVERDUE' | 'RECURRING'>('ALL');

  // Modal
  const [adding, setAdding] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Row | null>(null);

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    apiFetch<any>('/api/v1/assets?page_size=50')
      .then(async (assetsData) => {
        if (!active) return;
        const assetList = Array.isArray(assetsData) ? assetsData : assetsData?.items || [];
        setAssets(assetList);

        // Concurrent batch fetch using Promise.all
        const jobPromises = assetList.slice(0, 15).map(async (asset: Row) => {
          try {
            const mData = await apiFetch<any>(`/api/v1/assets/${asset.id}/maintenance?page_size=50`);
            const mList = Array.isArray(mData) ? mData : mData?.items || [];
            return mList.map((j: Row) => ({
              ...j,
              asset_name: asset.name,
              asset_number: asset.asset_number,
              asset_id: asset.id,
            }));
          } catch (_) {
            return [];
          }
        });

        const results = await Promise.all(jobPromises);
        if (active) {
          setJobs(results.flat());
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [version]);

  // Compute Upcoming & Overdue Maintenance
  const nowMs = new Date().getTime();

  const jobsWithMeta: Row[] = jobs.map((j: Row): Row => {
    const rawStatus = String(j.status || 'OPEN').toUpperCase();
    const scheduledDateStr = j.scheduled_date ? String(j.scheduled_date).split('T')[0] : '';
    const scheduledMs = scheduledDateStr ? new Date(scheduledDateStr).getTime() : 0;

    const isCompleted = ['COMPLETED', 'RESOLVED', 'CLOSED', 'POSTED'].includes(rawStatus);
    const isInProgress = rawStatus === 'IN_PROGRESS';
    const isOpen = ['OPEN', 'SCHEDULED', 'PENDING', 'DRAFT'].includes(rawStatus);

    let isOverdue = false;
    let isUpcoming = false;
    let daysDiff = 0;

    if (!isCompleted && scheduledDateStr) {
      daysDiff = Math.ceil((scheduledMs - nowMs) / (1000 * 60 * 60 * 24));
      if (daysDiff < 0) {
        isOverdue = true;
      } else if (daysDiff <= 30) {
        isUpcoming = true;
      }
    }

    return {
      ...j,
      isCompleted,
      isInProgress,
      isOpen,
      isOverdue,
      isUpcoming,
      daysDiff,
      scheduledDateStr,
    };
  });

  const totalJobs = jobsWithMeta.length;
  const recurringCount = jobsWithMeta.filter((j) => j.is_recurring).length;
  const inProgressCount = jobsWithMeta.filter((j) => j.isInProgress).length;
  const completedCount = jobsWithMeta.filter((j) => j.isCompleted).length;
  const upcomingJobs = jobsWithMeta.filter((j) => j.isUpcoming || (j.isOpen && !j.isOverdue));
  const overdueJobs = jobsWithMeta.filter((j) => j.isOverdue);

  const filteredJobs = jobsWithMeta.filter((j) => {
    const searchStr = `${j.title || ''} ${j.description || ''} ${j.asset_name || ''} ${j.provider || ''}`.toLowerCase();
    const matchesSearch = !search || searchStr.includes(search.toLowerCase());
    const matchesAsset = assetFilter === 'ALL' || String(j.asset_id) === assetFilter;
    const matchesType = typeFilter === 'ALL' || String(j.maintenance_type || '').toUpperCase() === typeFilter;

    let matchesTab = true;
    if (activeTab === 'UPCOMING') matchesTab = j.isUpcoming || (j.isOpen && !j.isOverdue);
    else if (activeTab === 'OVERDUE') matchesTab = j.isOverdue;
    else if (activeTab === 'RECURRING') matchesTab = !!j.is_recurring;

    let matchesStatus = true;
    if (statusFilter === 'RECURRING') matchesStatus = !!j.is_recurring;
    else if (statusFilter === 'IN_PROGRESS') matchesStatus = j.isInProgress;
    else if (statusFilter === 'SCHEDULED') matchesStatus = j.isOpen;
    else if (statusFilter === 'COMPLETED') matchesStatus = j.isCompleted;

    return matchesSearch && matchesAsset && matchesType && matchesTab && matchesStatus;
  });

  const maintenanceCreateOp = {
    schema: {
      type: 'object',
      required: ['title'],
      properties: {
        asset_id: { type: 'string', format: 'uuid', title: 'Target Equipment Asset' },
        title: { type: 'string', minLength: 1, maxLength: 200, title: 'Job Title / Scope' },
        description: { type: 'string', title: 'Description / Scope of Work' },
        is_recurring: { type: 'boolean', title: 'Maintenance Schedule / Recurrence', default: false },
        recurrence_interval_days: { type: 'number', title: 'Recurrence Interval (Days)', default: 30 },
        maintenance_type: {
          type: 'string',
          enum: ['PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'SERVICE', 'OTHER'],
          title: 'Maintenance Type',
          default: 'PREVENTIVE',
        },
        priority: {
          type: 'string',
          enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'],
          title: 'Priority',
          default: 'NORMAL',
        },
        scheduled_date: { type: 'string', format: 'date', title: 'Scheduled Date' },
        assigned_employee_id: { type: 'string', format: 'uuid', title: 'Assigned Technician' },
        provider: { type: 'string', title: 'Service Provider / Contractor' },
        cost: { type: 'number', title: 'Maintenance Cost ($)' },
      },
    },
    permissions: ['assets.update'],
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4">
        <div>
          <Link href="/workspace/assets" className="text-xs text-primary flex items-center gap-1 mb-2 hover:underline">
            <ArrowLeft size={12} /> Equipment Fleet
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Maintenance & Schedules Workspace</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track upcoming maintenance works, recurring preventive schedules, active work orders, and service overhauls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={reload} className="btn-secondary text-xs p-2.5" title="Refresh data">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {assets.length > 0 && (
            <button onClick={() => setAdding(true)} className="btn-primary text-xs flex items-center gap-1">
              <Plus size={14} /> Schedule Maintenance
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('UPCOMING')}
          className="card p-4 space-y-1.5 border-l-4 border-l-blue-500 cursor-pointer hover:border-blue-600 transition-all"
        >
          <span className="text-xs font-semibold text-muted-foreground block">Upcoming Works (30 Days)</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-blue-700">{loading ? '…' : upcomingJobs.length}</span>
            <Calendar size={18} className="text-blue-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Scheduled & preventive maintenance due</p>
        </div>

        <div
          onClick={() => setActiveTab('OVERDUE')}
          className="card p-4 space-y-1.5 border-l-4 border-l-rose-500 cursor-pointer hover:border-rose-600 transition-all"
        >
          <span className="text-xs font-semibold text-muted-foreground block">Overdue Maintenance</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-700">{loading ? '…' : overdueJobs.length}</span>
            <AlertCircle size={18} className="text-rose-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Passed target scheduled dates</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-muted-foreground block">In Progress Jobs</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-700">{loading ? '…' : inProgressCount}</span>
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Tasks currently undergoing service</p>
        </div>

        <div className="card p-4 space-y-1.5 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-muted-foreground block">Completed Maintenance</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-700">{loading ? '…' : completedCount}</span>
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <p className="text-[11px] text-muted-foreground">Successfully closed & verified tasks</p>
        </div>
      </div>

      {/* Upcoming Maintenance Spotlight Grid Section */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar size={16} className="text-blue-600" /> Upcoming Maintenance Works Timeline
            </h3>
            <p className="text-xs text-muted-foreground">
              Prioritized schedule of maintenance tasks due across the equipment fleet.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`text-xs px-3 py-1.5 rounded font-semibold transition-all ${
                activeTab === 'ALL' ? 'bg-primary text-primary-foreground' : 'btn-secondary'
              }`}
            >
              All Jobs ({totalJobs})
            </button>
            <button
              onClick={() => setActiveTab('UPCOMING')}
              className={`text-xs px-3 py-1.5 rounded font-semibold transition-all ${
                activeTab === 'UPCOMING' ? 'bg-blue-600 text-white' : 'btn-secondary'
              }`}
            >
              Upcoming ({upcomingJobs.length})
            </button>
            <button
              onClick={() => setActiveTab('OVERDUE')}
              className={`text-xs px-3 py-1.5 rounded font-semibold transition-all ${
                activeTab === 'OVERDUE' ? 'bg-rose-600 text-white' : 'btn-secondary'
              }`}
            >
              Overdue ({overdueJobs.length})
            </button>
            <button
              onClick={() => setActiveTab('RECURRING')}
              className={`text-xs px-3 py-1.5 rounded font-semibold transition-all ${
                activeTab === 'RECURRING' ? 'bg-indigo-600 text-white' : 'btn-secondary'
              }`}
            >
              Recurring ({recurringCount})
            </button>
          </div>
        </div>

        {/* Upcoming Grid */}
        {upcomingJobs.length > 0 && activeTab !== 'OVERDUE' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingJobs.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="bg-blue-50/60 border border-blue-200 p-3.5 rounded-lg space-y-2 hover:shadow-sm transition-all"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-bold text-xs text-foreground line-clamp-1">{item.title}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300 shrink-0">
                    {item.daysDiff === 0 ? 'Due Today' : `Due in ${item.daysDiff} days`}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-primary">{item.asset_name}</p>
                  <p>Provider: {item.provider || 'In-House Team'}</p>
                  {item.is_recurring && (
                    <span className="inline-block text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5">
                      🔄 Every {item.recurrence_interval_days || 30} days
                    </span>
                  )}
                </div>
                <div className="pt-1 flex justify-between items-center border-t border-blue-100 text-[11px]">
                  <span className="text-muted-foreground font-medium">Date: {item.scheduledDateStr || '—'}</span>
                  <button onClick={() => setSelectedJob(item)} className="btn-secondary py-0.5 px-2 text-[10px]">
                    Inspect Work
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by job title, scope or provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground shrink-0" />
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="input-field text-xs py-1.5 w-44 bg-background"
            >
              <option value="ALL">All Equipment Fleet</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.asset_number ? `${a.asset_number} — ` : ''}{a.name}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field text-xs py-1.5 w-40 bg-background"
            >
              <option value="ALL">All Types</option>
              <option value="PREVENTIVE">Preventive</option>
              <option value="CORRECTIVE">Corrective</option>
              <option value="SERVICE">Service</option>
              <option value="INSPECTION">Inspection</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-xs py-1.5 w-44 bg-background"
            >
              <option value="ALL">All Statuses</option>
              <option value="RECURRING">Recurring Schedules</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="SCHEDULED">Scheduled / Open</option>
              <option value="COMPLETED">Completed</option>
            </select>

            {(search || assetFilter !== 'ALL' || typeFilter !== 'ALL' || statusFilter !== 'ALL' || activeTab !== 'ALL') && (
              <button
                type="button"
                className="btn-secondary text-xs py-1.5 px-3"
                onClick={() => {
                  setSearch('');
                  setAssetFilter('ALL');
                  setTypeFilter('ALL');
                  setStatusFilter('ALL');
                  setActiveTab('ALL');
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <span className="text-xs text-muted-foreground font-semibold">
          Showing {filteredJobs.length} maintenance records
        </span>
      </div>

      {/* Main Table */}
      <div className="card p-5 overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading maintenance schedules database...</p>
        ) : filteredJobs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <Wrench size={32} className="mx-auto text-muted-foreground/40" />
            <p className="text-sm font-semibold">No maintenance tasks recorded matching filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-3">Job Title & Scope</th>
                  <th className="p-3">Equipment Asset</th>
                  <th className="p-3">Type & Priority</th>
                  <th className="p-3">Schedule Type</th>
                  <th className="p-3">Status & Urgency</th>
                  <th className="p-3">Scheduled Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredJobs.map((job) => {
                  const status = String(job.status || 'SCHEDULED').toUpperCase();
                  const priority = String(job.priority || 'NORMAL').toUpperCase();

                  return (
                    <tr
                      key={job.id || job.title}
                      className={`transition-colors ${
                        job.isOverdue
                          ? 'bg-rose-50/70 hover:bg-rose-100/50'
                          : job.isUpcoming
                          ? 'bg-blue-50/40 hover:bg-blue-100/40'
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      <td className="p-3">
                        <span className="font-bold text-foreground block">{job.title}</span>
                        {job.description && (
                          <span className="text-[11px] text-muted-foreground line-clamp-1">{job.description}</span>
                        )}
                      </td>

                      <td className="p-3">
                        <Link href={`/workspace/assets/${job.asset_id}`} className="font-semibold text-primary hover:underline block">
                          {job.asset_name}
                        </Link>
                        {job.asset_number && (
                          <span className="text-[11px] text-muted-foreground">Tag: {job.asset_number}</span>
                        )}
                      </td>

                      <td className="p-3">
                        <span className="block font-semibold text-foreground">{job.maintenance_type || 'SERVICE'}</span>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                            priority === 'CRITICAL' ? 'bg-rose-100 text-rose-800'
                              : priority === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {priority}
                        </span>
                      </td>

                      <td className="p-3">
                        {job.is_recurring ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-900 border border-indigo-200">
                            <Calendar size={10} /> Every {job.recurrence_interval_days || 30} days
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Scheduled Job</span>
                        )}
                      </td>

                      <td className="p-3">
                        {job.isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle size={10} /> Completed
                          </span>
                        ) : job.isInProgress ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock size={10} /> In Progress
                          </span>
                        ) : job.isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                            <AlertCircle size={10} /> Overdue ({Math.abs(job.daysDiff)} days)
                          </span>
                        ) : job.isUpcoming ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-900 border border-blue-200">
                            <Calendar size={10} /> Due in {job.daysDiff} days
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            {status}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-muted-foreground font-medium">
                        {job.scheduledDateStr || '—'}
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="btn-secondary py-1 px-2.5 text-[11px]"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {adding && (
        <Modal name="Schedule Maintenance Job" onClose={() => setAdding(false)}>
          <RecordForm
            operation={maintenanceCreateOp}
            path={assets[0] ? `/api/v1/assets/${assets[0].id}/maintenance` : ''}
            method="POST"
            onSuccess={() => {
              setAdding(false);
              reload();
            }}
          />
        </Modal>
      )}

      {/* Details Modal */}
      {selectedJob && (
        <Modal name={`Maintenance Details · ${selectedJob.title}`} onClose={() => setSelectedJob(null)}>
          <WorkCompletionDetails work={selectedJob} />
          <div className="space-y-4 text-xs">
            {selectedJob.isOverdue && (
              <div className="bg-rose-100 border border-rose-300 p-3 rounded text-rose-900 font-bold flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-700" />
                <span>This maintenance job is OVERDUE by {Math.abs(selectedJob.daysDiff)} days! Scheduled date was {selectedJob.scheduledDateStr}.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Job Title</span>
                <strong className="text-sm font-semibold">{selectedJob.title}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Equipment Asset</span>
                <strong className="text-sm font-semibold text-primary">{selectedJob.asset_name}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Maintenance Type</span>
                <strong className="text-sm font-semibold">{selectedJob.maintenance_type}</strong>
              </div>
              <div className="bg-muted/30 p-2.5 rounded">
                <span className="text-muted-foreground block">Scheduled Date</span>
                <strong className="text-sm font-semibold">{selectedJob.scheduledDateStr || '—'}</strong>
              </div>
            </div>

            {selectedJob.description && (
              <div className="bg-muted/30 p-3 rounded space-y-1">
                <span className="font-semibold text-muted-foreground block uppercase text-[10px]">Scope of Work</span>
                <p className="leading-relaxed">{selectedJob.description}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setSelectedJob(null)} className="btn-secondary text-xs">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
