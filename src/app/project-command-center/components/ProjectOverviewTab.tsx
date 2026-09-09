'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Wrench, ChevronRight, Clock } from 'lucide-react';
import { getProjects, getProjectOverview, type ProjectOverview } from '@/lib/api';

interface EmployeeItem {
  id?: string;
  employee?: { id?: string; full_name?: string; first_name?: string; last_name?: string; employee_number?: string };
  full_name?: string;
  position?: { name?: string } | string;
  role?: string;
  status?: string;
  [key: string]: unknown;
}

interface AssetItem {
  id?: string;
  asset_code?: string;
  code?: string;
  name?: string;
  status?: string;
  latest_meter_reading?: { value?: number; unit?: string };
  [key: string]: unknown;
}

interface ActivityItem {
  id?: string;
  created_at?: string;
  description?: string;
  action?: string;
  [key: string]: unknown;
}

function getEmpName(e: EmployeeItem): string {
  if (e?.employee?.full_name) return e.employee.full_name;
  if (e?.employee?.first_name || e?.employee?.last_name)
    return `${e.employee?.first_name ?? ''} ${e.employee?.last_name ?? ''}`.trim();
  return e?.full_name ?? '—';
}

function getRole(e: EmployeeItem): string {
  if (typeof e?.position === 'object' && e?.position?.name) return e.position.name;
  if (typeof e?.position === 'string') return e.position;
  return e?.role ?? '—';
}

function getStatusClass(status?: string): string {
  switch (status?.toUpperCase()) {
    case 'ASSIGNED': return 'badge-assigned';
    case 'ON_LEAVE': return 'badge-on-leave';
    case 'AVAILABLE': return 'badge-available';
    default: return 'badge-neutral';
  }
}

function getAssetStatusClass(status?: string): string {
  switch (status?.toUpperCase()) {
    case 'OPERATING': return 'badge-operating';
    case 'AVAILABLE': return 'badge-available';
    case 'STANDBY': return 'badge-standby';
    case 'BREAKDOWN': return 'badge-breakdown';
    case 'UNDER_MAINTENANCE': return 'badge-maintenance';
    default: return 'badge-neutral';
  }
}

function getMeter(asset: AssetItem): string {
  if (asset?.latest_meter_reading?.value !== undefined) {
    return `${asset.latest_meter_reading.value.toLocaleString()} ${asset.latest_meter_reading.unit ?? 'h'}`;
  }
  return '—';
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch { return dateStr; }
}

export default function ProjectOverviewTab() {
  const [project, setProject] = useState<ProjectOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjects({ status: 'ACTIVE', page_size: '1' })
      .then(async res => {
        const first = res?.items?.[0];
        if (first?.id) {
          const overview = await getProjectOverview(first.id);
          setProject(overview);
        }
      })
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, []);

  const employees = (project?.current_employees as EmployeeItem[]) ?? [];
  const assets = (project?.current_assets as AssetItem[]) ?? [];
  const activity = (project?.recent_assignments as ActivityItem[]) ?? [];

  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-5">
          {[1, 2].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
              {[1, 2, 3].map(j => (
                <div key={j} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ))}
        </div>
        <div>
          <div className="h-4 bg-muted animate-pulse rounded w-1/3 mb-3" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded mb-1" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-5">
        {/* Current Workforce */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-primary" />
              <span className="text-sm font-700 text-foreground">Current Workforce</span>
              {project?.employee_count !== undefined && (
                <span className="badge badge-neutral">{project.employee_count} total</span>
              )}
            </div>
            <Link href="/workforce-overview" className="text-xs text-primary font-600 hover:underline flex items-center gap-1">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No workforce data available.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.slice(0, 8).map((emp, idx) => (
                  <tr key={emp?.id ?? idx}>
                    <td>
                      <Link href="/workforce-overview" className="entity-link text-sm">{getEmpName(emp)}</Link>
                    </td>
                    <td className="text-sm text-muted-foreground">{getRole(emp)}</td>
                    <td><span className={`badge ${getStatusClass(emp?.status)}`}>{emp?.status?.replace('_', ' ') ?? '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Current Equipment */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wrench size={15} className="text-primary" />
              <span className="text-sm font-700 text-foreground">Current Equipment</span>
              {project?.asset_count !== undefined && (
                <span className="badge badge-neutral">{project.asset_count} total</span>
              )}
            </div>
            <Link href="/fleet-dashboard" className="text-xs text-primary font-600 hover:underline flex items-center gap-1">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No equipment data available.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Meter</th>
                </tr>
              </thead>
              <tbody>
                {assets.slice(0, 6).map((asset, idx) => (
                  <tr key={asset?.id ?? idx}>
                    <td>
                      <Link href="/fleet-dashboard" className="entity-link text-sm font-600">
                        {asset?.asset_code ?? asset?.code ?? '—'}
                      </Link>
                    </td>
                    <td className="text-sm text-muted-foreground">{asset?.name ?? '—'}</td>
                    <td><span className={`badge ${getAssetStatusClass(asset?.status)}`}>{asset?.status?.replace(/_/g, ' ') ?? '—'}</span></td>
                    <td className="text-sm tabular-nums text-muted-foreground">{getMeter(asset)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} className="text-primary" />
          <span className="text-sm font-700 text-foreground">Recent Activity</span>
        </div>
        {activity.length === 0 ? (
          <div className="border border-border rounded p-4 text-center text-sm text-muted-foreground">
            No recent activity.
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-border border border-border rounded">
            {activity.slice(0, 8).map((item, idx) => (
              <div key={item?.id ?? idx} className="flex gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors">
                <span className="text-2xs text-muted-foreground tabular-nums whitespace-nowrap mt-0.5">
                  {formatTime(item?.created_at)}
                </span>
                <p className="text-xs text-foreground leading-snug">
                  {item?.description ?? item?.action ?? 'Activity recorded'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}