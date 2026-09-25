'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { 
  Award, TrendingUp, Users, Plus, RefreshCw, Search, 
  Eye, CheckCircle2, ShieldCheck, Layers, Calendar, ChevronDown, UserCheck 
} from 'lucide-react';
import { apiFetch, SupervisorScorecardRead } from '@/lib/api';
import { Modal, ErrorModal, rows } from '@/components/DataUI';
import SearchableSelect from '@/components/SearchableSelect';
import AppDateTimePicker from '@/components/ui/AppDateTimePicker';

export default function FieldLeadershipOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [scorecards, setScorecards] = useState<SupervisorScorecardRead[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [version, setVersion] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  // Selected scorecard & Form modal
  const [selectedScorecard, setSelectedScorecard] = useState<SupervisorScorecardRead | null>(null);
  const [showAddScorecard, setShowAddScorecard] = useState(false);

  // Form states
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [newScorecard, setNewScorecard] = useState({
    supervisor_id: '',
    project_id: '',
    period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10),
    production_score: 22,
    rig_condition_score: 18,
    downtime_score: 13,
    hse_score: 14,
    consumables_score: 8,
    crew_management_score: 4,
    reporting_score: 4,
    stewardship_score: 4,
    notes: 'Comprehensive site operational audit. Excellent rig availability and safety compliance.',
  });

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<SupervisorScorecardRead[]>('/api/v1/control-tower/scorecards').catch(() => []),
      apiFetch<any>('/api/v1/employees?page_size=100').catch(() => ({ items: [] })),
      apiFetch<any>('/api/v1/projects?page_size=100').catch(() => ({ items: [] })),
    ]).then(([scRes, empRes, projRes]) => {
      if (!active) return;
      setScorecards(rows(scRes) as SupervisorScorecardRead[]);
      setEmployees(rows(empRes));
      setProjects(rows(projRes));
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [version]);

  const getSupervisorName = (sc: SupervisorScorecardRead) => {
    if (sc.supervisor_name) return sc.supervisor_name;
    const supObj = sc.supervisor || (sc as any).supervisor;
    if (supObj?.first_name || supObj?.last_name) {
      return `${supObj.first_name || ''} ${supObj.last_name || ''}`.trim();
    }
    if (supObj?.full_name) return supObj.full_name;
    const emp = (Array.isArray(employees) ? employees : []).find((e) => e.id === sc.supervisor_id);
    if (emp) {
      const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
      if (name) return name;
      if (emp.job_title) return `${emp.job_title} (${sc.supervisor_id.slice(0, 6)})`;
    }
    return sc.supervisor_id ? `Supervisor (${sc.supervisor_id.slice(0, 8)})` : 'Supervisor';
  };

  const [errorMessage, setErrorMessage] = useState('');

  const handleCreateScorecard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScorecard.supervisor_id) {
      setErrorMessage('Please select a supervisor');
      return;
    }
    try {
      await apiFetch('/api/v1/control-tower/scorecards', {
        method: 'POST',
        body: JSON.stringify(newScorecard),
      });
      setShowAddScorecard(false);
      reload();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create scorecard');
    }
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'A':
      case 'B': return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
      case 'C':
      case 'D': return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
      default: return 'bg-rose-500/10 text-rose-700 border-rose-500/20';
    }
  };

  // Metrics
  const totalSc = scorecards.length;
  const avgScore = totalSc > 0 ? (scorecards.reduce((acc, s) => acc + (Number(s.overall_weighted_score) || 0), 0) / totalSc) : 0;
  const gradeACount = scorecards.filter((s) => s.grade === 'A').length;
  const uniqueSupervisors = new Set(scorecards.map((s) => s.supervisor_id)).size;

  const filteredScorecards = scorecards.filter((sc) => {
    const term = search.toLowerCase();
    const supName = getSupervisorName(sc).toLowerCase();
    const matchesSearch = !term || supName.includes(term) || (sc.scorecard_number || '').toLowerCase().includes(term) || (sc.notes || '').toLowerCase().includes(term);
    const matchesGrade = !gradeFilter || sc.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  const filteredSupervisorsForForm = (Array.isArray(employees) ? employees : []).filter((e) => {
    if (!supervisorSearch.trim()) return true;
    const q = supervisorSearch.toLowerCase();
    const fullName = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (e.job_title || '').toLowerCase().includes(q) ||
      (e.department_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" />
              Site Operations Leadership & Field Performance Scorecards
            </h1>
            <p className="text-sm text-muted-foreground">
              8-pillar operational scorecards evaluating field supervisors across production, rig condition, HSE safety, downtime, and stewardship
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
              onClick={() => setShowAddScorecard(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Scorecard
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border bg-card space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">TOTAL SCORECARDS AUDITED</span>
            <div className="text-2xl font-bold text-foreground">{totalSc}</div>
            <span className="text-xs text-muted-foreground">Field leadership performance audits</span>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AVERAGE WEIGHTED SCORE</span>
            <div className="text-2xl font-bold text-foreground">{avgScore.toFixed(1)}%</div>
            <span className="text-xs text-muted-foreground">Across all 8 operational pillars</span>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">GRADE A EXCELLENCE</span>
            <div className="text-2xl font-bold text-foreground">{gradeACount} scorecards</div>
            <span className="text-xs text-muted-foreground">Top-tier field leadership ratings</span>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SUPERVISORS EVALUATED</span>
            <div className="text-2xl font-bold text-foreground">{uniqueSupervisors}</div>
            <span className="text-xs text-muted-foreground">Active site supervisors & rig leaders</span>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search scorecards by supervisor name or scorecard #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm border rounded-lg pl-9 pr-3 py-1.5 bg-background"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="min-w-[180px]">
              <SearchableSelect
                value={gradeFilter}
                onChange={setGradeFilter}
                options={[
                  { value: '', label: 'All Performance Grades' },
                  { value: 'A', label: 'Grade A (90%+)' },
                  { value: 'B', label: 'Grade B (80%-89%)' },
                  { value: 'C', label: 'Grade C (70%-79%)' },
                  { value: 'D', label: 'Grade D (60%-69%)' },
                  { value: 'F', label: 'Grade F (<60%)' },
                ]}
                searchable={false}
              />
            </div>

            <button
              onClick={() => router.push('/workspace/control-tower/scorecards')}
              className="flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs font-semibold hover:bg-muted"
            >
              <Layers className="h-3.5 w-3.5" /> Raw Data Table
            </button>
          </div>
        </div>

        {/* Scorecards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScorecards.map((sc) => {
            const supName = getSupervisorName(sc);
            const projName = projects.find((p) => p.id === sc.project_id)?.name || 'All Sites';
            return (
              <div
                key={sc.id}
                className="p-4 rounded-xl border bg-card space-y-3 shadow-sm hover:border-primary/50 transition flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-muted-foreground">{sc.scorecard_number}</span>
                    <span className={`px-2 py-0.5 rounded text-xs border font-extrabold ${getGradeBadge(sc.grade)}`}>
                      Grade {sc.grade} ({Number(sc.overall_weighted_score).toFixed(1)}%)
                    </span>
                  </div>

                  <h3 className="font-bold text-base leading-snug flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary shrink-0" />
                    {supName}
                  </h3>

                  <p className="text-xs text-muted-foreground">Assigned Site: <strong className="text-foreground">{projName}</strong></p>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>Period: {sc.period_start} to {sc.period_end}</span>
                  </div>

                  {/* Subscores pill summary */}
                  <div className="grid grid-cols-4 gap-1 text-[10px] font-semibold text-center pt-2">
                    <div className="bg-muted text-muted-foreground border border-border/50 p-1 rounded">Prod: {sc.production_score}/25</div>
                    <div className="bg-muted text-muted-foreground border border-border/50 p-1 rounded">Rig: {sc.rig_condition_score}/20</div>
                    <div className="bg-muted text-muted-foreground border border-border/50 p-1 rounded">Down: {sc.downtime_score}/15</div>
                    <div className="bg-muted text-muted-foreground border border-border/50 p-1 rounded">HSE: {sc.hse_score}/15</div>
                  </div>
                </div>

                <div className="border-t pt-3 flex justify-end">
                  <button
                    onClick={() => setSelectedScorecard(sc)}
                    className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" /> View Scorecard
                  </button>
                </div>
              </div>
            );
          })}

          {filteredScorecards.length === 0 && (
            <div className="col-span-full p-8 text-center border rounded-xl bg-card text-muted-foreground">
              No field leadership scorecards match the specified criteria. Click "New Supervisor Scorecard" to audit a field leader.
            </div>
          )}
        </div>
      </div>

      {/* VIEW SCORECARD DETAILS MODAL */}
      {selectedScorecard && (
        <Modal title={`Field Leadership Scorecard: ${selectedScorecard.scorecard_number}`} onClose={() => setSelectedScorecard(null)}>
          <div className="space-y-6 text-sm">
            {/* Header Info */}
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-xs text-muted-foreground block">Supervisor</span>
                <span className="font-bold text-lg text-foreground flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  {getSupervisorName(selectedScorecard)}
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  Audit Period: {selectedScorecard.period_start} to {selectedScorecard.period_end}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted-foreground block">Overall Rating</span>
                <div className={`px-3 py-1 rounded text-sm font-extrabold border inline-block mt-0.5 ${getGradeBadge(selectedScorecard.grade)}`}>
                  Grade {selectedScorecard.grade} ({Number(selectedScorecard.overall_weighted_score).toFixed(1)}%)
                </div>
              </div>
            </div>

            {/* 8-Pillar Breakdown */}
            <div>
              <h3 className="font-bold text-sm mb-3">8 Operational Pillars Performance Breakdown</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">Pillar Category</th>
                      <th className="p-2.5">Max Weight</th>
                      <th className="p-2.5">Score Achieved</th>
                      <th className="p-2.5">Performance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2.5 font-medium">1. Production Meterage Target</td>
                      <td className="p-2.5 text-muted-foreground">25%</td>
                      <td className="p-2.5 font-bold text-foreground">{selectedScorecard.production_score} / 25</td>
                      <td className="p-2.5">{((selectedScorecard.production_score / 25) * 100).toFixed(0)}%</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">2. Rig Availability & Condition</td>
                      <td className="p-2.5 text-muted-foreground">20%</td>
                      <td className="p-2.5 font-bold text-foreground">{selectedScorecard.rig_condition_score} / 20</td>
                      <td className="p-2.5">{((selectedScorecard.rig_condition_score / 20) * 100).toFixed(0)}%</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">3. Downtime Minimization</td>
                      <td className="p-2.5 text-muted-foreground">15%</td>
                      <td className="p-2.5 font-bold text-foreground">{selectedScorecard.downtime_score} / 15</td>
                      <td className="p-2.5">{((selectedScorecard.downtime_score / 15) * 100).toFixed(0)}%</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">4. HSE Incident Prevention & Safety</td>
                      <td className="p-2.5 text-muted-foreground">15%</td>
                      <td className="p-2.5 font-bold text-foreground">{selectedScorecard.hse_score} / 15</td>
                      <td className="p-2.5">{((selectedScorecard.hse_score / 15) * 100).toFixed(0)}%</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">5. Consumables & Bit Efficiency</td>
                      <td className="p-2.5 text-muted-foreground">10%</td>
                      <td className="p-2.5 font-bold text-foreground">{selectedScorecard.consumables_score} / 10</td>
                      <td className="p-2.5">{((selectedScorecard.consumables_score / 10) * 100).toFixed(0)}%</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">6. Crew Productivity & Management</td>
                      <td className="p-2.5 text-muted-foreground">5%</td>
                      <td className="p-2.5 font-bold text-foreground">{selectedScorecard.crew_management_score} / 5</td>
                      <td className="p-2.5">{((selectedScorecard.crew_management_score / 5) * 100).toFixed(0)}%</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">7. Daily Shift Log Accuracy</td>
                      <td className="p-2.5 text-muted-foreground">5%</td>
                      <td className="p-2.5 font-bold text-foreground">{selectedScorecard.reporting_score} / 5</td>
                      <td className="p-2.5">{((selectedScorecard.reporting_score / 5) * 100).toFixed(0)}%</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">8. Site Environmental Stewardship</td>
                      <td className="p-2.5 text-muted-foreground">5%</td>
                      <td className="p-2.5 font-bold text-foreground">{selectedScorecard.stewardship_score} / 5</td>
                      <td className="p-2.5">{((selectedScorecard.stewardship_score / 5) * 100).toFixed(0)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {selectedScorecard.notes && (
              <div>
                <span className="text-xs text-muted-foreground block font-bold mb-1">Field Audit Notes & Feedback</span>
                <p className="text-xs text-foreground bg-muted/30 p-3 rounded border">{selectedScorecard.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={() => setSelectedScorecard(null)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Close Scorecard
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE SCORECARD MODAL */}
      {showAddScorecard && (
        <Modal title="Create 8-Pillar Supervisor Scorecard" onClose={() => setShowAddScorecard(false)}>
          <form onSubmit={handleCreateScorecard} className="space-y-4 text-sm p-1">
            {/* Supervisor Searchable Select */}
            <div>
              <label className="block text-xs font-medium mb-1">Supervisor Selection *</label>
              <SearchableSelect
                required
                value={newScorecard.supervisor_id}
                onChange={(val) => setNewScorecard({ ...newScorecard, supervisor_id: val })}
                options={[
                  { value: '', label: `Select Supervisor (${employees.length} available)...` },
                  ...employees.map((e) => {
                    const labelName = `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.job_title || `Employee (${e.id.slice(0, 6)})`;
                    const extra = e.job_title ? ` — ${e.job_title}` : '';
                    return {
                      value: e.id,
                      label: `${labelName}${extra}`,
                    };
                  }),
                ]}
                placeholder="Select supervisor..."
                searchable={true}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Project / Site</label>
                <SearchableSelect
                  value={newScorecard.project_id}
                  onChange={(val) => setNewScorecard({ ...newScorecard, project_id: val })}
                  options={[
                    { value: '', label: 'Select Project (Optional)...' },
                    ...projects.map((p) => ({
                      value: p.id,
                      label: p.name,
                    })),
                  ]}
                  placeholder="Select project..."
                  searchable={projects.length > 5}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Audit Start Date *</label>
                <AppDateTimePicker
                  mode="date"
                  required
                  value={newScorecard.period_start}
                  onChange={(val) => setNewScorecard({ ...newScorecard, period_start: val })}
                  placeholder="Select start date"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Audit End Date *</label>
                <AppDateTimePicker
                  mode="date"
                  required
                  value={newScorecard.period_end}
                  onChange={(val) => setNewScorecard({ ...newScorecard, period_end: val })}
                  placeholder="Select end date"
                />
              </div>
            </div>

            {/* 8 Pillar Inputs */}
            <div className="border-t pt-3 space-y-3">
              <label className="block text-xs font-bold text-foreground">8 Operational Pillars Scoring</label>

              <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3 rounded border">
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">1. Production Meterage (Max 25)</label>
                  <input
                    type="number"
                    min="0"
                    max="25"
                    value={newScorecard.production_score}
                    onChange={(e) => setNewScorecard({ ...newScorecard, production_score: Number(e.target.value) })}
                    className="w-full text-xs border rounded p-1.5 bg-background font-bold text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium mb-0.5">2. Rig Condition (Max 20)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={newScorecard.rig_condition_score}
                    onChange={(e) => setNewScorecard({ ...newScorecard, rig_condition_score: Number(e.target.value) })}
                    className="w-full text-xs border rounded p-1.5 bg-background font-bold text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium mb-0.5">3. Downtime Minimization (Max 15)</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={newScorecard.downtime_score}
                    onChange={(e) => setNewScorecard({ ...newScorecard, downtime_score: Number(e.target.value) })}
                    className="w-full text-xs border rounded p-1.5 bg-background font-bold text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium mb-0.5">4. HSE Safety (Max 15)</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={newScorecard.hse_score}
                    onChange={(e) => setNewScorecard({ ...newScorecard, hse_score: Number(e.target.value) })}
                    className="w-full text-xs border rounded p-1.5 bg-background font-bold text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium mb-0.5">5. Consumables & Bits (Max 10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={newScorecard.consumables_score}
                    onChange={(e) => setNewScorecard({ ...newScorecard, consumables_score: Number(e.target.value) })}
                    className="w-full text-xs border rounded p-1.5 bg-background font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium mb-0.5">6. Crew Productivity (Max 5)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={newScorecard.crew_management_score}
                    onChange={(e) => setNewScorecard({ ...newScorecard, crew_management_score: Number(e.target.value) })}
                    className="w-full text-xs border rounded p-1.5 bg-background font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium mb-0.5">7. Daily Logs (Max 5)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={newScorecard.reporting_score}
                    onChange={(e) => setNewScorecard({ ...newScorecard, reporting_score: Number(e.target.value) })}
                    className="w-full text-xs border rounded p-1.5 bg-background font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium mb-0.5">8. Site Stewardship (Max 5)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={newScorecard.stewardship_score}
                    onChange={(e) => setNewScorecard({ ...newScorecard, stewardship_score: Number(e.target.value) })}
                    className="w-full text-xs border rounded p-1.5 bg-background font-bold"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Audit Notes & Recommendations</label>
              <textarea
                rows={2}
                value={newScorecard.notes}
                onChange={(e) => setNewScorecard({ ...newScorecard, notes: e.target.value })}
                className="w-full text-xs border rounded p-2 bg-background"
                placeholder="Observed strengths, safety performance, maintenance issues..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
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

      <ErrorModal error={errorMessage} onClose={() => setErrorMessage('')} />
    </AppLayout>
  );
}
