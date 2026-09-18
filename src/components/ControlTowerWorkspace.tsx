'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, TrendingUp, Award, FileSpreadsheet, Eye, Plus, RefreshCw, 
  Search, ShieldCheck, DollarSign, Activity, CheckCircle2, AlertTriangle, Layers, UserCheck
} from 'lucide-react';
import { apiFetch, CeoControlTowerSummary, SupervisorScorecardRead, CommercialOpportunityRead } from '@/lib/api';
import { Modal, rows } from './DataUI';

export default function ControlTowerWorkspace() {
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'SCORECARDS' | 'OPPORTUNITIES' | 'CLIENT_PORTAL'>('SUMMARY');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CeoControlTowerSummary | null>(null);
  const [scorecards, setScorecards] = useState<SupervisorScorecardRead[]>([]);
  const [opportunities, setOpportunities] = useState<CommercialOpportunityRead[]>([]);
  const [version, setVersion] = useState(0);

  // New Scorecard Form State
  const [showAddScorecard, setShowAddScorecard] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [newScorecard, setNewScorecard] = useState({
    supervisor_id: '',
    project_id: '',
    period_start: new Date().toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10),
    production_score: 20,
    rig_condition_score: 16,
    downtime_score: 12,
    hse_score: 15,
    consumables_score: 8,
    crew_management_score: 4,
    reporting_score: 4,
    stewardship_score: 4,
    notes: '',
  });

  // New Opportunity Form State
  const [showAddOpp, setShowAddOpp] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [newOpp, setNewOpp] = useState({
    client_id: '',
    title: '',
    tender_stage: 'PROPOSAL_SENT',
    win_probability_pct: 70,
    estimated_value: 250000,
    currency: 'USD',
    expected_close_date: '',
    notes: '',
  });

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

  const handleCreateScorecard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/control-tower/scorecards', {
        method: 'POST',
        body: JSON.stringify(newScorecard),
      });
      setShowAddScorecard(false);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to create scorecard');
    }
  };

  const handleCreateOpp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/control-tower/opportunities', {
        method: 'POST',
        body: JSON.stringify(newOpp),
      });
      setShowAddOpp(false);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to create opportunity');
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'B': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'C': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'D': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default: return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            CEO Control Tower & Scorecards
          </h1>
          <p className="text-sm text-muted-foreground">
            Executive oversight, 8-pillar supervisor scorecards, commercial tenders, and client governance
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
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b space-x-4">
        <button
          onClick={() => setActiveTab('SUMMARY')}
          className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'SUMMARY'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Executive Overview
        </button>
        <button
          onClick={() => setActiveTab('SCORECARDS')}
          className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'SCORECARDS'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Award className="h-4 w-4" />
          Supervisor Scorecards ({scorecards.length})
        </button>
        <button
          onClick={() => setActiveTab('OPPORTUNITIES')}
          className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'OPPORTUNITIES'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Tender Pipeline ({opportunities.length})
        </button>
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'SUMMARY' && (
        <div className="space-y-6">
          {summary ? (
            <>
              {/* Executive KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border bg-card space-y-1 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>TOTAL REVENUE</span>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold">
                    ${summary.total_revenue?.toLocaleString() || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">Net: ${summary.net_contribution?.toLocaleString() || '0'}</p>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-1 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>CONTRIBUTION MARGIN</span>
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold">
                    {summary.contribution_margin_pct?.toFixed(1) || '0.0'}%
                  </div>
                  <p className="text-xs text-muted-foreground">Direct cost: ${summary.total_direct_cost?.toLocaleString() || '0'}</p>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-1 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>RIG AVAILABILITY & PRODUCTION</span>
                    <Activity className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-bold">
                    {summary.avg_asset_availability_pct?.toFixed(1) || '0.0'}%
                  </div>
                  <p className="text-xs text-muted-foreground">{summary.total_metres_drilled?.toLocaleString() || 0}m drilled across {summary.active_rigs || 0} rigs</p>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-1 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>RELIABILITY & HSE</span>
                    <ShieldCheck className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold">
                    {summary.open_hse_incidents || 0} Incidents
                  </div>
                  <p className="text-xs text-muted-foreground">{summary.active_work_orders || 0} active maintenance work orders</p>
                </div>
              </div>

              {/* Project Summaries */}
              <div className="border rounded-xl bg-card overflow-hidden">
                <div className="p-4 border-b font-semibold flex items-center justify-between">
                  <span>Active Project Performance Summary</span>
                  <span className="text-xs text-muted-foreground">{summary.project_summaries?.length || 0} active sites</span>
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
                      {(summary.project_summaries || []).map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{p.project_name}</td>
                          <td className="px-4 py-3">${p.revenue?.toLocaleString() || '0'}</td>
                          <td className="px-4 py-3 text-rose-600">${p.direct_cost?.toLocaleString() || '0'}</td>
                          <td className="px-4 py-3 font-semibold text-emerald-600">${p.contribution?.toLocaleString() || '0'}</td>
                          <td className="px-4 py-3">{p.metres_drilled?.toLocaleString() || '0'} m</td>
                        </tr>
                      ))}
                      {(!summary.project_summaries || summary.project_summaries.length === 0) && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                            No project summaries recorded yet. Shift reports auto-post financial entries.
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
              {loading ? 'Loading Control Tower metrics...' : 'Control Tower data unavailable.'}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUPERVISOR SCORECARDS */}
      {activeTab === 'SCORECARDS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">8-Pillar Weighted Supervisor Scorecards</h2>
            <button
              onClick={() => setShowAddScorecard(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Scorecard
            </button>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Scorecard #</th>
                  <th className="px-4 py-3">Supervisor</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Sub-Scores (Prod/Rig/HSE/etc)</th>
                  <th className="px-4 py-3">Overall Weighted</th>
                  <th className="px-4 py-3">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {scorecards.map((sc) => (
                  <tr key={sc.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-medium text-xs">{sc.scorecard_number}</td>
                    <td className="px-4 py-3 font-medium">{sc.supervisor_id}</td>
                    <td className="px-4 py-3 text-xs">{sc.period_start} to {sc.period_end}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      P:{sc.production_score} | R:{sc.rig_condition_score} | H:{sc.hse_score} | D:{sc.downtime_score}
                    </td>
                    <td className="px-4 py-3 font-bold">{Number(sc.overall_weighted_score).toFixed(1)} / 100</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded border text-xs font-bold ${getGradeColor(sc.grade)}`}>
                        Grade {sc.grade}
                      </span>
                    </td>
                  </tr>
                ))}
                {scorecards.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No supervisor scorecards recorded yet. Click "New Scorecard" to evaluate rig supervisors.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TENDER PIPELINE */}
      {activeTab === 'OPPORTUNITIES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Commercial Tenders & Opportunities</h2>
            <button
              onClick={() => setShowAddOpp(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Opportunity
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunities.map((opp) => (
              <div key={opp.id} className="p-4 rounded-xl border bg-card space-y-3 shadow-sm hover:border-primary/50 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-muted-foreground">{opp.opportunity_number}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    {opp.tender_stage}
                  </span>
                </div>
                <h3 className="font-semibold text-base leading-snug">{opp.title}</h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Value:</span>
                  <span className="font-bold">${Number(opp.estimated_value).toLocaleString()} {opp.currency}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Win Probability:</span>
                  <span className="font-semibold text-emerald-600">{opp.win_probability_pct}%</span>
                </div>
                {opp.expected_close_date && (
                  <p className="text-xs text-muted-foreground">Expected Close: {opp.expected_close_date}</p>
                )}
              </div>
            ))}
            {opportunities.length === 0 && (
              <div className="col-span-full p-8 text-center border rounded-xl bg-card text-muted-foreground">
                No active tenders or commercial opportunities.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE SCORECARD MODAL */}
      {showAddScorecard && (
        <Modal title="Create 8-Pillar Supervisor Scorecard" onClose={() => setShowAddScorecard(false)}>
          <form onSubmit={handleCreateScorecard} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Supervisor</label>
                <select
                  required
                  value={newScorecard.supervisor_id}
                  onChange={(e) => setNewScorecard({ ...newScorecard, supervisor_id: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="">Select Supervisor...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.job_title || 'Supervisor'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Project</label>
                <select
                  value={newScorecard.project_id}
                  onChange={(e) => setNewScorecard({ ...newScorecard, project_id: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="">Select Project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Period Start</label>
                <input
                  type="date"
                  required
                  value={newScorecard.period_start}
                  onChange={(e) => setNewScorecard({ ...newScorecard, period_start: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Period End</label>
                <input
                  type="date"
                  required
                  value={newScorecard.period_end}
                  onChange={(e) => setNewScorecard({ ...newScorecard, period_end: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>
            </div>

            {/* Sub-scores */}
            <div className="space-y-2 border-t pt-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground">8 Sub-Scores (Max Ceilings 25, 20, 15, 15, 10, 5, 5, 5)</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label>Production (0 - 25): {newScorecard.production_score}</label>
                  <input
                    type="range" min="0" max="25" step="0.5"
                    value={newScorecard.production_score}
                    onChange={(e) => setNewScorecard({ ...newScorecard, production_score: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label>Rig Condition (0 - 20): {newScorecard.rig_condition_score}</label>
                  <input
                    type="range" min="0" max="20" step="0.5"
                    value={newScorecard.rig_condition_score}
                    onChange={(e) => setNewScorecard({ ...newScorecard, rig_condition_score: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label>Downtime (0 - 15): {newScorecard.downtime_score}</label>
                  <input
                    type="range" min="0" max="15" step="0.5"
                    value={newScorecard.downtime_score}
                    onChange={(e) => setNewScorecard({ ...newScorecard, downtime_score: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label>HSE (0 - 15): {newScorecard.hse_score}</label>
                  <input
                    type="range" min="0" max="15" step="0.5"
                    value={newScorecard.hse_score}
                    onChange={(e) => setNewScorecard({ ...newScorecard, hse_score: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label>Consumables (0 - 10): {newScorecard.consumables_score}</label>
                  <input
                    type="range" min="0" max="10" step="0.5"
                    value={newScorecard.consumables_score}
                    onChange={(e) => setNewScorecard({ ...newScorecard, consumables_score: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label>Crew Mgmt (0 - 5): {newScorecard.crew_management_score}</label>
                  <input
                    type="range" min="0" max="5" step="0.5"
                    value={newScorecard.crew_management_score}
                    onChange={(e) => setNewScorecard({ ...newScorecard, crew_management_score: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label>Reporting (0 - 5): {newScorecard.reporting_score}</label>
                  <input
                    type="range" min="0" max="5" step="0.5"
                    value={newScorecard.reporting_score}
                    onChange={(e) => setNewScorecard({ ...newScorecard, reporting_score: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label>Stewardship (0 - 5): {newScorecard.stewardship_score}</label>
                  <input
                    type="range" min="0" max="5" step="0.5"
                    value={newScorecard.stewardship_score}
                    onChange={(e) => setNewScorecard({ ...newScorecard, stewardship_score: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddScorecard(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Save Scorecard
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE OPPORTUNITY MODAL */}
      {showAddOpp && (
        <Modal title="Create Commercial Opportunity (Tender)" onClose={() => setShowAddOpp(false)}>
          <form onSubmit={handleCreateOpp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Client</label>
              <select
                required
                value={newOpp.client_id}
                onChange={(e) => setNewOpp({ ...newOpp, client_id: e.target.value })}
                className="w-full text-sm border rounded p-2 bg-background"
              >
                <option value="">Select Client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Tender Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Deepwater RC Drilling 2026"
                value={newOpp.title}
                onChange={(e) => setNewOpp({ ...newOpp, title: e.target.value })}
                className="w-full text-sm border rounded p-2 bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Stage</label>
                <select
                  value={newOpp.tender_stage}
                  onChange={(e) => setNewOpp({ ...newOpp, tender_stage: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="PROSPECT">PROSPECT</option>
                  <option value="QUALIFIED">QUALIFIED</option>
                  <option value="PROPOSAL_SENT">PROPOSAL_SENT</option>
                  <option value="NEGOTIATION">NEGOTIATION</option>
                  <option value="WON">WON</option>
                  <option value="LOST">LOST</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Estimated Value ($)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newOpp.estimated_value}
                  onChange={(e) => setNewOpp({ ...newOpp, estimated_value: Number(e.target.value) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddOpp(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Save Opportunity
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
