'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { RotateCcw, ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { getUpcomingRotations } from '@/lib/api';

interface RotationItem {
  id?: string;
  employee?: { id?: string; full_name?: string; first_name?: string; last_name?: string; employee_number?: string };
  employee_name?: string;
  employee_number?: string;
  project?: { name?: string } | string;
  project_name?: string;
  rotation_type?: string;
  change_type?: string;
  scheduled_date?: string;
  date?: string;
  pattern?: string;
  rotation_pattern?: string;
  [key: string]: unknown;
}

function getEmployeeName(r: RotationItem): string {
  if (r?.employee?.full_name) return r.employee.full_name;
  if (r?.employee?.first_name || r?.employee?.last_name)
    return `${r.employee?.first_name ?? ''} ${r.employee?.last_name ?? ''}`.trim();
  return r?.employee_name ?? '—';
}

function getProjectName(r: RotationItem): string {
  if (typeof r?.project === 'object' && r?.project?.name) return r.project.name;
  if (typeof r?.project === 'string') return r.project;
  return r?.project_name ?? '—';
}

function getChangeType(r: RotationItem): 'offsite' | 'return' {
  const t = (r?.rotation_type ?? r?.change_type ?? '').toUpperCase();
  if (t.includes('OFF') || t.includes('LEAVE') || t.includes('OUT')) return 'offsite';
  return 'return';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function daysUntil(dateStr?: string): number {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export default function UpcomingRotations() {
  const [rotations, setRotations] = useState<RotationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUpcomingRotations(14)
      .then(data => setRotations((data as RotationItem[]) ?? []))
      .catch(() => setRotations([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <RotateCcw size={15} className="text-primary" />
          <span className="text-sm font-700 text-foreground">Upcoming Rotations</span>
          <span className="badge badge-neutral">Next 14 days</span>
        </div>
        <Link href="/workforce-overview" className="text-xs text-primary font-600 hover:underline flex items-center gap-1">
          View All <ChevronRight size={12} />
        </Link>
      </div>

      {loading ? (
        <div className="divide-y divide-border">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-3 flex gap-4">
              <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/6" />
            </div>
          ))}
        </div>
      ) : rotations.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No upcoming rotations in the next 14 days.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Project</th>
                <th>Change</th>
                <th>Pattern</th>
                <th>Date</th>
                <th>Days Away</th>
              </tr>
            </thead>
            <tbody>
              {rotations.map((rot, idx) => {
                const changeType = getChangeType(rot);
                const dateStr = rot?.scheduled_date ?? rot?.date as string | undefined;
                const days = daysUntil(dateStr);
                const empNo = rot?.employee?.employee_number ?? rot?.employee_number;
                const pattern = rot?.pattern ?? rot?.rotation_pattern as string | undefined;
                return (
                  <tr key={rot?.id ?? idx}>
                    <td>
                      <div>
                        <Link href="/workforce-overview" className="entity-link text-sm font-600">{getEmployeeName(rot)}</Link>
                        {empNo && <p className="text-2xs text-muted-foreground">{empNo}</p>}
                      </div>
                    </td>
                    <td className="text-sm text-muted-foreground">{getProjectName(rot)}</td>
                    <td>
                      <div className={`flex items-center gap-1.5 text-xs font-600 ${changeType === 'offsite' ? 'text-amber-700' : 'text-green-700'}`}>
                        {changeType === 'offsite' ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
                        {changeType === 'offsite' ? 'Off Site' : 'Return to Site'}
                      </div>
                    </td>
                    <td className="text-xs text-muted-foreground tabular-nums">{pattern ?? '—'}</td>
                    <td className="text-xs text-foreground font-500">{formatDate(dateStr)}</td>
                    <td>
                      <span className={`text-xs font-700 tabular-nums ${days <= 5 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {days}d
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}