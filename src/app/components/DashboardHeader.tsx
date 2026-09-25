'use client';

import React, { useEffect, useState } from 'react';
import { Filter, RefreshCw, SlidersHorizontal, X } from 'lucide-react';
import { getProjects, getDateRangeFromPreset, type ProjectRead } from '@/lib/api';
import { Modal } from '@/components/DataUI';
import { useAuth } from '@/components/AuthProvider';
import SearchableSelect from '@/components/SearchableSelect';
import AppDateTimePicker from '@/components/ui/AppDateTimePicker';

interface DashboardHeaderProps {
  timeframe: string;
  setTimeframe: (t: string) => void;
  dateFrom: string;
  setDateFrom: (d: string) => void;
  dateTo: string;
  setDateTo: (d: string) => void;
  projectId: string;
  setProjectId: (id: string) => void;
  status: string;
  setStatus: (s: string) => void;
  onRefresh?: () => void;
}

export default function DashboardHeader({
  timeframe,
  setTimeframe,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  projectId,
  setProjectId,
  status,
  setStatus,
  onRefresh,
}: DashboardHeaderProps) {
  const auth = useAuth();
  const user = auth?.user;
  const personName = user
    ? ([user.first_name, user.last_name].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'User')
    : '';

  const currentHour = new Date().getHours();
  const greetingTime = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingName = personName || 'User';

  const [projects, setProjects] = useState<ProjectRead[]>([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Modal draft state
  const [draftTimeframe, setDraftTimeframe] = useState(timeframe);
  const [draftDateFrom, setDraftDateFrom] = useState(dateFrom);
  const [draftDateTo, setDraftDateTo] = useState(dateTo);
  const [draftProjectId, setDraftProjectId] = useState(projectId);
  const [draftStatus, setDraftStatus] = useState(status);

  useEffect(() => {
    getProjects({ page_size: '50' })
      .then((res) => setProjects(res?.items ?? []))
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    setDraftTimeframe(timeframe);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setDraftProjectId(projectId);
    setDraftStatus(status);
  }, [timeframe, dateFrom, dateTo, projectId, status]);

  const activeFilterCount =
    (projectId ? 1 : 0) +
    (status ? 1 : 0) +
    (timeframe !== 'all_time' ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);
  const hasActiveFilter = activeFilterCount > 0;

  const handleTimeframeChange = (val: string) => {
    setDraftTimeframe(val);
    if (val !== 'custom') {
      const range = getDateRangeFromPreset(val);
      setDraftDateFrom(range.dateFrom);
      setDraftDateTo(range.dateTo);
    }
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeframe(draftTimeframe);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setProjectId(draftProjectId);
    setStatus(draftStatus);
    setFilterModalOpen(false);
  };

  const selectedProjectName = projects.find((p) => p.id === projectId)?.name;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-600 mb-1">
            Operations Dashboard
          </p>
          <h1 className="text-2xl font-700 text-foreground" style={{ letterSpacing: '-0.01em' }}>
            {greetingTime}, {greetingName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cestos Operations — operational summary, delivery performance, and real-time alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterModalOpen(true)}
            className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90 transition flex items-center gap-1.5 shadow-sm"
          >
            <SlidersHorizontal size={14} />
            Filter Data
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-primary font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button className="btn-secondary text-xs" onClick={onRefresh} aria-label="Refresh dashboard">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Active DB Filters Bar */}
      <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-600">
          <Filter size={14} className="text-primary" />
          <span>Active Database Query Filters:</span>
          {hasActiveFilter ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {timeframe !== 'all_time' && (
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium border border-primary/20">
                  Timeframe: {timeframe.replace('_', ' ').toUpperCase()}
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
              {projectId && (
                <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[11px] font-medium border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                  Project: {selectedProjectName || projectId.substring(0, 8)}
                </span>
              )}
              {status && (
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-medium border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                  Status: {status}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground font-normal italic">
              Showing default organization records across all active projects.
            </span>
          )}
        </div>

        {hasActiveFilter && (
          <button
            className="text-xs text-rose-600 font-semibold hover:underline flex items-center gap-1"
            onClick={() => {
              setTimeframe('all_time');
              setDateFrom('');
              setDateTo('');
              setProjectId('');
              setStatus('');
            }}
          >
            <X size={12} /> Clear DB Filters
          </button>
        )}
      </div>

      {/* FILTER POPUP MODAL */}
      {filterModalOpen && (
        <Modal name="Filter Executive Dashboard Database Data" onClose={() => setFilterModalOpen(false)}>
          <form onSubmit={handleApplyFilters} className="space-y-4 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg border text-muted-foreground">
              <p className="font-semibold text-foreground text-xs">Database Level Filtering</p>
              <p className="text-[11px] mt-0.5">
                Configuring these parameters triggers direct database queries for project KPIs, equipment fleet status, workforce metrics, and inventory statistics.
              </p>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Timeframe Preset</label>
              <SearchableSelect
                options={[
                  { value: 'all_time', label: 'All Time' },
                  { value: 'today', label: 'Today' },
                  { value: 'this_week', label: 'This Week' },
                  { value: 'this_month', label: 'This Month' },
                  { value: 'this_quarter', label: 'This Quarter' },
                  { value: 'ytd', label: 'Year to Date (YTD)' },
                  { value: 'custom', label: 'Custom Date Range' },
                ]}
                value={draftTimeframe}
                onChange={handleTimeframeChange}
                searchable={false}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-foreground">Start Date (Date From)</label>
                <AppDateTimePicker
                  mode="date"
                  value={draftDateFrom}
                  onChange={(val) => {
                    setDraftDateFrom(val);
                    setDraftTimeframe('custom');
                  }}
                  placeholder="Select start date"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-foreground">End Date (Date To)</label>
                <AppDateTimePicker
                  mode="date"
                  value={draftDateTo}
                  onChange={(val) => {
                    setDraftDateTo(val);
                    setDraftTimeframe('custom');
                  }}
                  placeholder="Select end date"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Target Operational Project</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'All Projects & Work Sites' },
                  ...projects.map((p) => ({
                    value: p.id,
                    label: p.project_number ? `${p.project_number} - ${p.name}` : p.name,
                  })),
                ]}
                value={draftProjectId}
                onChange={setDraftProjectId}
                searchable={true}
                placeholder="Select project..."
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-foreground">Project Operational Status</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'All Operational Statuses' },
                  { value: 'ACTIVE', label: 'Active Deployment' },
                  { value: 'MOBILIZING', label: 'Mobilizing / Site Prep' },
                  { value: 'PLANNING', label: 'Planning Phase' },
                  { value: 'PAUSED', label: 'Paused / Standby' },
                  { value: 'COMPLETED', label: 'Completed' },
                ]}
                value={draftStatus}
                onChange={setDraftStatus}
                searchable={false}
              />
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
    </div>
  );
}