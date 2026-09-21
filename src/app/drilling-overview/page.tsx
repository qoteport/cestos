'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { 
  Flame, Activity, Layers, RefreshCw, Search, ArrowUpRight, CheckCircle2, Clock, MapPin, Gauge, Compass, Eye
} from 'lucide-react';
import { apiFetch, DrillingShiftReportRead, DrillingProgramRead, DrillHoleRead } from '@/lib/api';
import { Modal, rows } from '@/components/DataUI';

export default function DrillingOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<DrillingShiftReportRead[]>([]);
  const [programs, setPrograms] = useState<DrillingProgramRead[]>([]);
  const [holes, setHoles] = useState<DrillHoleRead[]>([]);
  const [selectedShift, setSelectedShift] = useState<DrillingShiftReportRead | null>(null);
  const [version, setVersion] = useState(0);

  const [search, setSearch] = useState('');

  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      apiFetch<DrillingShiftReportRead[]>('/api/v1/drilling/shifts').catch(() => []),
      apiFetch<DrillingProgramRead[]>('/api/v1/drilling/programs').catch(() => []),
      apiFetch<DrillHoleRead[]>('/api/v1/drilling/holes').catch(() => []),
    ]).then(([sRes, pRes, hRes]) => {
      if (!active) return;
      setShifts(rows(sRes) as DrillingShiftReportRead[]);
      setPrograms(rows(pRes) as DrillingProgramRead[]);
      setHoles(rows(hRes) as DrillHoleRead[]);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [version]);

  const totalMetres = (Array.isArray(shifts) ? shifts : []).reduce(
    (acc, s) => acc + (Number(s.total_metres ?? s.total_metres_drilled ?? s.metres_drilled) || 0),
    0
  );

  const validRecoveryShifts = (Array.isArray(shifts) ? shifts : []).filter(
    (s) =>
      (s.avg_core_recovery_pct !== undefined && s.avg_core_recovery_pct !== null) ||
      (s.core_recovery_pct !== undefined && s.core_recovery_pct !== null)
  );

  const avgCoreRecovery = validRecoveryShifts.length > 0
    ? validRecoveryShifts.reduce((acc, s) => acc + Number(s.avg_core_recovery_pct ?? s.core_recovery_pct ?? 0), 0) / validRecoveryShifts.length
    : 0;

  const filteredShifts = (Array.isArray(shifts) ? shifts : []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const num = s.report_number || s.shift_number || s.id?.slice(0, 8) || '';
    const date = s.date || s.shift_date || '';
    const type = s.shift_type || '';
    const status = s.status || '';
    return (
      num.toLowerCase().includes(q) ||
      date.toLowerCase().includes(q) ||
      type.toLowerCase().includes(q) ||
      status.toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout>
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Flame className="h-6 w-6 text-amber-500" />
              Drilling Operations & Production Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Shift production logging, core recovery tracking, drill hole status, and rig performance analytics
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
              onClick={() => router.push('/workspace/drilling/shifts')}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90"
            >
              <Layers className="h-4 w-4" />
              Shifts & Logs
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border bg-card space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Metres Drilled</span>
              <Flame className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono">
              {totalMetres.toLocaleString()} m
            </div>
            <p className="text-xs text-muted-foreground">Logged across {shifts.length} shifts</p>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Avg Core Recovery</span>
              <Gauge className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {avgCoreRecovery.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">High quality core retrieval target (&gt;90%)</p>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Drilling Programs</span>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono">
              {programs.length} Active
            </div>
            <p className="text-xs text-muted-foreground">Planned vs Actual Metres Tracking</p>
          </div>

          <div className="p-4 rounded-xl border bg-card space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Drill Holes</span>
              <MapPin className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-blue-600">
              {holes.length} Logged
            </div>
            <p className="text-xs text-muted-foreground">In-progress & Completed Holes</p>
          </div>
        </div>

        {/* Recent Shift Reports Table */}
        <div className="border rounded-xl bg-card p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-500" />
                Shift Production Reports
              </h2>
              <p className="text-xs text-muted-foreground">Daily shift logs, metres drilled, core recovery percentage, and operating hours</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search shifts..."
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
                  <th className="px-4 py-3">Shift #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Start - End Depth</th>
                  <th className="px-4 py-3">Metres Drilled</th>
                  <th className="px-4 py-3">Core Recovery</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredShifts.slice(0, 8).map((s) => {
                  const shiftNum = s.report_number || s.shift_number || (s.id ? `DR-${s.id.slice(0, 8).toUpperCase()}` : 'N/A');
                  const shiftDate = s.date || s.shift_date || (s.created_at ? s.created_at.slice(0, 10) : 'N/A');
                  const metres = s.total_metres ?? s.total_metres_drilled ?? s.metres_drilled ?? 0;
                  const coreRec = s.avg_core_recovery_pct ?? s.core_recovery_pct ?? 0;

                  const hasIntervals = Array.isArray(s.intervals) && s.intervals.length > 0;
                  const startDepth = hasIntervals ? s.intervals![0].from_depth_m : (s.start_depth_m ?? 0);
                  const endDepth = hasIntervals ? s.intervals![s.intervals!.length - 1].to_depth_m : (s.end_depth_m ?? metres);

                  return (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-xs">{shiftNum}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{shiftDate}</td>
                      <td className="px-4 py-3 font-semibold text-xs">
                        <span className="px-2 py-0.5 rounded text-xs bg-secondary">{s.shift_type || 'DAY'}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{startDepth}m - {endDepth}m</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600">{metres} m</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          Number(coreRec) >= 90 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {coreRec}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          s.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' :
                          s.status === 'SUBMITTED' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {s.status || 'DRAFT'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedShift(s)}
                          className="px-2.5 py-1 text-xs border rounded font-medium hover:bg-muted inline-flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" /> Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredShifts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No shift reports logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Programs & Drill Holes */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="border rounded-xl bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Active Drilling Programs
              </h2>
              <button
                onClick={() => router.push('/workspace/drilling/programs')}
                className="text-xs text-primary font-medium hover:underline"
              >
                View All Programs →
              </button>
            </div>
            <div className="space-y-3">
              {(Array.isArray(programs) ? programs : []).slice(0, 4).map((p) => (
                <div key={p.id} className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm block">{p.program_name || p.name}</span>
                    <span className="text-xs text-muted-foreground">Type: {p.drilling_type || p.program_code}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm block">{p.target_metres} m Target</span>
                    <span className="text-xs font-medium text-emerald-600">{p.status}</span>
                  </div>
                </div>
              ))}
              {programs.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No active drilling programs registered.</p>
              )}
            </div>
          </div>

          <div className="border rounded-xl bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-500" />
                Drill Hole Register
              </h2>
              <button
                onClick={() => router.push('/workspace/drilling/holes')}
                className="text-xs text-primary font-medium hover:underline"
              >
                View All Holes →
              </button>
            </div>
            <div className="space-y-3">
              {(Array.isArray(holes) ? holes : []).slice(0, 4).map((h) => (
                <div key={h.id} className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm block">{h.hole_number}</span>
                    <span className="text-xs text-muted-foreground">Dip: {h.dip_deg ?? -60}° | Azimuth: {h.azimuth_deg ?? 180}°</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm block">{h.target_depth_m} m Planned</span>
                    <span className="text-xs font-medium text-blue-600">{h.status}</span>
                  </div>
                </div>
              ))}
              {holes.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No drill holes recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedShift && (
        <Modal
          title={`Shift Report Details - ${selectedShift.report_number || selectedShift.shift_number || selectedShift.id?.slice(0, 8)}`}
          onClose={() => setSelectedShift(null)}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 p-4 bg-muted/20 border rounded-xl">
              <div>
                <span className="text-xs text-muted-foreground block">Shift Number</span>
                <span className="font-mono font-bold text-sm">
                  {selectedShift.report_number || selectedShift.shift_number || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Date & Shift Type</span>
                <span className="font-semibold text-sm">
                  {selectedShift.date || selectedShift.shift_date || 'N/A'} ({selectedShift.shift_type || 'DAY'})
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Total Metres</span>
                <span className="font-mono font-bold text-sm text-emerald-600">
                  {selectedShift.total_metres ?? selectedShift.total_metres_drilled ?? selectedShift.metres_drilled ?? 0} m
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Core Recovery</span>
                <span className="font-mono font-bold text-sm text-blue-600">
                  {selectedShift.avg_core_recovery_pct ?? selectedShift.core_recovery_pct ?? 0}%
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Status</span>
                <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-xs ${
                  selectedShift.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' :
                  selectedShift.status === 'SUBMITTED' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'
                }`}>
                  {selectedShift.status || 'SUBMITTED'}
                </span>
              </div>
            </div>

            {/* Intervals Table */}
            <div>
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-500" /> Drilled Intervals
              </h3>
              {Array.isArray(selectedShift.intervals) && selectedShift.intervals.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted font-semibold uppercase text-muted-foreground border-b">
                      <tr>
                        <th className="p-2.5">From Depth</th>
                        <th className="p-2.5">To Depth</th>
                        <th className="p-2.5">Interval (m)</th>
                        <th className="p-2.5">Core Recovery %</th>
                        <th className="p-2.5">Lithology</th>
                        <th className="p-2.5">Drill Hole ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedShift.intervals.map((inv, idx) => (
                        <tr key={inv.id || idx}>
                          <td className="p-2.5 font-mono">{inv.from_depth_m} m</td>
                          <td className="p-2.5 font-mono">{inv.to_depth_m} m</td>
                          <td className="p-2.5 font-mono font-semibold">{inv.metres_drilled ?? (inv.to_depth_m - inv.from_depth_m)} m</td>
                          <td className="p-2.5 font-mono text-emerald-600 font-semibold">{inv.core_recovery_pct ?? 0}%</td>
                          <td className="p-2.5 font-mono">{inv.lithology_code || 'N/A'}</td>
                          <td className="p-2.5 font-mono text-muted-foreground">{inv.drill_hole_id || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic border p-3 rounded-lg">No interval telemetry records attached to this shift.</p>
              )}
            </div>

            {Boolean(selectedShift.notes) && (
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-1">Shift Notes & Observations</h3>
                <p className="text-xs p-3 bg-muted/20 border rounded-lg font-mono whitespace-pre-wrap">{String(selectedShift.notes)}</p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setSelectedShift(null)}
                className="px-4 py-2 bg-secondary text-secondary-foreground text-xs font-semibold rounded-lg hover:bg-secondary/80"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
