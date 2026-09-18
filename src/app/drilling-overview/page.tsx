'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { 
  Flame, Activity, Layers, RefreshCw, Search, ArrowUpRight, CheckCircle2, Clock, MapPin, Gauge
} from 'lucide-react';
import { apiFetch, DrillingShiftReportRead, DrillingProgramRead, DrillHoleRead } from '@/lib/api';
import { rows } from '@/components/DataUI';

export default function DrillingOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<DrillingShiftReportRead[]>([]);
  const [programs, setPrograms] = useState<DrillingProgramRead[]>([]);
  const [holes, setHoles] = useState<DrillHoleRead[]>([]);
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

  const totalMetres = (Array.isArray(shifts) ? shifts : []).reduce((acc, s) => acc + (Number(s.metres_drilled ?? s.total_metres_drilled) || 0), 0);
  const avgCoreRecovery = (Array.isArray(shifts) ? shifts : []).length > 0
    ? (shifts.reduce((acc, s) => acc + (Number(s.core_recovery_pct) || 0), 0) / shifts.length)
    : 0;

  const filteredShifts = (Array.isArray(shifts) ? shifts : []).filter((s) =>
    !search || (s.shift_number || '').toLowerCase().includes(search.toLowerCase()) || (s.shift_type || '').toLowerCase().includes(search.toLowerCase())
  );

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
              Raw Shifts & Logs
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
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredShifts.slice(0, 8).map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">{s.shift_number}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.shift_date}</td>
                    <td className="px-4 py-3 font-semibold text-xs">{s.shift_type}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.start_depth_m ?? 0}m - {s.end_depth_m ?? 0}m</td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-600">{s.metres_drilled ?? s.total_metres_drilled ?? 0} m</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        Number(s.core_recovery_pct) >= 90 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {s.core_recovery_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredShifts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
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
    </AppLayout>
  );
}
