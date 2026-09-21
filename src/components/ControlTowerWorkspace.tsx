'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, TrendingUp, Award, FileSpreadsheet, Eye, Plus, RefreshCw, 
  Search, ShieldCheck, DollarSign, Activity, CheckCircle2, AlertTriangle, Layers, UserCheck, Paperclip, Upload, Download, X, Pencil, Filter
} from 'lucide-react';
import { apiFetch, CeoControlTowerSummary, SupervisorScorecardRead, CommercialOpportunityRead, updateCommercialOpportunity } from '@/lib/api';
import { Modal, ErrorModal, SearchableProjectSelect, rows } from './DataUI';
import OperationsPerformanceCombinedChart from '@/app/components/OperationsPerformanceCombinedChart';

export default function ControlTowerWorkspace({ subResource }: { subResource?: string }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CeoControlTowerSummary | null>(null);
  const [scorecards, setScorecards] = useState<SupervisorScorecardRead[]>([]);
  const [opportunities, setOpportunities] = useState<CommercialOpportunityRead[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [version, setVersion] = useState(0);

  // Global Filter States
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [datePreset, setDatePreset] = useState<string>('all_time');
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<CeoControlTowerSummary>('/api/v1/control-tower/summary').catch(() => null),
      apiFetch<SupervisorScorecardRead[]>('/api/v1/control-tower/scorecards').catch(() => []),
      apiFetch<CommercialOpportunityRead[]>('/api/v1/control-tower/opportunities').catch(() => []),
      apiFetch<any>('/api/v1/employees?page_size=100').catch(() => ({ items: [] })),
      apiFetch<any>('/api/v1/projects?page_size=100').catch(() => ({ items: [] })),
      apiFetch<any>('/api/v1/clients?page_size=100').catch(() => ({ items: [] })),
    ]).then(([summaryRes, scRes, oppRes, empRes, projRes, clientRes]) => {
      if (!active) return;
      if (summaryRes) setSummary(summaryRes);
      setScorecards(rows(scRes) as SupervisorScorecardRead[]);
      setOpportunities(rows(oppRes) as CommercialOpportunityRead[]);
      setEmployees(rows(empRes));
      setProjects(rows(projRes));
      setClients(rows(clientRes));
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [version]);

  const [errorMessage, setErrorMessage] = useState('');

  // Date preset helper
  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const formatDate = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    switch (preset) {
      case 'last_30': {
        const past = new Date();
        past.setDate(now.getDate() - 30);
        setFilterDateFrom(formatDate(past));
        setFilterDateTo(formatDate(now));
        break;
      }
      case 'last_90': {
        const past = new Date();
        past.setDate(now.getDate() - 90);
        setFilterDateFrom(formatDate(past));
        setFilterDateTo(formatDate(now));
        break;
      }
      case 'this_month': {
        const first = new Date(year, month, 1);
        setFilterDateFrom(formatDate(first));
        setFilterDateTo(formatDate(now));
        break;
      }
      case 'ytd': {
        const first = new Date(year, 0, 1);
        setFilterDateFrom(formatDate(first));
        setFilterDateTo(formatDate(now));
        break;
      }
      case 'all_time':
      default:
        setFilterDateFrom('');
        setFilterDateTo('');
        break;
    }
  };

  const clearFilters = () => {
    setFilterProject('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setDatePreset('all_time');
  };

  // Derived filtered items & calculations
  const filteredProjectSummaries = (Array.isArray(summary?.project_summaries) ? summary.project_summaries : []).filter((p: any) => {
    if (filterProject && p.project_id !== filterProject && p.project_name !== filterProject) {
      return false;
    }
    return true;
  });

  const hasActiveProjectFilter = !!filterProject;
  const displayRevenue = hasActiveProjectFilter
    ? filteredProjectSummaries.reduce((sum: number, p: any) => sum + (p.revenue || 0), 0)
    : (summary?.total_revenue || 0);

  const displayDirectCost = hasActiveProjectFilter
    ? filteredProjectSummaries.reduce((sum: number, p: any) => sum + (p.direct_cost || 0), 0)
    : (summary?.total_direct_cost || 0);

  const displayNetContribution = hasActiveProjectFilter
    ? displayRevenue - displayDirectCost
    : (summary?.net_contribution || 0);

  const displayMarginPct = displayRevenue > 0
    ? (displayNetContribution / displayRevenue) * 100
    : (summary?.contribution_margin_pct || 0);

  const displayMetres = hasActiveProjectFilter
    ? filteredProjectSummaries.reduce((sum: number, p: any) => sum + (p.metres_drilled || 0), 0)
    : (summary?.total_metres_drilled || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Operations and Revenue
          </h1>
          <p className="text-sm text-muted-foreground">
            Operational oversight, field leadership scorecards, commercial tenders, and client governance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilterModal(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-medium transition-colors ${
              filterProject || filterDateFrom || filterDateTo
                ? 'bg-primary/10 border-primary text-primary font-semibold'
                : 'hover:bg-muted text-foreground'
            }`}
          >
            <Filter className="h-4 w-4 text-primary" />
            Filter
            {(filterProject || filterDateFrom || filterDateTo) && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px]">
                Active
              </span>
            )}
          </button>
          <button
            onClick={reload}
            className="flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-medium hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* EXECUTIVE OVERVIEW */}
      <div className="space-y-6">
        {/* Active Filter Chips Bar */}
        {(filterProject || filterDateFrom || filterDateTo) && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-card border rounded-xl shadow-xs">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mr-1">
              <Filter className="h-3.5 w-3.5 text-primary" /> Active Filters:
            </span>

            {filterProject && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                Project: {projects.find((p) => p.id === filterProject || p.name === filterProject)?.name || filterProject}
                <button
                  onClick={() => setFilterProject('')}
                  className="hover:text-rose-500 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {(filterDateFrom || filterDateTo) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                Date Range: {filterDateFrom || 'Start'} to {filterDateTo || 'Present'}
                <button
                  onClick={() => {
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setDatePreset('all_time');
                  }}
                  className="hover:text-rose-500 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-rose-600 font-semibold hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {summary ? (
          <>
            {/* Executive KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border bg-card space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>TOTAL REVENUE</span>
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold">
                  ${displayRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground font-medium">Net: ${displayNetContribution.toLocaleString()}</p>
              </div>

              <div className="p-4 rounded-xl border bg-card space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>CONTRIBUTION MARGIN</span>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold">
                  {displayMarginPct.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground font-medium">Direct cost: ${displayDirectCost.toLocaleString()}</p>
              </div>

              <div className="p-4 rounded-xl border bg-card space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>RIG AVAILABILITY & PRODUCTION</span>
                  <Activity className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold">
                  {summary.avg_asset_availability_pct?.toFixed(1) || '0.0'}%
                </div>
                <p className="text-xs text-muted-foreground font-medium">{displayMetres.toLocaleString()}m drilled across {summary.active_rigs || 0} rigs</p>
              </div>

              <div className="p-4 rounded-xl border bg-card space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>RELIABILITY & HSE</span>
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold">
                  {summary.open_hse_incidents || 0} Incidents
                </div>
                <p className="text-xs text-muted-foreground font-medium">{summary.active_work_orders || 0} active maintenance work orders</p>
              </div>
            </div>

            {/* Operations, Revenue & Cost Performance Over Time Chart */}
            <div className="border rounded-xl bg-card p-5 space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    Operations, Revenue & Cost Performance Over Time
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Single comparative line plot tracking drilling production (metres), auto-posted revenue ($), and direct operational costs ($)
                  </p>
                </div>
              </div>

              <OperationsPerformanceCombinedChart
                dateFrom={filterDateFrom}
                dateTo={filterDateTo}
                projectId={filterProject}
              />
            </div>

            {/* Project Summaries */}
            <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
              <div className="p-4 border-b font-semibold flex items-center justify-between">
                <span>Active Project Performance Summary</span>
                <span className="text-xs text-muted-foreground">{filteredProjectSummaries.length} active sites</span>
              </div>
              <div className="divide-y overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Project Name</th>
                      <th className="px-4 py-3">Revenue ($)</th>
                      <th className="px-4 py-3">Direct Cost ($)</th>
                      <th className="px-4 py-3">Contribution ($)</th>
                      <th className="px-4 py-3">Metres Drilled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredProjectSummaries.map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{p.project_name}</td>
                        <td className="px-4 py-3">${p.revenue?.toLocaleString() || '0'}</td>
                        <td className="px-4 py-3 text-rose-600">${p.direct_cost?.toLocaleString() || '0'}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-600">${p.contribution?.toLocaleString() || '0'}</td>
                        <td className="px-4 py-3">{p.metres_drilled?.toLocaleString() || '0'} m</td>
                      </tr>
                    ))}
                    {filteredProjectSummaries.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          No matching project performance summaries recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center border rounded-xl bg-card text-muted-foreground">
            {loading ? 'Loading Operations and Revenue metrics...' : 'Operations and Revenue data unavailable.'}
          </div>
        )}
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <Modal title="Filter Operations & Revenue Data" onClose={() => setShowFilterModal(false)}>
          <div className="space-y-5">
            {/* Project Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Target Project</label>
              <SearchableProjectSelect
                projects={projects}
                value={filterProject}
                onChange={setFilterProject}
                placeholder="All Projects & Sites"
              />
            </div>

            {/* Date Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Quick Date Presets</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { id: 'all_time', label: 'All Time' },
                  { id: 'last_30', label: 'Last 30D' },
                  { id: 'last_90', label: 'Last 90D' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'ytd', label: 'YTD' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applyDatePreset(item.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      datePreset === item.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/40 hover:bg-muted border-border'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">From Date</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => {
                    setFilterDateFrom(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full text-sm border rounded-lg p-2 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">To Date</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => {
                    setFilterDateTo(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full text-sm border rounded-lg p-2 bg-background"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-rose-600 font-semibold hover:underline"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90"
              >
                Apply & View Dashboard
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ErrorModal error={errorMessage} onClose={() => setErrorMessage('')} />
    </div>
  );
}

