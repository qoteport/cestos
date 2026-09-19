'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { 
  Building2, TrendingUp, Award, FileSpreadsheet, DollarSign, Activity, 
  Flame, CheckCircle2, AlertTriangle, UserCheck, ShieldCheck, Search, Filter, RefreshCw, Calendar, X
} from 'lucide-react';
import { apiFetch, CeoControlTowerSummary, SupervisorScorecardRead, CommercialOpportunityRead } from '@/lib/api';
import { rows } from '@/components/DataUI';
import OperationsPerformanceCombinedChart from '@/app/components/OperationsPerformanceCombinedChart';

export default function ControlTowerOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CeoControlTowerSummary | null>(null);
  const [scorecards, setScorecards] = useState<SupervisorScorecardRead[]>([]);
  const [opportunities, setOpportunities] = useState<CommercialOpportunityRead[]>([]);
  const [version, setVersion] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<CeoControlTowerSummary>('/api/v1/control-tower/summary').catch(() => null),
      apiFetch<SupervisorScorecardRead[]>('/api/v1/control-tower/scorecards').catch(() => []),
      apiFetch<CommercialOpportunityRead[]>('/api/v1/control-tower/opportunities').catch(() => []),
    ]).then(([sumRes, scRes, oppRes]) => {
      if (!active) return;
      if (sumRes) setSummary(sumRes);
      setScorecards(rows(scRes) as SupervisorScorecardRead[]);
      setOpportunities(rows(oppRes) as CommercialOpportunityRead[]);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [version]);

  const projects = Array.isArray(summary?.project_summaries) ? summary.project_summaries : [];
  const filteredProjects = projects.filter((p: any) => 
    !search || (p.project_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const applyPreset = (days: number | null) => {
    if (days === null) {
      setDateFrom('');
      setDateTo('');
      return;
    }
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setDateTo(end.toISOString().slice(0, 10));
    setDateFrom(start.toISOString().slice(0, 10));
  };

  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        {/* Header with Title and Date Range Filter */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Operations and Revenue
            </h1>
            <p className="text-sm text-muted-foreground">
              Global operational telemetry, contract profitability, field leadership performance, and commercial revenue
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Calendar Date Filter Pickers replacing Raw Data button */}
            <div className="flex items-center gap-2 bg-card border rounded-lg p-1.5 shadow-sm text-xs">
              <Calendar className="h-4 w-4 text-primary ml-1 shrink-0" />
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground font-medium">Start:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-background border rounded px-2 py-1 text-xs font-mono"
                />
              </div>
              <span className="text-muted-foreground font-medium">to</span>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground font-medium">End:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-background border rounded px-2 py-1 text-xs font-mono"
                />
              </div>

              {(dateFrom || dateTo) && (
                <button
                  onClick={() => applyPreset(null)}
                  className="p-1 text-muted-foreground hover:text-rose-500 transition"
                  title="Clear Date Filter"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => applyPreset(30)}
                className={`px-2.5 py-1.5 rounded text-xs font-medium border transition ${
                  dateFrom && dateTo ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'
                }`}
              >
                30D
              </button>
              <button
                onClick={() => applyPreset(90)}
                className="px-2.5 py-1.5 rounded text-xs font-medium border hover:bg-muted transition"
              >
                90D
              </button>
              <button
                onClick={() => applyPreset(null)}
                className="px-2.5 py-1.5 rounded text-xs font-medium border hover:bg-muted transition"
              >
                All
              </button>
            </div>

            <button
              onClick={reload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium hover:bg-muted"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border bg-card space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono">
              ${Number(summary?.total_revenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Direct Cost: ${Number(summary?.total_direct_cost || 0).toLocaleString()}
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Net Contribution</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              ${Number(summary?.net_contribution || 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                {Number(summary?.contribution_margin_pct || 0).toFixed(1)}% Margin
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Metres Drilled</span>
              <Flame className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono">
              {Number(summary?.total_metres_drilled || 0).toLocaleString()} m
            </div>
            <p className="text-xs text-muted-foreground">
              Active Rigs: <span className="font-semibold text-foreground">{summary?.active_rigs || 0}</span>
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Fleet Availability</span>
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-blue-600">
              {Number(summary?.avg_asset_availability_pct || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Work Orders: {summary?.active_work_orders || 0} | Incidents: {summary?.open_hse_incidents || 0}
            </p>
          </div>
        </div>

        {/* Project Profitability Table */}
        <div className="border rounded-xl bg-card p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Project Financial & Operational Performance
              </h2>
              <p className="text-xs text-muted-foreground">Real-time revenue, cost, metres drilled, and site availability breakdown by project</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg bg-background"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Project Name</th>
                  <th className="px-4 py-3">Metres Drilled</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Direct Cost</th>
                  <th className="px-4 py-3">Net Contribution</th>
                  <th className="px-4 py-3">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProjects.map((p: any, idx: number) => {
                  const margin = Number(p.contribution_margin_pct || 0);
                  return (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold">{p.project_name}</td>
                      <td className="px-4 py-3 font-mono">{Number(p.metres_drilled || 0).toLocaleString()} m</td>
                      <td className="px-4 py-3 font-mono font-medium">${Number(p.revenue || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">${Number(p.direct_cost || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600">${Number(p.net_contribution || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          margin >= 30 ? 'bg-emerald-500/10 text-emerald-600' :
                          margin >= 15 ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No project performance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Combined Trend Plot Graph directly under the Project Performance Table */}
        <div className="border rounded-xl bg-card p-5 space-y-3 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Operations, Revenue & Cost Performance Over Time
              </h2>
              <p className="text-xs text-muted-foreground">
                Single comparative line plot tracking drilling production (metres), auto-posted revenue ($), and direct operational costs ($)
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"/> Metres Drilled (m)
              </span>
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"/> Revenue ($)
              </span>
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"/> Direct Cost ($)
              </span>
            </div>
          </div>

          <OperationsPerformanceCombinedChart dateFrom={dateFrom} dateTo={dateTo} />
        </div>

        {/* Bottom Section: Scorecards & Tender Pipeline */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Field Leadership Operations Overview */}
          <div className="border rounded-xl bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Field Leadership Operational Ratings
              </h2>
              <button
                onClick={() => router.push('/field-leadership-overview')}
                className="text-xs text-primary font-medium hover:underline"
              >
                View Field Leadership Overview →
              </button>
            </div>

            <div className="space-y-3">
              {(Array.isArray(scorecards) ? scorecards : []).slice(0, 4).map((sc) => (
                <div key={sc.id} className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm block">{sc.scorecard_number}</span>
                    <span className="text-xs text-muted-foreground">Period: {sc.period_start} to {sc.period_end}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-bold">{sc.overall_weighted_score} pts</span>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                      sc.grade === 'A' ? 'bg-emerald-500 text-white' :
                      sc.grade === 'B' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      Grade {sc.grade}
                    </span>
                  </div>
                </div>
              ))}
              {scorecards.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No scorecards found.</p>
              )}
            </div>
          </div>

          {/* Tender Pipeline Overview */}
          <div className="border rounded-xl bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Commercial Tender Pipeline
              </h2>
              <button
                onClick={() => router.push('/tenders-overview')}
                className="text-xs text-primary font-medium hover:underline"
              >
                View Tender Pipeline Overview →
              </button>
            </div>

            <div className="space-y-3">
              {(Array.isArray(opportunities) ? opportunities : []).slice(0, 4).map((opp) => (
                <div key={opp.id} className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm block">{opp.title}</span>
                    <span className="text-xs text-muted-foreground">Stage: {opp.tender_stage} | Prob: {opp.win_probability_pct}%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-bold text-emerald-600 block">
                      ${Number(opp.estimated_value || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase">{opp.currency}</span>
                  </div>
                </div>
              ))}
              {opportunities.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No active tender opportunities.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
