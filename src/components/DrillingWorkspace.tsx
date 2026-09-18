'use client';

import React, { useState, useEffect } from 'react';
import { 
  Flame, Plus, RefreshCw, Layers, Compass, CheckCircle2, AlertCircle, Clock, Users, ArrowRight, Search, Eye 
} from 'lucide-react';
import { 
  apiFetch, DrillingProgramRead, DrillHoleRead, DrillingShiftReportRead 
} from '@/lib/api';
import { Modal, rows } from './DataUI';

export default function DrillingWorkspace({ subResource }: { subResource?: string }) {
  const [activeTab, setActiveTab] = useState<'PROGRAMS' | 'HOLES' | 'SHIFTS'>('SHIFTS');
  const [search, setSearch] = useState('');
  const [selectedShift, setSelectedShift] = useState<DrillingShiftReportRead | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<DrillingProgramRead | null>(null);
  const [selectedHole, setSelectedHole] = useState<DrillHoleRead | null>(null);

  // New Program Modal
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [newProgram, setNewProgram] = useState({
    project_id: '',
    program_name: '',
    drilling_type: 'RC',
    target_metres: 5000,
    status: 'ACTIVE',
  });

  // New Hole Modal
  const [showAddHole, setShowAddHole] = useState(false);
  const [newHole, setNewHole] = useState({
    project_id: '',
    hole_number: 'HOLE-RC-001',
    drilling_type: 'RC',
    target_depth_m: 250,
    status: 'IN_PROGRESS',
  });

  useEffect(() => {
    if (subResource === 'programs') setActiveTab('PROGRAMS');
    else if (subResource === 'holes') setActiveTab('HOLES');
    else if (subResource === 'shifts') setActiveTab('SHIFTS');
  }, [subResource]);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<DrillingProgramRead[]>([]);
  const [holes, setHoles] = useState<DrillHoleRead[]>([]);
  const [shifts, setShifts] = useState<DrillingShiftReportRead[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [version, setVersion] = useState(0);

  // New Shift Form State
  const [showAddShift, setShowAddShift] = useState(false);
  const [newShift, setNewShift] = useState({
    rig_id: '',
    project_id: '',
    shift_date: new Date().toISOString().slice(0, 10),
    shift_type: 'DAY',
    shift_number: 'DS-001',
    total_metres_drilled: 120.5,
    core_recovery_pct: 95.0,
    productive_hours: 10.0,
    standby_hours: 1.0,
    maintenance_hours: 1.0,
  });

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<DrillingProgramRead[]>('/api/v1/drilling/programs').catch(() => []),
      apiFetch<DrillHoleRead[]>('/api/v1/drilling/holes').catch(() => []),
      apiFetch<DrillingShiftReportRead[]>('/api/v1/drilling/shifts').catch(() => []),
      apiFetch<any>('/api/v1/projects?page_size=100').catch(() => ({ items: [] })),
      apiFetch<any>('/api/v1/assets?page_size=100').catch(() => ({ items: [] })),
    ]).then(([progRes, holeRes, shiftRes, projRes, assetRes]) => {
      if (!active) return;
      setPrograms(rows(progRes) as DrillingProgramRead[]);
      setHoles(rows(holeRes) as DrillHoleRead[]);
      setShifts(rows(shiftRes) as DrillingShiftReportRead[]);
      setProjects(rows(projRes));
      setAssets(rows(assetRes));
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [version]);

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/drilling/shifts', {
        method: 'POST',
        body: JSON.stringify(newShift),
      });
      setShowAddShift(false);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to create shift production report');
    }
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/drilling/programs', {
        method: 'POST',
        body: JSON.stringify(newProgram),
      });
      setShowAddProgram(false);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to create drilling program');
    }
  };

  const handleCreateHole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/v1/drilling/holes', {
        method: 'POST',
        body: JSON.stringify(newHole),
      });
      setShowAddHole(false);
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to create drill hole');
    }
  };

  const handleApproveShift = async (shiftId: string) => {
    try {
      await apiFetch(`/api/v1/drilling/shifts/${shiftId}/approve`, { method: 'POST' });
      reload();
    } catch (err: any) {
      alert(err.message || 'Failed to approve shift report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="h-6 w-6 text-amber-500" />
            Rig & Shift Drilling Operations
          </h1>
          <p className="text-sm text-muted-foreground">
            Drilling programs, hole specifications, daily shift production logs, core recovery, and auto-revenue engine
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

      {/* Navigation Tabs */}
      <div className="flex border-b space-x-4">
        <button
          onClick={() => setActiveTab('SHIFTS')}
          className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'SHIFTS'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-4 w-4" />
          Shift Production Reports ({shifts.length})
        </button>
        <button
          onClick={() => setActiveTab('PROGRAMS')}
          className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'PROGRAMS'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="h-4 w-4" />
          Drilling Programs ({programs.length})
        </button>
        <button
          onClick={() => setActiveTab('HOLES')}
          className={`pb-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'HOLES'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Compass className="h-4 w-4" />
          Drill Holes ({holes.length})
        </button>
      </div>

      {/* SHIFTS TAB */}
      {activeTab === 'SHIFTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Daily Shift Production Reports</h2>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search shift reports..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-sm border rounded-lg pl-9 pr-3 py-1.5 bg-background"
                />
              </div>
              <button
                onClick={() => setShowAddShift(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 shrink-0"
              >
                <Plus className="h-4 w-4" />
                New Shift Report
              </button>
            </div>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Shift #</th>
                  <th className="px-4 py-3">Date & Type</th>
                  <th className="px-4 py-3">Drilled Metres</th>
                  <th className="px-4 py-3">Core Recovery</th>
                  <th className="px-4 py-3">Hours (Prod / Standby / Maint)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(Array.isArray(shifts) ? shifts : [])
                  .filter((s) => {
                    if (!search.trim()) return true;
                    const q = search.toLowerCase();
                    return (
                      s.shift_number?.toLowerCase().includes(q) ||
                      s.shift_date?.toLowerCase().includes(q) ||
                      s.status?.toLowerCase().includes(q)
                    );
                  })
                  .map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono font-medium text-xs">{s.shift_number}</td>
                      <td className="px-4 py-3 font-medium">
                        {s.shift_date} <span className="text-xs text-muted-foreground">({s.shift_type})</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600">{s.total_metres_drilled} m</td>
                      <td className="px-4 py-3 font-semibold">{s.core_recovery_pct}%</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {s.productive_hours}h / {s.standby_hours}h / {s.maintenance_hours}h
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          s.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' :
                          s.status === 'SUBMITTED' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedShift(s)}
                          className="px-2 py-1 text-xs border rounded font-medium hover:bg-muted inline-flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" /> Details
                        </button>
                        {s.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleApproveShift(s.id)}
                            className="px-2 py-1 text-xs bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                {shifts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No shift production reports recorded yet. Click "New Shift Report" to record rig production.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROGRAMS TAB */}
      {activeTab === 'PROGRAMS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Drilling Programs</h2>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search programs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-sm border rounded-lg pl-9 pr-3 py-1.5 bg-background"
                />
              </div>
              <button
                onClick={() => setShowAddProgram(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 shrink-0"
              >
                <Plus className="h-4 w-4" />
                New Program
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Array.isArray(programs) ? programs : [])
              .filter((p) => {
                if (!search.trim()) return true;
                const q = search.toLowerCase();
                return (
                  p.program_name?.toLowerCase().includes(q) ||
                  p.drilling_type?.toLowerCase().includes(q) ||
                  p.status?.toLowerCase().includes(q)
                );
              })
              .map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProgram(p)}
                  className="p-4 rounded-xl border bg-card space-y-2 shadow-sm hover:border-primary/50 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">{p.drilling_type}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-secondary">{p.status}</span>
                  </div>
                  <h3 className="font-bold text-base">{p.program_name}</h3>
                  <div className="flex items-center justify-between text-sm pt-2">
                    <span className="text-muted-foreground">Progress:</span>
                    <span className="font-bold">{p.drilled_metres || 0} / {p.target_metres} m</span>
                  </div>
                </div>
              ))}
            {programs.length === 0 && (
              <div className="col-span-full p-8 text-center border rounded-xl bg-card text-muted-foreground">
                No active drilling programs found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* HOLES TAB */}
      {activeTab === 'HOLES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Drill Holes</h2>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search drill holes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-sm border rounded-lg pl-9 pr-3 py-1.5 bg-background"
                />
              </div>
              <button
                onClick={() => setShowAddHole(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 shrink-0"
              >
                <Plus className="h-4 w-4" />
                New Drill Hole
              </button>
            </div>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Hole #</th>
                  <th className="px-4 py-3">Target Depth</th>
                  <th className="px-4 py-3">Final Depth</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(Array.isArray(holes) ? holes : [])
                  .filter((h) => {
                    if (!search.trim()) return true;
                    const q = search.toLowerCase();
                    return (
                      h.hole_number?.toLowerCase().includes(q) ||
                      h.status?.toLowerCase().includes(q)
                    );
                  })
                  .map((h) => (
                    <tr key={h.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono font-medium">{h.hole_number}</td>
                      <td className="px-4 py-3">{h.target_depth_m} m</td>
                      <td className="px-4 py-3 font-bold">{h.final_depth_m} m</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-secondary">{h.status}</span></td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedHole(h)}
                          className="px-2 py-1 text-xs border rounded font-medium hover:bg-muted inline-flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" /> Details
                        </button>
                      </td>
                    </tr>
                  ))}
                {holes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No drill holes recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW SHIFT MODAL */}
      {showAddShift && (
        <Modal title="Create Daily Shift Production Report" onClose={() => setShowAddShift(false)}>
          <form onSubmit={handleCreateShift} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Rig / Asset</label>
                <select
                  required
                  value={newShift.rig_id}
                  onChange={(e) => setNewShift({ ...newShift, rig_id: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="">Select Rig...</option>
                  {(Array.isArray(assets) ? assets : []).map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.asset_number || 'Rig'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Project</label>
                <select
                  required
                  value={newShift.project_id}
                  onChange={(e) => setNewShift({ ...newShift, project_id: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="">Select Project...</option>
                  {(Array.isArray(projects) ? projects : []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Shift Date</label>
                <input
                  type="date"
                  required
                  value={newShift.shift_date}
                  onChange={(e) => setNewShift({ ...newShift, shift_date: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Shift Type</label>
                <select
                  value={newShift.shift_type}
                  onChange={(e) => setNewShift({ ...newShift, shift_type: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="DAY">DAY</option>
                  <option value="NIGHT">NIGHT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Metres Drilled</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newShift.total_metres_drilled}
                  onChange={(e) => setNewShift({ ...newShift, total_metres_drilled: Number(e.target.value) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Core Recovery %</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newShift.core_recovery_pct}
                  onChange={(e) => setNewShift({ ...newShift, core_recovery_pct: Number(e.target.value) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddShift(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Save Shift Report
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* NEW PROGRAM MODAL */}
      {showAddProgram && (
        <Modal title="Create Drilling Program" onClose={() => setShowAddProgram(false)}>
          <form onSubmit={handleCreateProgram} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Project</label>
              <select
                required
                value={newProgram.project_id}
                onChange={(e) => setNewProgram({ ...newProgram, project_id: e.target.value })}
                className="w-full text-sm border rounded p-2 bg-background"
              >
                <option value="">Select Project...</option>
                {(Array.isArray(projects) ? projects : []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Program Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Nimba Exploration RC Campaign"
                value={newProgram.program_name}
                onChange={(e) => setNewProgram({ ...newProgram, program_name: e.target.value })}
                className="w-full text-sm border rounded p-2 bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Drilling Method</label>
                <select
                  value={newProgram.drilling_type}
                  onChange={(e) => setNewProgram({ ...newProgram, drilling_type: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="RC">Reverse Circulation (RC)</option>
                  <option value="DIAMOND_CORE">Diamond Core (DD)</option>
                  <option value="RAB">RAB</option>
                  <option value="AIR_CORE">Air Core</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Target Metres</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newProgram.target_metres}
                  onChange={(e) => setNewProgram({ ...newProgram, target_metres: Number(e.target.value) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddProgram(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Save Program
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* NEW HOLE MODAL */}
      {showAddHole && (
        <Modal title="Create Drill Hole Specification" onClose={() => setShowAddHole(false)}>
          <form onSubmit={handleCreateHole} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Project</label>
              <select
                required
                value={newHole.project_id}
                onChange={(e) => setNewHole({ ...newHole, project_id: e.target.value })}
                className="w-full text-sm border rounded p-2 bg-background"
              >
                <option value="">Select Project...</option>
                {(Array.isArray(projects) ? projects : []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Hole Number / ID</label>
              <input
                type="text"
                required
                placeholder="e.g. HOLE-RC-005"
                value={newHole.hole_number}
                onChange={(e) => setNewHole({ ...newHole, hole_number: e.target.value })}
                className="w-full text-sm border rounded p-2 bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Method</label>
                <select
                  value={newHole.drilling_type}
                  onChange={(e) => setNewHole({ ...newHole, drilling_type: e.target.value })}
                  className="w-full text-sm border rounded p-2 bg-background"
                >
                  <option value="RC">RC</option>
                  <option value="DIAMOND_CORE">Diamond Core</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Target Depth (m)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newHole.target_depth_m}
                  onChange={(e) => setNewHole({ ...newHole, target_depth_m: Number(e.target.value) })}
                  className="w-full text-sm border rounded p-2 bg-background"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddHole(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90"
              >
                Save Drill Hole
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* VIEW SHIFT DETAILS MODAL */}
      {selectedShift && (
        <Modal title={`Shift Report - ${selectedShift.shift_number}`} onClose={() => setSelectedShift(null)}>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3 text-sm">
              <div>
                <span className="font-semibold">{selectedShift.shift_date} ({selectedShift.shift_type})</span>
                <p className="text-xs text-muted-foreground">Rig: {selectedShift.rig_id || 'Primary Rig'}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full font-semibold ${
                selectedShift.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
              }`}>
                {selectedShift.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block">Metres Drilled</span>
                <strong className="text-base text-emerald-600 font-bold">{selectedShift.total_metres_drilled} m</strong>
              </div>
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block">Core Recovery</span>
                <strong className="text-base font-bold">{selectedShift.core_recovery_pct}%</strong>
              </div>
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block">Hours Breakdown</span>
                <span className="font-medium">{selectedShift.productive_hours}h Prod / {selectedShift.standby_hours}h Stby / {selectedShift.maintenance_hours}h Maint</span>
              </div>
            </div>

            {selectedShift.status !== 'APPROVED' && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={async () => {
                    await handleApproveShift(selectedShift.id);
                    setSelectedShift(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                >
                  Approve Shift & Auto-Post Revenue
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* VIEW PROGRAM DETAILS MODAL */}
      {selectedProgram && (
        <Modal title={`Drilling Program - ${selectedProgram.program_name}`} onClose={() => setSelectedProgram(null)}>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-muted-foreground">Method: {selectedProgram.drilling_type}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-secondary text-xs font-semibold">{selectedProgram.status}</span>
            </div>
            <div className="p-4 border rounded-lg bg-card space-y-2">
              <div className="flex justify-between font-semibold text-sm">
                <span>Total Metres Target</span>
                <span>{selectedProgram.target_metres} m</span>
              </div>
              <div className="flex justify-between font-semibold text-sm text-emerald-600">
                <span>Drilled Progress</span>
                <span>{selectedProgram.drilled_metres || 0} m</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* VIEW HOLE DETAILS MODAL */}
      {selectedHole && (
        <Modal title={`Drill Hole - ${selectedHole.hole_number}`} onClose={() => setSelectedHole(null)}>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block">Target Depth</span>
                <strong className="text-sm font-bold">{selectedHole.target_depth_m} m</strong>
              </div>
              <div className="p-3 border rounded-lg bg-card">
                <span className="text-muted-foreground block">Final Depth</span>
                <strong className="text-sm font-bold">{selectedHole.final_depth_m || 0} m</strong>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
