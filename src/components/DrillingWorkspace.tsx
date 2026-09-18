'use client';

import React, { useState, useEffect } from 'react';
import { 
  Flame, Plus, RefreshCw, Layers, Compass, CheckCircle2, AlertCircle, Clock, Users, ArrowRight
} from 'lucide-react';
import { 
  apiFetch, DrillingProgramRead, DrillHoleRead, DrillingShiftReportRead 
} from '@/lib/api';
import { Modal, rows } from './DataUI';

export default function DrillingWorkspace() {
  const [activeTab, setActiveTab] = useState<'PROGRAMS' | 'HOLES' | 'SHIFTS'>('SHIFTS');
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Daily Shift Production Reports</h2>
            <button
              onClick={() => setShowAddShift(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Shift Report
            </button>
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
                {shifts.map((s) => (
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
                    <td className="px-4 py-3 text-right">
                      {s.status !== 'APPROVED' && (
                        <button
                          onClick={() => handleApproveShift(s.id)}
                          className="px-2 py-1 text-xs bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                        >
                          Approve & Auto-Post Revenue
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Drilling Programs</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((p) => (
              <div key={p.id} className="p-4 rounded-xl border bg-card space-y-2 shadow-sm">
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Drill Holes</h2>
          </div>
          <div className="border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Hole #</th>
                  <th className="px-4 py-3">Target Depth</th>
                  <th className="px-4 py-3">Final Depth</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {holes.map((h) => (
                  <tr key={h.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-medium">{h.hole_number}</td>
                    <td className="px-4 py-3">{h.target_depth_m} m</td>
                    <td className="px-4 py-3 font-bold">{h.final_depth_m} m</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-secondary">{h.status}</span></td>
                  </tr>
                ))}
                {holes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
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
                  {assets.map((a) => (
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
                  {projects.map((p) => (
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
    </div>
  );
}
