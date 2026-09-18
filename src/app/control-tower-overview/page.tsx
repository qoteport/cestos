'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { 
  Building2, TrendingUp, Award, FileSpreadsheet, DollarSign, Activity, 
  Flame, CheckCircle2, AlertTriangle, Layers, UserCheck, ShieldCheck, Search, Filter, RefreshCw
} from 'lucide-react';
import { apiFetch, CeoControlTowerSummary, SupervisorScorecardRead, CommercialOpportunityRead } from '@/lib/api';
import { rows } from '@/components/DataUI';

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

  const filteredOpps = (Array.isArray(opportunities) ? opportunities : []).filter((o) =>
    !stageFilter || o.tender_stage === stageFilter
  );

  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Operations Command Center
            </h1>
            <p className="text-sm text-muted-foreground">
              Global operational telemetry, contract profitability, field leadership performance, and tender pipeline
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reload}
              className="flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-medium hover:bg-muted"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => router.push('/workspace/control-tower/summary')}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90"
            >
              <Layers className="h-4 w-4" />
              Raw Data & Scorecards
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
                onClick={() => router.push('/workspace/control-tower/scorecards')}
                className="text-xs text-primary font-medium hover:underline"
              >
                View All Scorecards →
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
                      Rating {sc.grade}
                    </span>
                  </div>
                </div>
              ))}
              {scorecards.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No field leadership scorecards filed yet.</p>
              )}
            </div>
          </div>

          {/* Tender & Commercial Opportunities */}
          <div className="border rounded-xl bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                Tender Pipeline & Opportunities
              </h2>
              <button
                onClick={() => router.push('/workspace/control-tower/opportunities')}
                className="text-xs text-primary font-medium hover:underline"
              >
                Manage Pipeline →
              </button>
            </div>

            <div className="space-y-3">
              {filteredOpps.slice(0, 4).map((opp) => (
                <div key={opp.id} className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm block">{opp.title}</span>
                    <span className="text-xs text-muted-foreground">Tender Stage: {opp.tender_stage}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm block">${Number(opp.estimated_value).toLocaleString()} {opp.currency}</span>
                    <span className="text-xs font-medium text-emerald-600">{opp.win_probability_pct}% Win Prob</span>
                  </div>
                </div>
              ))}
              {opportunities.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No active tender opportunities recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
